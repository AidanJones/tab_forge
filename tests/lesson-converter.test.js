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

test('metadata is quoted, lesson annotations are retained outside the musical stream', () => {
  const title = 'Riff "A" \\ 50%';
  const result = lessonToAlphaTex(doc(['note: easy', '"words"', 'A gentle picking pattern', '0s1'], { title }), { A: [-1, 0, 2, 2, 2, 0] });
  assert.equal(parse(result).title, title);
  assert.equal(result.annotations, 1);
  assert.equal(result.beatCount, 1);
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
