import {test,expect} from '@playwright/test';
import {openSection} from './workflow-helpers.js';

test('personal riffs are searchable, persistent and preserve timestamped references through backups',async({page})=>{
  await page.goto('/practice.html#riffs');
  await expect(page.locator('.riff-card')).toHaveCount(6);
  await page.locator('#riff-search').fill('Fingerpicking');await expect(page.locator('.riff-card')).toHaveCount(1);
  await page.locator('#riff-search').fill('');await openSection(page,'#riff-create');
  await page.getByLabel('Riff title',{exact:true}).fill('My intro');await page.getByLabel('Song / artist').fill('My song');
  await page.getByLabel('YouTube example URL').fill('https://youtu.be/example?t=42');
  await page.getByLabel('Short tab',{exact:true}).fill('0.6 3.6 5.6 3.6');await page.getByRole('button',{name:'Save short tab',exact:true}).click();
  await expect(page.locator('#riff-status')).toContainText('Riff saved');
  await page.reload();await page.locator('#riff-search').fill('My song');
  await expect(page.locator('.riff-card')).toHaveCount(1);await expect(page.getByRole('link',{name:'Watch example'})).toHaveAttribute('href','https://youtu.be/example?t=42');
  await page.getByRole('button',{name:'Hear / view riff',exact:true}).click();await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#score-title')).toHaveText('My intro');
  await page.getByRole('link',{name:'← Back to riffs',exact:true}).click();
  await openSection(page,'#riff-library > details:last-child');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export riffs',exact:true}).click();
  const file=await download;await page.getByRole('button',{name:'Remove saved riff',exact:true}).click();await expect(page.locator('.riff-card')).toHaveCount(0);
  await page.locator('#riff-import').setInputFiles(await file.path());await expect(page.locator('.riff-card')).toHaveCount(1);
});

test('song passage can become a riff and resumes only its selected bars',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/practice.html');
  await page.locator('#demo').click();await expect(page.locator('#play')).toBeEnabled();
  await openSection(page,'#passage-tracks');await page.locator('#from-bar').selectOption('1');await page.locator('#to-bar').selectOption('1');await page.locator('#select-bars').click();
  await page.getByRole('link',{name:'Riffs',exact:true}).click();await openSection(page,'#riff-create');await page.getByLabel('Riff title',{exact:true}).fill('Just bar two');
  await page.locator('#riff-capture').click();await expect(page.locator('#riff-status')).toContainText('Riff saved');
  await page.reload();await page.locator('#riff-search').fill('Just bar two');await page.getByRole('button',{name:'Practise riff with microphone',exact:true}).click();
  await expect(page.locator('#score-title')).toHaveText('Just bar two');await expect(page.getByLabel('Play-along mode')).toHaveValue('wait');
  await openSection(page,'#passage-tracks');await expect(page.locator('#range-label')).toContainText('bar 2–2');
  expect(Number(await page.locator('#position').evaluate(n=>n.value))).toBeGreaterThan(0);expect(errors).toEqual([]);
});

test('editor riff practice preserves lesson text and fits a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/index.html#riffs');
  const lesson=await page.locator('#input').inputValue();
  await page.locator('.riff-card').nth(1).getByRole('button',{name:'Practise riff with microphone',exact:true}).click();
  await expect(page.locator('#score-title')).toHaveText('Minor pentatonic answer');await expect(page.locator('#play-along')).toBeVisible();
  await expect(page.locator('#editor-player')).not.toHaveAttribute('inert');
  await openSection(page,'#score-exports');await page.locator('#save-project').click();await expect(page.locator('#project-save-status')).toContainText('Saved project');
  const notes=await page.evaluate(async()=>{const {ProjectStore}=await import('/practice/project-store.js');const store=new ProjectStore();return (await store.all('projects'))[0].lessonNotes;});expect(notes).toBeFalsy();
  await page.getByRole('link',{name:'← Back to riffs',exact:true}).click();
  expect(await page.locator('#input').inputValue()).toBe(lesson);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'test-results/riffs-phone.png',fullPage:true});
});
