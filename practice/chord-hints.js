import { model } from '@coderline/alphatab';
import { CHORD_LIBRARY } from './chord-library.js';
import { removeFingerExamples } from './finger-examples.js';

const PREFIX = '__tab_forge_shape_hint__';
const STANDARD = [64,59,55,50,45,40];

// Shape matching, not harmonic analysis. A bar must describe one unambiguous
// fixed grip across at least three strings, with two fretted strings observed.
export function inferBarShape(staff, bar) {
  if (staff.isPercussion || staff.tuning.length !== 6) return null;
  const observed = new Map();
  for (const voice of bar.voices) for (const beat of voice.beats) for (const note of beat.notes) {
    if (note.isDead || note.isTieDestination || note.harmonicType || note.isPiano || note.bendType || note.slideInType || note.slideOutType) return null;
    const string = staff.tuning.length + 1 - note.string;
    if (observed.has(string) && observed.get(string) !== note.fret) return null;
    observed.set(string,note.fret);
  }
  if (observed.size < 3 || [...observed.values()].filter(fret=>fret>0).length < 2) return null;
  const candidates = new Map();
  for (const [id,chord] of staff.chords ?? []) {
    if (!id.startsWith(PREFIX) && chord.strings.length===6) candidates.set(chord.strings.join(','),{name:chord.name,strings:chord.strings});
  }
  if (staff.tuning.every((pitch,i)=>pitch===STANDARD[i])) {
    for (const [name,frets] of Object.entries(CHORD_LIBRARY)) {
      const strings=[...frets].reverse();
      if(!candidates.has(strings.join(','))) candidates.set(strings.join(','),{name,strings});
    }
  }
  const matches=[...candidates.values()].filter(chord=>[...observed].every(([string,fret])=>chord.strings[string-1]===fret));
  return matches.length===1 ? matches[0] : null;
}

export function removeSuggestedShapes(score) {
  removeFingerExamples(score);
  for(const track of score.tracks) for(const staff of track.staves) {
    for(const bar of staff.bars) for(const voice of bar.voices) for(const beat of voice.beats) {
      if(beat.chordId?.startsWith(PREFIX)) beat.chordId=null;
    }
    for(const id of staff.chords?.keys() ?? []) if(id.startsWith(PREFIX)) staff.chords.delete(id);
  }
}

export function addSuggestedShapes(score) {
  removeSuggestedShapes(score);
  let count=0;
  for(const track of score.tracks) for(const staff of track.staves) for(const bar of staff.bars) {
    const beats=bar.voices.flatMap(voice=>voice.beats);
    if(beats.some(beat=>beat.chordId)) continue; // Authored chord changes always win.
    const candidate=inferBarShape(staff,bar);
    const first=beats.find(beat=>beat.notes.length);
    if(!candidate || !first) continue;
    const id=`${PREFIX}${track.index}_${staff.index}_${bar.index}`;
    const chord=new model.Chord();
    chord.name=`${candidate.name} shape (suggested)`;
    chord.strings=[...candidate.strings];
    const fretted=chord.strings.filter(fret=>fret>0);
    chord.firstFret=fretted.length && Math.min(...fretted)>3 ? Math.min(...fretted) : 1;
    staff.addChord(id,chord);
    first.chordId=id;
    ++count;
  }
  return count;
}

export function scoreForExport(score, settings) {
  const copy=model.JsonConverter.jsObjectToScore(model.JsonConverter.scoreToJsObject(score),settings);
  removeSuggestedShapes(copy);
  return copy;
}
