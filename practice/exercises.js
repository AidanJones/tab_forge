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

// Pentatonic boxes use the same pitch set for a major key and its relative minor.
const PENTATONIC_BOXES = [
  {offset:0,frets:[[0,3],[0,2],[0,2],[0,2],[0,3],[0,3]]},
  {offset:2,frets:[[1,3],[0,3],[0,3],[0,2],[1,3],[1,3]]},
  {offset:4,frets:[[1,3],[1,3],[1,3],[0,3],[1,4],[1,3]]},
  {offset:7,frets:[[0,3],[0,3],[0,2],[0,2],[1,3],[0,3]]},
  {offset:9,frets:[[1,3],[1,3],[0,3],[0,3],[1,3],[1,3]]},
];
export function scalePatterns(root=0,type='major') {
  const result=[{id:'root',label:'Root position · two octaves'},{id:'low',label:'Low / open position · frets 0–4'}];
  if(['majorPentatonic','minorPentatonic'].includes(type)){
    const minorRoot=type==='majorPentatonic'?(root+9)%12:root;
    const base=(minorRoot-4+12)%12;
    for(const [i,box]of PENTATONIC_BOXES.entries()){
      const frets=box.frets.flat().map(f=>f+base+box.offset);
      result.push({id:`box${i+1}`,label:`${type==='majorPentatonic'?'Relative-minor':'Pentatonic'} box ${i+1} · frets ${Math.min(...frets)}–${Math.max(...frets)}`});
    }
  }
  result.push({id:'middle',label:'Middle position · frets 5–9'},{id:'high',label:'High position · frets 10–14'},{id:'upper',label:'Upper position · frets 15–19'},{id:'neck',label:'Across the neck · three octaves'});
  return result;
}

export function scaleExercise(root = 0, type = 'major', direction = 'both', pattern = 'root') {
  if (!Number.isInteger(root) || root < 0 || root > 11 || !SCALES[type] || !['up','down','both'].includes(direction)) throw new Error('Choose a scale, key and direction.');
  const choice=scalePatterns(root,type).find(p=>p.id===pattern);
  if(!choice)throw new Error('Choose an available scale pattern.');
  let base = (root - 4 + 12) % 12;
  const start = 40 + base, intervals=SCALES[type].intervals;
  const inScale=midi=>intervals.includes((midi-root+120)%12);
  let ascending=[];
  if(pattern.startsWith('box')){
    const box=PENTATONIC_BOXES[Number(pattern.slice(3))-1];
    const minorRoot=type==='majorPentatonic'?(root+9)%12:root;
    base=(minorRoot-4+12)%12+box.offset;
    ascending=box.frets.flatMap((frets,i)=>frets.map(f=>({string:6-i,fret:base+f,midi:STANDARD_TUNING[5-i]+base+f})));
  }else if(pattern==='neck'){
    const pitches=Array.from({length:37},(_,i)=>start+i).filter(inScale);
    let previous={string:6,fret:base};
    ascending=pitches.map((midi,i)=>{
      const desired=base+12*i/(pitches.length-1);
      const candidates=STANDARD_TUNING.flatMap((open,index)=>{
        const fret=midi-open,string=index+1;
        return fret>=0&&fret<=24&&string<=previous.string?[{string,fret,midi}]:[];
      });
      const cost=n=>Math.abs(n.fret-desired)+.5*Math.abs(n.fret-previous.fret)+.5*Math.abs(n.string-previous.string);
      candidates.sort((a,b)=>cost(a)-cost(b)||b.string-a.string);
      previous=candidates[0];return previous;
    });
  }else if(pattern!=='root'){
    base={low:0,middle:5,high:10,upper:15}[pattern];
    const candidates=STANDARD_TUNING.flatMap((open,i)=>Array.from({length:5},(_,f)=>({string:i+1,fret:base+f,midi:open+base+f}))).filter(n=>inScale(n.midi)).sort((a,b)=>a.midi-b.midi||b.string-a.string);
    // The G/B tuning overlap can give one pitch two locations in a five-fret window.
    ascending=candidates.filter((n,i)=>!i||n.midi!==candidates[i-1].midi);
  }else{
    for (let midi=start; midi<=start+24; ++midi) {
      if (!inScale(midi)) continue;
      for (let string=6; string>=1; --string) {
        const fret=midi-STANDARD_TUNING[string-1];
        if (fret>=base && fret<=base+4) { ascending.push({string,fret,midi}); break; }
      }
    }
  }
  const notes=direction==='up' ? ascending : direction==='down' ? [...ascending].reverse() : [...ascending,...ascending.slice(0,-1).reverse()];
  const maxFret=Math.max(...notes.map(n=>n.fret)),minFret=Math.min(...notes.map(n=>n.fret));
  const title=`${ROOTS[root]} ${SCALES[type].name.toLowerCase()}${pattern==='root'?'':` · ${choice.label.split(' · ')[0]}`} · ${direction==='both'?'up and down':direction}`;
  const texNotes=notes.map(n=>`${n.fret}.${n.string}`);
  const bars=[];
  for(let i=0;i<texNotes.length;i+=4) bars.push([...texNotes.slice(i,i+4),...Array((4-texNotes.slice(i,i+4).length)%4).fill('r')].join(' '));
  const description=pattern==='root'?'Two octaves from the root':pattern==='neck'?'Three octaves from the root, shifting up the neck':pattern.startsWith('box')?'Two notes per string; this box can begin on a scale tone other than the root':'All scale pitches in this fret area; the first note may be a scale tone other than the root';
  return { title, notes, base, minFret, maxFret, pattern, description,
    tex:`\\title ${JSON.stringify(title)} \\artist "tab_forge scale trainer" \\tempo 80 . \\tuning E4 B3 G3 D3 A2 E2 \\ts 4 4 :4 ${bars.join(' | ')} |`,
    lesson:`title: ${title}\ntuning: standard\n[Scale practice]\nnote: ${description}. Play evenly and let each note sound clearly\n${notes.map(n=>`${n.fret}f${n.string}s`).join(' ')}`,
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
