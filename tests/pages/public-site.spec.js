import {test,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const fixture=fileURLToPath(new URL('../fixtures/original-four-notes.gp4',import.meta.url));

test('public root opens Practice home and Create works under the repository URL prefix',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');await expect(page.getByRole('heading',{name:'Practise a little. Make something yours.'})).toBeVisible();
  await page.getByRole('link',{name:'Create a tab',exact:false}).click();await expect(page).toHaveURL(/\/tab_forge\/create\.html#write/);
  await page.locator('.quick-riff-builder > summary').click();await page.getByRole('button',{name:'String 6, open',exact:true}).click();await page.getByRole('button',{name:'Insert riff into lesson'}).click();await expect(page.locator('#play')).toBeEnabled();
  const font=await page.request.get('font/Bravura.woff2');expect(font.ok()).toBe(true);expect((await page.request.get('soundfont/sonivox.sf2')).ok()).toBe(true);expect(errors).toEqual([]);
});

test('private files stay local and can open in the hosted player',async({page})=>{
  const writes=[];page.on('request',r=>{if(['POST','PUT','PATCH'].includes(r.method()))writes.push(r.url());});
  await page.goto('my-files.html');await page.locator('#private-file').setInputFiles(fixture);await expect(page.locator('.private-file-row h3')).toHaveText('Original four notes');
  await page.getByRole('link',{name:'Open / practise'}).click();await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#score-title')).toHaveText('Original four notes');
  expect(writes).toEqual([]);expect(await (await page.request.get('scores/catalog.json')).json()).toEqual([]);
  const availability=await (await page.request.get('scores/availability.json')).json();expect(availability.every(file=>!file.local)).toBe(true);
});

test('Kindle mode works without modern media APIs and publishes only original prepared scores',async({page})=>{
  await page.addInitScript(()=>{for(const name of ['AudioContext','Worker','indexedDB','fetch'])Object.defineProperty(window,name,{value:undefined,configurable:true});});
  await page.setViewportSize({width:768,height:1024});await page.goto('kindle.html');await expect(page.locator('#reader-status')).toHaveText('Ready.');
  const data=await (await page.request.get('eink/catalog.json')).json();expect(data.files.map(file=>file.id)).toEqual(['demo']);
  await page.getByRole('button',{name:'Scores',exact:true}).click();await page.getByRole('button',{name:'Open score',exact:true}).click();await expect(page.locator('.reader-score svg').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
});

test('public Home and My files fit a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'test-results/pages/home-phone.png',fullPage:true});await page.locator('.page-header').getByRole('link',{name:'My files',exact:true}).click();await expect(page.getByRole('heading',{name:'My files',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('public spider exercise opens from home and returns to the selected permutation',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('./');
  await page.getByRole('link',{name:'Spider · all 24 finger patterns',exact:true}).click();
  await expect(page.locator('#spider-pattern option')).toHaveCount(24);
  await page.getByLabel('Finger permutation').selectOption('2134');
  await page.getByRole('button',{name:'Load spider tab',exact:true}).click();
  await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#score-title')).toHaveText('Spider · 2134 · frets 5–8');
  await page.getByRole('link',{name:'← Back to spider',exact:true}).click();await expect(page.getByLabel('Finger permutation')).toHaveValue('2134');expect(errors).toEqual([]);
});

test('public rhythm trainer maps a selected chord and starts a timing round without microphone uploads',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
  await page.getByRole('link',{name:'Picking & strumming · rhythm trainer',exact:true}).click();
  await page.getByRole('combobox',{name:'Pattern',exact:true}).selectOption('travis');await page.getByLabel('Practice chord',{exact:true}).selectOption('C');
  await expect(page.locator('#rhythm-grid button').first()).toContainText('3f C3');
  await page.getByRole('combobox',{name:'Input',exact:true}).selectOption('tap');await page.locator('#rhythm-start').click();
  await expect(page.locator('#rhythm-count')).toContainText('Ready');await page.locator('#rhythm-stop').click();
  await expect(page.locator('#rhythm-start')).toBeEnabled();expect(errors).toEqual([]);
});
