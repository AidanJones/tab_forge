import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importer, Settings, midi } from '@coderline/alphatab';
import { playAlongTimeline } from '../practice/play-along-timeline.js';
import { playAlongTick } from '../practice/transport.js';

function fixture() {
  const settings = new Settings();
  const score = importer.ScoreLoader.loadAlphaTex('\\tempo 90 \\tuning E4 B3 G3 D3 A2 E2 \\chord ("C" 0 1 0 2 3 x) . \\ro :4 (0.1 1.2 0.3 2.4 3.5){ch "C"} 3.5 2.4 0.3 | \\rc 2 1.2 0.1 1.2 0.1 |', settings);
  const generator = new midi.MidiFileGenerator(score, settings, new midi.AlphaSynthMidiFileHandler(new midi.MidiFile()));
  generator.generate();
  return { score, cache: generator.tickLookup };
}

test('timeline follows actual repeat playback order and conventional high-string numbering', () => {
  const { score, cache } = fixture();
  const track = score.tracks[0], beat = track.staves[0].bars[0].voices[0].beats[0];
  beat.brushType = 2; beat.text = '<Let it ring>';
  const plan = new WeakMap([[beat.notes.find(n=>n.fret===3),{finger:3}]]);
  const timeline = playAlongTimeline(track, cache, plan);
  assert.deepEqual(timeline.bars.map(b=>b.number), [1,2,1,2]);
  assert.equal(timeline.events.length, 16);
  const [first] = timeline.events;
  assert.equal(first.start, cache.masterBars[0].start);
  assert.equal(timeline.events[8].start, cache.masterBars[2].start);
  assert.equal(first.chord, 'C'); assert.equal(first.direction, 'down');
  assert.equal(first.text, '<Let it ring>');
  assert(first.notes.some(n=>n.string===5 && n.fret===3 && n.finger===3));
  assert(first.notes.some(n=>n.string===1 && n.fret===0));
  assert.equal(timeline.events[1].direction, '');
  assert(first.end>first.start);
});

test('clock respects speed, pause and loop bounds and limits extrapolation', () => {
  const state={playing:true,speed:50,position:{currentTick:960,endTick:8000,tempo:120}};
  assert.equal(playAlongTick(state,100),1056);
  assert.equal(playAlongTick(state,5000),1075.2);
  assert.equal(playAlongTick({...state,playing:false},100),960);
  assert.equal(playAlongTick({...state,looping:true,range:{endTick:1000}},100),1000);
  assert.equal(playAlongTick({...state,position:{...state.position,currentTick:200}},0),200);
  assert.deepEqual(playAlongTimeline(null,null).events,[]);
});
