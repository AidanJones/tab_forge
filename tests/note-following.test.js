import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NoteFollowing } from '../practice/note-following.js';
import { midiFrequency } from '../practice/pitch.js';
const event=(start,fret,extra={})=>({start,end:start+960,notes:[{string:6,fret}],...extra});
const timeline={tuning:[64,59,55,50,45,40],capo:0,events:[event(0,0),event(960,3),event(1920,5)]};
const heard=midi=>({state:'listening',signal:'detected',reading:{frequency:midiFrequency(midi)}});

test('wait-for-notes advances only on the correct stable pitch, holds on wrong notes and completes',()=>{
  const follow=new NoteFollowing();assert.equal(follow.start(timeline),0);
  assert.equal(follow.hear(heard(45)),null);assert.equal(follow.index,0);
  assert.equal(follow.hear(heard(40)),960);assert.equal(follow.target.midi,43);
  assert.equal(follow.hear(heard(40)),null);
  assert.equal(follow.snapshot.heard,null);
  assert.equal(follow.hear(heard(43)),1920);
  assert.equal(follow.hear(heard(45)),2880);assert(follow.complete);assert(!follow.active);
  assert.equal(follow.start(timeline,{tick:2880}),0);
});
test('wait-for-notes respects capo, repeats, range, loops, pause and repeated pitches',()=>{
  const follow=new NoteFollowing();
  const repeated={...timeline,capo:2,events:[event(0,0),event(960,0),event(1920,3)]};
  follow.start(repeated,{range:{startTick:0,endTick:1920},loop:true});
  assert.equal(follow.target.midi,42);assert.equal(follow.hear(heard(42)),960);
  follow.seek(961);assert.equal(follow.hear(heard(42)),null);
  follow.hear({signal:'settling'});assert.equal(follow.hear(heard(42)),null);
  follow.hear({signal:'silent'});assert.equal(follow.hear(heard(42)),0);
  assert(!follow.complete);follow.pause();assert.equal(follow.hear(heard(42)),null);
  assert.equal(follow.start(repeated,{tick:961,range:{startTick:960,endTick:2880}}),960);
  follow.reset();assert.equal(follow.snapshot.total,0);
});
test('rests, dead notes and tied destinations do not demand a new attack; polyphonic passages are rejected',()=>{
  const follow=new NoteFollowing();
  const partial={...timeline,events:[event(0,0,{rest:true}),event(960,0,{notes:[{string:6,fret:0,tied:true}]}),event(1920,3)]};
  assert.equal(follow.start(partial),1920);assert.equal(follow.steps.length,1);
  assert.throws(()=>follow.start({...timeline,events:[event(0,0,{notes:[{string:6,fret:0},{string:5,fret:2}]})]}),/contains chords/);
  assert.throws(()=>follow.start({...timeline,events:[event(0,0),event(0,3)]}),/contains chords/);
  assert.throws(()=>follow.start({...timeline,events:[]}),/No playable/);
});
