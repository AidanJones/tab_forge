import { CHORD_LIBRARY } from './chord-library.js';
export const STANDARD_TUNING = [64,59,55,50,45,40];
export const ROOTS = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const SCALES = {
  major: { name:'Major', intervals:[0,2,4,5,7,9,11] },
  minor: { name:'Natural minor', intervals:[0,2,3,5,7,8,10] },
  majorPentatonic: { name:'Major pentatonic', intervals:[0,2,4,7,9] },
  minorPentatonic: { name:'Minor pentatonic', intervals:[0,3,5,7,10] },
  blues: { name:'Blues', intervals:[0,3,5,6,7,10] },
  harmonicMinor: { name:'Harmonic minor', intervals:[0,2,3,5,7,8,11] },
  dorian: { name:'Dorian', intervals:[0,2,3,5,7,9,10] },
  mixolydian: { name:'Mixolydian', intervals:[0,2,4,5,7,9,10] },
  chromatic: { name:'Chromatic', intervals:[0,1,2,3,4,5,6,7,8,9,10,11] },
};

export function chordExercise(name) {
  const frets = CHORD_LIBRARY[name];
  if (!frets) throw new Error('Choose a supported chord.');
  return frets.flatMap((fret, i) => fret < 0 ? [] : [{ string:6-i, fret, midi:STANDARD_TUNING[5-i]+fret }]);
}

export function scaleExercise(root = 0, type = 'major', direction = 'both') {
  if (!Number.isInteger(root) || root < 0 || root > 11 || !SCALES[type] || !['up','down','both'].includes(direction)) throw new Error('Choose a scale, key and direction.');
  const base = (root - 4 + 12) % 12;
  const start = 40 + base;
  const ascending = [];
  for (let midi=start; midi<=start+24; ++midi) {
    if (!SCALES[type].intervals.includes((midi-start)%12)) continue;
    // A five-fret position spans all pitches between adjacent strings.
    for (let string=6; string>=1; --string) {
      const fret=midi-STANDARD_TUNING[string-1];
      if (fret>=base && fret<=base+4) { ascending.push({string,fret,midi}); break; }
    }
  }
  const notes=direction==='up' ? ascending : direction==='down' ? [...ascending].reverse() : [...ascending,...ascending.slice(0,-1).reverse()];
  const title=`${ROOTS[root]} ${SCALES[type].name.toLowerCase()} · ${direction==='both'?'up and down':direction}`;
  const texNotes=notes.map(n=>`${n.fret}.${n.string}`);
  const bars=[];
  for(let i=0;i<texNotes.length;i+=4) bars.push([...texNotes.slice(i,i+4),...Array((4-texNotes.slice(i,i+4).length)%4).fill('r')].join(' '));
  return { title, notes, base,
    tex:`\\title ${JSON.stringify(title)} \\artist "tab_forge scale trainer" \\tempo 80 . \\tuning E4 B3 G3 D3 A2 E2 \\ts 4 4 :4 ${bars.join(' | ')} |`,
    lesson:`title: ${title}\ntuning: standard\n[Scale practice]\nnote: Play evenly and let each note sound clearly\n${notes.map(n=>`${n.fret}f${n.string}s`).join(' ')}`,
  };
}

// A sequence advances once per stable pitch, not once per analysis frame.
export class NoteTrainer {
  constructor(notes = []) { this.reset(notes); }
  reset(notes = this.notes) { this.notes=notes; this.index=0; this.last=null; }
  hear(reading) {
    if (!reading) { this.last=null; return false; }
    const midi=Math.round(69+12*Math.log2(reading.frequency/440));
    const target=this.notes[this.index];
    if (!target || midi===this.last) return false;
    if (Math.abs(1200*Math.log2(reading.frequency/(440*2**((target.midi-69)/12))))>35) return false;
    this.last=midi;
    ++this.index;
    return true;
  }
  get complete() { return this.notes.length>0 && this.index===this.notes.length; }
}
