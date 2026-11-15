import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {listScores,scoreAvailability} from '../practice/score-library-plugin.js';
test('public build never discovers local downloaded scores or marks them available',async()=>{
  const previous=process.env.TAB_FORGE_PUBLIC_BUILD;process.env.TAB_FORGE_PUBLIC_BUILD='true';
  try{assert.deepEqual(await listScores(),[]);assert((await scoreAvailability()).every(file=>!file.local&&file.url===null));}
  finally{if(previous===undefined)delete process.env.TAB_FORGE_PUBLIC_BUILD;else process.env.TAB_FORGE_PUBLIC_BUILD=previous;}
});
test('deployment workflow uses the privacy-checked Pages build and does not hydrate GP4 downloads',async()=>{
  const workflow=await readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
  assert(workflow.includes('pnpm build:pages'));assert(workflow.includes('pnpm test'));assert(!workflow.includes('download-gp4'));assert(workflow.includes('pages: write'));
});
