import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importer, exporter, Settings } from '@coderline/alphatab';
import { lessonToAlphaTex } from '../practice/lesson-converter.js';

const doc = (lines, metadata = {}, chords = {}) => ({ metadata, chords, sections: [{ content: lines }] });
const parse = result => importer.ScoreLoader.loadAlphaTex(result.tex, new Settings());

test('lesson converter preserves string, fret, simultaneous groups and chosen rhythm', () => {
  const result = lessonToAlphaTex(doc(['3f1s 0s6', '12f5s + 2f4s']), {}, { tempo: 90, duration: 8 });
  const score = parse(result);
  const beats = score.tracks[0].staves[0].bars[0].voices[0].beats;
  assert.equal(score.tempo, 90);
  assert.equal(result.beatCount, 3);
  assert.equal(result.paddedRests, 5);
  assert.equal(beats[0].notes[0].realValue, 67);
  assert.equal(beats[1].notes[0].realValue, 40);
  assert.deepEqual(beats[2].notes.map(note => note.fret), [12, 2]);
  assert(beats.every(beat => beat.duration === 8));
});

test('custom chords override case-insensitive built-in shapes and preserve muted strings', () => {
  const result = lessonToAlphaTex(doc(['c'], {}, { C: 'x35553' }), { C: [-1, 3, 2, 0, 1, 0] });
  const notes = parse(result).tracks[0].staves[0].bars[0].voices[0].beats[0].notes;
  assert.equal(notes.length, 5);
  assert.equal(notes.find(note => note.string === 6).fret, 3);
});

test('metadata is quoted, playing instructions and lyrics become native score annotations', () => {
  const title = 'Riff "A" \\ 50%';
  const result = lessonToAlphaTex(doc(['note: easy', '"words"', 'A gentle picking pattern', '0s1'], { title }), { A: [-1, 0, 2, 2, 2, 0] });
  assert.equal(parse(result).title, title);
  assert.equal(result.annotations, 2);
  assert.equal(result.beatCount, 1);
  const beat=parse(result).tracks[0].staves[0].bars[0].voices[0].beats[0];
  assert.equal(beat.text,'easy · A gentle picking pattern');
  assert.deepEqual(beat.lyrics,['words']);
  assert.equal(parse(result).tracks[0].staves[0].chords?.size ?? 0,0); // "A gentle..." is prose, not a used A chord.
});

test('fingerpicked phrases retain sections, chord shapes, instructions and lyrics through standard exports',()=>{
  const result=lessonToAlphaTex({metadata:{title:'Fingerpicked lesson'},chords:{C:'x32010',Am:'x02210'},sections:[
    {name:'Verse',chord:'C',content:['note: Play softly; let it ring','"Take your time now"','3f5s 2f4s 0s3 1f2s','0s1 1f2s 0s3 2f4s']},
    {name:'Chorus',chord:'Am',content:['0s5 2f4s','note: Gently','lyrics: Sing these words']},
  ]},{});
  const settings=new Settings(),score=parse(result);
  for(const loaded of [score,importer.ScoreLoader.loadScoreFromBytes(new exporter.Gp7Exporter().export(score,settings),settings),importer.ScoreLoader.loadAlphaTex(new exporter.AlphaTexExporter().exportToString(score,settings),settings)]) {
    const staff=loaded.tracks[0].staves[0];
    assert.equal(loaded.masterBars[0].section.text,'Verse');
    assert.equal(loaded.masterBars[2].section.text,'Chorus');
    assert.deepEqual([...staff.chords.values()].find(chord=>chord.name==='C').strings,[0,1,0,2,3,-1]);
    assert.equal(staff.bars[0].voices[0].beats[0].chord.name,'C');
    assert.equal(staff.bars[1].voices[0].beats[0].chord.name,'C');
    assert.equal(staff.bars[0].voices[0].beats[0].text,'Play softly; let it ring');
    assert.deepEqual(staff.bars[0].voices[0].beats.map(beat=>beat.lyrics?.[0]),['Take','your','time','now']);
    assert.equal(staff.bars[2].voices[0].beats[0].chord.name,'Am');
    assert.equal(staff.bars[2].voices[0].beats[0].text,'Gently');
    assert.deepEqual(staff.bars[2].voices[0].beats.slice(0,2).map(beat=>beat.lyrics?.[0]),['Sing','these words']);
    assert(staff.bars[0].voices[0].beats.every(beat=>beat.notes.length===1));
  }
});

test('shape changes annotate individual notes without adding strummed chords',()=>{
  const result=lessonToAlphaTex(doc(['shape: C','3f5s 2f4s','shape: Am','note: Play softer','0s5 2f4s'],{}, {C:'x32010',Am:'x02210'}),{});
  const beats=parse(result).tracks[0].staves[0].bars[0].voices[0].beats;
  assert.deepEqual(beats.map(b=>b.notes.length),[1,1,1,1]);
  assert.equal(beats[0].chord.name,'C');
  assert.equal(beats[2].chord.name,'Am');
  assert.equal(beats[2].text,'Play softer');
  assert.equal(beats[0].text,null);
  assert.throws(()=>lessonToAlphaTex(doc(['shape: Unknown','0s1']),{}),/Define the shape/);
});

test('higher-position custom shapes place their diagram at the correct first fret',()=>{
  const result=lessonToAlphaTex(doc(['shape: High','7f5s 7f4s'],{}, {High:'x77777'}),{});
  assert.equal([...parse(result).tracks[0].staves[0].chords.values()][0].firstFret,7);
});

test('unsupported tuning and malformed playable notes produce actionable errors', () => {
  assert.throws(() => lessonToAlphaTex(doc(['0s1'], { tuning: 'drop D' }), {}), /tuning/);
  assert.throws(() => lessonToAlphaTex(doc(['3f1s+4f1s']), {}), /same string/);
  assert.throws(() => lessonToAlphaTex(doc(['3f9s']), {}), /Cannot play/);
  assert.throws(() => lessonToAlphaTex(doc(['Q'], {}, { Q: 'x12' }), {}), /six fret/);
  assert.throws(() => lessonToAlphaTex(doc(['note: no music']), {}), /Add a section/);
  assert.throws(() => lessonToAlphaTex(doc(['0s1']), {}, { tempo: 0 }), /tempo/);
});

test('created scores round-trip through GP7 and alphaTex with timing and draft label', () => {
  const result = lessonToAlphaTex(doc(['3f1s 0s6 12f5s+2f4s'], { title: 'Saved lesson' }), {}, { tempo: 95, duration: 8 });
  const settings = new Settings();
  const score = parse(result);
  const gp = new exporter.Gp7Exporter().export(score, settings);
  const tex = new exporter.AlphaTexExporter().exportToString(score, settings);
  const decoded = [importer.ScoreLoader.loadScoreFromBytes(gp, settings), importer.ScoreLoader.loadAlphaTex(tex, settings)];
  for (const loaded of decoded) {
    assert.equal(loaded.title, 'Saved lesson');
    assert.match(loaded.subTitle, /Draft rhythm/);
    assert.equal(loaded.tempo, 95);
    assert.deepEqual(loaded.tracks[0].staves[0].tuning, [64, 59, 55, 50, 45, 40]);
    const beats = loaded.tracks[0].staves[0].bars[0].voices[0].beats;
    assert.equal(beats[0].duration, 8);
    assert.equal(beats[0].notes[0].realValue, 67);
    assert.deepEqual(beats[2].notes.map(note => note.fret), [12, 2]);
  }
});
