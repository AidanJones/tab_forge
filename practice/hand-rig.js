// Three-dimensional joint positions projected onto the two-dimensional neck.
// z is distance above the strings: a pressed fingertip has z=0; resting fingers
// retain clearance. Fixed phalanx lengths prevent the old rubber-finger curves.
const LENGTHS = { 1: [86, 60, 32], 2: [94, 66, 34], 3: [88, 61, 32], 4: [70, 49, 28] };
const add = (a, b) => a.map((n, i) => n + b[i]);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const mul = (a, n) => a.map(value => value * n);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const length = a => Math.hypot(...a);
const unit = a => mul(a, 1 / (length(a) || 1));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export const projectHandPoint = ([x, y, z]) => ({ x, y: y - z * 0.6 });

function solveFinger(base, tip, lengths) {
  const [proximal, middle, distal] = lengths;
  const reach = length(sub(base, tip)) / (proximal + middle + distal);
  const blend = clamp((reach - 0.38) / 0.45, 0, 1);
  const toward = unit([base[0] - tip[0], base[1] - tip[1], 0]);
  const curled = [0, -0.6, 0.8];
  const extended = [toward[0] * 0.91, toward[1] * 0.91, 0.415];
  let direction = unit(add(mul(curled, 1 - blend), mul(extended, blend)));
  let dip = add(tip, mul(direction, distal));
  if (length(sub(dip, base)) < Math.abs(proximal - middle) + 2) {
    direction = unit(sub(tip, base));
    dip = add(tip, mul(direction, distal));
  }
  const delta = sub(dip, base);
  const distance = length(delta);
  const axis = unit(delta);
  // The bend pole points away from the strings. Fingers arch upwards instead
  // of bending sideways across neighbouring fingers in the screen plane.
  const pole = [0, -0.15, 1];
  const bend = unit(sub(pole, mul(axis, dot(pole, axis))));
  const along = clamp((proximal ** 2 - middle ** 2 + distance ** 2) / (2 * (distance || 1)), -proximal, proximal);
  const rise = Math.sqrt(Math.max(0, proximal ** 2 - along ** 2));
  const pip = add(add(base, mul(axis, along)), mul(bend, rise));
  const joints = [base, pip, dip, tip];
  const error = Math.abs(length(sub(pip, dip)) - middle);
  return { joints, reachable: error < 1, lengths, error };
}

export function naturalHandPose(notes, layout, window, { next = [], previousPosition } = {}) {
  const usable = list => list.filter(note => !note.dead && !note.uncertain && note.fret >= window.start && note.fret <= window.end && Number.isInteger(note.finger) && note.finger >= 0 && note.finger <= 4);
  const candidates = usable(notes);
  const contacts = candidates.filter(note => !candidates.some(other => other.finger === note.finger && other.fret !== note.fret));
  const upcoming = usable(next);
  const anchors = list => list.filter(note => note.finger > 0).map(note => note.fret - note.finger + 1);
  const currentAnchors = anchors(contacts);
  const nextAnchors = anchors(upcoming);
  const position = clamp(currentAnchors.length ? median(currentAnchors) : nextAnchors.length ? median(nextAnchors) : previousPosition ?? window.start, window.start, Math.max(window.start, window.end - 3));
  const direction = layout.mirrored ? 1 : -1;
  const centre = clamp(layout.point(1, position + 1.5).x, 110, 810);
  const bottom = layout.height - 26;
  const spread = clamp(layout.cell * 0.5, 24, 34);
  const baseFor = (finger, forward = 0, shift = 0) => [centre + direction * (2.5 - finger) * spread + shift, bottom + 26 + [0, 0, -5, 0, 12][finger] - forward, 28];
  const targetsFor = finger => contacts.filter(note => note.finger === finger);
  const targetFor = finger => targetsFor(finger).map(note => ({ ...layout.point(note.string, note.fret), note })).sort((a, b) => a.y - b.y)[0];

  // Move/roll the whole grip towards the neck for low-string reaches. Palm
  // placement changes coherently; individual fingers never gain extra length.
  let fit = { cost: Infinity, forward: 0, shift: 0 };
  for (const forward of [0, 8, 16, 24, 32, 40, 48, 56, 64]) for (const shift of [-16, 0, 16]) {
    let cost = forward ** 2 * 0.008 + shift ** 2 * 0.02;
    for (const finger of [1, 2, 3, 4]) {
      const target = targetFor(finger);
      if (!target) continue;
      const base = baseFor(finger, forward, shift);
      const reach = length(sub(base, [target.x, target.y, 0]));
      const maximum = LENGTHS[finger].reduce((a, b) => a + b, 0) - 10;
      cost += Math.max(0, reach - maximum) ** 2 * 25;
      cost += solveFinger(base, [target.x, target.y, 0], LENGTHS[finger]).error ** 2 * 20;
    }
    if (cost < fit.cost) fit = { cost, forward, shift };
  }
  const fingers = [1, 2, 3, 4].map(finger => {
    const target = targetFor(finger);
    const anticipation = upcoming.find(note => note.finger === finger);
    const base = baseFor(finger, fit.forward, fit.shift);
    // Resting fingers form a loose grip close to the hand, rather than splaying
    // to four widely spaced fret columns as if every finger were playing.
    const relaxed = { x: base[0] - direction * 10, y: layout.y(1.7 + finger * 0.12) };
    const resting = anticipation ? layout.point(anticipation.string, anticipation.fret) : relaxed;
    let solution = solveFinger(base, target ? [target.x, target.y, 0] : [resting.x, resting.y, 23], LENGTHS[finger]);
    const active = Boolean(target && solution.reachable);
    if (target && !active) solution = solveFinger(base, [resting.x, resting.y, 26], LENGTHS[finger]);
    if (!solution.reachable) solution = solveFinger(base, [relaxed.x, relaxed.y, 23], LENGTHS[finger]);
    return {
      finger, ...solution, points: solution.joints.map(projectHandPoint),
      base: projectHandPoint(base), tip: projectHandPoint(solution.joints[3]),
      active, targets: active ? targetsFor(finger) : [], anticipating: Boolean(!active && anticipation),
    };
  });
  const palmCentre = centre + fit.shift;
  const palm = { x: palmCentre, y: bottom + 66 - fit.forward, z: 24 };
  const wrist = { x: palmCentre + direction * 18, y: bottom + 140 - fit.forward * 0.4, z: 18 };
  const thumbNote = contacts.find(note => note.finger === 0);
  return {
    centre: palmCentre, position, direction, fingers, palm, wrist,
    palmY: projectHandPoint([palm.x, palm.y, palm.z]).y, wristY: projectHandPoint([wrist.x, wrist.y, wrist.z]).y,
    thumb: thumbNote ? layout.point(thumbNote.string, thumbNote.fret) : null,
    contacts: [...fingers.flatMap(finger => finger.targets), ...contacts.filter(note => note.finger === 0)],
    open: notes.length > 0 && notes.every(note => note.fret === 0 && !note.dead),
  };
}
