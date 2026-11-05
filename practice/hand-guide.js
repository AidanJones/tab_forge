// A stylised 2D hand rig. Contact positions come from the same coordinates as
// the note markers; the palm/finger proportions are illustrative, not a 3D model.
export function drawHand(svg, pose, layout, create, appearing) {
  const group = create('g', { class: `hand-overlay${appearing ? ' hand-appearing' : ''}`, 'aria-label': 'Illustrated fretting hand' });
  const skin = '#d7aa81';
  const outline = '#976d4c';
  const c = pose.centre;
  const p = pose.palmY;
  const w = pose.wristY;
  const s = pose.direction;

  // Wrist and palm form a single silhouette below the neck.
  group.append(create('path', {
    d: `M ${c - 47} ${w} L ${c - 57} ${p + 35} Q ${c - 91} ${p + 1} ${c - 72} ${p - 39} Q ${c} ${p - 62} ${c + 72} ${p - 39} Q ${c + 94} ${p + 3} ${c + 58} ${p + 36} L ${c + 47} ${w} Z`,
    fill: skin, stroke: outline, 'stroke-width': 2,
  }));
  group.append(create('path', { d: `M ${c - 43} ${p - 4} Q ${c} ${p + 29} ${c + 42} ${p - 7} M ${c - 27} ${p + 35} Q ${c} ${p + 48} ${c + 32} ${p + 28}`, fill: 'none', stroke: '#b38460', 'stroke-width': 1.5, opacity: 0.65 }));

  const thumb = pose.thumb || { x: c + s * 93, y: layout.height + 17 };
  const thumbPath = `M ${c + s * 52} ${p + 13} Q ${c + s * 117} ${p - 5} ${thumb.x} ${thumb.y}`;
  group.append(create('path', { d: thumbPath, fill: 'none', stroke: outline, 'stroke-width': 28, 'stroke-linecap': 'round' }));
  group.append(create('path', { d: thumbPath, fill: 'none', stroke: skin, 'stroke-width': 24, 'stroke-linecap': 'round', class: 'hand-thumb' }));

  for (const finger of [...pose.fingers].reverse()) {
    const { base, tip } = finger;
    const d = `M ${base.x} ${base.y} C ${base.x} ${base.y - 50}, ${tip.x + s * 5} ${tip.y + 43}, ${tip.x} ${tip.y}`;
    group.append(create('path', { d, fill: 'none', stroke: outline, 'stroke-width': 26, 'stroke-linecap': 'round', opacity: 0.95 }));
    group.append(create('path', {
      d, fill: 'none', stroke: finger.active ? skin : '#cda47f', 'stroke-width': 22, 'stroke-linecap': 'round',
      class: 'hand-finger', 'data-finger': finger.finger, 'data-active': finger.active,
      'data-tip-x': tip.x, 'data-tip-y': tip.y,
    }));
    group.append(create('ellipse', { cx: tip.x, cy: tip.y + 10, rx: 6, ry: 10, fill: '#f4dac1', stroke: '#b58a68', 'stroke-width': 0.8, opacity: 0.7 }));
    // An index barre touches several strings at one fret rather than inventing
    // different fingers for each note in the same barre.
    if (finger.targets.length > 1) {
      const targets = finger.targets.map(note => layout.point(note.string, note.fret));
      group.append(create('line', { class: 'hand-barre', x1: tip.x, x2: tip.x, y1: Math.min(...targets.map(point => point.y)), y2: Math.max(...targets.map(point => point.y)), stroke: skin, 'stroke-width': 20, 'stroke-linecap': 'round', opacity: 0.9 }));
    }
  }
  svg.append(group);
}
