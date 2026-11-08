import {download} from './download.js';

// These are original technique exercises, not transcriptions of recordings.
export const RIFFS = [
  ['open-low-e','Low E pulse','Picking','0.6 0.6 3.6 0.6 | 5.6 3.6 0.6 0.6'],
  ['minor-answer','Minor pentatonic answer','Pentatonic','5.6 8.6 5.5 7.5 | 5.4 7.5 5.5 8.6'],
  ['blues-step','Blues stepping stones','Blues','5.5 6.5 7.5 5.4 | 7.5 6.5 5.5 3.5'],
  ['open-arpeggio','Open-string arpeggio','Fingerpicking','0.6 2.5 2.4 0.3 | 0.2 0.3 2.4 2.5'],
  ['string-crossing','Two-string conversation','String crossing','5.3 5.2 7.3 8.2 | 7.3 5.2 5.3 5.2'],
  ['chromatic-walk','Four-finger walk','Finger independence','5.6 6.6 7.6 8.6 | 5.5 6.5 7.5 8.5'],
].map(([id,title,technique,tab])=>({id,title,technique,tab,song:'Original exercise',notes:'Standard tuning, no capo. Pick each note cleanly; release repeated notes between attacks.',bpm:80,builtin:true}));

export function youtubeReference(value) {
  if(!value?.trim())return '';
  try {
    const url=new URL(value);
    if(url.protocol==='https:' && ['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(url.hostname) && !url.username && !url.password)return url.href;
  } catch { /* Display a useful form error instead of making an unsafe link. */ }
  throw new Error('Use an https://youtube.com or https://youtu.be reference link. You can include its timestamp.');
}

export function riffExercise(riff) {
  if(riff.tex)return {title:riff.title,tex:riff.tex,session:riff.session,from:'riffs'};
  const bars=String(riff.tab||'').trim().replace(/\|\s*$/,'').split('|').map(bar=>bar.trim().split(/\s+/));
  if(!bars.length || bars.length>8 || bars.some(bar=>bar.length!==4 || bar.some(note=>! /^(?:[0-9]|1[0-9]|2[0-4])\.[1-6]$/.test(note))))throw new Error('Enter 1–8 bars with four fret.string notes per bar, separated by |. Example: 0.6 3.6 5.6 3.6');
  const bpm=Number(riff.bpm);
  if(!Number.isInteger(bpm)||bpm<30||bpm>240)throw new Error('Choose a tempo from 30 to 240 BPM.');
  return {title:riff.title,from:'riffs',tex:`\\title ${JSON.stringify(riff.title)} \\artist "Riff trainer" \\tempo ${bpm} . \\tuning E4 B3 G3 D3 A2 E2 \\ts 4 4 :4 ${bars.map(b=>b.join(' ')).join(' | ')} |`};
}

export function validateRiff(value) {
  if(!value || typeof value.title!=='string'||!value.title.trim()||value.title.length>120)throw new Error('Give the riff a title (up to 120 characters).');
  const riff={id:typeof value.id==='string'?value.id:crypto.randomUUID(),title:value.title.trim(),song:String(value.song||'').slice(0,160),technique:String(value.technique||'').slice(0,80),notes:String(value.notes||'').slice(0,2000),youtube:youtubeReference(value.youtube),bpm:Number(value.bpm||80),tab:String(value.tab||'')};
  if(value.tex){
    if(typeof value.tex!=='string'||value.tex.length>1000000)throw new Error('This score is too large to save as a riff.');
    const session=value.session;
    if(!session?.range || !Number.isFinite(session.range.startTick)||!Number.isFinite(session.range.endTick)||session.range.startTick<0||session.range.endTick<=session.range.startTick)throw new Error('Select a passage before saving a song riff.');
    riff.tex=value.tex;riff.session={range:{...session.range},track:Number.isInteger(session.selectedTrack??session.track)?(session.selectedTrack??session.track):0,tick:session.range.startTick,looping:true};
  }
  riffExercise(riff);return riff;
}

export class RiffLibrary {
  constructor(host,{load,capture}) {
    this.host=host;this.load=load;this.capture=capture;this.saved=[];
    host.innerHTML=`<div class="panel-heading"><div><h2>Riff library</h2><p>Learn a short phrase, one correct note at a time. Microphone practice supports single notes; use Hear / view for chord riffs. Use headphones so playback stays out of the microphone.</p></div></div>
      <label>Search riffs<input id="riff-search" type="search" placeholder="Title, song or technique"></label>
      <div id="riff-list" class="riff-list"></div><p id="riff-status" role="status"></p>
      <details id="riff-create"><summary>Add your own riff</summary><form id="riff-form" class="riff-form">
      <label>Riff title<input name="title" required maxlength="120"></label>
      <label>Song / artist<input name="song" maxlength="160"></label>
      <label>Technique<input name="technique" maxlength="80" placeholder="e.g. Fingerpicking"></label>
      <label>YouTube example URL<input name="youtube" type="url" placeholder="https://youtu.be/…?t=42"></label>
      <label>Practice notes<textarea name="notes" maxlength="2000"></textarea></label>
      <label>Tempo (BPM)<input name="bpm" type="number" min="30" max="240" value="80" required></label>
      <label>Short tab<textarea name="tab" placeholder="0.6 3.6 5.6 3.6 | 0.5 2.5 3.5 2.5"></textarea></label>
      <p>Use fret.string (6 is low E, 1 is high e), four quarter notes per bar and | between bars. Up to eight bars; standard tuning, no capo. To keep an existing score’s tuning and rhythms, select its passage under Passage & tracks, then save it below.</p>
      <div class="button-row"><button type="submit">Save short tab</button><button type="button" id="riff-capture">Save selected song passage</button></div>
      </form></details><details><summary>Riff backups</summary><p>Personal riffs stay in this browser. Export a backup to keep or move them. Reference videos open on YouTube; audio transcription is a future feature.</p><div class="button-row"><button id="riff-export" type="button">Export riffs</button><label>Import riff backup<input id="riff-import" type="file" accept=".json,application/json"></label></div></details>`;
    this.$=s=>host.querySelector(s);
    try{this.saved=JSON.parse(localStorage.getItem('tab-forge:riffs')||'[]').map(validateRiff);}catch{this.message('Saved riffs could not be read. Import a backup to recover them.');}
    this.$('#riff-search').addEventListener('input',()=>this.render());
    this.$('#riff-form').addEventListener('submit',e=>{e.preventDefault();this.save(false);});
    this.$('#riff-capture').addEventListener('click',()=>this.save(true));
    this.$('#riff-export').addEventListener('click',async()=>{
      download(JSON.stringify({version:1,riffs:this.saved},null,2),'tab-forge-riffs.json','application/json');
    });
    this.$('#riff-import').addEventListener('change',async e=>{
      try{
        const file=e.target.files[0];if(!file)return;if(file.size>5000000)throw new Error('Riff backups must be under 5 MB.');
        const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.riffs)||data.riffs.length>200)throw new Error('Choose a tab_forge riff backup (up to 200 riffs).');
        const incoming=data.riffs.map(validateRiff),merged=new Map(this.saved.map(r=>[r.id,r]));for(const riff of incoming)merged.set(riff.id,riff);
        if(merged.size>200)throw new Error('Keep up to 200 personal riffs in this browser.');this.persist([...merged.values()]);this.message('Riffs imported.');
      }catch(error){this.message(error.message);}finally{e.target.value='';}
    });this.render();
  }
  message(text){this.$('#riff-status').textContent=text;}
  persist(riffs){if(riffs.length>200)throw new Error('Keep up to 200 personal riffs in this browser.');localStorage.setItem('tab-forge:riffs',JSON.stringify(riffs));this.saved=riffs;this.render();}
  save(passage){
    try{
      const values=Object.fromEntries(new FormData(this.$('#riff-form')));
      if(passage)Object.assign(values,this.capture());
      const riff=validateRiff(values);this.persist([...this.saved,riff]);this.message('Riff saved in this browser. Export a backup to keep a copy.');
      this.$('#riff-create').open=false;
    }catch(error){this.message(error.name==='QuotaExceededError'?'Browser storage is full. Export your riffs before removing any saved items.':error.message);}
  }
  render(){
    const query=this.$('#riff-search').value.trim().toLowerCase();
    const riffs=[...this.saved,...RIFFS].filter(r=>[r.title,r.song,r.technique,r.notes].join(' ').toLowerCase().includes(query));
    this.$('#riff-list').replaceChildren();
    for(const riff of riffs){
      const card=document.createElement('article');card.className='riff-card';
      const title=document.createElement('h3');title.textContent=riff.title;
      const meta=document.createElement('p');meta.textContent=[riff.song,riff.technique,riff.tex?'Saved song passage':`${riff.tab.split('|').length} bars · ${riff.bpm} BPM`].filter(Boolean).join(' · ');
      const notes=document.createElement('p');notes.textContent=riff.notes;
      const buttons=document.createElement('div');buttons.className='button-row';
      for(const [label,wait]of [['Practise riff with microphone',true],['Hear / view riff',false]]){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{try{this.load(riffExercise(riff),{wait});}catch(error){this.message(error.message);}});buttons.append(b);
      }
      if(riff.youtube){const a=document.createElement('a');a.href=riff.youtube;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Watch example ↗';buttons.append(a);}
      if(!riff.builtin){const remove=document.createElement('button');remove.type='button';remove.textContent='Remove saved riff';remove.addEventListener('click',()=>{try{this.persist(this.saved.filter(r=>r.id!==riff.id));this.message('Riff removed.');}catch(error){this.message(error.message);}});buttons.append(remove);}
      card.append(title,meta,notes,buttons);this.$('#riff-list').append(card);
    }
    if(!riffs.length)this.$('#riff-list').textContent='No matching riffs. Try a different search or add your own.';
  }
}
