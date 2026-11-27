import {COUNTS,RHYTHM_PRESETS,RhythmSession} from './rhythm-engine.js';
import {RhythmAudio} from './rhythm-audio.js';
import {pitchNote,midiFrequency} from './pitch.js';
import {CHORD_LIBRARY} from './chord-library.js';
import {pickingTargets} from './rhythm-patterns.js';

const noteName=midi=>{const p=pitchNote(midiFrequency(midi));return p.name+p.octave;};

export class RhythmTrainer {
  constructor(host,{beforeStart=()=>{}}={}){
    this.host=host;this.beforeStart=beforeStart;this.$=s=>host.querySelector(s);this.running=false;this.pending=false;
    this.text=(selector,value)=>{const node=this.$(selector);if(node.textContent!==String(value))node.textContent=value;};
    host.innerHTML=`<h2>Find your groove</h2><p>Keep moving on <strong>1 + 2 + 3 + 4 +</strong>. Play the solid slots; move past the strings on the empty ones. This repeats one bar of 4/4 in eighth notes.</p>
      <div class="rhythm-settings"><label>Technique<select id="rhythm-technique"><option value="picking">Picking · timing + optional note bonus</option><option value="strumming">Strumming · timing</option></select></label><label>Pattern<select id="rhythm-preset"></select></label><label>Starting / manual BPM<input id="rhythm-bpm" type="number" min="30" max="180" value="50"></label><label>Input<select id="rhythm-input-mode"><option value="microphone">Guitar microphone</option><option value="tap">Tap button / Space · timing only</option></select></label></div>
      <p class="rhythm-pattern-help">Tap a slot to turn its sound on or off. D is the down motion on a number; U is the up motion on +. For picking, use these as down/up picking cues.</p>
      <div id="rhythm-grid" class="rhythm-grid" aria-label="Eight eighth-note slots"></div>
      <details class="rhythm-targets"><summary>Target notes · optional picking bonus</summary><p>Choose a pitch for each sounded slot, or Any note for timing only. Targets are editable original exercises, not a transcription of Blackbird. A microphone checks pitch, not which string or finger you used.</p><div id="rhythm-notes" class="rhythm-note-grid"></div></details>
      <div class="rhythm-settings rhythm-tempo"><label><input id="rhythm-adaptive" type="checkbox" checked> Adapt tempo as I improve</label><span>Three clean bars: +5 BPM. Two difficult bars: −5 BPM. Changes start on a future bar.</span></div>
      <details class="rhythm-options"><summary>Metronome, microphone & timing settings</summary><div class="rhythm-settings"><label>Minimum BPM<input id="rhythm-min" type="number" min="30" max="180" value="30"></label><label>Maximum BPM<input id="rhythm-max" type="number" min="30" max="180" value="140"></label><label>Microphone<select id="rhythm-device"><option value="">System default</option></select></label><label>Ignore sounds below<input id="rhythm-floor" type="range" min="-60" max="-15" value="-42"><output id="rhythm-floor-value">−42 dB</output></label><label>Attack sensitivity<select id="rhythm-sensitivity"><option value="1.35">High · quieter attacks</option><option value="1.6" selected>Normal</option><option value="2">Low · stronger attacks</option></select></label><label>Mic timing correction (ms)<input id="rhythm-offset" type="number" min="-200" max="200" value="0"></label><label><input id="rhythm-subdivision" type="checkbox"> Click the + subdivisions too</label></div><p>Use headphones: a speaker metronome can be mistaken for your playing. Pluck or strum clearly. If you consistently read late despite playing with the click, a positive timing correction subtracts that delay. Browser, microphone and headphone latency affect these estimates.</p><p>The microphone grades attack timing. It cannot confirm down/up direction or whether a strummed chord sounds good. A held note earns no further timing points; each sounded slot needs a fresh attack. Tap mode tests timing without microphone access.</p></details>
      <div class="rhythm-session" tabindex="-1" role="group" aria-label="Rhythm practice controls and rewards"><div class="rhythm-actions"><button id="rhythm-start" class="primary" type="button">Start practice</button><button id="rhythm-stop" type="button" disabled>Stop</button><button id="rhythm-tap" type="button" hidden>Tap · Space</button></div>
      <p id="rhythm-status" role="status">Start at 50 BPM, allow microphone access, then follow four count-in beats.</p><div class="rhythm-meter"><label>Input level <meter id="rhythm-level" min="0" max=".15" value="0"></meter></label><span id="rhythm-attacks">0 attacks heard</span></div>
      <div class="rhythm-pulse" aria-label="Current stroke"><strong id="rhythm-count">Ready</strong><span id="rhythm-motion">↕</span><span id="rhythm-cue">Keep your hand moving through the silent slots</span></div>
      <p id="rhythm-feedback" role="status">Timing earns points. A correct target pitch adds 50.</p><div class="rhythm-rewards" aria-label="Practice rewards"><span>Points <strong id="rhythm-points">0</strong></span><span>Streak <strong id="rhythm-streak">0</strong></span><span>Accuracy <strong id="rhythm-accuracy">—</strong></span><span>Note bonuses <strong id="rhythm-bonus">0</strong></span><span id="rhythm-badge">Build an 8-hit streak</span></div><p id="rhythm-summary"></p></div>`;
    const chordLabel=document.createElement('label');chordLabel.textContent='Practice chord';const chordSelect=document.createElement('select');chordSelect.id='rhythm-chord';chordSelect.setAttribute('aria-label','Practice chord');chordSelect.append(new Option('Any chord · timing only','any'),...Object.keys(CHORD_LIBRARY).map(name=>new Option(name,name)));chordSelect.value='G';chordLabel.append(chordSelect);this.$('.rhythm-settings').append(chordLabel);
    const chordInfo=document.createElement('p');chordInfo.id='rhythm-chord-info';this.$('.rhythm-settings').after(chordInfo);
    const reference=document.createElement('p');reference.id='rhythm-reference';chordInfo.after(reference);
    const mapping=document.createElement('label');mapping.textContent='Picking targets ';const targetMode=document.createElement('select');targetMode.id='rhythm-target-mode';targetMode.setAttribute('aria-label','Picking targets');targetMode.append(new Option('From chord + picking strings','chord'),new Option('Custom pitches / timing only','custom'));mapping.append(targetMode);this.$('.rhythm-targets').insertBefore(mapping,this.$('#rhythm-notes'));
    const strings=document.createElement('div');strings.id='rhythm-strings';strings.className='rhythm-note-grid';this.$('.rhythm-targets').insertBefore(strings,this.$('#rhythm-notes'));
    const noteHelp=document.createElement('p');noteHelp.textContent='Chord mode derives the pitch from the selected string and fret. P = thumb, I = index, M = middle, A = ring. For pitch bonuses, isolate each pluck: ringing bass notes can mask the next pitch. Strumming is timing-only; chord selection is a practice guide.';this.$('.rhythm-targets').append(noteHelp);
    const bonusLabel=document.createElement('label');const bonus=document.createElement('input');bonus.type='checkbox';bonus.id='rhythm-note-bonus';bonus.checked=true;bonusLabel.append(bonus,' Award single-note pitch bonuses');this.$('.rhythm-targets').insertBefore(bonusLabel,mapping);
    noteHelp.append(' Turn off pitch bonuses for ringing arpeggios or simultaneous pinches; timing practice still works.');
    this.$('.rhythm-session').insertBefore(this.$('#rhythm-grid'),this.$('.rhythm-pulse'));
    this.$('#rhythm-preset').replaceChildren(...Object.entries(RHYTHM_PRESETS).map(([id,p])=>new Option(p.name,id)));
    this.audio=new RhythmAudio({state:(state,message)=>this.audioState(state,message),frame:(time,rms)=>this.frame(time,rms),attack:time=>this.attack(time),pitch:(event,pitch)=>this.pitch(event,pitch)});
    this.$('#rhythm-preset').addEventListener('change',()=>this.preset());
    chordSelect.addEventListener('change',()=>this.syncTargets());targetMode.addEventListener('change',()=>this.syncTargets());
    this.$('#rhythm-technique').addEventListener('change',()=>this.targetsVisibility());
    this.$('#rhythm-floor').addEventListener('input',()=>this.$('#rhythm-floor-value').textContent=`${this.$('#rhythm-floor').value} dB`);
    this.$('#rhythm-start').addEventListener('click',()=>this.start());this.$('#rhythm-stop').addEventListener('click',()=>this.stop());
    this.$('#rhythm-tap').addEventListener('click',()=>this.attack(this.audio.now));
    this.$('#rhythm-bpm').addEventListener('change',()=>{
      if(this.running){const value=Number(this.$('#rhythm-bpm').value);if(Number.isInteger(value)&&value>=30&&value<=180){this.session.bpm=value;this.session.adaptive=false;this.$('#rhythm-adaptive').checked=false;this.$('#rhythm-status').textContent=`Manual tempo ${value} BPM begins on the next unscheduled bar.`;}}
    });
    this.$('#rhythm-adaptive').addEventListener('change',()=>{if(this.session)this.session.adaptive=this.$('#rhythm-adaptive').checked;});
    document.addEventListener('keydown',event=>{
      if(document.body.dataset.task!=='rhythm'||event.code!=='Space'||event.repeat||event.ctrlKey||event.metaKey||event.altKey||/INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY/.test(event.target.tagName))return;
      event.preventDefault();if(this.running&&this.$('#rhythm-input-mode').value==='tap')this.attack(this.audio.now);
    });
    window.addEventListener('hashchange',()=>this.checkNavigation());window.addEventListener('popstate',()=>this.checkNavigation());
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&(this.running||this.pending))this.stop('Paused because the page was hidden. Start again for a fresh count-in.');});
    window.addEventListener('pagehide',()=>this.stop());this.preset();
  }
  checkNavigation(){if(location.hash!=='#rhythm'&&(this.running||this.pending))this.stop();}
  targetsVisibility(){this.$('.rhythm-targets').hidden=this.$('#rhythm-technique').value!=='picking';this.drawPattern();}
  preset(){
    const p=RHYTHM_PRESETS[this.$('#rhythm-preset').value];this.hits=p.hits.map(Boolean);
    this.$('#rhythm-technique').value=p.technique;
    this.$('#rhythm-target-mode').value='chord';
    this.$('#rhythm-reference').replaceChildren(document.createTextNode(`${p.description} `));if(p.source){const link=document.createElement('a');link.href=p.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Technique lesson ↗';this.$('#rhythm-reference').append(link);}
    this.$('#rhythm-grid').replaceChildren(...this.hits.map((hit,i)=>{
      const button=document.createElement('button');button.type='button';button.dataset.slot=i;button.setAttribute('aria-label',`${Math.floor(i/2)+1}${i%2?' +':''}: ${i%2?'up':'down'} motion`);
      button.innerHTML=`<span>${COUNTS[i]}</span><strong>${i%2?'↑ U':'↓ D'}</strong><small></small>`;
      button.addEventListener('click',()=>{this.hits[i]=!this.hits[i];this.syncTargets();});return button;
    }));
    this.$('#rhythm-notes').replaceChildren(...this.hits.map((_,i)=>{
      const label=document.createElement('label');label.textContent=`${Math.floor(i/2)+1}${i%2?' +':''} `;
      const select=document.createElement('select');select.setAttribute('aria-label',`Target pitch ${Math.floor(i/2)+1}${i%2?' +':''}`);select.dataset.noteSlot=i;
      select.append(new Option('Any note',''),...Array.from({length:49},(_,n)=>new Option(noteName(40+n),40+n)));select.value=p.notes?.[i]??'';select.addEventListener('change',()=>this.drawPattern());label.append(select);return label;
    }));
    this.$('#rhythm-strings').replaceChildren(...this.hits.map((_,i)=>{const label=document.createElement('label');label.textContent=`${Math.floor(i/2)+1}${i%2?' +':''}`;const select=document.createElement('select');select.dataset.stringSlot=i;select.setAttribute('aria-label',`Picking string ${Math.floor(i/2)+1}${i%2?' +':''}`);select.append(new Option('Any / no target','any'),new Option('Chord bass','bass'),new Option('Alternating bass','alt'),...Array.from({length:6},(_,j)=>new Option(`String ${j+1}`,j+1)));select.value=p.strings?.[i]??'any';select.addEventListener('change',()=>this.syncTargets());label.append(select);return label;}));
    this.syncTargets();this.targetsVisibility();
  }
  syncTargets(){
    const chord=this.$('#rhythm-chord').value,frets=CHORD_LIBRARY[chord],fromChord=this.$('#rhythm-target-mode').value==='chord';
    this.$('#rhythm-strings').hidden=!fromChord;this.$('#rhythm-notes').hidden=fromChord;this.plan=null;this.targetError='';
    if(fromChord&&chord!=='any')try{this.plan=pickingTargets(chord,[...this.host.querySelectorAll('[data-string-slot]')].map(select=>select.value),this.hits);this.host.querySelectorAll('[data-note-slot]').forEach((select,i)=>select.value=this.plan[i]?.midi??'');}catch(error){this.targetError=error.message;}
    else if(fromChord)this.host.querySelectorAll('[data-note-slot]').forEach(select=>select.value='');
    this.$('#rhythm-chord-info').textContent=frets?`${chord} · low E → high e: ${frets.map(f=>f<0?'×':f).join(' · ')}. × = mute, 0 = open. Standard tuning, no capo.${this.targetError?` ${this.targetError}`:''}`:'Any chord · attack timing only. Select a chord for automatic picking targets.';
    this.drawPattern();
  }
  drawPattern(){
    const picking=this.$('#rhythm-technique').value==='picking';
    this.host.querySelectorAll('[data-slot]').forEach((button,i)=>{if(!this.running){button.dataset.result='';button.dataset.current='false';}const target=this.$(`[data-note-slot="${i}"]`)?.value,n=picking&&this.plan?.[i];button.setAttribute('aria-pressed',String(this.hits[i]));button.querySelector('strong').textContent=n?`${n.finger} · s${n.string}`:i%2?'↑ U':'↓ D';button.querySelector('small').textContent=this.hits[i]?n?`${n.fret}f ${noteName(n.midi)}`:`PLAY${target&&picking?` ${noteName(Number(target))}`:''}`:'miss strings';});
    this.host.querySelectorAll('[data-note-slot]').forEach((select,i)=>select.disabled=this.running||!this.hits[i]);
    this.host.querySelectorAll('[data-string-slot]').forEach((select,i)=>select.disabled=this.running||!this.hits[i]);
    this.$('.rhythm-pattern-help').textContent=picking?'Tap slots to choose when to play. Picking cards show P/I/M/A, string (s) and fret (f) when mapped to a chord; string 6 is low E, string 1 high e. These are fingerstyle suggestions, not measured finger choices.':'Tap slots to choose when to strum. D is down on a number, U is up on +. Keep the silent motions moving; the selected chord does not change timing scores.';
  }
  lock(locked){
    this.$('.rhythm-session').dataset.running=String(this.running);
    this.host.querySelectorAll('.rhythm-settings input,.rhythm-settings select,[data-slot],[data-note-slot],[data-string-slot],#rhythm-target-mode,#rhythm-note-bonus').forEach(input=>{if(!['rhythm-bpm','rhythm-adaptive'].includes(input.id))input.disabled=locked;});
    if(!locked)this.drawPattern();this.$('#rhythm-bpm').disabled=this.pending;this.$('#rhythm-adaptive').disabled=this.pending;
    this.$('#rhythm-start').disabled=locked;this.$('#rhythm-stop').disabled=!locked;
  }
  async start(){
    if(this.running||this.pending)return;
    const bpm=Number(this.$('#rhythm-bpm').value),min=Number(this.$('#rhythm-min').value),max=Number(this.$('#rhythm-max').value),offset=Number(this.$('#rhythm-offset').value);
    try{
      if(this.$('#rhythm-technique').value==='picking'&&this.$('#rhythm-target-mode').value==='chord'&&this.targetError)throw new Error(this.targetError);
      if(![min,max,offset].every(Number.isInteger)||min<30||max>180||min>max||bpm<min||bpm>max||Math.abs(offset)>200)throw new Error('Use whole BPM values with minimum ≤ starting tempo ≤ maximum (30–180), and a timing correction from −200 to 200 ms.');
      const session=new RhythmSession({hits:this.hits,bpm,min,max,adaptive:this.$('#rhythm-adaptive').checked});
      this.beforeStart();this.pending=true;this.lock(true);
      const mic=this.$('#rhythm-input-mode').value==='microphone';
      const ready=await this.audio.start(mic,this.$('#rhythm-device').value);
      if(!ready)return;
      this.pending=false;this.running=true;this.session=session;this.attacks=0;this.lastDraw=-Infinity;this.offset=mic?offset/1000:0;
      this.$('#rhythm-attacks').textContent=`0 attacks ${mic?'heard':'tapped'}`;
      this.targets=[...this.host.querySelectorAll('[data-note-slot]')].map(select=>select.value===''?null:Number(select.value));
      this.noteBonus=mic&&this.$('#rhythm-technique').value==='picking'&&this.$('#rhythm-note-bonus').checked;
      this.audio.floor=10**(Number(this.$('#rhythm-floor').value)/20);this.audio.ratio=Number(this.$('#rhythm-sensitivity').value);
      this.countStart=this.audio.now+.2;this.beat=60/bpm;this.begin=this.countStart+4*this.beat;session.start(this.begin);
      this.$('#rhythm-tap').hidden=mic;this.$('#rhythm-tap').disabled=true;this.lock(true);this.$(mic?'#rhythm-stop':'.rhythm-session').focus({preventScroll:true});
      this.$('.rhythm-session').scrollIntoView({block:'start'});this.frame(this.audio.now,0);this.devices();
    }catch(error){this.$('#rhythm-status').textContent=error.message;this.pending=false;this.lock(false);}
  }
  async devices(){
    try{const devices=await navigator.mediaDevices.enumerateDevices();const select=this.$('#rhythm-device'),previous=select.value;select.replaceChildren(new Option('System default',''),...devices.filter(d=>d.kind==='audioinput'&&d.deviceId!=='default').map((d,i)=>new Option(d.label||`Microphone ${i+1}`,d.deviceId)));if([...select.options].some(o=>o.value===previous))select.value=previous;}catch{/* Default input remains usable. */}
  }
  audioState(state,message){
    if(state==='requesting'){this.pending=true;this.lock(true);}
    if(state==='idle'||state==='error'){this.running=false;this.pending=false;this.lock(false);this.$('#rhythm-tap').hidden=true;this.$('#rhythm-level').value=0;}
    if(message)this.$('#rhythm-status').textContent=message;
  }
  frame(now,rms){
    if(!this.running)return;
    const s=this.session;s.tick(now,this.offset);
    for(let i=0;i<4;i++){const at=this.countStart+i*this.beat;if(at>=now-.04&&at<=now+.15)this.audio.click(at,i===0);}
    for(const bar of s.bars)for(let i=0;i<8;i++)if((i%2===0||this.$('#rhythm-subdivision').checked)&&bar.events[i].at>=now-.04&&bar.events[i].at<=now+.15)this.audio.click(bar.events[i].at,i===0,i%2===1);
    if(now-(this.lastDraw??-Infinity)<1/30)return;this.lastDraw=now;
    this.$('#rhythm-level').value=rms;
    const countIn=now<this.begin;
    this.$('#rhythm-tap').disabled=countIn;
    const bar=s.barAt(now),slot=countIn?-1:Math.min(7,Math.floor((now-bar.start)/(30/bar.bpm)));
    this.$('#rhythm-count').textContent=countIn?`Ready · ${Math.min(4,Math.max(1,Math.ceil((this.begin-now)/this.beat)))}`:`${Math.floor(slot/2)+1}${slot%2?' +':''}`;
    const picked=!countIn&&this.$('#rhythm-technique').value==='picking'&&this.plan?.[slot];
    this.$('#rhythm-motion').textContent=picked?picked.finger:slot%2===0?'↓':'↑';
    this.$('#rhythm-motion').dataset.up=String(slot%2===1);this.$('#rhythm-motion').dataset.silent=String(countIn||!this.hits[slot]);
    this.$('#rhythm-cue').textContent=countIn?'Four count-in beats · get your hand ready':picked?`String ${picked.string}, fret ${picked.fret} · ${noteName(picked.midi)}`:this.hits[slot]?`${slot%2?'Up':'Down'} · PLAY${this.noteBonus&&this.targets[slot]!==null?` ${noteName(this.targets[slot])}`:''}`:`${slot%2?'Up':'Down'} · miss the strings, keep moving`;
    this.host.querySelectorAll('[data-slot]').forEach((button,i)=>{button.dataset.current=String(i===slot);button.dataset.result=bar.events[i].state;});
    this.text('#rhythm-status',countIn?'Count in with the clicks. Play from the next 1.':`${this.$('#rhythm-chord').value==='any'?'Any chord':this.$('#rhythm-chord').value} · ${bar.bpm} BPM · ${s.adaptive?'adaptive tempo':'manual tempo'}${s.bpm!==bar.bpm?` · ${s.bpm} BPM coming up`:''}`);
    this.drawRewards();
  }
  attack(time){
    if(!this.running||time<this.begin-.14)return null;
    this.attacks++;const event=this.session.attack(time-(this.$('#rhythm-input-mode').value==='microphone'?this.offset:0));
    this.$('#rhythm-attacks').textContent=`${this.attacks} attacks ${this.$('#rhythm-input-mode').value==='microphone'?'heard':'tapped'}`;this.drawRewards();return this.noteBonus?event:null;
  }
  pitch(event,pitch){if(!this.running)return;this.session.pitch(event,pitch&&Math.abs(pitch.cents)<=45?pitch.midi:null,this.targets[event.slot]);this.drawRewards();}
  drawRewards(){
    const s=this.session;if(!s)return;
    this.text('#rhythm-feedback',s.feedback);this.$('#rhythm-points').textContent=s.points;this.$('#rhythm-streak').textContent=`${s.combo} · best ${s.best}`;this.$('#rhythm-accuracy').textContent=s.totalHits+s.misses+s.extras?`${s.accuracy}%`:'—';this.$('#rhythm-bonus').textContent=s.bonuses;
    this.$('#rhythm-badge').textContent=s.best>=24?'★ Groove keeper · 24 in a row':s.best>=16?'★ In the pocket · 16 in a row':s.best>=8?'★ Steady hands · 8 in a row':'Build an 8-hit streak';
    this.$('#rhythm-summary').textContent=`${s.totalHits} on-time attacks · ${s.misses} missed · ${s.extras} extra strokes. Accuracy counts hits, misses and extras; pitch bonuses are separate.`;
  }
  stop(message='Stopped. Start again for a fresh count-in and new round.'){
    this.audio.stop();this.$('#rhythm-status').textContent=message;this.$('#rhythm-count').textContent='Stopped';this.$('#rhythm-cue').textContent='Adjust the pattern or start a fresh round.';this.$('#rhythm-motion').textContent='↕';this.$('#rhythm-motion').dataset.silent='true';this.host.querySelectorAll('[data-slot]').forEach(button=>button.dataset.current='false');this.drawRewards();
  }
}
