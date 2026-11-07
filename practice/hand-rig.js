// Palm-local skeleton. All rendering and transitions use these same rigid
// chains; joint centres are never independently dragged towards markers.
export const BONE_LENGTHS = { 1: [86, 60, 32], 2: [94, 66, 34], 3: [88, 61, 32], 4: [74, 51, 30] };
export const PAD_RADIUS = 7;
const rad = degrees => degrees * Math.PI / 180;
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const distance = (a, b) => Math.hypot(...a.map((n, axis) => n - b[axis]));
const lerp = (a, b, t) => a.map((n, i) => n * (1 - t) + b[i] * t);
const sub = (a,b) => a.map((n,i) => n-b[i]);
const dot = (a,b) => a.reduce((sum,n,i) => sum+n*b[i],0);
export const projectHandPoint = ([x, y, z]) => ({ x, y: y - z * 0.6 });
export const JOINT_LIMITS = { mcp: [rad(-15), rad(95)], pip: [0, rad(110)], dip: [rad(-10), rad(85)], yaw: [-rad(35), rad(35)] };
function inFrame(offset, origin, yaw = 0) {
  return [origin[0] + offset[0] * Math.cos(yaw) - offset[1] * Math.sin(yaw), origin[1] + offset[0] * Math.sin(yaw) + offset[1] * Math.cos(yaw), origin[2] + offset[2]];
}

// These reusable grip families are expressed relative to their first fret.
// Written finger assignments remain authoritative; an unmatched fingering uses
// the constrained solver instead of being forced into a named chord.
export const GRIP_PRESETS = [
  { name: 'E-shape barre', shape: [[6,0,1],[5,2,3],[4,2,4],[3,1,2],[2,0,1],[1,0,1]], forward: 8 },
  { name: 'Minor barre', shape: [[6,0,1],[5,2,3],[4,2,4],[3,0,1],[2,0,1],[1,0,1]], forward: 8 },
  { name: 'A-shape barre', shape: [[5,0,1],[4,2,2],[3,2,3],[2,2,4],[1,0,1]], forward: 0 },
  { name: 'C shape', shape: [[5,2,3],[4,1,2],[2,0,1]], forward: 0 },
  { name: 'E shape', shape: [[5,1,2],[4,1,3],[3,0,1]], forward: 8 },
  { name: 'A minor shape', shape: [[4,1,2],[3,1,3],[2,0,1]], forward: 0 },
  { name: 'D shape', shape: [[3,0,1],[2,1,3],[1,0,2]], forward: 0 },
  { name: 'G/B shape', shape: [[5,0,1],[2,1,3],[1,1,4]], forward: 0 },
];
const signature = notes => notes.map(n => `${n.string}:${n.fret}:${n.finger}`).sort().join('|');
const presetSignature = preset => signature(preset.shape.map(([string, fret, finger]) => ({ string, fret, finger })));
const gripCache = new Map();
const chainCache = new Map();
function remember(cache, key, value) {
  if (cache.size >= 512) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
}

export function forwardFinger(base, angles, lengths, side = 1) {
  const joints = [base];
  let pitch = angles.mcp;
  for (let i = 0; i < 3; ++i) {
    if (i === 1) pitch -= angles.pip;
    if (i === 2) pitch -= angles.dip;
    const last = joints.at(-1), reach = Math.cos(pitch) * lengths[i];
    joints.push([last[0] + Math.sin(angles.yaw) * reach, last[1] - Math.cos(angles.yaw) * reach, last[2] + side * Math.sin(pitch) * lengths[i]]);
  }
  return joints;
}

// Expanded neck bounds include the thickness of the bone, not just its axis.
export function clearsNeck(joints, neck, radius = 6) {
  for (let bone = 0; bone < joints.length - 1; ++bone) for (let sample = 0; sample <= 16; ++sample) {
    const [x, y, z] = lerp(joints[bone], joints[bone + 1], sample / 16);
    if (x > neck.left - radius && x < neck.right + radius && y > neck.top - radius && y < neck.bottom + radius && z > neck.back - radius && z < neck.front + radius) return false;
  }
  return true;
}

function segmentDistance(a0,a1,b0,b1) {
  const u=sub(a1,a0), v=sub(b1,b0), w=sub(a0,b0);
  const a=dot(u,u), b=dot(u,v), c=dot(v,v), d=dot(u,w), e=dot(v,w), denominator=a*c-b*b;
  let s=denominator>1e-9 ? clamp((b*e-c*d)/denominator,0,1) : 0;
  let t=c>1e-9 ? (b*s+e)/c : 0;
  if(t<0) {t=0;s=a>1e-9?clamp(-d/a,0,1):0;}
  else if(t>1) {t=1;s=a>1e-9?clamp((b-d)/a,0,1):0;}
  return distance(lerp(a0,a1,s),lerp(b0,b1,t));
}

export function chainsOverlap(first, second, clearance = 12) {
  for(let a=0;a<first.length-1;++a) for(let b=0;b<second.length-1;++b) {
    if(segmentDistance(first[a],first[a+1],second[b],second[b+1]) < clearance) return true;
  }
  return false;
}

function solveChain(base, target, lengths, neck, { barre = false, barreSpan = 0, side = 1, yawLimit = true, yawReference = 0, obstacles = [] } = {}) {
  const delta = target.map((n, i) => n - base[i]);
  const key = JSON.stringify([delta.map(n => +n.toFixed(3)), lengths, barre, side, yawLimit, yawReference]);
  let candidates = chainCache.get(key);
  if (!candidates) {
    candidates = [];
    const reach = Math.hypot(delta[0], delta[1]), height = delta[2] * side;
    const yaw = Math.atan2(delta[0], -delta[1]);
    const [a, b, c] = lengths;
    if (!yawLimit || Math.abs(yaw - yawReference) <= JOINT_LIMITS.yaw[1]) {
      for (const degrees of [0, ...Array.from({length:58}, (_,i) => -105 + i * 2)]) {
        const distal = rad(degrees), u = reach - c * Math.cos(distal), z = height - c * Math.sin(distal);
        const cosine = (u * u + z * z - a * a - b * b) / (2 * a * b);
        if (Math.abs(cosine) > 1) continue;
        const pip = Math.acos(cosine);
        const mcp = Math.atan2(z, u) + Math.atan2(b * Math.sin(pip), a + b * Math.cos(pip));
        const dip = mcp - pip - distal;
        const angles = { yaw, mcp, pip, dip };
        if (Object.entries(angles).some(([name, angle]) => name !== 'yaw' && (angle < JOINT_LIMITS[name][0] || angle > JOINT_LIMITS[name][1]))) continue;
        const cost = (mcp - rad(45)) ** 2 + (pip - rad(barre ? 15 : 65)) ** 2 * 0.25 + (dip - rad(barre ? 0 : 35)) ** 2 * 0.4 + (barre ? distal ** 2 * 5 : 0);
        candidates.push({ angles, cost });
      }
    }
    candidates.sort((a, b) => a.cost - b.cost);
    remember(chainCache, key, candidates);
  }
  for (const candidate of candidates) {
    const joints = forwardFinger(base, candidate.angles, lengths, side);
    if (barre) {
      let covered = 0, flat = true;
      for (let i = 2; i >= 0 && covered < barreSpan; --i) {
        covered += lengths[i];
        if (Math.abs(joints[i][2] - PAD_RADIUS) > 4) flat = false;
      }
      if (!flat) continue;
    }
    if (clearsNeck(joints, neck, side === 1 ? 5 : 6) && !obstacles.some(other => chainsOverlap(joints,other))) return { ...candidate, joints, error: distance(joints[3], target) };
  }
  return null;
}

function fingerView(finger) {
  const pad = [...finger.joints[3]];
  pad[2] -= PAD_RADIUS;
  return { ...finger, points: finger.joints.map(projectHandPoint), base: projectHandPoint(finger.joints[0]), tip: finger.active ? finger.contactPoint ?? projectHandPoint([pad[0], pad[1], 0]) : projectHandPoint(pad), clearance: Math.abs(pad[2]) < 1e-6 ? 0 : Math.max(0, pad[2]), reachable: true, error: finger.error ?? 0 };
}

export function naturalHandPose(notes, layout, window, { next = [], previousPosition } = {}) {
  const usable = list => list.filter(n => !n.dead && !n.uncertain && n.fret >= window.start && n.fret <= window.end && Number.isInteger(n.finger) && n.finger > 0 && n.finger <= 4);
  const possible = usable(notes);
  const contacts = possible.filter(n => !possible.some(other => other.finger === n.finger && other.fret !== n.fret));
  const upcoming = usable(next);
  const anchors = (contacts.length ? contacts : upcoming).map(n => n.fret - n.finger + 1);
  const position = clamp(anchors.length ? median(anchors) : previousPosition ?? window.start, window.start, Math.max(window.start, window.end - 3));
  const firstFret = contacts.length ? Math.min(...contacts.map(n => n.fret)) : position;
  const normalized = contacts.map(n => ({ ...n, fret: n.fret - firstFret }));
  const preset = GRIP_PRESETS.find(p => presetSignature(p) === signature(normalized));
  const direction = layout.mirrored ? 1 : -1, bottom = layout.height - 26;
  const centre = layout.point(1, position + 1.5).x, spread = 30;
  const neck = { left: Math.min(layout.x(105), layout.x(875)), right: Math.max(layout.x(105), layout.x(875)), top: 40, bottom, front: -2, back: -32 };
  const rootOffset = finger => [direction * (2.5 - finger) * spread, -40 + [0,0,-5,0,12][finger], finger === 1 ? 59 : 78];
  const baseFor = (finger, fit) => inFrame(rootOffset(finger), palmFor(fit), fit.yaw);
  const palmFor = fit => [centre + fit.shift, bottom + 66 - fit.forward, -52];
  const metacarpalFor = (finger, fit) => {
    return inFrame([rootOffset(finger)[0], -8, 10], palmFor(fit), fit.yaw);
  };
  const targetsFor = finger => contacts.filter(n => n.finger === finger);
  const targetFor = finger => targetsFor(finger).map(n => layout.point(n.string, n.fret)).sort((a,b) => a.y - b.y)[0];
  const optionsFor = (finger, fit) => ({ yawReference: fit.yaw, barre: targetsFor(finger).length > 1, barreSpan: Math.max(0, ...targetsFor(finger).map(n => layout.y(n.string))) - Math.min(Infinity, ...targetsFor(finger).map(n => layout.y(n.string))) });
  const cacheKey = JSON.stringify([layout.strings, layout.frets, layout.mirrored, signature(contacts.map(n => ({ ...n, fret: n.fret - position }))), preset?.name]);
  let fit = gripCache.get(cacheKey);
  if (!fit) {
    fit = { cost: Infinity, forward: 0, shift: 0, yaw: 0 };
    const aligned = [1,2,3,4].flatMap(finger => targetFor(finger) ? [targetFor(finger).x - centre - rootOffset(finger)[0]] : []);
    const barrePositions = [1,2,3,4].flatMap(finger => targetsFor(finger).length > 1 ? [bottom + 66 + rootOffset(finger)[1] - targetFor(finger).y - BONE_LENGTHS[finger].reduce((a,b) => a+b,0)] : []);
    for (const forward of [...new Set([-64,-48,-32,-18,-16,0,8,16,24,...barrePositions])]) for (const shift of [...new Set([-80,-48,-16,0,16,48,80,...aligned])]) for (const yaw of [-30,-15,0,15,30].map(rad)) {
      const option = { forward, shift, yaw };
      let cost = forward ** 2 * 0.005 + shift ** 2 * 0.001 + yaw ** 2 * 5 + Math.abs(forward - (preset?.forward ?? 0)) * 0.05;
      const occupied = [];
      for (const finger of [1,2,3,4]) {
        const base = baseFor(finger, option);
        if (!clearsNeck([metacarpalFor(finger, option), base], neck, 4)) cost += 10000;
        const target = targetFor(finger);
        if (!target) continue;
        const solution = solveChain(base, [target.x, target.y, PAD_RADIUS], BONE_LENGTHS[finger], neck, { ...optionsFor(finger, option), obstacles: occupied });
        if (solution) occupied.push(solution.joints);
        cost += solution ? solution.cost : 1000;
      }
      if (cost < fit.cost) fit = { ...option, cost };
    }
    remember(gripCache, cacheKey, fit);
  }
  const palm = palmFor(fit);
  const activeSolutions = new Map(), occupied = [];
  for (const finger of [1,2,3,4]) {
    const target = targetFor(finger);
    if (!target) continue;
    const solution = solveChain(baseFor(finger,fit), [target.x,target.y,PAD_RADIUS], BONE_LENGTHS[finger], neck, { ...optionsFor(finger,fit), obstacles: occupied });
    if (solution) { activeSolutions.set(finger,solution); occupied.push(solution.joints); }
  }
  const fingers = [1,2,3,4].map(finger => {
    const base = baseFor(finger, fit), lengths = BONE_LENGTHS[finger];
    const target = targetFor(finger);
    let solution = activeSolutions.get(finger);
    const active = Boolean(solution);
    const anticipation = upcoming.find(n => n.finger === finger);
    let anticipating = false;
    if (!solution && anticipation) {
      const point = layout.point(anticipation.string, anticipation.fret);
      solution = solveChain(base, [point.x, point.y, 65], lengths, neck, { yawReference: fit.yaw, obstacles: occupied });
      anticipating = Boolean(solution);
    }
    if (!solution) {
      for (const mcp of [85,95,75,65]) for (const fan of [5,12,20]) {
        const angles = { yaw: fit.yaw + direction * rad((2.5 - finger) * fan), mcp: rad(mcp), pip: rad(105), dip: rad(60) };
        const joints = forwardFinger(base, angles, lengths);
        if (!solution || (clearsNeck(joints,neck,5) && !occupied.some(other => chainsOverlap(joints,other)))) solution = { angles, joints, error: 0 };
        if (clearsNeck(joints,neck,5) && !occupied.some(other => chainsOverlap(joints,other))) break;
      }
    }
    if (!active) occupied.push(solution.joints);
    return fingerView({ finger, ...solution, lengths, active, anticipating, contactPoint: target, targets: active ? targetsFor(finger) : [], rootOffset: rootOffset(finger), metacarpal: metacarpalFor(finger, fit) });
  });
  const thumbOffset = [direction * 42, -12, 4];
  const thumbBase = inFrame(thumbOffset, palm, fit.yaw);
  const thumbTip = [palm[0] + direction * 10, Math.max(105, thumbBase[1] - 92), -42];
  const thumbLengths = [45,38,30];
  const thumb = solveChain(thumbBase, thumbTip, thumbLengths, neck, { side: -1, yawLimit: false });
  return {
    centre: palm[0], position, direction, fingers, neck,
    grip: { origin: palm, spread, forward: fit.forward, yaw: fit.yaw },
    palm: { x: palm[0], y: palm[1], z: palm[2] },
    wrist: { x: palm[0] + direction * 12, y: palm[1] + 52, z: -52 },
    palmY: projectHandPoint(palm).y, wristY: projectHandPoint([palm[0], palm[1] + 52, -52]).y,
    thumb: null, thumbChain: thumb ? { ...thumb, lengths: thumbLengths, side: -1, rootOffset: thumbOffset } : null,
    contacts: fingers.flatMap(f => f.targets), preset: preset?.name ?? 'Adaptive grip',
    open: notes.length > 0 && notes.every(n => n.fret === 0 && !n.dead),
    constrained: fingers.every((f,i) => clearsNeck(f.joints, neck, 5) && clearsNeck([f.metacarpal,f.joints[0]],neck,4) && !fingers.slice(i+1).some(other => chainsOverlap(f.joints,other.joints))),
  };
}

// Interpolate one palm frame and joint rotations, then rebuild every chain.
// Finger roots and metacarpals remain rigidly attached to that palm.
export function interpolateHandPose(before, after, t) {
  if (!before || t >= 1) return after;
  const palmPoint = lerp(before.grip.origin, after.grip.origin, t);
  const yaw = before.grip.yaw * (1-t) + after.grip.yaw * t;
  const fingers = after.fingers.map((finger, i) => {
    const old = before.fingers[i];
    const base = inFrame(finger.rootOffset, palmPoint, yaw);
    const angles = Object.fromEntries(Object.keys(finger.angles).map(key => [key, old.angles[key] * (1-t) + finger.angles[key] * t]));
    let joints = forwardFinger(base, angles, finger.lengths);
    while (!clearsNeck(joints, after.neck, 5) && angles.mcp < JOINT_LIMITS.mcp[1]) {
      angles.mcp = Math.min(JOINT_LIMITS.mcp[1], angles.mcp + rad(2));
      joints = forwardFinger(base, angles, finger.lengths);
    }
    return fingerView({ ...finger, active: false, angles, joints, metacarpal: inFrame([finger.rootOffset[0], -8, 10], palmPoint, yaw) });
  });
  // A straight blend of two valid grips can still cross the middle/ring
  // fingers. Resolve that path using joint rotations, never bone stretching.
  for (let pass=0;pass<3;++pass) for(let index=0;index<4;++index) {
    const finger=fingers[index], others=fingers.filter((_,i)=>i!==index);
    if(!others.some(other=>chainsOverlap(finger.joints,other.joints))) continue;
    const alternatives=[];
    for(const mcp of [0,5,-5,15,-15,30,-30]) for(const pip of [0,10,-10,25,-25]) for(const fan of [0,5,-5,15,-15,30,-30]) {
      const angles={...finger.angles,mcp:finger.angles.mcp+rad(mcp),pip:finger.angles.pip+rad(pip),yaw:finger.angles.yaw+rad(fan)};
      if(angles.mcp<JOINT_LIMITS.mcp[0]||angles.mcp>JOINT_LIMITS.mcp[1]||angles.pip<0||angles.pip>JOINT_LIMITS.pip[1]||Math.abs(angles.yaw-yaw)>JOINT_LIMITS.yaw[1]) continue;
      alternatives.push({angles,cost:mcp*mcp+pip*pip+fan*fan});
    }
    alternatives.sort((a,b)=>a.cost-b.cost);
    for(const option of alternatives) {
      const joints=forwardFinger(finger.joints[0],option.angles,finger.lengths);
      if(!clearsNeck(joints,after.neck,5)||others.some(other=>chainsOverlap(joints,other.joints))) continue;
      fingers[index]=fingerView({...finger,angles:option.angles,joints});
      break;
    }
  }
  let thumbChain = after.thumbChain;
  if (before.thumbChain && thumbChain) {
    const angles = Object.fromEntries(Object.keys(thumbChain.angles).map(key => [key, before.thumbChain.angles[key] * (1-t) + thumbChain.angles[key] * t]));
    thumbChain = { ...thumbChain, angles, joints: forwardFinger(inFrame(thumbChain.rootOffset, palmPoint, yaw), angles, thumbChain.lengths, -1) };
  }
  return { ...after, fingers, grip: { ...after.grip, origin: palmPoint, yaw }, palm: { x:palmPoint[0], y:palmPoint[1], z:palmPoint[2] }, thumbChain };
}
