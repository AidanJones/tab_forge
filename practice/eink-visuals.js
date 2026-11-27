import {platform,Settings} from '@coderline/alphatab';
import {CHORD_LIBRARY} from './chord-library.js';
import {RHYTHM_PRESETS,pickingTargets} from './rhythm-patterns.js';
import {SPIDER_PATTERNS} from './spider.js';
import {rhythmNotation} from './rhythm-score.js';
import {chordFingerExample} from './finger-examples.js';
import {paintFingerExample} from './finger-example-renderer.js';

export const READER_CHORDS=Object.keys(CHORD_LIBRARY);
const chordCache=new Map();
export function readerVisualCatalogue(){
  return {rhythms:Object.entries(RHYTHM_PRESETS).map(([id,p])=>({id,name:p.name,technique:p.technique,description:p.description,source:p.source||'',hits:p.hits})),chords:READER_CHORDS.map((name,index)=>({id:String(index),name,frets:CHORD_LIBRARY[name]})),spiderPatterns:SPIDER_PATTERNS};
}
export function readerRhythmData(id,chordIndex){
  const p=RHYTHM_PRESETS[id],chord=READER_CHORDS[chordIndex];if(!p||!chord)throw new Error('Choose an available rhythm and chord.');
  const plan=p.strings?pickingTargets(chord,p.strings,p.hits):null;
  return {title:p.name,chord,description:p.description,technique:p.technique,hits:p.hits,plan,notation:rhythmNotation({hits:p.hits,technique:p.technique,chord,plan})};
}
// Reuse the full app's constrained hand pose and cartoon-bone renderer. Only
// the resulting static, monochrome SVG reaches the Kindle (no 3D runtime).
export function readerChordDiagram(name){
  if(chordCache.has(name))return chordCache.get(name);
  const frets=CHORD_LIBRARY[name];if(!frets)throw new Error('Unknown chord.');
  const strings=[...frets].reverse(),example=chordFingerExample({strings},name==='G'?{assignments:[4,null,null,null,1,2]}:{}),canvas=new platform.SvgCanvas();canvas.settings=new Settings();
  canvas.beginRender(200,160);paintFingerExample(canvas,{name,strings,assignments:example.variant.assignments,available:example.available},100,9);
  const svg=String(canvas.endRender()).replace('<svg ','<svg viewBox="0 0 200 160" ').replace(/(fill|stroke)="(#[0-9A-Fa-f]{6}|rgba\([^)]+\))"/g,(_,kind,value)=>{
    if(kind==='stroke')return 'stroke="#000000"';
    const rgb=value[0]==='#'?[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)):value.match(/[\d.]+/g).slice(0,3).map(Number);
    return `fill="${(rgb[0]+rgb[1]+rgb[2])/3>145?'#FFFFFF':'#000000'}"`;
  });
  const result={name,frets,assignments:example.variant.assignments,available:example.available,svg};chordCache.set(name,result);return result;
}
