import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MidiOutput } from '../practice/midi-output.js';

async function setup() {
  const messages = [];
  const port = { id: 'fm1', name: 'M-VAVE FM1', state: 'connected', open: async () => {}, close: async () => {}, clear() {}, send(bytes) { messages.push(bytes); } };
  const access = { outputs: new Map([[port.id, port]]) };
  const midi = new MidiOutput(() => {}, async () => access);
  await midi.connect();
  await midi.arm('fm1');
  messages.length = 0;
  return { midi, messages, port, access };
}

test('MIDI output sends scaled note-on/off to the chosen channel and tracks overlapping pitches', async () => {
  const { midi, messages } = await setup();
  midi.setChannel(3);
  messages.length = 0;
  midi.forward([{ kind: 'on', key: 60, velocity: 100 }, { kind: 'on', key: 60, velocity: 100 }]);
  assert.deepEqual(messages[0], [0x92, 60, 65]);
  midi.forward([{ kind: 'off', key: 60 }]);
  assert.equal(messages.length, 2);
  midi.forward([{ kind: 'off', key: 60 }]);
  assert.deepEqual(messages[2], [0x82, 60, 0]);
  assert.equal(midi.held.size, 0);
});

test('panic releases notes/sustain and volume zero prevents new notes', async () => {
  const { midi, messages } = await setup();
  midi.forward([{ kind: 'on', key: 64, velocity: 90 }]);
  midi.setVolume(0);
  assert(messages.some(bytes => bytes[0] === 0x80 && bytes[1] === 64));
  assert(messages.some(bytes => bytes[0] === 0xb0 && bytes[1] === 64 && bytes[2] === 0));
  assert(messages.some(bytes => bytes[0] === 0xb0 && bytes[1] === 123));
  const count = messages.length;
  midi.forward([{ kind: 'on', key: 60, velocity: 80 }]);
  assert.equal(messages.length, count);
});

test('unplug and send failure disarm the output and clear held notes', async () => {
  const { midi, port, access } = await setup();
  midi.forward([{ kind: 'on', key: 60, velocity: 80 }]);
  port.state = 'disconnected';
  access.onstatechange();
  assert(!midi.enabled);
  assert.equal(midi.held.size, 0);
  port.state = 'connected';
  await midi.arm('fm1');
  port.send = () => { throw new Error('unplugged'); };
  midi.forward([{ kind: 'on', key: 61, velocity: 80 }]);
  assert(!midi.enabled);
  assert.match(midi.status, /failed/);
});

test('a pending port open cannot re-enable output after Stop/disarm', async () => {
  const { midi, port } = await setup();
  let release;
  port.open = () => new Promise(resolve => { release = resolve; });
  const pending = midi.arm('fm1');
  midi.disarm();
  release();
  await pending;
  assert(!midi.enabled);
});
