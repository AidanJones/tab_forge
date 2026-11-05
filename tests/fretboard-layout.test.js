import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fretboardLayout, handPose } from '../practice/fretboard-layout.js';

const video = () => fretboardLayout({ strings: 6, frets: 12, start: 1, video: true });

test('video view puts high E at the bottom, fret 12 on the left and open strings on the right', () => {
  const layout = video();
  assert(layout.point(1, 3).y > layout.point(6, 3).y);
  assert(layout.point(1, 12).x < layout.point(1, 1).x);
  assert(layout.point(1, 1).x < layout.point(1, 0).x);
  const mirrored = fretboardLayout({ strings: 4, frets: 12, start: 1, video: true, leftHanded: true });
  assert(mirrored.point(1, 3).y > mirrored.point(4, 3).y);
  assert(mirrored.point(1, 12).x > mirrored.point(1, 0).x);
});

test('hand fingertips use exactly the fretboard contact coordinates, including barres', () => {
  const layout = video();
  const notes = [{ string: 1, fret: 1, finger: 1 }, { string: 6, fret: 1, finger: 1 }, { string: 3, fret: 2, finger: 2 }];
  const pose = handPose(notes, layout, { start: 1, end: 12 });
  const index = pose.fingers.find(finger => finger.finger === 1);
  assert.equal(index.targets.length, 2);
  assert.deepEqual(index.tip, layout.point(6, 1));
  assert.deepEqual(pose.fingers[1].tip, layout.point(3, 2));
  assert.equal(pose.fingers[2].active, false);
});

test('open strings, unknown fingers and conflicting hints never invent a hand contact', () => {
  const layout = video();
  const pose = handPose([{ string: 1, fret: 0, finger: null }], layout, { start: 1, end: 12 });
  assert(pose.open);
  assert.equal(pose.contacts.length, 0);
  const conflict = handPose([{ string: 1, fret: 1, finger: 1 }, { string: 2, fret: 3, finger: 1 }, { string: 3, fret: 9, finger: 4, uncertain: true }], layout, { start: 1, end: 12 });
  assert.equal(conflict.contacts.length, 0);
});
