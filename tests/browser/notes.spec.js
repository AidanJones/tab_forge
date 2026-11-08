import {test,expect} from '@playwright/test';
import {notePool,noteAt,STRING_NAMES} from '../../practice/note-map.js';

test('natural fretboard, string presets and highlighted positions teach the correct note names',async({page})=>{
  await page.goto('/notes.html');await expect(page.locator('#note-board button')).toHaveCount(16);
  await page.locator('#note-board button[data-string="6"][data-fret="3"]').click();
  await expect(page.locator('#note-feedback')).toContainText('G2');
  await expect(page.locator('#note-board .highlight')).toHaveCount(2);
  await page.getByLabel('Strings to learn').selectOption('treble');
  await expect(page.locator('#note-board button[data-string="6"]')).toHaveCount(0);
  await expect(page.locator('#note-board button[data-string="1"][data-fret="3"]')).toHaveText('G');
  await page.getByLabel('Notes to show').selectOption('all');await expect(page.locator('#note-board button')).toHaveCount(26);
  await page.reload();await expect(page.getByLabel('Strings to learn')).toHaveValue('treble');
});
test('find and name quizzes hide answers, hold wrong answers and save progress',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/notes.html');
  await page.getByLabel('Strings to learn').selectOption('6');await page.getByLabel('Fret range').selectOption('5');await page.getByLabel('Learning mode').selectOption('find');
  await expect(page.locator('#note-board .target')).toHaveCount(0);
  const question=await page.locator('#note-question').textContent(),target=notePool('6',5).find(n=>question.startsWith(`Find ${n.name} on`));
  const wrong=notePool('6',5).find(n=>n.fret!==target.fret);
  await page.locator(`#note-board button[data-fret="${wrong.fret}"]`).click();await expect(page.locator('#note-feedback')).toContainText('Find');
  await expect(page.locator('#note-question')).toHaveText(question);
  await page.locator(`#note-board button[data-fret="${target.fret}"]`).click();await expect(page.locator('#note-feedback')).toContainText('Correct');
  await expect(page.locator('#note-score')).toContainText('1 correct / 2');
  await page.getByLabel('Learning mode').selectOption('name');
  const marked=page.locator('#note-board .target');await expect(marked).toHaveText('?');
  const fret=Number(await marked.getAttribute('data-fret'));await page.locator('#note-answer-buttons').getByRole('button',{name:noteAt(6,fret).name,exact:true}).click();
  await expect(page.locator('#note-feedback')).toContainText('Correct');
  await page.locator('#note-next').click();await page.locator('#note-reveal').click();await expect(page.locator('#note-feedback')).toContainText('Answer:');
  await page.reload();await expect(page.locator('#note-total')).toContainText('2 correct / 3 submitted answers · 1 answers revealed');expect(errors).toEqual([]);
});
test('learn notes is reachable from the app and fits phones with an internally scrolling neck',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/practice.html#riffs');await page.getByRole('link',{name:'Learn notes',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Learn your fretboard notes'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByText('BEAD GCF',{exact:true})).toBeVisible();await page.screenshot({path:'test-results/notes-phone.png',fullPage:true});
  await page.getByRole('link',{name:'Scales',exact:true}).click();await expect(page.locator('.trainer-scale-panel')).toBeVisible();
});
