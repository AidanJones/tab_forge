export function fretboardLayout({ strings, frets, start, video = false, leftHanded = false }) {
  const width = 920;
  const mirrored = video !== leftHanded;
  const gap = 34;
  const height = 60 + strings * gap;
  const cell = 770 / frets;
  const x = value => mirrored ? width - value : value;
  const y = string => 54 + (video ? strings - string : string - 1) * gap;
  return {
    width, height, gap, cell, mirrored, video, x, y,
    point(string, fret) { return { x: x(fret === 0 ? 73 : 105 + (fret - start + 0.5) * cell), y: y(string) }; },
  };
}

export function handPose(notes, layout, { start, end }) {
  const possible = notes.filter(note => !note.dead && !note.uncertain && note.fret >= start && note.fret <= end && note.finger !== null && note.finger >= 0 && note.finger <= 4);
  const contacts = possible.filter(note => !possible.some(other => other.finger === note.finger && other.fret !== note.fret));
  const points = contacts.map(note => layout.point(note.string, note.fret));
  const centre = Math.max(145, Math.min(775, points.length ? points.reduce((sum, point) => sum + point.x, 0) / points.length : layout.point(1, 2).x));
  const bottom = layout.height - 26;
  const direction = layout.mirrored ? 1 : -1;
  const fingers = [1, 2, 3, 4].map(finger => {
    const targets = contacts.filter(note => note.finger === finger);
    const target = targets.map(note => ({ ...layout.point(note.string, note.fret), note })).sort((a, b) => a.y - b.y)[0];
    const base = { x: centre + direction * (2.5 - finger) * 37, y: bottom + 82 };
    const tip = target || { x: base.x + direction * 5, y: bottom + 24 + (finger === 4 ? 15 : 0) };
    return { finger, base, tip: { x: tip.x, y: tip.y }, active: Boolean(target), targets };
  });
  const thumbNote = contacts.find(note => note.finger === 0);
  return {
    centre, palmY: bottom + 108, wristY: bottom + 190, direction, fingers,
    thumb: thumbNote ? layout.point(thumbNote.string, thumbNote.fret) : null,
    contacts,
    open: notes.length > 0 && notes.every(note => note.fret === 0 && !note.dead),
  };
}
