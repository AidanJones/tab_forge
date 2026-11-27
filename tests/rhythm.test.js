import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AttackDetector,RhythmSession,RHYTHM_PRESETS,timingWindow} from '../practice/rhythm-engine.js';
import {pickingTargets} from '../practice/rhythm-patterns.js';
import {CHORD_LIBRARY} from '../practice/chord-library.js';
import {STANDARD_TUNING} from '../practice/exercises.js';

test('timing grades, single-credit attacks, rests and optional pitch bonuses',()=>{
  const s=new RhythmSession({hits:RHYTHM_PRESETS.offbeats.hits,bpm:60,adaptive:false});s.start(5);
  assert.equal(s.attack(2),null);assert.equal(s.extras,0);
  const first=s.attack(5.02);assert.equal(s.points,100);s.pitch(first,43,43);assert.equal(s.points,150);
  s.pitch(first,43,43);assert.equal(s.points,150);
  assert.equal(s.attack(5.03),null);assert.equal(s.extras,1);assert.equal(s.combo,0);
  assert.equal(s.attack(5.5),null);assert.equal(s.extras,2);
  const second=s.attack(6.075);assert.equal(s.points,210);s.pitch(second,51,50);assert.equal(s.bonuses,1);
  const third=s.attack(6.625);assert.equal(s.points,240);assert.equal(third.slot,3);
  s.tick(8.9);assert.equal(s.misses,3);assert.equal(s.accuracy,38);
});

test('three accurate bars raise future tempo; two difficult bars lower it within limits',()=>{
  const s=new RhythmSession({hits:RHYTHM_PRESETS.quarters.hits,bpm:50,min:45,max:55});s.start(0);
  let start=0;
  for(let round=0;round<3;round++){
    const bar=s.bars.find(b=>Math.abs(b.start-start)<.001);
    for(const event of bar.events.filter(e=>e.active)){s.tick(event.at);assert(s.attack(event.at));}
    s.tick(bar.end+.001);start=bar.end;
  }
  assert.equal(s.bpm,55);assert.equal(s.totalHits,12);
  for(let i=0;i<4;i++){const bar=s.bars.find(b=>!b.done);s.tick(bar.end+.001);}
  assert.equal(s.bpm,45);assert(s.bars.every(b=>b.bpm>=45&&b.bpm<=55));
  const manual=new RhythmSession({hits:RHYTHM_PRESETS.quarters.hits,bpm:50,adaptive:false});manual.start(0);
  for(let i=0;i<4;i++)manual.tick(manual.bars.at(-1).end+.01);assert.equal(manual.bpm,50);
});

test('miss deadlines use input correction without moving metronome events',()=>{
  const s=new RhythmSession({hits:RHYTHM_PRESETS.quarters.hits,bpm:60});s.start(5);
  s.tick(5.2,.12);assert.equal(s.misses,0);assert(s.attack(5.2-.12));
  assert.equal(s.bars[0].events[0].at,5);s.tick(6.3,.12);assert.equal(s.misses,1);
  assert(timingWindow(180)<30/180/2);
});

test('energy attacks require a new rise, ignore a held note, and suppress a strum cluster',()=>{
  const d=new AttackDetector();assert(d.hear(.05,1));
  for(let i=1;i<30;i++)assert(!d.hear(.05,1+i*.01));
  assert(!d.hear(.001,1.4));assert(d.hear(.08,1.41));
  d.hear(.001,1.42);assert(!d.hear(.1,1.43));
  for(let i=0;i<30;i++)d.hear(.0001,1.5+i*.01);
  assert(d.hear(.01,2));d.reset();assert(!d.hear(.001,3));
});

test('silent and malformed patterns cannot start',()=>{
  for(const options of [{hits:Array(8).fill(0)},{hits:[1,1]},{hits:Array(8).fill(1),bpm:0}])assert.throws(()=>new RhythmSession(options));
});

test('all chord-aware picking templates map only to fretted notes and follow bass-string changes',()=>{
  for(const [chord,frets]of Object.entries(CHORD_LIBRARY))for(const p of Object.values(RHYTHM_PRESETS).filter(p=>p.strings)){
    const notes=pickingTargets(chord,p.strings,p.hits);
    for(const n of notes.filter(Boolean)){
      assert.equal(n.fret,frets[6-n.string]);assert(n.fret>=0);assert.equal(n.midi,STANDARD_TUNING[n.string-1]+n.fret);assert(['P','I','M','A'].includes(n.finger));
    }
  }
  const p=RHYTHM_PRESETS.arpeggio;
  for(const [chord,string,midi]of [['C',5,48],['Am',5,45],['G',6,43],['D',4,50],['G/B',5,47]]){
    const first=pickingTargets(chord,p.strings,p.hits)[0];assert.equal(first.string,string);assert.equal(first.midi,midi);
  }
  assert.throws(()=>pickingTargets('C',[6]),/mutes string 6/);
  assert.deepEqual(pickingTargets('C',[6],[false]),[null]);
  assert.equal(RHYTHM_PRESETS.reggae.hits.join(''),'01010101');assert.equal(RHYTHM_PRESETS.strum.hits.join(''),'10110111');
});
