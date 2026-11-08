import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalogueEntries, filterSongs, safeResourceUrl, captureSession } from '../practice/song-catalog.js';
import { importLibrary } from '../practice/library-backup.js';
import { mergeCatalogues } from '../practice/merge-catalogue.js';
import { songCatalogue } from '../practice/score-library-plugin.js';

test('updated catalogue uses current metadata while retaining every original project identity',async()=>{
  const original=JSON.parse(await readFile(new URL('../songs/songs.json',import.meta.url),'utf8'));
  const updated=JSON.parse(await readFile(new URL('../songs/songs2.json',import.meta.url),'utf8'));
  const untouched=JSON.stringify([original,updated]),merged=mergeCatalogues(original,updated),entries=catalogueEntries(merged);
  assert.equal(filterSongs(entries).length,350);assert.equal(filterSongs(entries,{view:'suggestions'}).length,82);
  assert.equal(entries.length,433);assert.equal(new Set(entries.map(s=>s.catalogueId)).size,433);
  for(const old of catalogueEntries(original))assert(entries.some(s=>s.catalogueId===old.catalogueId));
  const chain=entries.find(s=>s.title==='The Chain');assert.equal(chain.catalogueId,'suggestions:s1');assert.equal(chain.suggested,false);assert.equal(chain.id,306);
  assert.equal(entries.find(s=>s.catalogueId==='songs:111').title,'Lovefool');
  assert.equal(entries.find(s=>s.catalogueId==='songs:165').title,'Ironic');
  const retired=entries.find(s=>s.catalogueId==='songs:89');assert(retired.archived);assert(!filterSongs(entries,{query:'Holly'}).includes(retired));
  assert.equal(JSON.stringify([original,updated]),untouched);
  assert.deepEqual(await songCatalogue(),merged);
});

test('catalogue merge preserves explicit corrections and does not duplicate promoted suggestions',()=>{
  const original={songs:[{id:1,title:'Incorrect',artist:'Band',needs_check:true,notes:'Check this'}],suggestions:[{id:'s1',title:'Song',artist:'Band'}]};
  const update={songs:[{id:1,title:'Corrected',artist:'Band',needs_check:false,notes:null},{id:2,title:'Song',artist:'Band'}],suggestions:[]};
  const merged=mergeCatalogues(original,update);
  assert.equal(merged.songs[0].notes,null);assert.equal(merged.songs[0].needs_check,false);
  assert.equal(merged.songs[1].catalogue_id,'suggestions:s1');assert.equal(merged.retired.length,0);
  assert.throws(()=>mergeCatalogues(original,{songs:[update.songs[0],update.songs[0]],suggestions:[]}),/Duplicate/);
});

test('the supplied catalogue keeps stable distinct identities for 305 songs and 128 suggestions',async()=>{
  const data=JSON.parse(await readFile(new URL('../songs/songs.json',import.meta.url),'utf8'));
  const entries=catalogueEntries(data);
  assert.equal(entries.length,433);assert.equal(new Set(entries.map(s=>s.catalogueId)).size,433);
  assert.equal(filterSongs(entries).length,305);assert.equal(filterSongs(entries,{view:'suggestions'}).length,128);
  assert.equal(entries.filter(s=>s.needs_check).length,8);
  assert.equal(data.songs[0].practice.learning_status,'not started');
});
test('search covers artist, chords and techniques; promoted suggestions and personal progress are overlays',()=>{
  const songs=catalogueEntries({songs:[{id:1,title:'One',artist:'Artist',genre:'Rock',chords:['Em'],techniques:['fingerpicking'],practice:{learning_status:'not started'}}],suggestions:[{id:1,title:'Two',artist:'Other',genre:'Folk'}]});
  assert.equal(filterSongs(songs,{query:'ARTIST em fingerpicking',genre:'Rock'}).length,1);
  assert.equal(filterSongs(songs,{status:'learning'}).length,0);
  const states={'songs:1':{practice:{learning_status:'learning'}},'suggestions:1':{promoted:true}};
  assert.equal(filterSongs(songs,{status:'learning',states}).length,1);
  assert.equal(filterSongs(songs,{states}).length,2);assert.equal(filterSongs(songs,{view:'suggestions',states}).length,0);
  assert.equal(songs[0].practice.learning_status,'not started');
  for(const url of ['javascript:alert(1)','file:///tmp/data','data:text/html,boom','not a url'])assert.equal(safeResourceUrl(url),null);
  assert.equal(safeResourceUrl('https://example.com/tab'),'https://example.com/tab');
});
test('checkpoints capture practice state without autoplay, microphone permissions or MIDI ports',()=>{
  const state={playing:true,selectedTrack:1,speed:50,snap:'beat',range:{startTick:960,endTick:3840},looping:true,volume:35,countIn:false,metronome:true,position:{currentTick:1920},tracks:[{index:1,name:'Guitar',muted:false,solo:true}]};
  const session=captureSession(state,{view:'scrolling',mode:'wait'});
  assert.equal(session.tick,1920);assert.equal(session.mode,'wait');assert(!('playing'in session));assert(!('midi'in session));assert.notEqual(session.range,state.range);
});
test('malformed backups are rejected before writing any records',async()=>{
  let writes=0;const store={remember:()=>{++writes;},putEntry:()=>{++writes;}};
  const file=value=>new File([JSON.stringify(value)],'backup.json');
  await assert.rejects(importLibrary(store,file({version:1,projects:[],entries:[]})),/supported/);
  await assert.rejects(importLibrary(store,file({format:'tab-forge-library',version:1,projects:[{id:'p',title:'x',filename:'oops.exe',file:'aGVsbG8='}],entries:[]})),/invalid/);
  assert.equal(writes,0);
});
