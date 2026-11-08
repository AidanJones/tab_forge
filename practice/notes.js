import {NOTE_NAMES,NATURALS,STRING_NAMES,noteAt,notePool,nextNote} from './note-map.js';
import {MicrophonePitch} from './microphone.js';
import {centsBetween,midiFrequency,pitchNote,signalDb} from './pitch.js';

const $=id=>document.getElementById(id),key='tab-forge:note-learning';
let target,answered=false,revealed=false,highlight=null,lastMatched=null;
let totals={correct:0,attempts:0,revealed:0},pool=[];
const settings=['note-strings','note-range','note-set','note-mode'];
try{
  const saved=JSON.parse(localStorage.getItem(key)||'{}');
  for(const id of settings)if([...$(id).options].some(o=>o.value===saved[id]))$(id).value=saved[id];
  for(const field of Object.keys(totals))if(Number.isSafeInteger(saved.totals?.[field])&&saved.totals[field]>=0)totals[field]=saved.totals[field];
}catch{/* The exercise also works without browser persistence. */}
function persist(){
  try{localStorage.setItem(key,JSON.stringify({...Object.fromEntries(settings.map(id=>[id,$(id).value])),totals}));}
  catch{$('note-total').textContent='Browser storage unavailable. This session still works.';return;}
  $('note-total').textContent=`${totals.correct} correct / ${totals.attempts} submitted answers · ${totals.revealed} answers revealed`;
}
function feedback(text){$('note-feedback').textContent=text;}
function newQuestion(){
  target=nextNote(pool,target);answered=false;revealed=false;highlight=null;
  $('note-challenge').hidden=$('note-mode').value==='explore';
  $('note-question').textContent=$('note-mode').value==='find'?`Find ${target.name} on ${STRING_NAMES[target.string-1]} · string ${target.string}`:`What is the marked note on ${STRING_NAMES[target.string-1]} · fret ${target.fret}?`;
  $('note-score').textContent=`${totals.correct} correct / ${totals.attempts} submitted answers`;
  $('note-reveal').disabled=false;$('note-next').textContent='Skip / next note';
  feedback($('note-mode').value==='explore'?'Click a labelled note to highlight its other positions.':'Take your time. The note names are hidden during the quiz.');
  $('note-answer-buttons').replaceChildren();
  if($('note-mode').value==='name')for(const pc of $('note-set').value==='natural'?NATURALS:NOTE_NAMES.map((_,i)=>i)){
    const button=document.createElement('button');button.textContent=NOTE_NAMES[pc];button.addEventListener('click',()=>answer(pc===target.pc,`${NOTE_NAMES[pc]} is not the marked note. Try again.`));$('note-answer-buttons').append(button);
  }
  draw();
}
function answer(correct,wrong,{microphone=false}={}){
  if(answered||$('note-mode').value==='explore')return;
  if(!microphone||correct){++totals.attempts;if(correct)++totals.correct;persist();}
  if(!correct){feedback(wrong);return;}
  answered=true;highlight=target.pc;
  feedback(`Correct — ${target.name}, string ${target.string}, ${target.fret===0?'open':`fret ${target.fret}`}. Say the name aloud, then choose Next note.`);
  finishQuestion();
}
function finishQuestion(){
  $('note-reveal').disabled=true;$('note-next').textContent='Next note';
  $('note-score').textContent=`${totals.correct} correct / ${totals.attempts} submitted answers`;
  for(const button of $('note-answer-buttons').children)button.disabled=true;
  draw();
}
function draw(){
  const focused=document.activeElement?.closest('#note-board button');
  const focusPosition=focused?{string:focused.dataset.string,fret:focused.dataset.fret}:null;
  const board=$('note-board'),max=Number($('note-range').value),explore=$('note-mode').value==='explore';
  board.style.gridTemplateColumns=`64px repeat(${max+1},minmax(48px,1fr))`;
  board.style.minWidth=max===5?'420px':'760px';board.replaceChildren();
  board.append(document.createElement('span'));
  for(let fret=0;fret<=max;fret++){const label=document.createElement('span');label.className='note-fret-label';label.textContent=fret===0?'Open':String(fret);board.append(label);}
  for(let string=1;string<=6;string++){
    const label=document.createElement('span');label.className='note-string-label';label.textContent=`${string} · ${STRING_NAMES[string-1]}`;board.append(label);
    for(let fret=0;fret<=max;fret++){
      const note=noteAt(string,fret),included=pool.some(n=>n.string===string&&n.fret===fret),cell=document.createElement('div');
      cell.className=`note-cell${fret===0?' open-string':''}${!included?' inactive':''}`;
      if(included){
        const button=document.createElement('button');button.type='button';button.dataset.string=string;button.dataset.fret=fret;button.dataset.pc=note.pc;
        const marked=!explore&&target.string===string&&target.fret===fret,showName=explore||answered||revealed;
        button.className=[!note.natural?'accidental':'',!showName?'unknown':'',highlight===note.pc?'highlight':'',marked&&($('note-mode').value==='name'||answered)?'target':''].filter(Boolean).join(' ');
        button.textContent=showName?note.name:marked&&$('note-mode').value==='name'?'?':'·';
        button.setAttribute('aria-label',`${STRING_NAMES[string-1]}, string ${string}, ${fret===0?'open':`fret ${fret}`}${showName?`, ${note.name}${note.octave}`:''}`);
        button.addEventListener('click',()=>{
          if(explore){highlight=note.pc;feedback(`${note.name}${note.octave} · string ${string}, ${fret===0?'open':`fret ${fret}`}. Other ${note.name} positions are highlighted.`);draw();}
          else if($('note-mode').value==='find')answer(string===target.string&&fret===target.fret,`${note.name} is at that position. Find ${target.name} on string ${target.string}.`);
        });cell.append(button);
      }
      board.append(cell);
    }
  }
  if(focusPosition)board.querySelector(`[data-string="${focusPosition.string}"][data-fret="${focusPosition.fret}"]`)?.focus({preventScroll:true});
}
for(const id of settings)$(id).addEventListener('change',()=>{
  pool=notePool($('note-strings').value,Number($('note-range').value),$('note-set').value==='natural');persist();newQuestion();
});
$('note-next').addEventListener('click',newQuestion);
$('note-reveal').addEventListener('click',()=>{
  if(answered)return;answered=true;revealed=true;highlight=target.pc;++totals.revealed;persist();
  feedback(`Answer: ${target.name}, string ${target.string}, ${target.fret===0?'open':`fret ${target.fret}`}. Play it and say its name before moving on.`);finishQuestion();
});
$('note-reset').addEventListener('click',()=>{totals={correct:0,attempts:0,revealed:0};persist();newQuestion();});

let micState='idle';
const mic=new MicrophonePitch(state=>{
  const prior=micState;micState=state.state;
  $('note-mic-start').disabled=['requesting','listening'].includes(micState);$('note-mic-stop').disabled=!['requesting','listening'].includes(micState);
  $('note-input').disabled=micState==='requesting';
  $('note-level').value=Math.max(-90,signalDb(state.rms));
  $('note-mic-resume').hidden=state.signal!=='suspended';
  const statuses={silent:'No audio reaching the microphone. Check mute and the selected input.',quiet:'Input is below the noise floor. Move closer or lower the threshold.',suspended:'Browser audio is paused. Choose Resume audio.',muted:'Microphone is muted or unavailable.',unclear:'Pluck one clean note at a time.',settling:'Listening for a stable pitch…'};
  $('note-mic-status').textContent=state.message||statuses[state.signal]||(micState==='requesting'?'Allow microphone access in your browser.':micState==='listening'?`Listening${state.inputName?` · ${state.inputName}`:''}.`:'Microphone off.');
  if(micState==='listening'&&prior!=='listening')inputs();
  if(!state.reading){if(['silent','quiet'].includes(state.signal))lastMatched=null;return;}
  const heard=pitchNote(state.reading.frequency);
  $('note-mic-status').textContent=`Heard ${heard.name}${heard.octave}. ${$('note-mode').value==='find'?'Play the requested note on the chosen string.':'Switch to Find a note to check played answers.'}`;
  if($('note-mode').value!=='find'||answered||heard.midi===lastMatched)return;
  if(Math.abs(centsBetween(state.reading.frequency,midiFrequency(target.midi)))<=35){lastMatched=heard.midi;answer(true,'',{microphone:true});}
});
async function inputs(){
  try{const devices=await navigator.mediaDevices.enumerateDevices(),previous=$('note-input').value;$('note-input').replaceChildren(new Option('System default',''),...devices.filter(d=>d.kind==='audioinput'&&d.deviceId!=='default').map((d,i)=>new Option(d.label||`Microphone ${i+1}`,d.deviceId)));if([...$('note-input').options].some(o=>o.value===previous))$('note-input').value=previous;}catch{/* System default remains available. */}
}
$('note-mic-start').addEventListener('click',()=>mic.start($('note-input').value));
$('note-mic-stop').addEventListener('click',()=>mic.stop());
$('note-mic-resume').addEventListener('click',()=>mic.resumeAudio());
$('note-input').addEventListener('change',()=>{if(micState==='listening')mic.start($('note-input').value);});
$('note-noise').addEventListener('input',()=>{mic.noiseFloor=10**(Number($('note-noise').value)/20);});
$('note-microphone').addEventListener('toggle',()=>{if(!$('note-microphone').open)mic.stop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)mic.stop('Microphone stopped while this page was hidden.');});
window.addEventListener('pagehide',()=>mic.stop());
pool=notePool($('note-strings').value,Number($('note-range').value),$('note-set').value==='natural');persist();newQuestion();
