import { model } from '@coderline/alphatab';
import { suggestFingering } from './fingering.js';
import { naturalHandPose, GRIP_PRESETS } from './hand-rig.js';
import { fretboardLayout } from './fretboard-layout.js';

export const EXAMPLE_PREFIX = '__tab_forge_hand_example__';
export const EXAMPLE_MARKER = '__TAB_FORGE_HAND__:';

// A fingering variant is independent of its chord shape. Explicit assignments
// are conventional high-string-first arrays: null=open/muted, 0=thumb, 1..4.
// This boundary can support a variant picker without redefining chord pitches.
export function chordFingerExample(chord, { assignments, written = [], variantId = 'example-1' } = {}) {
  const strings = [...chord.strings];
  const notes = strings.flatMap((fret,i) => fret < 0 ? [] : [{ string:i+1, fret, writtenFinger:null }]);
  let conflicting = false;
  for (const hint of written) {
    const note = notes.find(n => n.string === hint.string && n.fret === hint.fret);
    if (!note || !Number.isInteger(hint.finger) || hint.finger < 0 || hint.finger > 4) continue;
    if (note.writtenFinger !== null && note.writtenFinger !== hint.finger) conflicting = true;
    note.writtenFinger = hint.finger;
  }
  if (assignments) {
    if (assignments.length !== strings.length || assignments.some(f => f !== null && (!Number.isInteger(f) || f < 0 || f > 4))) throw new Error('Use one finger assignment per string: null or 0–4.');
    for (const note of notes) if (note.fret > 0) note.writtenFinger = assignments[note.string-1];
  }
  const fretted = notes.filter(note => note.fret > 0);
  const lowestFret = fretted.length ? Math.max(1, Math.min(...fretted.map(note=>note.fret))) : 1;
  const firstFret = fretted.length && Math.max(...fretted.map(note=>note.fret))>5 ? lowestFret : 1;
  const preset=GRIP_PRESETS.find(p=>p.shape.length===fretted.length && p.shape.every(([string,fret,finger])=>
    fretted.some(n=>n.string===string && n.fret-lowestFret===fret && (n.writtenFinger===null || n.writtenFinger===finger))));
  const fingers=preset ? notes.map(note=>({ ...note, finger:note.fret===0?null:preset.shape.find(([string])=>string===note.string)[2], origin:note.writtenFinger!==null?'written':'suggested', uncertain:false })) : suggestFingering([notes])[0] ?? [];
  const layout = fretboardLayout({ strings:strings.length, frets:12, start:firstFret, video:true });
  const pose = naturalHandPose(fingers,layout,{start:firstFret,end:firstFret+11});
  const available = !conflicting && !fingers.some(f=>f.uncertain) && pose.constrained && pose.contacts.length===fretted.length;
  return {
    variant: { id:variantId, origin:assignments?'explicit':written.length?'written':'suggested', assignments:strings.map((_,i)=>fingers.find(n=>n.string===i+1)?.finger ?? null) },
    strings, fingers, layout, pose, available,
  };
}

export function decodeFingerExample(text) {
  if (!text.startsWith(EXAMPLE_MARKER)) return null;
  try {
    const value=JSON.parse(text.slice(EXAMPLE_MARKER.length));
    if (typeof value.name !== 'string' || typeof value.chordId !== 'string' || !Array.isArray(value.strings) || value.strings.length<4 || value.strings.length>8 || value.strings.some(f=>!Number.isInteger(f)||f< -1||f>36)) return null;
    if (!Array.isArray(value.assignments) || value.assignments.length!==value.strings.length || value.assignments.some(f=>f!==null&&(!Number.isInteger(f)||f<0||f>4))) return null;
    return value;
  } catch { return null; }
}

export function removeFingerExamples(score) {
  for(const track of score.tracks) for(const staff of track.staves) {
    for(const bar of staff.bars) for(const voice of bar.voices) for(const beat of voice.beats) {
      if (!beat.chordId?.startsWith(EXAMPLE_PREFIX)) continue;
      const payload=decodeFingerExample(staff.getChord(beat.chordId)?.name ?? '');
      beat.chordId=payload?.chordId ?? null;
    }
    for(const id of staff.chords?.keys() ?? []) if(id.startsWith(EXAMPLE_PREFIX)) staff.chords.delete(id);
  }
}

export function addFingerExamples(score) {
  removeFingerExamples(score);
  let count=0;
  for(const track of score.tracks) for(const staff of track.staves) {
    if(staff.isPercussion || staff.tuning.length<4 || staff.tuning.length>8) continue;
    for(const bar of staff.bars) for(const voice of bar.voices) {
      for(let index=0;index<voice.beats.length;++index) {
        const beat=voice.beats[index], chord=beat.chord;
        if(!chord || chord.strings.length!==staff.tuning.length) continue;
        const written=[];
        for(let j=index;j<voice.beats.length;++j) {
          if(j>index && voice.beats[j].hasChord) break;
          for(const note of voice.beats[j].notes) if(note.leftHandFinger>=0 && note.leftHandFinger<=4) {
            written.push({ string:staff.tuning.length+1-note.string, fret:note.fret, finger:note.leftHandFinger });
          }
        }
        const example=chordFingerExample(chord,{written});
        const payload={ name:chord.name, chordId:beat.chordId, strings:[...chord.strings], assignments:example.variant.assignments, origin:example.variant.origin, variantId:example.variant.id, available:example.available };
        const display=new model.Chord();
        display.name=EXAMPLE_MARKER+JSON.stringify(payload);
        display.strings=[...chord.strings];
        display.showDiagram=false; // Only originals belong in the top chord key.
        const id=EXAMPLE_PREFIX+beat.id;
        staff.addChord(id,display);
        beat.chordId=id;
        ++count;
      }
    }
  }
  return count;
}
