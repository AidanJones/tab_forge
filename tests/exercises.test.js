import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importer, Settings } from '@coderline/alphatab';
import { chordExercise, scaleExercise, scalePatterns, SCALES, NoteTrainer, STANDARD_TUNING } from '../practice/exercises.js';
import { midiFrequency } from '../practice/pitch.js';

test('all 108 two-octave scales contain every intended pitch in a compact playable position and import as real tabs',()=>{
  for(let root=0;root<12;++root)for(const [key,scale] of Object.entries(SCALES)){
    const exercise=scaleExercise(root,key,'up');
    assert.equal(exercise.notes.length,scale.intervals.length*2+1);
    assert.equal(exercise.notes.at(-1).midi-exercise.notes[0].midi,24);
    for(const note of exercise.notes){
      assert.equal(STANDARD_TUNING[note.string-1]+note.fret,note.midi);
      assert(note.fret>=exercise.base&&note.fret<=exercise.base+4);
      assert(scale.intervals.includes((note.midi-exercise.notes[0].midi)%12));
    }
    const score=importer.ScoreLoader.loadAlphaTex(exercise.tex,new Settings());
    const notes=score.tracks[0].staves[0].bars.flatMap(bar=>bar.voices[0].beats.flatMap(beat=>beat.notes));
    assert.deepEqual(notes.map(note=>note.realValue),exercise.notes.map(note=>note.midi));
    const both=scaleExercise(root,key,'both').notes;
    assert.deepEqual(both.slice(exercise.notes.length),exercise.notes.slice(0,-1).reverse());
    assert.deepEqual(scaleExercise(root,key,'down').notes,[...exercise.notes].reverse());
  }
});
test('chord checks exclude muted strings and require each correct string pitch in order',()=>{
  const notes=chordExercise('C'), trainer=new NoteTrainer(notes);
  assert.deepEqual(notes.map(n=>n.string),[5,4,3,2,1]);
  assert.deepEqual(notes.map(n=>n.midi),[48,52,55,60,64]);
  assert(!trainer.hear({frequency:440}));assert.equal(trainer.index,0);
  assert(!trainer.hear({frequency:midiFrequency(48)*2**(45/1200)}));
  for(const note of notes){assert(trainer.hear({frequency:midiFrequency(note.midi)}));assert(!trainer.hear({frequency:midiFrequency(note.midi)}));}
  assert(trainer.complete);trainer.reset();assert.equal(trainer.index,0);
  const repeats=new NoteTrainer([notes[0],notes[0]]);
  assert(repeats.hear({frequency:midiFrequency(48)}));assert(!repeats.hear({frequency:midiFrequency(48)}));repeats.hear(null);assert(repeats.hear({frequency:midiFrequency(48)}));
});


test('every scale pattern has valid pitches and frets, reverses exactly and imports without losing notes',()=>{
  for(let root=0;root<12;root++)for(const [type,scale]of Object.entries(SCALES))for(const pattern of scalePatterns(root,type)){
    const exercise=scaleExercise(root,type,'up',pattern.id),notes=exercise.notes;
    assert(notes.length>1);
    for(const [i,n]of notes.entries()){
      assert(n.fret>=0&&n.fret<=24,`${root} ${type} ${pattern.id}`);
      assert.equal(n.midi,STANDARD_TUNING[n.string-1]+n.fret);
      assert(scale.intervals.includes((n.midi-root+120)%12));
      if(i)assert(n.midi>notes[i-1].midi);
    }
    if(pattern.id.startsWith('box')){assert.equal(notes.length,12);for(let string=1;string<=6;string++)assert.equal(notes.filter(n=>n.string===string).length,2);}
    if(pattern.id==='neck'){assert.equal(notes.at(-1).midi-notes[0].midi,36);assert.equal(notes.at(-1).fret-notes[0].fret,12);assert.equal(notes.length,scale.intervals.length*3+1);}
    const score=importer.ScoreLoader.loadAlphaTex(exercise.tex,new Settings());
    const parsed=score.tracks[0].staves[0].bars.flatMap(b=>b.voices[0].beats.flatMap(beat=>beat.notes.map(n=>n.realValue)));
    assert.deepEqual(parsed,notes.map(n=>n.midi));
    assert.deepEqual(scaleExercise(root,type,'down',pattern.id).notes,[...notes].reverse());
    assert.deepEqual(scaleExercise(root,type,'both',pattern.id).notes,[...notes,...notes.slice(0,-1).reverse()]);
  }
});
