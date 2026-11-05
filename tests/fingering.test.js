import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestFingering, fretWindow, noteName } from '../practice/fingering.js';

const note = (string, fret, writtenFinger = -2) => ({ string, fret, writtenFinger });

test('a four-fret run uses a stable hand position and all four fingers', () => {
  const plan = suggestFingering([1, 2, 3, 4].map(fret => [note(1, fret)]));
  assert.deepEqual(plan.map(group => group[0].finger), [1, 2, 3, 4]);
  assert(plan.every(group => group[0].origin === 'suggested'));
});

test('open strings need no finger, and written finger/thumb hints win', () => {
  const [group] = suggestFingering([[note(1, 0, 3), note(5, 3, 4), note(6, 1, 0)]]);
  assert.equal(group[0].finger, null);
  assert.equal(group[0].origin, 'open');
  assert.equal(group[1].finger, 4);
  assert.equal(group[1].origin, 'written');
  assert.equal(group[2].finger, 0);
  assert.equal(group[2].origin, 'written');
});

test('E major and F barre shapes get playable independent fingers and index barre', () => {
  const [e] = suggestFingering([[[6, 0], [5, 2], [4, 2], [3, 1], [2, 0], [1, 0]].map(([string, fret]) => note(string, fret))]);
  assert.deepEqual(e.map(note => note.finger), [null, 2, 3, 1, null, null]);
  const [f] = suggestFingering([[[6, 1], [5, 3], [4, 3], [3, 2], [2, 1], [1, 1]].map(([string, fret]) => note(string, fret))]);
  assert.deepEqual(f.map(note => note.finger), [1, 3, 4, 2, 1, 1]);
});

test('muted notes, harmonics, wide stretches and conflicting hints are not fabricated', () => {
  const [wide] = suggestFingering([[note(1, 1), note(2, 10, 4)]]);
  assert.equal(wide[0].finger, null);
  assert(wide[0].uncertain);
  assert.equal(wide[1].finger, 4);
  const [special] = suggestFingering([[{ ...note(1, 3), dead: true }, { ...note(2, 12), harmonic: true }]]);
  assert.equal(special[0].origin, 'muted');
  assert.equal(special[1].finger, null);
  assert(special[1].uncertain);
  const [conflict] = suggestFingering([[note(1, 2, 1), note(2, 3, 1)]]);
  assert(conflict.every(note => note.finger === 1 && note.uncertain));
});

test('empty groups and rest passages are supported without losing position continuity', () => {
  assert.deepEqual(suggestFingering([]), []);
  const result = suggestFingering([[note(1, 5)], [], [note(1, 7)], [note(1, 8)]]);
  assert.deepEqual(result.map(group => group[0]?.finger ?? null), [1, null, 3, 4]);
});

test('fret windows include high positions, and pitch labels handle octaves', () => {
  assert.deepEqual(fretWindow([note(1, 0)]), { start: 1, end: 12 });
  assert.deepEqual(fretWindow([note(1, 15), note(2, 17)]), { start: 14, end: 25 });
  assert.equal(noteName(64, true), 'E4');
  assert.equal(noteName(61), 'C♯');
});
