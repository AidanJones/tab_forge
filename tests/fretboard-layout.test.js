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

test('finger bones retain their lengths across string reaches and mirrored grips', () => {
  for (const leftHanded of [false, true]) {
    const layout = fretboardLayout({ strings: 6, frets: 12, start: 1, video: true, leftHanded });
    for (let string = 1; string <= 6; ++string) for (let finger = 1; finger <= 4; ++finger) {
      const pose = handPose([{ string, fret: finger, finger }], layout, { start: 1, end: 12 });
      const pressed = pose.fingers[finger - 1];
      assert(pressed.active, `string ${string}, finger ${finger}`);
      assert(Math.abs(pressed.joints[3][2] - 7) < 1e-6);
      for (const part of pose.fingers) {
        assert(part.reachable);
        part.lengths.forEach((expected, i) => {
          const actual = Math.hypot(...part.joints[i].map((value, axis) => value - part.joints[i + 1][axis]));
          assert(Math.abs(actual - expected) < 1);
        });
        if (!part.active) assert(part.joints[3][2] > 0);
      }
    }
  }
});

test('unused fingers prepare above the next string without claiming contact', () => {
  const layout = video();
  const pose = handPose([{ string: 1, fret: 1, finger: 1 }], layout, { start: 1, end: 12 }, { next: [{ string: 2, fret: 2, finger: 2 }] });
  const middle = pose.fingers[1];
  assert(middle.anticipating);
  assert.equal(middle.active, false);
  assert(Math.abs(middle.joints[3][0] - layout.point(2, 2).x) < 1e-6);
  assert(Math.abs(middle.joints[3][1] - layout.point(2, 2).y) < 1e-6);
  assert(middle.joints[3][2] > 0);
  assert.equal(pose.contacts.length, 1);
});
