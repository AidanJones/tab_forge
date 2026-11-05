import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { naturalHandPose, interpolateHandPose, clearsNeck, chainsOverlap, JOINT_LIMITS, GRIP_PRESETS } from '../practice/hand-rig.js';
import { fretboardLayout } from '../practice/fretboard-layout.js';
import { BlockHand } from '../practice/block-hand.js';

const layout = leftHanded => fretboardLayout({ strings: 6, frets: 12, start: 1, video: true, leftHanded });
const pose = (notes, leftHanded = false) => naturalHandPose(notes, layout(leftHanded), {start:1,end:12});
const length = (a,b) => Math.hypot(...a.map((n,i) => n-b[i]));
const chord = (preset, fret = 1) => preset.shape.map(([string, offset, finger]) => ({string, fret:fret+offset, finger}));

function checkSkeleton(p) {
  for (const finger of p.fingers) {
    finger.lengths.forEach((expected, i) => assert(Math.abs(length(finger.joints[i], finger.joints[i+1]) - expected) < 1e-6));
    for (const name of ['mcp','pip','dip']) assert(finger.angles[name] >= JOINT_LIMITS[name][0] - 1e-6 && finger.angles[name] <= JOINT_LIMITS[name][1] + 1e-6);
    assert(Math.abs(finger.angles.yaw - p.grip.yaw) <= JOINT_LIMITS.yaw[1] + 1e-6);
    assert(clearsNeck(finger.joints, p.neck, 5), `finger ${finger.finger} penetrates neck`);
    assert(clearsNeck([finger.metacarpal, finger.joints[0]], p.neck, 4));
  }
  for(let a=0;a<4;++a) for(let b=a+1;b<4;++b) assert(!chainsOverlap(p.fingers[a].joints,p.fingers[b].joints), `fingers ${a+1}/${b+1} overlap`);
  assert(p.thumbChain, 'thumb remains attached behind neck');
  assert(clearsNeck(p.thumbChain.joints, p.neck, 6));
  p.thumbChain.lengths.forEach((expected,i) => assert(Math.abs(length(p.thumbChain.joints[i],p.thumbChain.joints[i+1])-expected) < 1e-6));
}

test('common chord families fit one constrained palm and a thumb behind the neck', () => {
  for (const leftHanded of [false,true]) for (const preset of GRIP_PRESETS) {
    const notes = chord(preset), p = pose(notes,leftHanded);
    assert.equal(p.preset, preset.name);
    assert.equal(p.contacts.length, notes.length, preset.name);
    checkSkeleton(p);
  }
});

test('barre presets keep the entire index flat and transpose as one rigid grip', () => {
  const first = pose(chord(GRIP_PRESETS[0])), higher = pose(chord(GRIP_PRESETS[0],5));
  const dx = layout().point(1,5).x-layout().point(1,1).x;
  for (const joint of first.fingers[0].joints) assert(Math.abs(joint[2]-7) < 1e-6);
  for (let finger = 0; finger < 4; ++finger) for (let joint = 0; joint < 4; ++joint) {
    const a = first.fingers[finger].joints[joint], b = higher.fingers[finger].joints[joint];
    assert(Math.abs(b[0]-a[0]-dx) < 1e-6);
    assert(Math.abs(b[1]-a[1]) < 1e-6);
    assert(Math.abs(b[2]-a[2]) < 1e-6);
  }
});

test('slides interpolate palm and joint rotations without stretching bones or detaching roots', () => {
  const before = pose(chord(GRIP_PRESETS[3])), after = pose(chord(GRIP_PRESETS[0],7));
  for (let step = 0; step <= 20; ++step) {
    const p = interpolateHandPose(before,after,step/20);
    checkSkeleton(p);
    for (const finger of p.fingers) {
      assert(Math.abs(length(finger.metacarpal, finger.joints[0]) - length(after.fingers[finger.finger-1].metacarpal,after.fingers[finger.finger-1].joints[0])) < 1e-6);
    }
  }
});

test('rendered Bone hierarchy matches the solver at every joint, including the thumb', () => {
  const p = pose(chord(GRIP_PRESETS[0]));
  const model = new BlockHand();
  model.update(p,0.42);
  model.root.updateMatrixWorld(true);
  assert(new THREE.Box3().setFromObject(model.palm).max.z < p.neck.back);
  const check = (chain,joints) => chain.forEach((bone,i) => {
    assert(bone.isBone);
    const actual = bone.getWorldPosition(new THREE.Vector3());
    const [x,y,z] = joints[i];
    assert(actual.distanceTo(new THREE.Vector3(x,-y,z)) < 1e-6);
  });
  for (const finger of model.fingers) check(finger.chain,p.fingers[finger.finger-1].joints);
  check(model.thumb,p.thumbChain.joints);
});

test('changes between all preset families keep finger chains separated', () => {
  const poses=GRIP_PRESETS.map(p=>pose(chord(p)));
  for(const before of poses) for(const after of poses) for(const t of [0.2,0.4,0.6,0.8]) {
    checkSkeleton(interpolateHandPose(before,after,t));
  }
});
