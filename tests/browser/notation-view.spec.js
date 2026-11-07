import { test, expect } from '@playwright/test';
import { importer, Settings } from '@coderline/alphatab';
import { readFile } from 'node:fs/promises';

async function expectNotation(page,tab,sheet) {
  await page.locator('#score-viewport').scrollIntoViewIfNeeded();
  await expect.poll(async()=>{
    const text=await page.locator('#score').textContent();
    // alphaTab's pinned SMuFL glyphs: six-string TAB and guitar G clefs.
    return {tab:text.includes('\ue06d'),sheet:/[\ue050-\ue054]/u.test(text)};
  }).toEqual({tab,sheet});
}

test('editor switches among tab, sheet music and both without interrupting playback',async({page})=>{
  await page.goto('/index.html');
  await page.locator('#input').fill('title: Notation choices\n[Verse - C]\nnote: Gently\n"Take your time now"\n3f5s 2f4s 0s3 1f2s');
  await page.getByRole('button',{name:'Update preview',exact:true}).click();
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.getByLabel('Notation',{exact:true})).toHaveValue('both');
  await expectNotation(page,true,true);
  await page.locator('#score-notation').selectOption('tab');
  await expectNotation(page,true,false);
  await expect(page.locator('#score')).toContainText('Gently');
  await expect(page.locator('#score')).toContainText('Take');
  const download=page.waitForEvent('download');
  await page.locator('#save-gp').click();
  const file=await download;
  const score=importer.ScoreLoader.loadScoreFromBytes(await readFile(await file.path()),new Settings());
  expect(score.tracks[0].staves[0].showTablature).toBe(true);
  expect(score.tracks[0].staves[0].showStandardNotation).toBe(false);
  await page.locator('#speed').fill('25');
  await page.locator('#play').click();
  const position=await page.locator('#position').evaluate(n=>Number(n.value));
  await page.locator('#score-notation').selectOption('sheet');
  await expectNotation(page,false,true);
  await expect(page.locator('#play')).toHaveText('Pause');
  await expect.poll(()=>page.locator('#position').evaluate(n=>Number(n.value))).toBeGreaterThan(position);
  await page.locator('#score-notation').selectOption('both');
  await expectNotation(page,true,true);
  await page.locator('#stop').click();
});

test('notation preference survives navigation and import on Practice',async({page})=>{
  await page.goto('/index.html');
  await page.getByRole('button',{name:'Load example',exact:true}).click();
  await expect(page.locator('#play')).toBeEnabled();
  await page.locator('#score-notation').selectOption('tab');
  await page.goto('/practice.html');
  await expect(page.locator('#score-notation')).toHaveValue('tab');
  await page.locator('#file').setInputFiles({name:'view.alphatex',mimeType:'text/plain',buffer:Buffer.from('\\tuning E4 B3 G3 D3 A2 E2 . 3.5 2.4 0.3 1.2 |')});
  await expect(page.locator('#play')).toBeEnabled();
  await expectNotation(page,true,false);
  await page.locator('#score-notation').selectOption('sheet');
  await expectNotation(page,false,true);
  await page.reload();
  await expect(page.locator('#score-notation')).toHaveValue('sheet');
});
