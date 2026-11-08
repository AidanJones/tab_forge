import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scalePositions,FIFTHS} from '../practice/scale-map.js';
import {ROOTS,SCALES,scaleExercise} from '../practice/exercises.js';
test('whole-neck maps contain precisely the selected scale and mark its tonic across all strings',()=>{
  for(let root=0;root<12;root++)for(const type of Object.keys(SCALES)){
    const positions=scalePositions(root,type,24);
    assert(positions.every(n=>SCALES[type].intervals.includes(n.interval)));
    assert(positions.filter(n=>n.root).every(n=>n.pc===root&&n.degree==='1'));
    for(const note of scaleExercise(root,type).notes)assert(positions.some(n=>n.string===note.string&&n.fret===note.fret));
    assert.equal(new Set(positions.map(n=>n.string)).size,6);
  }
});
test('circle moves by fifths and each relative minor shares its major scale pitches',()=>{
  assert.equal(new Set(FIFTHS.map(k=>k.pc)).size,12);
  for(const [i,key]of FIFTHS.entries()){
    assert.equal((FIFTHS[(i+1)%12].pc-key.pc+12)%12,7);
    const major=SCALES.major.intervals.map(n=>(n+key.pc)%12).sort((a,b)=>a-b);
    const minor=SCALES.minor.intervals.map(n=>(n+key.pc+9)%12).sort((a,b)=>a-b);
    assert.deepEqual(major,minor);
  }
});
