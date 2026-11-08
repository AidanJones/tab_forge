import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importer,Settings} from '@coderline/alphatab';
import {RIFFS,riffExercise,validateRiff,youtubeReference} from '../practice/riffs.js';

test('starter riffs are short playable single-note scores with correct string tuning',()=>{
  for(const riff of RIFFS){
    const score=importer.ScoreLoader.loadAlphaTex(riffExercise(riff).tex,new Settings());
    assert.equal(score.title,riff.title);
    assert.deepEqual(score.tracks[0].staves[0].tuning,[64,59,55,50,45,40]);
    assert.equal(score.masterBars.length,2);
    for(const bar of score.tracks[0].staves[0].bars)for(const beat of bar.voices[0].beats)assert.equal(beat.notes.length,1);
  }
});
test('custom riff input bounds musical length and permits only safe YouTube reference links',()=>{
  const riff=validateRiff({title:'My phrase',tab:'0.6 3.6 5.6 3.6',youtube:'https://youtu.be/abc?t=30'});
  assert.equal(riff.youtube,'https://youtu.be/abc?t=30');assert(riff.id);
  for(const tab of ['0.7 3.6 5.6 3.6','25.6 3.6 5.6 3.6','0.6','0.6 0.6 0.6 0.6 | '.repeat(9)])assert.throws(()=>validateRiff({title:'Bad',tab}));
  for(const url of ['javascript:alert(1)','https://youtube.com.evil.test','http://youtube.com/watch?v=a','https://evil@youtube.com/watch?v=a'])assert.throws(()=>youtubeReference(url));
});
test('saved passages retain range and track across backup validation without autoplay',()=>{
  const riff=validateRiff({title:'Song intro',tex:'score',session:{range:{startTick:3840,endTick:7680},selectedTrack:2}});
  assert.deepEqual(validateRiff(JSON.parse(JSON.stringify(riff))),riff);
  assert.deepEqual(riff.session,{range:{startTick:3840,endTick:7680},track:2,tick:3840,looping:true});
  assert.throws(()=>validateRiff({title:'Missing passage',tex:'score'}));
});
