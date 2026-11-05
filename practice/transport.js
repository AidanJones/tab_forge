export function speedPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(150, Math.max(25, Math.round(number / 5) * 5)) : 100;
}

export function sameRange(a, b) {
  return a === b || Boolean(a && b && a.startTick === b.startTick && a.endTick === b.endTick);
}

// alphaTab's tick cache follows playback order, including repeated bars.
// The end tick is exclusive, so a selection ending on a boundary does not
// accidentally include the next bar.
export function snapRangeToBars(range, bars) {
  if (!range || !bars.length) return range;
  const overlapping = bars.filter(bar => bar.start < range.endTick && bar.end > range.startTick);
  if (!overlapping.length) return range;
  return { startTick: overlapping[0].start, endTick: overlapping.at(-1).end };
}

export function rangeForBars(bars, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || !bars[from] || !bars[to] || from > to) {
    throw new Error('Choose an end bar at or after the start bar.');
  }
  return { startTick: bars[from].start, endTick: bars[to].end };
}

export function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function isTypingTarget(target) {
  return Boolean(target?.closest('input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"])'));
}
