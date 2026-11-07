import { centsBetween, midiFrequency, pitchNote } from './pitch.js';

export class NoteFollowing {
  constructor() { this.reset(); }
  reset() { this.steps=[];this.index=0;this.active=false;this.complete=false;this.lastMidi=null;this.heard=null; }
  start(timeline, { tick=0, range=null, loop=false } = {}) {
    const events=timeline.events.filter(e=>(!range || e.start>=range.startTick && e.start<range.endTick) && !e.rest);
    const groups=new Map();
    for(const event of events) {
      const notes=event.notes.filter(n=>!n.tied && !n.dead);
      if(!notes.length)continue;
      const group=groups.get(event.start)||[];
      group.push(...notes.map(n=>({...n,midi:timeline.tuning[n.string-1]+n.fret+(timeline.capo||0),tick:event.start,end:event.end})));
      groups.set(event.start,group);
    }
    if([...groups.values()].some(notes=>notes.length>1))throw new Error('Wait for notes supports single-note scales and melodies. This passage contains chords; select Timed playback or a single-note passage.');
    const restart=this.complete;
    this.steps=[...groups.values()].map(notes=>notes[0]);
    if(!this.steps.length)throw new Error('No playable single notes in this passage. Load a scale or choose another track.');
    this.index=restart?0:this.steps.findIndex(n=>n.tick>=tick-1);
    if(this.index<0)this.index=0;
    this.loop=loop;this.active=true;this.complete=false;this.lastMidi=null;this.heard=null;
    return this.target.tick;
  }
  pause() { this.active=false; }
  seek(tick) {
    const index=this.steps.findIndex(n=>n.tick>=tick-1);
    if(index>=0 && index!==this.index){this.index=index;this.lastMidi=null;this.heard=null;}
  }
  hear(state) {
    if(!this.active)return null;
    if(!state.reading){if(['silent','quiet'].includes(state.signal))this.lastMidi=null;return null;}
    const frequency=state.reading.frequency,midi=pitchNote(frequency).midi;
    // The previous correct note is allowed to ring while the player prepares
    // the next one; do not label that held note as a mistake.
    this.heard=midi===this.lastMidi?null:midi;
    if(midi!==this.lastMidi && Math.abs(centsBetween(frequency,midiFrequency(this.target.midi)))<=35){
      this.lastMidi=midi;this.heard=null;++this.index;
      if(this.index===this.steps.length){
        if(this.loop)this.index=0;
        else {this.active=false;this.complete=true;return this.steps.at(-1).end;}
      }
      return this.target.tick;
    }
    if(midi!==this.lastMidi)this.lastMidi=null;
    return null;
  }
  get target() { return this.steps[this.index]; }
  get snapshot() { return {active:this.active,complete:this.complete,index:this.index,total:this.steps.length,target:this.target,heard:this.heard}; }
}
