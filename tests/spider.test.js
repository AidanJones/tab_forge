import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importer, Settings} from '@coderline/alphatab';
import {SPIDER_PATTERNS, spiderExercise} from '../practice/spider.js';
import {STANDARD_TUNING} from '../practice/exercises.js';

test('all 24 spider permutations import with exact finger assignments, pitches and string transitions',()=>{
  assert.equal(SPIDER_PATTERNS.length,24);assert.equal(new Set(SPIDER_PATTERNS).size,24);
  for(const pattern of SPIDER_PATTERNS) for(const returning of [true,false]) for(const direction of ['up','down']){
    assert.equal([...pattern].sort().join(''),'1234');
    const exercise=spiderExercise({pattern,returning,direction,startFret:7});
    const fingers=[...pattern].map(Number);if(returning)fingers.push(...fingers.slice(0,-1).reverse());
    const strings=direction==='up'?[6,5,4,3,2,1]:[1,2,3,4,5,6];
    assert.equal(exercise.notes.length,6*fingers.length);
    const score=importer.ScoreLoader.loadAlphaTex(exercise.tex,new Settings());
    assert.equal(score.masterBars.length,6);
    const parsed=score.tracks[0].staves[0].bars.flatMap(b=>b.voices[0].beats.flatMap(b=>b.notes));
    assert.deepEqual(parsed.map(n=>n.leftHandFinger),exercise.notes.map(n=>n.finger));
    assert.deepEqual(parsed.map(n=>n.realValue),exercise.notes.map(n=>n.midi));
    for(const [i,string]of strings.entries()){
      const notes=exercise.notes.slice(i*fingers.length,(i+1)*fingers.length);
      assert.deepEqual(notes.map(n=>n.finger),fingers);
      assert(notes.every(n=>n.string===string&&n.fret===6+n.finger&&n.midi===STANDARD_TUNING[string-1]+n.fret));
    }
  }
});

test('spider fret boundaries and invalid settings',()=>{
  assert.deepEqual(spiderExercise().notes.slice(0,7).map(n=>n.finger),[1,2,3,4,3,2,1]);
  assert.equal(Math.max(...spiderExercise({startFret:21}).notes.map(n=>n.fret)),24);
  for(const options of [{pattern:'1123'},{pattern:'4123m'},{startFret:0},{startFret:22},{startFret:1.5},{bpm:0},{bpm:241},{direction:'both'}]) assert.throws(()=>spiderExercise(options));
});
