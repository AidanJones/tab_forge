export const COUNTS=['1','+','2','+','3','+','4','+'];
export {RHYTHM_PRESETS} from './rhythm-patterns.js';

export function timingWindow(bpm){return Math.min(.14,30/bpm*.38);}
export function rhythmGrade(error){return Math.abs(error)<=.045?'Perfect':Math.abs(error)<=.09?'Good':'Close';}

// All times use the audio clock, in seconds. Pitch is an optional later result
// for a matched attack; it never delays or substitutes for onset timing.
export class RhythmSession {
  constructor({hits,bpm=50,adaptive=true,min=35,max=140}={}){
    if(!Array.isArray(hits)||hits.length!==8||!hits.some(Boolean)||!Number.isInteger(bpm)||bpm<30||bpm>180)throw new Error('Choose at least one eighth-note slot and a tempo from 30 to 180.');
    this.hits=hits.map(Boolean);this.bpm=bpm;this.adaptive=adaptive;this.min=Math.min(min,bpm);this.max=Math.max(max,bpm);
    this.bars=[];this.points=0;this.combo=0;this.best=0;this.goodBars=0;this.badBars=0;this.feedback='Get ready';this.totalHits=0;this.misses=0;this.extras=0;this.bonuses=0;
  }
  start(at){this.bars.push(this.makeBar(at));}
  makeBar(start){
    const bpm=this.bpm,step=30/bpm;
    return {start,end:start+step*8,bpm,extras:0,done:false,events:this.hits.map((active,i)=>({at:start+i*step,slot:i,active,state:active?'waiting':'silent',error:null,bonus:false}))};
  }
  tick(now,correction=0){
    for(const bar of this.bars){
      for(const event of bar.events)if(event.active&&event.state==='waiting'&&now-correction>event.at+timingWindow(bar.bpm)){
        event.state='miss';this.misses++;this.combo=0;this.feedback=`Missed ${Math.floor(event.slot/2)+1}${event.slot%2?' +':''} · keep the pulse`;
      }
      if(!bar.done&&now>=bar.end+Math.max(0,correction)){
        bar.done=true;
        const active=bar.events.filter(e=>e.active),hit=active.filter(e=>e.state==='hit');
        const accurate=hit.filter(e=>Math.abs(e.error)<=.09).length/active.length;
        this.goodBars=accurate>=.85&&bar.extras===0?this.goodBars+1:0;
        this.badBars=hit.length/active.length<.6||bar.extras>1?this.badBars+1:0;
        if(this.adaptive&&this.goodBars>=3){this.bpm=Math.min(this.max,this.bpm+5);this.goodBars=0;this.feedback=`Three clean bars! Next tempo ${this.bpm} BPM`;}
        if(this.adaptive&&this.badBars>=2){this.bpm=Math.max(this.min,this.bpm-5);this.badBars=0;this.feedback=`Take it steadily · next tempo ${this.bpm} BPM`;}
      }
    }
    // Plan before the boundary so clicks are scheduled, rather than played by
    // a drifting JS timer. Tempo changes affect future, unscheduled bars only.
    while(this.bars.at(-1)&&this.bars.at(-1).end<=now+.18)this.bars.push(this.makeBar(this.bars.at(-1).end));
    // Retain enough history for late pitch results and the session summary.
    while(this.bars.length>6&&this.bars[0].done)this.bars.shift();
  }
  attack(at){
    const bar=this.bars.find(b=>at>=b.start-timingWindow(b.bpm)&&at<b.end);
    if(!bar)return null; // Count-in is never graded.
    const candidates=this.bars.flatMap(b=>b.events.filter(e=>e.active&&e.state==='waiting'&&Math.abs(e.at-at)<=timingWindow(b.bpm)).map(event=>({event,bar:b})));
    candidates.sort((a,b)=>Math.abs(a.event.at-at)-Math.abs(b.event.at-at));
    const match=candidates[0];
    if(!match){bar.extras++;this.extras++;this.combo=0;this.feedback='Extra stroke · keep the empty slots silent';return null;}
    const event=match.event;event.state='hit';event.error=at-event.at;
    const grade=rhythmGrade(event.error);const points={Perfect:100,Good:60,Close:30}[grade];
    this.totalHits++;this.combo++;this.best=Math.max(this.best,this.combo);this.points+=points;
    this.feedback=`${grade} · ${Math.round(Math.abs(event.error)*1000)} ms ${event.error<0?'early':'late'} · +${points}`;
    return event;
  }
  pitch(event,midi,target){
    if(!event||event.state!=='hit'||event.pitchChecked||target===null||target===undefined)return;
    event.pitchChecked=true;
    if(midi===target){event.bonus=true;this.bonuses++;this.points+=50;this.feedback=`${rhythmGrade(event.error)} + right note! +50 note bonus`;}
    else this.feedback=`Timing counted · ${midi===null?'pitch unclear':'different note'}, no note bonus`;
  }
  get accuracy(){return Math.round(this.totalHits/Math.max(1,this.totalHits+this.misses+this.extras)*100);}
  barAt(now){return this.bars.find(b=>now>=b.start&&now<b.end)||this.bars[0];}
}

// An energy attack must rise above the current sustain. A held note cannot
// repeatedly earn rewards; refractory time suppresses a strum's string spread.
export class AttackDetector {
  constructor(){this.reset();}
  reset(){this.previous=0;this.envelope=0;this.last=-Infinity;}
  hear(rms,at,{floor=.008,ratio=1.6,refractory=.12}={}){
    const rising=rms>floor&&rms>Math.max(this.previous*ratio,this.envelope*1.3);
    const hit=rising&&at-this.last>=refractory;
    this.envelope=this.envelope*.92+rms*.08;this.previous=rms;
    if(hit)this.last=at;
    return hit;
  }
}
