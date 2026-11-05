// A projected joint rig: one coherent grip, with separate string contact and
// hovering states. Group opacity lets the neck remain readable through it.
const number = n => Number(n.toFixed(2));
const point = p => `${number(p.x)} ${number(p.y)}`;

function centreline(points) {
  const samples = [];
  for (let segment = 0; segment < 3; ++segment) {
    const a = points[Math.max(0, segment - 1)], b = points[segment];
    const c = points[segment + 1], d = points[Math.min(3, segment + 2)];
    for (let step = 0; step < 8; ++step) {
      const t = step / 8;
      const coordinate = key => 0.5 * (2 * b[key] + (-a[key] + c[key]) * t + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t * t + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t * t * t);
      samples.push({ x: coordinate('x'), y: coordinate('y') });
    }
  }
  samples.push(points[3]);
  return samples;
}

function fingerOutline(points, finger) {
  const samples = centreline(points), left = [], right = [];
  samples.forEach((p, i) => {
    const before = samples[Math.max(0, i - 1)], after = samples[Math.min(samples.length - 1, i + 1)];
    const dx = after.x - before.x, dy = after.y - before.y;
    const distance = Math.hypot(dx, dy) || 1;
    const fraction = i / (samples.length - 1);
    const radius = (finger === 4 ? 9 : 11) * (1 - fraction) + 6.5 * fraction;
    left.push({ x: p.x - dy / distance * radius, y: p.y + dx / distance * radius });
    right.push({ x: p.x + dy / distance * radius, y: p.y - dx / distance * radius });
  });
  return `M ${left.map(point).join(' L ')} Q ${point(samples.at(-1))} ${point(right.at(-1))} L ${right.reverse().map(point).join(' L ')} Z`;
}

function animate(node, attribute, before, after, duration, create) {
  if (!duration || before === undefined || before === after) return;
  node.append(create('animate', { attributeName: attribute, from: before, to: after, dur: `${duration}ms`, fill: 'freeze', calcMode: 'spline', keyTimes: '0;1', keySplines: '0.22 0.61 0.36 1' }));
}

function nailOutline(points) {
  const tip = points[3], dip = points[2];
  const dx = tip.x - dip.x, dy = tip.y - dip.y;
  const length = Math.hypot(dx, dy) || 1;
  const cx = tip.x * 0.8 + dip.x * 0.2, cy = tip.y * 0.8 + dip.y * 0.2;
  const curve = angle => ({ x: cx + (-dy / length) * 4.5 * Math.cos(angle) + (dx / length) * 6.5 * Math.sin(angle), y: cy + (dx / length) * 4.5 * Math.cos(angle) + (dy / length) * 6.5 * Math.sin(angle) });
  const derivative = angle => ({ x: (dy / length) * 4.5 * Math.sin(angle) + (dx / length) * 6.5 * Math.cos(angle), y: (-dx / length) * 4.5 * Math.sin(angle) + (dy / length) * 6.5 * Math.cos(angle) });
  let path = `M ${point(curve(0))}`;
  for (let i = 0; i < 4; ++i) {
    const a = i * Math.PI / 2, b = (i + 1) * Math.PI / 2;
    const p = curve(a), q = curve(b), u = derivative(a), v = derivative(b), k = 0.55228475;
    path += ` C ${point({ x: p.x + k * u.x, y: p.y + k * u.y })} ${point({ x: q.x - k * v.x, y: q.y - k * v.y })} ${point(q)}`;
  }
  return `${path} Z`;
}

export function drawHand(svg, pose, layout, create, { previous, duration = 0, opacity = 0.42 } = {}) {
  const group = create('g', { class: 'hand-overlay', opacity, 'aria-label': 'Translucent fretting hand: fingertips press the active strings; other fingers hover.' });
  const skin = '#c7b9a5', outline = '#526d65';
  const definitions = create('defs');
  const skinLight = create('linearGradient', { id: 'hand-skin', x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
  skinLight.append(create('stop', { offset: '0%', 'stop-color': '#9fae9f' }), create('stop', { offset: '40%', 'stop-color': '#e1d5bf' }), create('stop', { offset: '100%', 'stop-color': skin }));
  definitions.append(skinLight);
  group.append(definitions);
  // A neutral thumb braces behind the neck. Written thumb-over hints explicitly
  // bring it onto the visible string plane instead.
  const thumb = pose.thumb;
  if (thumb) group.append(create('ellipse', { class: 'hand-thumb', cx: thumb.x, cy: thumb.y, rx: 9, ry: 13, fill: skin, stroke: outline, 'stroke-width': 1 }));
  // Render closer arches last. Fingers keep their joint lengths and their pads
  // lower onto the strings; idle fingers prepare above the next note's position.
  const order = [...pose.fingers].sort((a, b) => a.joints[1][2] - b.joints[1][2]);
  for (const finger of order) {
    const prior = previous?.fingers.find(item => item.finger === finger.finger);
    const d = fingerOutline(finger.points, finger.finger);
    const shape = create('path', {
      d, fill: 'url(#hand-skin)', stroke: outline, 'stroke-width': 1.3, 'stroke-linejoin': 'round',
      class: 'hand-finger', 'data-finger': finger.finger, 'data-active': finger.active,
      'data-tip-x': finger.tip.x, 'data-tip-y': finger.tip.y, 'data-clearance': finger.joints[3][2],
    });
    if (prior) animate(shape, 'd', fingerOutline(prior.points, prior.finger), d, duration, create);
    group.append(shape);
    const tip = finger.tip;
    const nail = create('path', { class: 'hand-nail', d: nailOutline(finger.points), fill: '#edf0e5', stroke: outline, 'stroke-width': 0.65, opacity: 0.7 });
    if (prior) animate(nail, 'd', nailOutline(prior.points), nailOutline(finger.points), duration, create);
    group.append(nail);
    if (finger.active) group.append(create('ellipse', { class: 'hand-pressure', cx: tip.x, cy: tip.y + 1, rx: 9, ry: 3.5, fill: '#4c8569', opacity: 0.7 }));
    if (finger.targets.length > 1) {
      const targets = finger.targets.map(note => layout.point(note.string, note.fret));
      group.append(create('line', { class: 'hand-barre', x1: tip.x, x2: tip.x, y1: Math.min(...targets.map(point => point.y)), y2: Math.max(...targets.map(point => point.y)), stroke: skin, 'stroke-width': 16, 'stroke-linecap': 'round' }));
    }
  }
  svg.append(group);
}
