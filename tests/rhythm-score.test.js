import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importer,Settings} from '@coderline/alphatab';
import {rhythmNotation} from '../practice/rhythm-score.js';
import {RHYTHM_PRESETS,pickingTargets} from '../practice/rhythm-patterns.js';
import {CHORD_LIBRARY} from '../practice/chord-library.js';

const load=data=>importer.ScoreLoader.loadAlphaTex(rhythmNotation(data).tex,new Settings());
test('all rhythm templates produce one exact bar with the intended rests, pitches and strum directions',()=>{
  for(const chord of Object.keys(CHORD_LIBRARY))for(const p of Object.values(RHYTHM_PRESETS)){
    const plan=p.strings?pickingTargets(chord,p.strings,p.hits):null;
    const score=load({hits:p.hits,technique:p.technique,chord,plan});
    assert.equal(score.masterBars.length,1);const beats=score.tracks[0].staves[0].bars[0].voices[0].beats;assert.equal(beats.length,8);
    for(const [i,beat]of beats.entries()){
      assert.equal(beat.duration,8);assert.equal(beat.isRest,!p.hits[i]);assert.equal(beat.text,`${Math.floor(i/2)+1}${i%2?' +':''}`);
      if(!p.hits[i])continue;
      if(p.technique==='picking')assert.equal(beat.notes[0].realValue,plan[i].midi);
      else {assert.equal(beat.pickStroke,i%2?1:2);assert.equal(beat.notes.length,CHORD_LIBRARY[chord].filter(f=>f>=0).length);}
    }
  }
});

test('unspecified attacks are dead-note crosses, while custom pitches keep their exact sound',()=>{
  const p=RHYTHM_PRESETS.eighths;
  for(const technique of ['picking','strumming']){
    const score=load({hits:p.hits,technique,chord:'any'});
    assert(score.tracks[0].staves[0].bars[0].voices[0].beats.every(b=>b.notes.every(n=>n.isDead)));
  }
  const notes=[40,43,48,55,59,64,76,88],score=load({hits:p.hits,technique:'picking',chord:'any',targets:notes});
  assert.deepEqual(score.tracks[0].staves[0].bars[0].voices[0].beats.map(b=>b.notes[0].realValue),notes);
});
