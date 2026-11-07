import { decodeFingerExample } from './finger-examples.js';

// Use alphaTab's generated playback order: a repeated bar has a new start tick.
// Nothing here schedules audio or changes the source score.
export function playAlongTimeline(track, cache, fingerPlan = new WeakMap()) {
  const staff = track?.staves.find(s => s.tuning.length && !s.isPercussion);
  if (!staff || !cache) return { events: [], bars: [], tuning: [], unavailable: 'Choose a fretted guitar or bass track for Play-along.' };
  const events = [], bars = [];
  for (const occurrence of cache.masterBars) {
    const bar = staff.bars[occurrence.masterBar.index];
    bars.push({ start: occurrence.start, end: occurrence.end, number: occurrence.masterBar.index + 1 });
    for (const voice of bar?.voices ?? []) for (const beat of voice.beats) {
      if (beat.isEmpty) continue;
      const range = cache.getRelativeBeatPlaybackRange(beat);
      if (!range) continue;
      const start = occurrence.start + range.startTick;
      const end = occurrence.start + range.endTick;
      const chord = beat.chord;
      events.push({ start, end, bar: occurrence.masterBar.index + 1,
        chord: decodeFingerExample(chord?.name ?? '')?.name ?? chord?.name ?? '',
        text: beat.text ?? '', rest: beat.isRest,
        direction: beat.brushType ? ([1,3].includes(beat.brushType) ? 'up' : 'down') : beat.pickStroke === 1 ? 'up' : beat.pickStroke === 2 ? 'down' : '',
        notes: beat.notes.filter(n => n.string > 0 && n.string <= staff.tuning.length).map(n => ({
          string: staff.tuning.length + 1 - n.string, fret: n.fret,
          finger: fingerPlan.get(n)?.finger ?? (n.leftHandFinger >= 0 ? n.leftHandFinger : null),
          tied: n.isTieDestination, dead: n.isDead,
          technique: n.isHammerPullDestination ? 'H/P' : n.isHarmonic ? '◇' : '',
        })),
      });
    }
  }
  events.sort((a,b) => a.start-b.start);
  return { events, bars, tuning: [...staff.tuning], capo: staff.capo };
}

