import {createHash} from 'node:crypto';
import * as alphaTab from '@coderline/alphatab';
import {catalogueEntries,songFilterOptions,songKey} from './song-catalog.js';
import {ROOTS,SCALES,scalePatterns,scaleExercise} from './exercises.js';
import {RIFFS} from './riffs.js';
import {FIFTHS} from './scale-map.js';
import {DEMO} from './demo.js';

export const readerSongId=id=>createHash('sha256').update(id).digest('hex').slice(0,16);
export function readerSong(data,id){const song=catalogueEntries(data).find(s=>!s.archived&&readerSongId(s.catalogueId)===id);if(!song)throw new Error('Song not found.');return song;}
export function readerCatalogue(data,files=[]) {
  const songs=catalogueEntries(data).filter(s=>!s.archived).map(s=>({
    id:s.catalogueId,readerId:readerSongId(s.catalogueId),title:s.title,artist:s.artist,genre:s.genre,key:s.key,keyValue:songKey(s.key).value,
    bpm:s.bpm,tuning:s.tuning,capo:s.capo,chords:s.chords,techniques:s.techniques,
    suggested:s.suggested,needs_check:s.needs_check,
  }));
  return {songs,genres:songFilterOptions(songs,'genre'),keys:songFilterOptions(songs,'key'),roots:ROOTS,
    scales:Object.entries(SCALES).map(([id,s])=>({id,name:s.name})),fifths:FIFTHS,
    riffs:RIFFS.map(r=>({...r,notes:r.tab.split('|').flatMap(b=>b.trim().split(/\s+/)).map(n=>{const [fret,string]=n.split('.').map(Number);return {fret,string};})})),
    files:[{id:'demo',name:'Original demo · First steps'},...files.map(f=>({id:f.id,name:f.name}))]};
}
export function readerScale(root,type){
  if(!Number.isInteger(root)||root<0||root>11||!SCALES[type])throw new Error('Unknown scale.');
  return {root:ROOTS[root],name:SCALES[type].name,intervals:SCALES[type].intervals,
    patterns:scalePatterns(root,type).map(p=>{const exercise=scaleExercise(root,type,'up',p.id);return {...p,notes:exercise.notes,minFret:exercise.minFret,maxFret:exercise.maxFret,description:exercise.description};})};
}
export function readerScore(bytes,{name='demo',track=0,notation='both'}={}){
  const settings=new alphaTab.Settings();settings.core.engine='svg';settings.core.enableLazyLoading=false;
  settings.display.barsPerRow=1;settings.display.scale=1.25;
  settings.display.resources.staffLineColor=new alphaTab.model.Color(0,0,0);
  const score=name==='demo'?alphaTab.importer.ScoreLoader.loadAlphaTex(DEMO,settings):
    /\.(tex|alphatex)$/i.test(name)?alphaTab.importer.ScoreLoader.loadAlphaTex(new TextDecoder().decode(bytes),settings):alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),settings);
  if(!score.tracks[track])throw new Error('Choose an available track.');
  for(const staff of score.tracks[track].staves){const tab=staff.tuning.length>0&&!staff.isPercussion;staff.showTablature=tab&&notation!=='sheet';staff.showStandardNotation=!tab||notation!=='tab';}
  const renderer=new alphaTab.rendering.ScoreRenderer(settings);renderer.width=880;
  const pages=[];let header=[];
  renderer.partialRenderFinished.on(chunk=>{
    const svg=String(chunk.renderResult).replace('<svg ',`<svg viewBox="0 0 ${chunk.width} ${chunk.height}" `);
    // Small title/tuning chunks belong with the first system, not on empty pages.
    if(chunk.height<70||!pages.length&&chunk.height<120){header.push(svg);return;}
    pages.push({svg:[...header,svg].join(''),width:chunk.width,height:chunk.height,tab:plainTab(score,track,chunk.firstMasterBarIndex,chunk.lastMasterBarIndex)});header=[];
  });
  renderer.renderScore(score,[track]);
  if(header.length){if(pages.length)pages.at(-1).svg+=header.join('');else pages.push({svg:header.join(''),width:880,height:120});}
  return {title:score.title||name,artist:score.artist,tracks:score.tracks.map((t,i)=>({id:i,name:t.name||`Track ${i+1}`})),track,pages};
}

function plainTab(score,track,first,last){
  const staff=score.tracks[track].staves[0];if(!staff.tuning.length||first<0)return '';
  const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const result=[];
  for(let i=first;i<=last;i++){
    const bar=staff.bars[i];if(!bar)continue;const beats=bar.voices[0].beats;
    result.push(`Bar ${i+1}`);
    for(let string=1;string<=staff.tuning.length;string++)result.push(`${string} ${names[staff.tuning[string-1]%12]}|`+beats.map(beat=>{const note=beat.notes.find(n=>n.string===string);const value=note?(note.isDead?'x':String(note.fret)):beat.isRest&&string===1?'r':'-';return '-'+value+'-'.repeat(Math.max(0,3-value.length));}).join('')+'|');
  }
  return result.join('\n');
}
