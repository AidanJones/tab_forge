import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importer, exporter, Settings } from '@coderline/alphatab';
import { DEMO } from '../practice/demo.js';
import { readFileSync } from 'node:fs';

function summary(score) {
  return {
    title: score.title,
    tempo: score.tempo,
    bars: score.masterBars.map(bar => [bar.timeSignatureNumerator, bar.timeSignatureDenominator]),
    tracks: score.tracks.map(track => ({
      name: track.name,
      staves: track.staves.map(staff => ({
        tuning: staff.tuning, capo: staff.capo,
        bars: staff.bars.map(bar => bar.voices.map(voice => voice.beats.map(beat => ({
          duration: beat.duration, dots: beat.dots,
          notes: beat.notes.map(note => [note.string, note.fret, note.realValue]),
        })))),
      })),
    })),
  };
}

test('original demo has correct standard tuning, low-E start, timing and bass', () => {
  const score = importer.ScoreLoader.loadAlphaTex(DEMO, new Settings());
  assert.equal(score.masterBars.length, 4);
  assert.deepEqual(score.tracks.map(track => track.name), ['Guitar', 'Bass']);
  assert.deepEqual(score.tracks[0].staves[0].tuning, [64, 59, 55, 50, 45, 40]);
  const first = score.tracks[0].staves[0].bars[0].voices[0].beats[0];
  assert.equal(first.duration, 4);
  assert.equal(first.notes[0].realValue, 40);
  // alphaTex uses high-to-low string numbering; Score.Note uses low-to-high.
  assert.equal(first.notes[0].string, 1);
});

test('GP7 demo export and re-import preserves musical content across tracks', () => {
  const settings = new Settings();
  const original = importer.ScoreLoader.loadAlphaTex(DEMO, settings);
  const bytes = new exporter.Gp7Exporter().export(original, settings);
  const loaded = importer.ScoreLoader.loadScoreFromBytes(bytes, settings);
  assert.deepEqual(summary(loaded), summary(original));
});

test('invalid imported binary is rejected by the real alphaTab importer', () => {
  assert.throws(() => importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode('not a guitar pro file'), new Settings()));
});

for (const extension of ['gp4', 'gp5']) {
  test(`original ${extension} fixture imports with correct frets, rhythm and pitch`, () => {
    const bytes = readFileSync(new URL(`./fixtures/original-four-notes.${extension}`, import.meta.url));
    const score = importer.ScoreLoader.loadScoreFromBytes(bytes, new Settings());
    assert.equal(score.title, 'Original four notes');
    const beats = score.tracks[0].staves[0].bars[0].voices[0].beats;
    assert.deepEqual(beats.map(beat => beat.notes[0].fret), [0, 2, 3, 0]);
    assert(beats.every(beat => beat.duration === 4));
    assert.equal(beats[0].notes[0].realValue, 40);
  });
}
