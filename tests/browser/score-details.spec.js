import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { importer, Settings } from '@coderline/alphatab';

const lesson='title: Gentle picking\nchords:\nC: x32010\nAm: x02210\n[Verse - C]\nnote: Softly, let it ring\n"Take your time now"\n3f5s 2f4s 0s3 1f2s\n0s1 1f2s 0s3 2f4s';
async function edit(page,source) {
  await page.goto('/index.html');
  await page.locator('#input').fill(source);
  await page.getByRole('button',{name:'Update preview',exact:true}).click();
  await expect(page.locator('#play')).toBeEnabled();
  await page.locator('#score-viewport').scrollIntoViewIfNeeded();
  await expect(page.locator('#score svg').first()).toBeVisible();
}

test('the single new score shows top chord diagrams, instructions and lyrics and exports them',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await edit(page,lesson);
  await expect(page.locator('#output,.tab-line,.printable-sheet')).toHaveCount(0);
  await expect(page.locator('#score')).toContainText('Softly, let it ring');
  await expect(page.locator('#score')).toContainText('Take');
  await expect(page.locator('#score-chords')).toBeChecked();
  await expect(page.locator('#score')).toContainText('Am'); // Defined library, even when only C is played.
  const textPositions=await page.locator('#score svg text').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,y:n.getBoundingClientRect().y})));
  expect(Math.min(...textPositions.filter(n=>n.text==='C').map(n=>n.y))).toBeLessThan(textPositions.find(n=>n.text==='Softly, let it ring').y);
  await page.locator('#score-shapes').check();
  await expect(page.locator('#shape-hint-status')).not.toContainText('suggested grip');
  const download=page.waitForEvent('download');
  await page.locator('#save-gp').click();
  const file=await download;
  const score=importer.ScoreLoader.loadScoreFromBytes(await readFile(await file.path()),new Settings());
  const beats=score.tracks[0].staves[0].bars[0].voices[0].beats;
  expect(beats[0].text).toBe('Softly, let it ring');
  expect(beats.map(beat=>beat.lyrics?.[0])).toEqual(['Take','your','time','now']);
  expect(beats[0].chord.name).toBe('C');
  expect(beats.every(beat=>beat.notes.length===1)).toBe(true);
  await page.locator('#score-viewport').screenshot({path:'test-results/new-score-details.png'});
  // Verify the native full-score print view while suppressing the system dialog.
  await page.evaluate(()=>{
    const original=window.open;
    window.open=function(...args) {
      const preview=original.apply(window,args);
      preview.print=()=>{preview.document.documentElement.dataset.printed='true';};
      return preview;
    };
  });
  const opened=page.waitForEvent('popup');
  await page.locator('#print-score').click();
  const printView=await opened;
  await expect(printView.locator('svg').first()).toBeVisible();
  await expect(printView.locator('body')).toContainText('Softly, let it ring');
  await expect(printView.locator('body')).toContainText('Take');
  await expect(printView.locator('html')).toHaveAttribute('data-printed','true');
  await printView.screenshot({path:'test-results/new-score-print.png',fullPage:true});
  await printView.close();
  await page.emulateMedia({media:'print'});
  await expect(page.locator('#score')).toBeVisible();
  await expect(page.locator('.input-section')).toBeHidden();
  await expect(page.locator('.transport')).toBeHidden();
  expect(errors).toEqual([]);
});

test('optional suggested grips are shared across pages, keep playback running and stay out of exports',async({page})=>{
  await edit(page,'title: Unlabelled picking\n[Verse]\n3f5s 2f4s 0s3 1f2s');
  await expect(page.locator('#score-shapes')).not.toBeChecked();
  await page.locator('#score-shapes').check();
  await expect(page.locator('#shape-hint-status')).toContainText('1 suggested grip');
  await expect(page.locator('#score')).toContainText('C shape (suggested)');
  const download=page.waitForEvent('download');
  await page.locator('#save-gp').click();
  const file=await download;
  const score=importer.ScoreLoader.loadScoreFromBytes(await readFile(await file.path()),new Settings());
  expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chordId).toBeNull();
  await page.locator('#speed').fill('25');
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveText('Pause');
  const before=await page.locator('#position').evaluate(n=>Number(n.value));
  await page.locator('#score-shapes').uncheck();
  await expect(page.locator('#play')).toHaveText('Pause');
  await expect.poll(()=>page.locator('#position').evaluate(n=>Number(n.value))).toBeGreaterThan(before);
  await page.locator('#stop').click();
  await page.locator('#score-shapes').check();
  await page.goto('/practice.html');
  await expect(page.locator('#score-shapes')).toBeChecked();
  await page.locator('#file').setInputFiles({name:'picking.alphatex',mimeType:'text/plain',buffer:Buffer.from('\\tuning E4 B3 G3 D3 A2 E2 . 3.5 2.4 0.3 1.2 |')});
  await expect(page.locator('#play')).toBeEnabled();
  await page.locator('#score-viewport').scrollIntoViewIfNeeded();
  await expect(page.locator('#shape-hint-status')).toContainText('1 suggested grip');
  await expect(page.locator('#score')).toContainText('C shape (suggested)');
  await page.locator('#score-chords').uncheck();
  await page.reload();
  await expect(page.locator('#score-chords')).not.toBeChecked();
});
