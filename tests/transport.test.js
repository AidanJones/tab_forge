import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speedPercent, snapRangeToBars, rangeForBars, sameRange } from '../practice/transport.js';

const bars = [
  { start: 0, end: 3840, number: 1 },
  { start: 3840, end: 7680, number: 2 },
  { start: 7680, end: 11520, number: 1 }, // Repeat in playback order.
];

test('speed obeys limits, five-percent steps and safe fallback', () => {
  assert.equal(speedPercent(0), 25);
  assert.equal(speedPercent(500), 150);
  assert.equal(speedPercent('50'), 50);
  assert.equal(speedPercent(54), 55);
  assert.equal(speedPercent(NaN), 100);
});

test('bar snapping treats the end as exclusive and respects repeats', () => {
  assert.deepEqual(snapRangeToBars({ startTick: 960, endTick: 3840 }, bars), { startTick: 0, endTick: 3840 });
  assert.deepEqual(snapRangeToBars({ startTick: 4000, endTick: 8000 }, bars), { startTick: 3840, endTick: 11520 });
  assert.equal(snapRangeToBars(null, bars), null);
  assert.deepEqual(rangeForBars(bars, 2, 2), { startTick: 7680, endTick: 11520 });
  assert.throws(() => rangeForBars(bars, 2, 0), /end bar/);
  assert.throws(() => rangeForBars(bars, -1, 2), /end bar/);
  assert(sameRange({ startTick: 0, endTick: 3840 }, snapRangeToBars({ startTick: 1, endTick: 3000 }, bars)));
});
