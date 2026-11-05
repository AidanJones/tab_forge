import { naturalHandPose } from './hand-rig.js';

export function fretboardLayout({ strings, frets, start, video = false, leftHanded = false }) {
  const width = 920;
  const mirrored = video !== leftHanded;
  const gap = video ? 24 : 34;
  const height = 94 + (strings - 1) * gap;
  const cell = 770 / frets;
  const x = value => mirrored ? width - value : value;
  const y = string => 54 + (video ? strings - string : string - 1) * gap;
  return {
    width, height, gap, cell, mirrored, video, x, y, strings, frets, start,
    point(string, fret) { return { x: x(fret === 0 ? 73 : 105 + (fret - start + (video ? 0.72 : 0.5)) * cell), y: y(string) }; },
  };
}

export function handPose(notes, layout, window, options) {
  return naturalHandPose(notes, layout, window, options);
}
