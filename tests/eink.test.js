import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readerCatalogue,readerSong,readerScale,readerScore} from '../practice/eink-data.js';
import {songCatalogue} from '../practice/score-library-plugin.js';

test('reader catalogue is compact, retains stable IDs and loads resources separately',async()=>{
  const source=await songCatalogue(),catalogue=readerCatalogue(source);
  assert.equal(catalogue.songs.length,432);
  assert(Buffer.byteLength(JSON.stringify(catalogue))<200000);
  const chain=catalogue.songs.find(s=>s.title==='The Chain');assert.equal(chain.id,'suggestions:s1');assert(!chain.tabs);
  const detail=readerSong(source,chain.readerId);assert.equal(detail.title,chain.title);assert(detail.tabs.length>0);
  assert.throws(()=>readerSong(source,'not-a-song'));
});
test('reader scale data reuses the real exercise generator including shifting patterns',()=>{
  const scale=readerScale(9,'minorPentatonic');assert.equal(scale.patterns.length,11);
  const neck=scale.patterns.find(p=>p.id==='neck');assert.equal(neck.notes.at(-1).midi-neck.notes[0].midi,36);
  assert.throws(()=>readerScale(99,'major'));assert.throws(()=>readerScale(9,'unknown'));
});
test('scores render without browser/audio APIs into static systems with scalable SVG and plain tab',async()=>{
  const bytes=await readFile(new URL('./fixtures/original-four-notes.gp4',import.meta.url));
  const score=readerScore(bytes,{name:'test.gp4'});assert.equal(score.title,'Original four notes');assert(score.pages.length);
  for(const page of score.pages){assert.match(page.svg,/<svg viewBox="0 0 /);assert(!page.svg.includes('<script'));}
  assert(score.pages.some(p=>p.tab?.includes('Bar 1')));assert.equal(readerScore(null).tracks.length,2);
  assert.throws(()=>readerScore(null,{track:99}));
});
test('reader entry and script avoid module loading and modern JavaScript syntax',async()=>{
  const script=await readFile(new URL('../public/kindle/reader.js',import.meta.url),'utf8');
  assert.doesNotThrow(()=>new Function(script));assert(!/\b(?:const|let|async|await|import|export)\s|=>|\?\.|\.replaceAll\(|\bfetch\(/.test(script));
  const html=await readFile(new URL('../public/kindle.html',import.meta.url),'utf8');assert(!html.includes('type="module"'));assert(html.includes('<noscript>'));
});
