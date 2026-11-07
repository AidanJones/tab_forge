import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importer, Settings } from '@coderline/alphatab';
import { chordFingerExample, addFingerExamples, decodeFingerExample, EXAMPLE_MARKER, removeFingerExamples } from '../practice/finger-examples.js';
import { scoreForExport } from '../practice/chord-hints.js';
import { fingerExampleCanvas } from '../practice/finger-example-renderer.js';
const C={strings:[0,1,0,2,3,-1]};

test('G/B uses a safe index, ring and little-finger grip',()=>{
  const example=chordFingerExample({strings:[3,3,0,0,2,-1]});
  assert(example.available);
  assert.deepEqual(example.variant.assignments,[4,3,null,null,1,null]);
  assert.equal(example.pose.fingers[1].active,false);
  assert.equal(example.pose.contacts.length,3);
});

test('the same chord supports different finger-assignment variants without changing pitches',()=>{
  const first=chordFingerExample(C);
  const alternate=chordFingerExample(C,{variantId:'alternate',assignments:[null,2,null,3,4,null]});
  assert(first.available);assert(alternate.available);
  assert.deepEqual(first.strings,alternate.strings);
  assert.notDeepEqual(first.variant.assignments,alternate.variant.assignments);
  assert.equal(alternate.variant.id,'alternate');
  for(const example of [first,alternate]) for(const finger of example.pose.fingers) {
    for(let i=0;i<3;++i) assert(Math.abs(Math.hypot(...finger.joints[i].map((v,axis)=>v-finger.joints[i+1][axis]))-finger.lengths[i])<1e-6);
    if(finger.active)for(const target of finger.targets)assert.deepEqual(finger.tip,example.layout.point(target.string,target.fret));
  }
});

test('barre examples use the existing safe grip, and impossible or conflicting examples stay unavailable',()=>{
  const barre=chordFingerExample({strings:[1,1,2,3,3,1]});
  assert(barre.available);
  assert.deepEqual(barre.variant.assignments,[1,1,2,4,3,1]);
  assert(!chordFingerExample({strings:[1,12,0,2,3,-1]}).available);
  assert(!chordFingerExample(C,{written:[{string:2,fret:1,finger:1},{string:2,fret:1,finger:2}]}).available);
});

test('display-only example references preserve authored chord names and written fingers through export cleanup',()=>{
  const settings=new Settings();
  const score=importer.ScoreLoader.loadAlphaTex('\\tuning E4 B3 G3 D3 A2 E2 \\chord ("C" 0 1 0 2 3 x) . 3.5{ch "C"} 2.4 0.3 1.2 |',settings);
  const staff=score.tracks[0].staves[0],beat=staff.bars[0].voices[0].beats[0];
  const original=beat.chordId;
  beat.notes[0].leftHandFinger=4;
  assert.equal(addFingerExamples(score),1);
  const payload=decodeFingerExample(beat.chord.name);
  assert.equal(payload.assignments[4],4);
  assert.equal(payload.origin,'written');
  assert.equal(beat.chord.showDiagram,false);
  const saved=scoreForExport(score,settings).tracks[0].staves[0];
  assert.equal(saved.bars[0].voices[0].beats[0].chord.name,'C');
  assert.equal(saved.bars[0].voices[0].beats[0].notes[0].leftHandFinger,4);
  assert.equal(saved.chords.size,1);
  assert(beat.chord.name.startsWith(EXAMPLE_MARKER));
  removeFingerExamples(score);
  assert.equal(beat.chordId,original);
});

test('the canvas adapter reserves real layout space and uses only validated example payloads',()=>{
  const base={measureText:text=>({width:text.length,height:10})};
  const canvas=fingerExampleCanvas(base);
  const payload={name:'C',chordId:'c',strings:C.strings,assignments:[null,1,null,2,3,null],origin:'suggested',variantId:'one',available:true};
  const measured=canvas.measureText(EXAMPLE_MARKER+JSON.stringify(payload));
  assert(measured.width>150 && measured.height>100);
  assert.deepEqual(canvas.measureText('Lyrics'),{width:6,height:10});
  assert.equal(decodeFingerExample(EXAMPLE_MARKER+'bad JSON'),null);
});
