import { CHORD_LIBRARY } from './chord-library.js';
import { chordExercise, scaleExercise, SCALES, ROOTS, NoteTrainer } from './exercises.js';
import { midiFrequency, pitchNote } from './pitch.js';

const noteName = midi => { const n=pitchNote(midiFrequency(midi)); return n.name+n.octave; };
export class Trainers {
  constructor(root, loadExercise) {
    this.root=root;this.$=s=>root.querySelector(s);this.loadExercise=loadExercise;
    this.chord=new NoteTrainer();this.scale=new NoteTrainer();
    this.$('.trainer-chord').replaceChildren(...Object.keys(CHORD_LIBRARY).map(name=>new Option(name,name)));
    this.$('.trainer-root').replaceChildren(...ROOTS.map((name,i)=>new Option(name,i)));
    this.$('.trainer-scale').replaceChildren(...Object.entries(SCALES).map(([key,scale])=>new Option(scale.name,key)));
    this.$('.trainer-chord').addEventListener('change',()=>this.resetChord());
    for(const selector of ['.trainer-root','.trainer-scale','.trainer-direction']) this.$(selector).addEventListener('change',()=>this.resetScale());
    this.$('.trainer-reset').addEventListener('click',()=>{this.resetChord();this.resetScale();});
    this.$('.trainer-load').addEventListener('click',()=>this.loadExercise(this.exercise));
    this.$('.trainer-practise').addEventListener('click',()=>this.loadExercise(this.exercise,{wait:true}));
    this.$('.trainer-mode').addEventListener('change',()=>this.update());
    this.resetChord();this.resetScale();
  }
  resetChord() {
    const name=this.$('.trainer-chord').value;
    this.chord.reset(chordExercise(name));
    const shape=CHORD_LIBRARY[name];
    const ns='http://www.w3.org/2000/svg', picture=this.$('.trainer-chord-diagram');
    const node=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
    picture.replaceChildren();
    for(let i=0;i<6;++i){const x=25+i*30;picture.append(node('line',{x1:x,x2:x,y1:35,y2:155,stroke:'#688575'}));picture.append(node('text',{x,y:22,'text-anchor':'middle',fill:'#294436'},shape[i]===-1?'×':shape[i]===0?'○':''));picture.append(node('text',{x,y:178,'text-anchor':'middle','font-size':11,fill:'#486753'},['E','A','D','G','B','e'][i]));if(shape[i]>0)picture.append(node('circle',{cx:x,cy:35+(shape[i]-.5)*30,r:9,fill:'#3f7053'}));}
    for(let i=0;i<5;++i)picture.append(node('line',{x1:25,x2:175,y1:35+i*30,y2:35+i*30,stroke:'#688575','stroke-width':i===0?4:1}));
    this.update();
  }
  resetScale() {
    this.exercise=scaleExercise(Number(this.$('.trainer-root').value),this.$('.trainer-scale').value,this.$('.trainer-direction').value);
    this.scale.reset(this.exercise.notes);this.update();
  }
  update(state) {
    const mode=this.$('.trainer-mode').value;
    const trainer=mode==='chord'?this.chord:this.scale;
    if(state?.state==='listening' && this.$('.trainer-listen').checked) trainer.hear(state.reading);
    else if(state) trainer.last=null;
    const key=[mode,trainer.index,this.$('.trainer-chord').value,this.exercise?.title].join(':');
    if(this.renderKey===key)return;
    this.renderKey=key;
    this.$('.trainer-chord-panel').hidden=mode!=='chord';
    this.$('.trainer-scale-panel').hidden=mode!=='scale';
    const notes=trainer.notes;
    this.$('.trainer-progress').textContent=`${trainer.index} / ${notes.length} notes checked`;
    const target=notes[trainer.index];
    this.$('.trainer-next').textContent=trainer.complete ? mode==='chord'?'All sounding strings checked. Now strum the chord and listen for clean ringing.':'Scale complete! Reset to try again, or choose another scale.' : target ? `Next: string ${target.string} · ${target.fret===0?'open':`fret ${target.fret}`} · ${noteName(target.midi)}` : '';
    const sequence=this.$('.trainer-sequence');
    sequence.replaceChildren(...notes.map((n,i)=>{
      const cell=document.createElement('span');cell.textContent=`${n.fret} / ${n.string}`;cell.dataset.state=i<trainer.index?'done':i===trainer.index?'next':'waiting';cell.title=`${noteName(n.midi)} · string ${n.string}, fret ${n.fret}`;return cell;
    }));
    if(this.exercise)this.$('.trainer-scale-description').textContent=`${this.exercise.title}. Two octaves in frets ${this.exercise.base}–${this.exercise.base+4}; standard tuning, no capo. Load the tab for fingering suggestions, audio and scrolling playback.`;
  }
}
