import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, centsBetween, midiFrequency, pitchNote, StablePitch, signalDb } from '../practice/pitch.js';

const tone=(frequency,rate=48000,amplitude=.2)=>Float32Array.from({length:8192},(_,i)=>amplitude*(Math.sin(2*Math.PI*frequency*i/rate)+.45*Math.sin(4*Math.PI*frequency*i/rate)+.2*Math.sin(6*Math.PI*frequency*i/rate))+.01);
test('pitch detector resolves guitar/bass fundamentals with overtones and a DC offset at common sample rates',()=>{
  for(const rate of [44100,48000,96000])for(const midi of [28,40,45,50,55,59,64,69,76,88]){
    const frequency=midiFrequency(midi), reading=detectPitch(tone(frequency,rate),rate);
    assert(reading.frequency,`Missing ${midi} at ${rate}`);
    assert(Math.abs(centsBetween(reading.frequency,frequency))<5,`Pitch ${midi} at ${rate}: ${reading.frequency}`);
    assert(reading.confidence>.9);
  }
});
test('silence, below-gate audio, short frames and non-periodic noise do not invent a note',()=>{
  let seed=123;
  const noise=Float32Array.from({length:8192},()=>{seed=(1664525*seed+1013904223)>>>0;return (seed/2**32-.5)*.1;});
  for(const buffer of [new Float32Array(8192),tone(110,48000,.0001),new Float32Array(8),noise])assert.equal(detectPitch(buffer,48000).frequency,null);
});
test('stable readings need repeated agreement, reset on silence and identify signed cents',()=>{
  const stable=new StablePitch(),read={frequency:440,confidence:1,rms:.1};
  assert.equal(stable.update(read),null);assert.equal(stable.update(read),null);assert.equal(stable.update(read).frequency,440);
  assert.equal(stable.update({frequency:330,confidence:1}),null);
  stable.update({frequency:null});assert.equal(stable.update(read),null);
  assert.equal(pitchNote(440).name,'A');assert.equal(pitchNote(440).octave,4);
  assert(Math.abs(pitchNote(440*2**(15/1200)).cents-15)<1e-8);
  assert(Math.abs(pitchNote(440*2**(-15/1200)).cents+15)<1e-8);
});

test('quiet microphone notes pass the default gate while background-level signals remain gated',()=>{
  const quiet=tone(110,48000,.001);
  assert.equal(detectPitch(quiet,48000,{noiseFloor:.003}).frequency,null);
  const detected=detectPitch(quiet,48000);
  assert(Math.abs(centsBetween(detected.frequency,110))<5);
  assert(signalDb(detected.rms)>-65 && signalDb(detected.rms)<-50);
  assert.equal(signalDb(0),-100);
  assert.equal(signalDb(.001),-60);
  assert.equal(detectPitch(tone(110,48000,.0001),48000).frequency,null);
});
