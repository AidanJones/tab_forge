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
// Between audio position events only interpolate briefly; a delayed clock or
// count-in must never let the visual run ahead indefinitely.
export function playAlongTick(state, elapsed = 0) {
  const tick = state.position.currentTick;
  if (!state.playing) return tick;
  const delta = Math.min(120, Math.max(0, elapsed)) * (state.position.tempo || 120) * 960 / 60000 * state.speed / 100;
  const end = state.looping && state.range ? state.range.endTick : state.position.endTick;
  return Math.min(end || tick, tick + delta);
}
