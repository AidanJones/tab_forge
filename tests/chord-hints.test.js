import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importer, Settings } from '@coderline/alphatab';
import { inferBarShape, addSuggestedShapes, removeSuggestedShapes, scoreForExport } from '../practice/chord-hints.js';
const settings=new Settings();
const load=body=>importer.ScoreLoader.loadAlphaTex(`\\tuning E4 B3 G3 D3 A2 E2 . ${body}`,settings);

test('a clear fingerpicked C grip gets a labelled visual hint without adding played notes',()=>{
  const score=load('3.5 2.4 0.3 1.2 |'),staff=score.tracks[0].staves[0];
  assert.equal(inferBarShape(staff,staff.bars[0]).name,'C');
  const before=staff.bars[0].voices[0].beats.map(b=>b.notes.map(n=>n.realValue));
  assert.equal(addSuggestedShapes(score),1);
  assert.match(staff.bars[0].voices[0].beats[0].chord.name,/C shape \(suggested\)/);
  assert.deepEqual(staff.bars[0].voices[0].beats.map(b=>b.notes.map(n=>n.realValue)),before);
  assert.equal(addSuggestedShapes(score),1);
  assert.equal(staff.chords.size,1);
  removeSuggestedShapes(score);
  assert.equal(staff.bars[0].voices[0].beats[0].chordId,null);
  assert.equal(staff.chords.size,0);
});

test('ambiguous fragments, moving frets and sparse passages do not invent a chord grip',()=>{
  for(const body of ['2.4 1.2 0.1 r |','3.5 2.5 0.3 1.2 |','3.5 3.5 3.5 3.5 |']) {
    const score=load(body);
    assert.equal(addSuggestedShapes(score),0);
  }
  const alternate=load('3.5 2.4 0.3 1.2 |');
  alternate.tracks[0].staves[0].stringTuning.tunings[5]=38;
  assert.equal(addSuggestedShapes(alternate),0);
});

test('written chord changes win and suggestions stay out of exports without changing the displayed score',()=>{
  const score=load('\\chord ("C" 0 1 0 2 3 x) 3.5{ch "C" txt "Softly" lyrics "Take"} 2.4 0.3 1.2 | 3.5 2.4 0.3 1.2 |');
  const staff=score.tracks[0].staves[0],written=staff.bars[0].voices[0].beats[0].chordId;
  assert.equal(addSuggestedShapes(score),1);
  assert.equal(staff.bars[0].voices[0].beats[0].chordId,written);
  const exported=scoreForExport(score,settings).tracks[0].staves[0];
  assert.equal(exported.bars[0].voices[0].beats[0].chord.name,'C');
  assert.equal(exported.bars[0].voices[0].beats[0].text,'Softly');
  assert.deepEqual(exported.bars[0].voices[0].beats[0].lyrics,['Take']);
  assert.equal(exported.bars[1].voices[0].beats[0].chordId,null);
  assert.equal(exported.chords.size,1);
  assert.match(staff.bars[1].voices[0].beats[0].chord.name,/suggested/);
});
