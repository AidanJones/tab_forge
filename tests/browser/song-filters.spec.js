import {test,expect} from '@playwright/test';
import {openSection} from './workflow-helpers.js';
async function browse(page){await page.goto('/practice.html#songs');await page.getByRole('button',{name:'My songs',exact:true}).click();await expect(page.locator('.project-library-count')).toContainText('350');}

test('combined filters show matching metadata and clear restores the catalogue',async({page})=>{
  await browse(page);await page.locator('#song-genre').selectOption('Classic Rock');await page.locator('#song-key').selectOption('2:minor');
  await expect(page.locator('.project-library-row')).toHaveCount(2);
  await openSection(page,'.song-more-filters');await page.locator('#song-instrument').selectOption('electric');await page.locator('#song-technique').selectOption('reggae skank');
  await expect(page.locator('.project-library-row strong')).toHaveText('Walking on the Moon');
  await expect(page.locator('.project-library-row small')).toContainText('D minor');
  await page.getByRole('button',{name:'View song',exact:true}).click();await expect(page.locator('.project-library-results h3')).toHaveText('Walking on the Moon');
  await page.getByRole('button',{name:'← Back to results',exact:true}).click();await expect(page.locator('#song-key')).toHaveValue('2:minor');
  await expect(page.locator('.project-library-row')).toHaveCount(1);await page.locator('#song-clear-filters').click();await expect(page.locator('.project-library-count')).toContainText('350 songs');
  await page.locator('#song-key').selectOption('__unknown__');await expect(page.locator('.project-library-row small').first()).toContainText('Key not listed');
  await page.locator('#song-clear-filters').click();await page.locator('#song-has-score').check();await expect(page.locator('.library-empty')).toContainText('No matches');await page.locator('#song-clear-filters').click();await expect(page.locator('.project-library-row')).toHaveCount(12);
});

test('song details browse the sorted filtered results and Back retains filters and page',async({page})=>{
  await browse(page);await page.locator('#song-genre').selectOption('Classic Rock');await page.locator('#song-key').selectOption('2:minor');await page.locator('#song-sort').selectOption('title');
  await page.getByRole('button',{name:'View song',exact:true}).first().click();await expect(page.locator('.project-library-results h3')).toHaveText('In the Air Tonight');
  await expect(page.getByRole('button',{name:'Previous song',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Next song',exact:true}).click();
  await expect(page.locator('.project-library-results h3')).toHaveText('Walking on the Moon');await expect(page.getByRole('button',{name:'Next song',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Previous song',exact:true}).click();await expect(page.locator('.song-detail-navigation')).toContainText('Song 1 of 2');
  await page.getByRole('button',{name:'← Back to results',exact:true}).click();await expect(page.locator('#song-sort')).toHaveValue('title');await expect(page.locator('.project-library-row')).toHaveCount(2);
  await page.locator('#song-clear-filters').click();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'View song',exact:true}).first().click();
  await expect(page.locator('.song-detail-navigation')).toContainText('Song 13 of 350');await page.getByRole('button',{name:'← Back to results',exact:true}).click();await expect(page.locator('.project-library-pages')).toContainText('2 / 30');
});

test('extra filters fit a phone and do not affect the Recent projects view',async({page})=>{
  await page.setViewportSize({width:390,height:844});await browse(page);await openSection(page,'.song-more-filters');await page.locator('#song-key').selectOption('9:major');await page.locator('#song-tuning').selectOption('standard');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'test-results/song-filters-phone.png',fullPage:true});
  await page.getByRole('button',{name:'Recent projects',exact:true}).click();await expect(page.locator('.song-more-filters')).toBeHidden();await expect(page.locator('#song-key')).toBeHidden();
  await page.getByRole('button',{name:'My songs',exact:true}).click();await expect(page.locator('#song-key')).toHaveValue('9:major');
});
