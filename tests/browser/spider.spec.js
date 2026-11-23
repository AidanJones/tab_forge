import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {importer,Settings} from '@coderline/alphatab';

test('spider settings make a playable fingered tab and return intact from microphone practice',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/practice.html#spider');
  await expect(page.locator('#spider-pattern option')).toHaveCount(24);
  await expect(page.locator('#tools-panel')).toBeHidden();await expect(page.locator('#drop-zone')).toBeHidden();
  await page.getByLabel('Finger permutation').selectOption('4123');await page.getByLabel('Index finger fret').fill('7');await page.locator('#spider-trainer').getByLabel('Tempo (BPM)',{exact:true}).fill('72');
  await page.getByLabel('String direction').selectOption('down');
  await expect(page.locator('#spider-preview')).toContainText('4 → 1 → 2 → 3 → 2 → 1 → 4');
  await page.getByRole('button',{name:'Load spider tab',exact:true}).click();await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#score-title')).toHaveText('Spider · 4123 · frets 7–10');
  await page.locator('#score-exports > summary').click();
  const exporting=page.waitForEvent('download');await page.locator('#save-alphatex').click();const download=await exporting;
  const score=importer.ScoreLoader.loadAlphaTex(await readFile(await download.path(),'utf8'),new Settings());
  const notes=score.tracks[0].staves[0].bars[0].voices[0].beats.flatMap(b=>b.notes);
  expect(notes.map(n=>n.leftHandFinger)).toEqual([4,1,2,3,2,1,4]);expect(notes.every(n=>n.realValue>=71&&n.realValue<=74)).toBe(true);expect(score.tempo).toBe(72);
  await page.getByRole('link',{name:'← Back to spider',exact:true}).click();
  await expect(page.getByLabel('Finger permutation')).toHaveValue('4123');
  await page.getByRole('button',{name:'Next permutation',exact:true}).click();await expect(page.getByLabel('Finger permutation')).toHaveValue('4132');
  await page.getByRole('button',{name:'Practise spider with microphone',exact:true}).click();
  await expect(page.getByLabel('Play-along mode')).toHaveValue('wait');await expect(page.locator('#play-along')).toBeVisible();
  expect(errors).toEqual([]);
});

test('spider fits a phone and editor exercises keep the lesson draft',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/index.html');
  const draft='title: My kept lesson\n[Verse]\n0s6 2f6s';await page.locator('#input').fill(draft);
  await page.getByRole('link',{name:'Spider',exact:true}).click();await page.getByLabel('Finger permutation').selectOption('2143');
  await page.getByLabel('Return through the pattern', {exact:false}).uncheck();await expect(page.locator('#spider-preview')).toContainText('24 notes');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'test-results/spider-phone.png',fullPage:true});
  await page.getByRole('button',{name:'Load spider tab',exact:true}).click();await expect(page.locator('#play')).toBeEnabled();
  await page.getByRole('link',{name:'← Back to writing',exact:true}).click();await expect(page.locator('#input')).toHaveValue(draft);
});

test('spider waits for the correct pitch through the return and next string',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{
      const context=new AudioContext(),tone=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();
      tone.frequency.value=440;gain.gain.value=.2;tone.connect(gain);gain.connect(destination);tone.start();await context.resume();
      window.spiderPitch=midi=>{tone.frequency.value=440*2**((midi-69)/12);};return destination.stream;
    }});
  });
  await page.goto('/practice.html#spider');await page.getByRole('button',{name:'Practise spider with microphone',exact:true}).click();
  await page.locator('#follow-microphone').click();await expect(page.locator('#play')).toBeEnabled();
  await page.getByLabel('Play-along start delay').selectOption('0');await page.locator('#play').click();
  await expect(page.locator('.play-along-status')).toContainText('0 / 42 played');
  await expect(page.locator('.play-along-status')).toContainText('Heard A4');
  // Index/middle/ring/little then back to index on low E, then index on A.
  for(const [i,midi]of [45,46,47,48,47,46,45,50].entries()){
    await page.evaluate(midi=>window.spiderPitch(midi),midi);
    await expect(page.locator('.play-along-status')).toContainText(`${i+1} / 42 played`);
  }
  await page.locator('#follow-microphone').click();await expect(page.locator('#play')).toBeDisabled();
});
