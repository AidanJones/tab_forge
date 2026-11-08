import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scoreAvailability} from '../practice/score-library-plugin.js';

test('score availability checks physical GP4 files and retains found sources when files are missing',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'tab-forge-gp4-'));
  try{
    await writeFile(join(directory,'valid.gp4'),await readFile(new URL('./fixtures/original-four-notes.gp4',import.meta.url)));
    await writeFile(join(directory,'invalid.gp4'),'<!doctype html>Not a score');
    const data={songs:[{id:1,guitar_pro_files:[{filename:'valid.gp4',format:'gp4'},{filename:'missing.gp4',format:'gp4'},{filename:'invalid.gp4',format:'gp4'},{filename:'../outside.gp4',format:'gp4'}]}]};
    const files=await scoreAvailability(data,directory);assert.equal(files.length,3);
    assert.deepEqual(files.map(f=>f.local),[true,false,false]);assert.equal(files[0].songId,'songs:1');assert.equal(files[0].url,'scores/valid.gp4');
    await unlink(join(directory,'valid.gp4'));assert.equal((await scoreAvailability(data,directory))[0].local,false);
  }finally{for(const file of ['valid.gp4','invalid.gp4'])await unlink(join(directory,file)).catch(()=>{});await rmdir(directory);}
});
