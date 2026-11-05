import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listScores } from '../practice/score-library-plugin.js';

test('library lists score files, encodes names and refreshes without scanning folders', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tab-forge-library-'));
  try {
    await writeFile(join(directory, 'riff 2 #1.GP4'), 'fixture');
    await writeFile(join(directory, 'README.md'), 'ignored');
    await mkdir(join(directory, 'subfolder.gp4'));
    assert.deepEqual(await listScores(directory), [{ name: 'riff 2 #1.GP4', url: 'scores/riff%202%20%231.GP4' }]);
    await writeFile(join(directory, 'riff 10.gp5'), 'fixture');
    assert.equal((await listScores(directory)).length, 2);
  } finally {
    // mkdtemp provides the exact newly created temporary directory.
    await rm(directory, { recursive: true });
  }
});
