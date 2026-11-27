import {test,expect} from '@playwright/test';

async function limitedBrowser(page){
  await page.addInitScript(()=>{for(const key of ['AudioContext','webkitAudioContext','Worker','WebGLRenderingContext','WebGL2RenderingContext','indexedDB','fetch'])Object.defineProperty(window,key,{configurable:true,value:undefined});});
}
test('Kindle catalogue works without modern media APIs and does not load the full player',async({page})=>{
  await limitedBrowser(page);const errors=[],urls=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>urls.push(r.url()));await page.goto('/kindle.html');
  await expect(page.getByText('350 matching songs.',{exact:false})).toBeVisible();
  await page.getByLabel('Genre',{exact:true}).selectOption('Classic Rock');await page.getByLabel('Key',{exact:true}).selectOption('2:minor');
  // E-ink only redraws the list on the explicit Apply action.
  await expect(page.getByText('350 matching songs.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Apply filters',exact:true}).click();await expect(page.getByText('2 matching songs.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'View song',exact:true}).first().click();await expect(page.locator('#reader-content h2')).toHaveText('In the Air Tonight');
  await page.getByLabel('My Kindle practice notes').fill('Practise this quietly');await page.getByRole('button',{name:'Save notes on this device'}).click();await expect(page.locator('#reader-status')).toContainText('Saved');
  await page.getByRole('button',{name:'Next song',exact:true}).click();await expect(page.locator('#reader-content h2')).toHaveText('Walking on the Moon');
  expect(urls.filter(u=>/alphaTab|three|soundfont|worklet|\.worker|@vite\/client/.test(u))).toEqual([]);expect(errors).toEqual([]);
});
test('Kindle scales, natural notes, circle and riffs use explicit static page turns',async({page})=>{
  await limitedBrowser(page);await page.setViewportSize({width:768,height:1024});await page.goto('/kindle.html');await expect(page.locator('#reader-status')).toHaveText('Ready.');
  await page.getByRole('button',{name:'Scales',exact:true}).click();await expect(page.getByLabel('Scale pattern')).toBeVisible();await page.getByLabel('Scale pattern').selectOption('neck');await page.getByRole('button',{name:'Show scale tab'}).click();
  await expect(page.locator('.reader-tab')).toContainText('5');await page.locator('#reader-content .reader-pages').first().getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('Notes 9–16',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Note map',exact:true}).click();await expect(page.locator('table tr')).toHaveCount(7);await page.getByRole('button',{name:'Frets 7–12'}).click();await expect(page.locator('table th').nth(1)).toHaveText('7');
  await expect(page.locator('.reader-fretboard')).toBeVisible();
  await page.getByRole('button',{name:'Circle of fifths',exact:true}).click();await expect(page.locator('table tr')).toHaveCount(13);
  await expect(page.locator('.reader-circle')).toBeVisible();
  await page.getByRole('button',{name:'Riffs',exact:true}).click();await expect(page.locator('.reader-tab')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
});

test('Kindle has rhythm notation, symbol help and the same static finger model without media APIs',async({page})=>{
  await limitedBrowser(page);await page.setViewportSize({width:768,height:1024});const urls=[];page.on('request',r=>urls.push(r.url()));await page.goto('/kindle.html');await expect(page.locator('#reader-status')).toHaveText('Ready.');
  await page.getByRole('button',{name:'Rhythm',exact:true}).click();await expect(page.locator('.reader-score svg').first()).toBeVisible();
  await expect(page.getByLabel('Rhythm pattern').locator('option')).toHaveCount(14);await page.getByLabel('Rhythm pattern').selectOption('arpeggio');await page.getByLabel('Practice chord').selectOption({label:'C'});await page.getByLabel('Rhythm notation').selectOption('both');await page.getByRole('button',{name:'Show rhythm',exact:true}).click();
  await expect(page.locator('#reader-content h3').first()).toContainText('C');await expect(page.locator('.reader-chord')).toBeVisible();
  await page.getByRole('button',{name:'Show / hide symbol key',exact:true}).click();await expect(page.locator('.reader-reference')).toContainText('Eighth rest');
  await page.getByRole('button',{name:'Show / hide skeleton finger example',exact:true}).click();await expect(page.locator('.reader-hand svg')).toBeVisible();await expect(page.locator('.reader-hand .cartoon-bone').first()).toBeVisible();
  await page.getByRole('button',{name:'Focus rhythm',exact:true}).click();await expect(page.locator('header')).toBeHidden();await page.getByRole('button',{name:'Show controls',exact:true}).click();await expect(page.locator('header')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
  await page.locator('.reader-hand').screenshot({path:'test-results/kindle-finger-example.png'});
  expect(urls.filter(u=>/alphaTab|three|soundfont|worklet|\.worker|@vite\/client/.test(u))).toEqual([]);
});

test('Kindle Spider includes all permutations, movable frets, per-string pages and a finger map',async({page})=>{
  await limitedBrowser(page);await page.setViewportSize({width:768,height:1024});await page.goto('/kindle.html');await expect(page.locator('#reader-status')).toHaveText('Ready.');
  await page.getByRole('button',{name:'Spider',exact:true}).click();await expect(page.getByLabel('Finger permutation').locator('option')).toHaveCount(24);
  await page.getByLabel('Finger permutation').selectOption('4123');await page.getByLabel('Index finger fret').fill('7');await page.getByRole('button',{name:'Show Spider',exact:true}).click();
  await expect(page.getByText('Fingers: 4 → 1 → 2 → 3 → 2 → 1 → 4',{exact:true})).toBeVisible();await expect(page.locator('#reader-content h3')).toHaveText('String 6 · frets 7–10');await expect(page.locator('.reader-tab')).toContainText('10');await expect(page.locator('.reader-fretboard')).toBeVisible();
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('#reader-content h3')).toHaveText('String 5 · frets 7–10');
  await page.getByRole('button',{name:'Focus Spider',exact:true}).click();await expect(page.locator('header')).toBeHidden();await page.getByRole('button',{name:'Show controls',exact:true}).click();await expect(page.locator('header')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);await page.screenshot({path:'test-results/kindle-spider.png',fullPage:true});
});
test('Kindle score pages are prepared on the server with notation, track and plain-text alternatives',async({page})=>{
  await limitedBrowser(page);await page.setViewportSize({width:1072,height:1448});await page.goto('/kindle.html');await expect(page.locator('#reader-status')).toHaveText('Ready.');await page.getByRole('button',{name:'Scores',exact:true}).click();await page.getByRole('button',{name:'Open score',exact:true}).click();
  await expect(page.locator('.reader-score svg').first()).toBeVisible();await page.evaluate(()=>document.fonts.ready);await page.getByRole('button',{name:'Focus score',exact:true}).click();await expect(page.locator('header')).toBeHidden();await page.screenshot({path:'test-results/kindle-score.png',fullPage:true});
  await page.getByRole('button',{name:'Toggle plain tab fallback'}).click();await expect(page.locator('.reader-tab')).toBeVisible();await expect(page.locator('.reader-tab')).toContainText('Bar 1');
  await page.getByRole('button',{name:'Show controls',exact:true}).click();await page.getByLabel('Track',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Read selected track'}).click();await expect(page.locator('.reader-score svg').first()).toBeVisible();
  await page.getByRole('button',{name:'Show browser feature report'}).click();await expect(page.locator('#reader-report')).toContainText('Audio API: not exposed');
});

test('a locally available GP4 can open from its Kindle song entry with a guitar part selected',async({page})=>{
  const data=await (await page.request.get('/eink/catalog.json')).json();
  const chain=data.songs.find(s=>s.title==='The Chain');
  test.skip(!chain?.localGp4Files?.length,'The ignored GP4 download is not present in this checkout.');
  await limitedBrowser(page);await page.goto('/kindle.html');await expect(page.locator('#reader-status')).toHaveText('Ready.');
  await page.getByLabel('Search songs').fill('The Chain');await page.getByLabel('Guitar Pro files',{exact:true}).selectOption('local');await page.getByRole('button',{name:'Apply filters',exact:true}).click();
  await page.getByRole('button',{name:'View song',exact:true}).click();await page.getByRole('button',{name:'Read GP4 on Kindle',exact:true}).click();
  await expect(page.locator('.reader-score svg').first()).toBeVisible();await expect(page.locator('select[aria-label="Track"] option:checked')).toContainText(/guitar/i);
});
