import { test, expect } from '@playwright/test';
import { importer,exporter,Settings } from '@coderline/alphatab';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DEMO } from '../../practice/demo.js';
import { openSection } from './workflow-helpers.js';
const original=new URL('../fixtures/original-four-notes.gp4',import.meta.url);
const demoFile=()=>({name:'my-song.gp',mimeType:'application/octet-stream',buffer:Buffer.from(new exporter.Gp7Exporter().export(importer.ScoreLoader.loadAlphaTex(DEMO,new Settings()),new Settings()))});
async function songs(page) {await page.goto('/practice.html');await page.getByRole('button',{name:'My songs',exact:true}).click();await expect(page.locator('.project-library-count')).toContainText('350');}
async function detail(page,title="Don't Do Me Like That") {await page.getByLabel('Search',{exact:true}).fill(title);await page.getByRole('button',{name:'View song',exact:true}).first().click();}

test('catalogue search, resources, suggestions and practice notes persist without rewriting the source list',async({page})=>{
  await songs(page);await detail(page);
  await expect(page.locator('.project-library-results h3')).toHaveText("Don't Do Me Like That");
  await page.getByLabel('Learning status',{exact:true}).selectOption('learning');await page.getByLabel('Practice goal',{exact:true}).fill('Clean changes at 70 BPM');await page.getByLabel('Target BPM',{exact:true}).fill('70');await page.locator('#project-library').getByLabel('Practice notes',{exact:true}).fill('Let the chorus ring.');
  await page.getByRole('button',{name:'Save practice notes',exact:true}).click();await expect(page.locator('.project-library-status')).toContainText('Practice notes saved');
  await page.locator('.project-library-results details > summary').filter({hasText:'Tab links'}).click();
  await expect(page.locator('.project-library-results a').first()).toHaveAttribute('rel','noopener noreferrer');
  await page.reload();await page.getByRole('button',{name:'My songs',exact:true}).click();await detail(page);
  await expect(page.getByLabel('Practice goal',{exact:true})).toHaveValue('Clean changes at 70 BPM');await expect(page.getByLabel('Target BPM',{exact:true})).toHaveValue('70');
  await page.getByRole('button',{name:'Suggestions',exact:true}).click();await page.getByLabel('Search',{exact:true}).fill('Never Going Back Again');await page.getByRole('button',{name:'View song',exact:true}).first().click();
  await page.getByRole('button',{name:'Add to my songs',exact:true}).click();await expect(page.locator('.project-library-status')).toContainText('Added to My songs');
  await page.getByRole('button',{name:'My songs',exact:true}).click();await page.getByLabel('Search',{exact:true}).fill('');await expect(page.locator('.project-library-count')).toContainText('351 songs');
  const base=JSON.parse(await readFile(new URL('../../songs/songs.json',import.meta.url),'utf8'));expect(base.songs[0].practice.learning_status).toBe('not started');
});

test('an attached score survives reload and resumes position, track, speed, loop, mix and view without autoplay',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await songs(page);await detail(page);
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Attach downloaded score',exact:true}).click();await (await chooser).setFiles(demoFile());
  await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#project-save-status')).toContainText('Saved project');
  await openSection(page,'#passage-tracks');await page.locator('#track').selectOption('1');await page.getByLabel('Mute Guitar',{exact:true}).check();await page.locator('#from-bar').selectOption('1');await page.locator('#to-bar').selectOption('2');await page.locator('#select-bars').click();await page.locator('#loop').check();
  await page.locator('#speed').fill('50');await page.locator('#volume').fill('35');await page.locator('#metronome').check();
  await page.getByRole('button',{name:'Play-along',exact:true}).click();await page.getByLabel('Play-along start delay').selectOption('0');await page.locator('#play').click();
  await expect.poll(()=>page.locator('#position').evaluate(n=>n.value)).toBeGreaterThan(5000);await page.locator('#play').click();
  await openSection(page,'#score-exports');await page.locator('#save-project').click();await expect(page.locator('#project-save-status')).toContainText('checkpoint saved');
  const tick=await page.locator('#position').evaluate(n=>n.value);
  await page.reload();await page.getByRole('button',{name:'Resume',exact:true}).click();
  await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#play')).toHaveText('Play');
  await expect.poll(()=>page.locator('#position').evaluate((n,saved)=>Math.abs(n.value-saved),tick)).toBeLessThanOrEqual(1);
  await expect(page.locator('#speed')).toHaveValue('50');await expect(page.locator('#volume')).toHaveValue('35');await expect(page.locator('#loop')).toBeChecked();await expect(page.locator('#metronome')).toBeChecked();await expect(page.locator('#play-along')).toBeVisible();
  await openSection(page,'#passage-tracks');await expect(page.locator('#track')).toHaveValue('1');await expect(page.getByLabel('Mute Guitar',{exact:true})).toBeChecked();
  await expect(page.locator('#range-label')).toContainText('bar 2–3 · looping');
  expect(errors).toEqual([]);
});

test('backups transfer saved score bytes and notes into a fresh browser context',async({page,browser})=>{
  await page.goto('/practice.html');await page.locator('#file').setInputFiles(fileURLToPath(original));await expect(page.locator('#project-save-status')).toContainText('Saved project');
  await openSection(page,'#song-picker');await page.getByRole('button',{name:'Details',exact:true}).click();
  await page.locator('#project-library').getByLabel('Practice notes',{exact:true}).fill('Remember the first position');await page.getByRole('button',{name:'Save practice notes',exact:true}).click();await expect(page.locator('.project-library-status')).toContainText('Practice notes saved');
  await openSection(page,'.library-backups');const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export library backup',exact:true}).click();const backup=await readFile(await (await downloaded).path());
  const json=JSON.parse(backup);expect(json.projects).toHaveLength(1);expect(Buffer.from(json.projects[0].file,'base64')).toEqual(await readFile(original));json.projects[0].lastOpenedAt=Date.UTC(2020,0,2);
  const context=await browser.newContext();try{
    const other=await context.newPage();await other.goto('http://127.0.0.1:5173/practice.html');await other.locator('#import-library-backup').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});
    await expect(other.locator('.project-library-status')).toContainText('Imported 1 projects');await expect(other.locator('.project-library-row small')).toContainText('2020');await other.getByRole('button',{name:'Details',exact:true}).click();await expect(other.locator('#project-library').getByLabel('Practice notes',{exact:true})).toHaveValue('Remember the first position');
    await other.getByRole('button',{name:'Resume saved score',exact:true}).click();await expect(other.locator('#score-title')).toHaveText('Original four notes');await expect(other.locator('#play')).toBeEnabled();await expect(other.locator('#play')).toHaveText('Play');
  }finally{await context.close();}
});

test('a corrupt import creates no saved project, and denied storage leaves ordinary playback usable',async({page})=>{
  await page.goto('/practice.html');await page.locator('#file').setInputFiles({name:'bad.gp4',mimeType:'application/octet-stream',buffer:Buffer.from('broken')});await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('.project-library-count')).toContainText('0 saved projects');
  await page.addInitScript(()=>{indexedDB.open=()=>{throw new Error('Storage disabled');};});await page.reload();
  await page.locator('#file').setInputFiles(fileURLToPath(original));await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#project-save-status')).toContainText('could not be saved');await page.locator('#play').click();await expect(page.locator('#play')).toHaveText('Pause');
});

test('created lesson projects retain their original notes and the catalogue works on a phone',async({page})=>{
  await page.goto('/index.html');await page.locator('#input').fill('title: Saved creator lesson\n[Intro]\n0s6 2f6s 3f6s');await page.getByRole('button',{name:'Update preview',exact:true}).click();await expect(page.locator('#play')).toBeEnabled();
  await openSection(page,'#score-exports');await page.locator('#save-project').click();await expect(page.locator('#project-save-status')).toContainText('Saved project');
  await page.getByRole('link',{name:'Songs',exact:true}).click();await page.getByRole('button',{name:'Details',exact:true}).click();await expect(page.getByRole('link',{name:'Open original lesson notes in editor',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'My songs',exact:true}).click();await detail(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.locator('#project-library').screenshot({path:'test-results/song-library-phone.png'});
});

test('a delayed automatic file save does not interrupt playback',async({page})=>{
  await page.addInitScript(()=>{
    const digest=crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest=async(...args)=>{await new Promise(resolve=>{window.allowProjectSave=resolve;});return digest(...args);};
  });
  await page.goto('/practice.html');await page.locator('#file').setInputFiles(fileURLToPath(original));await expect(page.locator('#play')).toBeEnabled();
  await page.locator('#play').click();await expect.poll(()=>page.locator('#position').evaluate(n=>n.value)).toBeGreaterThan(100);
  await page.evaluate(()=>window.allowProjectSave());await expect(page.locator('#project-save-status')).toContainText('Saved project');await expect(page.locator('#play')).toHaveText('Pause');
});

test('two arrangements stay distinct and reattaching the same file does not duplicate it',async({page})=>{
  await songs(page);await detail(page);
  async function attach(file){const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Attach downloaded score',exact:true}).click();await (await chooser).setFiles(file);await expect(page.locator('#project-save-status')).toContainText('Saved project');await openSection(page,'#song-picker');}
  await attach(fileURLToPath(original));await attach(demoFile());
  await expect(page.getByRole('button',{name:'Resume saved score',exact:true})).toHaveCount(2);
  await attach(demoFile());await expect(page.getByRole('button',{name:'Resume saved score',exact:true})).toHaveCount(2);
  await page.getByRole('button',{name:'Recent projects',exact:true}).click();await expect(page.locator('.project-library-count')).toContainText('2 saved projects');
  await page.getByRole('button',{name:'Details',exact:true}).first().click();await page.locator('.project-library-results details > summary').filter({hasText:'Remove saved copy'}).click();await page.getByRole('button',{name:'Remove from browser',exact:true}).click();await expect(page.locator('.project-library-count')).toContainText('1 saved project');
});

test('a cached-page return restores the checkpoint and keeps subsequent autosaving active',async({page})=>{
  await page.goto('/practice.html');await page.locator('#file').setInputFiles(fileURLToPath(original));await expect(page.locator('#project-save-status')).toContainText('Saved project');
  await page.locator('#play').click();await expect.poll(()=>page.locator('#position').evaluate(n=>n.value)).toBeGreaterThan(400);await page.locator('#play').click();
  await openSection(page,'#score-exports');await page.locator('#save-project').click();const tick=await page.locator('#position').evaluate(n=>n.value);
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  await expect.poll(()=>page.locator('#position').evaluate(n=>n.value)).toBeLessThanOrEqual(1);
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await expect.poll(()=>page.locator('#position').evaluate((n,t)=>Math.abs(n.value-t),tick)).toBeLessThanOrEqual(1);
  await expect(page.locator('#play')).toHaveText('Play');
  await page.locator('#speed').fill('75');await page.locator('#save-project').click();await page.reload();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('#speed')).toHaveValue('75');
});


test('updated catalogue keeps old promoted-suggestion scores and retired entries linked to personal notes',async({page})=>{
  await page.goto('/practice.html');
  const bytes=[...await readFile(original)];
  await page.evaluate(async bytes=>{
    const {ProjectStore}=await import('/practice/project-store.js'),store=new ProjectStore();
    const file=new File([new Uint8Array(bytes)],'old-attached-score.gp4');
    await store.remember(file,{title:'The Chain',songId:'suggestions:s1'});
    await store.putEntry('suggestions:s1',{learning_status:'learning',notes:'Keep my old notes',target_bpm:65},{promoted:true});
    await store.remember(file,{title:'Holly',songId:'songs:89'});
    await store.putEntry('songs:89',{notes:'Keep this retired entry too'});
  },bytes);
  await page.reload();await page.getByRole('button',{name:'My songs',exact:true}).click();await page.getByLabel('Search',{exact:true}).fill('The Chain');await page.getByRole('button',{name:'View song',exact:true}).click();
  await expect(page.locator('#project-library').getByLabel('Practice notes',{exact:true})).toHaveValue('Keep my old notes');await expect(page.getByLabel('Target BPM',{exact:true})).toHaveValue('65');
  await expect(page.getByRole('button',{name:'Resume saved score',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Resume saved score',exact:true}).click();await expect(page.locator('#play')).toBeEnabled();
  await openSection(page,'#song-picker');await page.getByRole('button',{name:'Recent projects',exact:true}).click();await page.getByLabel('Search',{exact:true}).fill('Holly');await page.getByRole('button',{name:'Details',exact:true}).click();
  await expect(page.locator('.library-notice').filter({hasText:'removed from the updated catalogue'})).toBeVisible();await expect(page.locator('#project-library').getByLabel('Practice notes',{exact:true})).toHaveValue('Keep this retired entry too');
});
