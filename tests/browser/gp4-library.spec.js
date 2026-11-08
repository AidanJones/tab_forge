import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {openSection} from './workflow-helpers.js';

test('found and locally playable GP4 filters are separate and a local file opens from song details',async({page})=>{
  const fixture=await readFile(new URL('../fixtures/original-four-notes.gp4',import.meta.url));
  await page.route('**/scores/availability.json',route=>route.fulfill({json:[
    {songId:'songs:1',filename:'test.gp4',format:'gp4',local:true,url:'scores/test.gp4',source_url:'https://example.com/tab'},
    {songId:'songs:2',filename:'missing.gp4',format:'gp4',local:false,url:null,source_url:'https://example.com/other'},
  ]}));
  await page.route('**/scores/test.gp4',route=>route.fulfill({body:fixture,contentType:'application/octet-stream'}));
  await page.goto('/practice.html#songs');await page.getByRole('button',{name:'My songs',exact:true}).click();await openSection(page,'.song-more-filters');
  await page.locator('#song-guitar-pro').selectOption('found');await expect(page.locator('.project-library-row')).toHaveCount(2);
  await page.locator('#song-guitar-pro').selectOption('local');await expect(page.locator('.project-library-row')).toHaveCount(1);await expect(page.locator('.project-library-row small')).toContainText('GP4 ready to play');
  await page.getByRole('button',{name:'View song',exact:true}).click();await page.getByRole('button',{name:'Open GP4',exact:true}).click();await expect(page.locator('#score-title')).toHaveText('Original four notes');await expect(page.locator('#project-save-status')).toContainText('Saved project');
});

test('the real verified downloads are filterable in the merged catalogue',async({page})=>{
  await page.goto('/practice.html#songs');await page.getByRole('button',{name:'My songs',exact:true}).click();await openSection(page,'.song-more-filters');await page.locator('#song-guitar-pro').selectOption('found');
  await page.getByLabel('Search',{exact:true}).fill('The Chain');await expect(page.locator('.project-library-row')).toHaveCount(1);await page.getByRole('button',{name:'View song',exact:true}).click();await expect(page.locator('.song-gp-files')).toContainText('The Chain');
  await expect(page.locator('.song-gp-files a')).toHaveAttribute('href',/guitarprotabs\.org/);
});
