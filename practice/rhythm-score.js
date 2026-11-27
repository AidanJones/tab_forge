import {CHORD_LIBRARY} from './chord-library.js';
import {STANDARD_TUNING} from './exercises.js';

export function rhythmNotation({hits,technique,chord,plan,targets,bpm=50}){
  const shape=CHORD_LIBRARY[chord];
  const chordDefinition=shape?`\\chord (${JSON.stringify(chord)} ${[...shape].reverse().map(f=>f<0?'x':f).join(' ')})`:'';
  let labelled=false,unpitched=false;
  const positions=[];
  const beats=hits.map((hit,i)=>{
    const effects=[`txt ${JSON.stringify(`${Math.floor(i/2)+1}${i%2?' +':''}`)}`];
    if(!hit){positions.push([]);return `r{${effects.join(' ')}}`;}
    if(shape&&!labelled){effects.push(`ch ${JSON.stringify(chord)}`);labelled=true;}
    if(technique==='strumming'){
      effects.push(i%2?'su':'sd');
      const notes=(shape?shape.flatMap((f,j)=>f<0?[]:[{fret:f,string:6-j}]):[6,5,4,3,2,1].map(string=>({fret:0,string,dead:true})));
      if(!shape)unpitched=true;positions.push(notes);
      return `(${notes.map(n=>`${n.fret}.${n.string}${n.dead?'{x}':''}`).join(' ')}){${effects.join(' ')}}`;
    }
    let note=plan?.[i];
    if(!note&&targets?.[i]!==null&&targets?.[i]!==undefined){
      note=STANDARD_TUNING.flatMap((open,j)=>{const fret=targets[i]-open;return fret>=0&&fret<=24?[{string:j+1,fret}]:[];}).sort((a,b)=>a.fret-b.fret||a.string-b.string)[0];
    }
    if(!note){note={string:3,fret:0,dead:true};effects.push('x');unpitched=true;}
    if(note.finger)effects.push(`rf ${{P:1,I:2,M:3,A:4}[note.finger]}`);
    positions.push([note]);return `${note.fret}.${note.string}{${effects.join(' ')}}`;
  });
  return {positions,unpitched,tex:`\\title "Rhythm practice" \\tempo ${bpm} \\tuning E4 B3 G3 D3 A2 E2 ${chordDefinition} . \\ts 4 4 :8 ${beats.join(' ')} |`};
}

// A display-only score. It shares the rhythm exercise data, but never creates a
// second synthesizer or audio clock alongside the metronome/microphone trainer.
export class RhythmScore {
  constructor(host){
    this.host=host;this.slot=-1;this.view='tab';this.waiters=new Set();
    host.innerHTML=`<div class="rhythm-score-heading"><strong>Read the pattern</strong><label>Show <select id="rhythm-notation" aria-label="Rhythm notation"><option value="tab">Tab</option><option value="sheet">Sheet music</option><option value="both">Tab + sheet music</option></select></label></div><p id="rhythm-score-help">Eight eighth-note slots. Rests are the silent gaps; the highlighted beat follows the count.</p><div class="rhythm-score-scroll" tabindex="0" aria-label="Rhythm tab or sheet music"><div class="rhythm-score-canvas"><div id="rhythm-score"></div><div class="rhythm-score-cursor" hidden aria-hidden="true"></div></div></div><p id="rhythm-score-status" role="status">Preparing tab…</p>`;
    this.$=s=>host.querySelector(s);
    this.$('#rhythm-notation').addEventListener('change',()=>{this.view=this.$('#rhythm-notation').value;this.render();});
    window.addEventListener('hashchange',()=>this.render());window.addEventListener('popstate',()=>this.render());
    window.addEventListener('pagehide',event=>{if(!event.persisted){this.destroyed=true;this.api?.destroy();}});
  }
  update(data){this.data=data;clearTimeout(this.timer);this.timer=setTimeout(()=>this.render(),60);}
  async render(){
    if(!this.data||this.host.closest('[hidden]')||this.destroyed)return;
    const key=JSON.stringify([this.data,this.view]);if(this.key===key)return;
    const request=this.request=(this.request||0)+1;
    try{
      this.module??=import('@coderline/alphatab');const a=await this.module;
      if(request!==this.request||this.destroyed)return;
      if(!this.api){
        this.api=new a.AlphaTabApi(this.$('#rhythm-score'),{core:{engine:'svg',fontDirectory:`${import.meta.env.BASE_URL}font/`,useWorkers:false,enableLazyLoading:false},player:{playerMode:a.PlayerMode.Disabled},display:{scale:.95,barsPerRow:1,lastSystemFillThreshold:0,padding:[12,8,12,8]}});
        for(const name of ['ScoreTitle','ScoreSubTitle','ScoreArtist','ScoreAlbum','ScoreWords','ScoreMusic','ScoreWordsAndMusic','GuitarTuning','ScoreCopyright','EffectTempo','EffectDynamics','EffectFingering'])if(a.NotationElement[name]!==undefined)this.api.settings.notation.elements.set(a.NotationElement[name],false);
        this.api.updateSettings();
        this.api.renderFinished.on(()=>{this.renderedKey=this.key;this.$('#rhythm-score-status').textContent='';this.highlight(this.slot,true);this.finishWaiting();});
        this.api.error.on(error=>{this.key=null;this.finishWaiting();this.$('#rhythm-score-status').textContent=`Score preview: ${error.message||'could not render this pattern'}`;});
      }
      const notation=rhythmNotation(this.data);
      const score=a.importer.ScoreLoader.loadAlphaTex(notation.tex,this.api.settings);
      const staff=score.tracks[0].staves[0];staff.showTablature=this.view!=='sheet';staff.showStandardNotation=this.view!=='tab';
      score.stylesheet.globalDisplayChordDiagramsOnTop=false;score.stylesheet.globalDisplayChordDiagramsInScore=false;
      this.beats=staff.bars[0].voices[0].beats;this.key=key;
      this.$('#rhythm-score-help').textContent=`Eight eighth-note slots. Rests are silent gaps; the highlight follows the count.${notation.unpitched?' × is an unspecified attack, not a guessed pitch. Choose a chord or target note for pitched notation.':''}${this.data.technique==='picking'&&!this.data.plan?' Custom pitches use one possible guitar position.':''}`;
      this.api.renderScore(score,[0]);
    }catch(error){this.key=null;this.finishWaiting();this.$('#rhythm-score-status').textContent=`Could not show the score: ${error.message}`;}
  }
  finishWaiting(){for(const resolve of this.waiters)resolve();this.waiters.clear();}
  async ready(){
    clearTimeout(this.timer);await this.render();
    if(this.key&&this.renderedKey!==this.key&&!this.destroyed)await new Promise(resolve=>{const finish=()=>{clearTimeout(timer);this.waiters.delete(finish);resolve();};const timer=setTimeout(finish,4000);this.waiters.add(finish);});
    // Let the SVG and font layout settle before positioning the practice panel.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  }
  highlight(slot,force=false){
    if(slot===this.slot&&!force)return;this.slot=slot;
    const cursor=this.$('.rhythm-score-cursor'),beat=this.beats?.[slot];
    const bounds=beat&&this.api?.boundsLookup?.findBeat(beat)?.realBounds;
    cursor.hidden=!bounds;
    if(!bounds)return;
    Object.assign(cursor.style,{left:`${bounds.x}px`,top:`${bounds.y}px`,width:`${Math.max(12,bounds.w)}px`,height:`${bounds.h}px`});
    const scroll=this.$('.rhythm-score-scroll');if(bounds.x<scroll.scrollLeft||bounds.x+bounds.w>scroll.scrollLeft+scroll.clientWidth)scroll.scrollLeft=Math.max(0,bounds.x-scroll.clientWidth*.3);
  }
}
