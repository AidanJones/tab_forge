import {test} from 'node:test';
import assert from 'node:assert/strict';
import {noteAt,notePool,nextNote} from '../practice/note-map.js';
test('natural note maps follow guitar tuning, octave repeat and semitone gaps',()=>{
  assert.deepEqual(notePool('6').map(n=>[n.fret,n.name]),[[0,'E'],[1,'F'],[3,'G'],[5,'A'],[7,'B'],[8,'C'],[10,'D'],[12,'E']]);
  assert.deepEqual(notePool('5').map(n=>n.fret),[0,2,3,5,7,8,10,12]);
  for(let f=0;f<=12;f++){assert.equal(noteAt(1,f).name,noteAt(6,f).name);assert.equal(noteAt(1,f).midi-noteAt(6,f).midi,24);}
  assert.equal(noteAt(6,0).octave,2);assert.equal(noteAt(1,0).octave,4);
});
test('quiz pools respect chosen strings, frets and accidental selection',()=>{
  assert(notePool('bass',5).every(n=>[5,6].includes(n.string)&&n.fret<=5&&n.natural));
  assert(notePool('treble').every(n=>[1,2].includes(n.string)));
  assert.equal(notePool('all',12,false).length,78);
  const pool=notePool('6',5);assert.notDeepEqual(nextNote(pool,pool[0],()=>0),pool[0]);
  assert.throws(()=>noteAt(0,1));assert.throws(()=>noteAt(6,-1));
});
