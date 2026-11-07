import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const context=vm.createContext({window:{addEventListener(){}},document:{getElementById(){return{addEventListener(){}};}}});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);

test('source parser preserves colons, hyphenated section names and explicit shape contexts',()=>{
  const data=context.parseMarkdown('title: A song: slowly\nchords:\nQ: x32010\n[Pre-chorus - Q]\nshape: C\n0s1\nnote: Softly: let it ring\n"Words: to sing"');
  assert.equal(data.metadata.title,'A song: slowly');
  assert.equal(data.sections[0].name,'Pre-chorus');
  assert.equal(data.sections[0].chord,'Q');
  assert.deepEqual([...data.sections[0].content],['shape: C','0s1','note: Softly: let it ring','"Words: to sing"']);
});

test('editor has one score output and no legacy ASCII renderer',()=>{
  assert(!html.includes('id="output"'));
  assert(!html.includes('function notesToTab'));
  assert(!html.includes('printable-sheet'));
  assert(html.includes('id="editor-player"'));
});
