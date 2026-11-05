import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({ window: { addEventListener() {} }, document: { getElementById() { return { addEventListener() {} }; } } });
vm.runInContext(script, context);

test('browser tabs number high e as string one and keep multi-digit columns aligned', () => {
  assert.equal(context.notesToTab('3f1s').split('\n')[0], 'e|3|');
  const lines = context.notesToTab('12f1s 0s2').split('\n');
  assert.equal(lines[0], 'e|12--|');
  assert.equal(lines[1], 'B|---0|');
  assert.equal(new Set(lines.map(line => line.length)).size, 1);
});

test('spaced plus groups form one chord column, not successive notes', () => {
  assert.equal(context.notesToTab('12f5s + 2f4s'), context.notesToTab('12f5s+2f4s'));
  assert.equal(context.notesToTab('2f5s + 2f4s').split('\n')[3], 'D|2|');
});

test('chord names ignore case and custom definitions override the built-in library', () => {
  assert.equal(context.chordToTab('em'), context.chordToTab('Em'));
  assert.equal(context.chordToTab('c', { C: 'x35553' }).split('\n')[0], 'e|3|');
  assert.equal(context.chordToTab('Q', { Q: 'x32010' }).split('\n')[0], 'e|0|');
  assert.match(context.chordToTab('Q', { Q: 'x12' }), /Invalid shape/);
});
