import { FINGER_COLORS } from './cartoon-bones.js';
import { playAlongTick } from './transport.js';
import { midiFrequency, pitchNote } from './pitch.js';

const NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key,value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
const pitch = midi => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi % 12] + (Math.floor(midi/12)-1);

export class PlayAlong {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('svg');
    this.status = root.querySelector('.play-along-status');
    this.lookahead = root.querySelector('[aria-label="Play-along look ahead"]');
    this.lookahead.addEventListener('change', () => this.draw());
    document.addEventListener('visibilitychange', () => this.refresh());
    this.resize = new ResizeObserver(() => this.refresh());
    this.resize.observe(root);
  }
  update(state) {
    // Mixer/render events do not reset the interpolation anchor.
    if (!this.state || state.position.currentTick !== this.state.position.currentTick || state.position.currentTime !== this.state.position.currentTime || state.playing !== this.state.playing || state.speed !== this.state.speed) this.anchor = performance.now();
    this.state = state;
    this.refresh();
  }
  setVisible(visible) { this.visible = visible; this.refresh(); }
  refresh() {
    cancelAnimationFrame(this.frame);
    if (!this.visible || document.hidden) return;
    this.draw();
    if (this.state?.playing) this.frame = requestAnimationFrame(() => this.refresh());
  }
  draw() {
    const state = this.state, timeline = state?.timeline;
    this.canvas.replaceChildren();
    if (!timeline?.tuning.length) {
      this.status.textContent = state?.tracks.length ? timeline?.unavailable || 'Preparing playback…' : 'Load a score to begin.';
      return;
    }
    const tick = playAlongTick(state, performance.now() - this.anchor);
    this.root.dataset.tick = tick.toFixed(2);
    const W = Math.max(480, Math.min(1000, this.canvas.clientWidth)), H = Math.max(350, 155 + timeline.tuning.length*40), hit = W < 600 ? 115 : 180;
    const scale = (W-hit-50)/(Number(this.lookahead.value)*960);
    const x = time => hit+(time-tick)*scale, y = string => 145+(string-1)*40;
    this.canvas.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.canvas.append(svg('rect',{width:W,height:H,rx:16,fill:'#172b2b'}));
    const clip = svg('clipPath',{id:'highway-clip'});
    clip.append(svg('rect',{x:75,y:0,width:W-75,height:H}));
    this.canvas.append(clip);
    const range = state.looping ? state.range : null;
    for (const bar of timeline.bars) {
      if (x(bar.end)<75 || x(bar.start)>W || (range && (bar.end<=range.startTick || bar.start>=range.endTick))) continue;
      for (let t=bar.start;t<bar.end;t+=960) if(x(t)>=75 && x(t)<=W) this.canvas.append(svg('line',{x1:x(t),x2:x(t),y1:112,y2:H-28,stroke:'#91afa8','stroke-opacity':t===bar.start ? .55 : .13,'stroke-dasharray':t===bar.start ? 'none' : '3 7'}));
      if(x(bar.start)>75) this.canvas.append(svg('text',{x:x(bar.start)+7,y:102,fill:'#9bb7b0','font-size':13},`Bar ${bar.number}`));
    }
    timeline.tuning.forEach((note,i) => {
      this.canvas.append(svg('line',{x1:75,x2:W,y1:y(i+1),y2:y(i+1),stroke:'#bed0c7','stroke-width':1+i*.35,'stroke-opacity':.45}));
      this.canvas.append(svg('text',{x:20,y:y(i+1)+5,fill:'#d0e5db','font-size':15},pitch(note)));
    });
    this.canvas.append(svg('rect',{x:75,y:114,width:hit-75,height:H-140,fill:'#071b1b',opacity:.45}));
    // Put the line behind the note heads so fret numbers remain readable.
    this.canvas.append(svg('line',{x1:hit,x2:hit,y1:110,y2:H-24,stroke:'#eff3b0','stroke-width':3,'class':'play-now-line'}));
    let current;
    let currentChord = '';
    for (const event of timeline.events) {
      if (event.start<=tick && event.chord) currentChord=event.chord;
      if (event.start<=tick && event.end>tick && !event.rest) current=event;
      if (x(event.end)<75 || x(event.start)>W || (range && (event.start<range.startTick || event.start>=range.endTick))) continue;
      const start=x(event.start), active=event.start<=tick && event.end>tick;
      const group=svg('g',{'class':'highway-event','clip-path':'url(#highway-clip)','data-start':event.start,'data-end':event.end,opacity:event.end<tick ? .3 : 1});
      if(event.chord) group.append(svg('text',{x:start+4,y:40,fill:'#e5edb4','font-size':24,'font-weight':700},event.chord));
      if(event.text) group.append(svg('text',{x:start+4,y:65,fill:'#b9d1c6','font-size':14},event.text));
      if(event.direction) group.append(svg('text',{x:start+4,y:91,fill:'#ffe6a5','font-size':17},`${event.direction==='down'?'↓':'↑'} ${event.direction}`));
      if(event.notes.length>1) group.append(svg('line',{x1:start,x2:start,y1:y(Math.min(...event.notes.map(n=>n.string))),y2:y(Math.max(...event.notes.map(n=>n.string))),stroke:'#b6c982','stroke-width':4,opacity:.6}));
      if(event.rest) group.append(svg('text',{x:start+4,y:H-8,fill:'#a7b9b5','font-size':13},'rest'));
      for(const note of event.notes) {
        const color=FINGER_COLORS[note.finger] || '#7dbb99', cy=y(note.string);
        const label=note.dead?'×':note.tied?'↝':String(note.fret);
        group.append(svg('rect',{x:start,y:cy-7,width:Math.max(0,x(event.end)-start-8),height:14,rx:7,fill:color,opacity:.4}));
        group.append(svg('rect',{x:start-17,y:cy-16,width:34,height:32,rx:12,fill:active?'#f3f4cd':color,stroke:active?'#fff':'#c5dacc','stroke-width':active?3:1}));
        group.append(svg('text',{x:start,y:cy+6,'text-anchor':'middle',fill:active?'#172b2b':'white','font-size':19,'font-weight':700},label));
        if(note.fret>0 && note.finger!==null) group.append(svg('text',{x:start+21,y:cy-12,fill:'#e7eee5','font-size':11},note.finger===0?'T':String(note.finger)));
        if(note.technique) group.append(svg('text',{x:start+19,y:cy+19,fill:'#dce9c4','font-size':10},note.technique));
      }
      this.canvas.append(group);
    }
    // A fixed play line makes the exact attack clear, even without animation.
    this.canvas.append(svg('text',{x:hit,y:H-7,'text-anchor':'middle',fill:'#eff3b0','font-size':13,'font-weight':700},'PLAY NOW'));
    const beatPhase=((tick%960)+960)%960/960;
    const bounce=matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.sin(Math.PI*beatPhase)*18;
    this.canvas.append(svg('circle',{cx:hit,cy:119-bounce,r:7,fill:'#eff3b0'}));
    this.status.textContent = `${state.playing?'Playing':'Preview'} · ${state.speed}%${timeline.capo ? ` · capo ${timeline.capo}` : ''}${currentChord ? ` · ${currentChord}` : ''}. ${current?.text || 'Play each fret as it crosses the line.'}`;
    const waiting=state.waiting;
    if(waiting?.complete)this.status.textContent=`Complete · ${waiting.total} notes played. Press Start listening to try again.`;
    else if(waiting?.active && waiting.target){
      const name=midi=>{const n=pitchNote(midiFrequency(midi));return n.name+n.octave;};
      this.status.textContent=`${waiting.index} / ${waiting.total} played · Play ${name(waiting.target.midi)} · string ${waiting.target.string}, ${waiting.target.fret ? `fret ${waiting.target.fret}`:'open'}${waiting.heard!==null && waiting.heard!==waiting.target.midi ? ` · Heard ${name(waiting.heard)} — try again`:''}`;
    }
  }
}
