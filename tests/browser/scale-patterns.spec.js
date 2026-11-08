import {test,expect} from '@playwright/test';
for(const path of ['/practice.html#scales','/index.html#scales'])test(`A minor pentatonic score loads from ${path}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(path);await page.getByLabel('Scale key').selectOption('9');await page.getByLabel('Scale type').selectOption('minorPentatonic');await page.getByLabel('Scale direction').selectOption('both');
 await page.getByRole('button',{name:'Load scale tab',exact:true}).click();await expect(page.locator('#score-title')).toHaveText('A minor pentatonic · up and down');await expect(page.locator('#score-viewport')).toBeVisible();await expect(page.locator('#score svg').first()).toBeVisible();await expect(page.locator('#play')).toBeEnabled();expect(errors).toEqual([]);
});



test('pentatonic boxes and the shifting pattern load, update the map and survive Score / Play-along switching',async({page})=>{
  await page.goto('/practice.html#scales');await page.getByLabel('Scale key').selectOption('9');await page.getByLabel('Scale type').selectOption('minorPentatonic');
  await expect(page.getByLabel('Scale pattern').locator('option')).toHaveCount(11);
  await page.getByLabel('Scale pattern').selectOption('box5');await expect(page.locator('.trainer-scale-description')).toContainText('frets 14–17');await expect(page.getByLabel('Map frets')).toHaveValue('24');
  await expect(page.locator('#scale-map-board .scale-pattern')).toHaveCount(12);
  await page.getByRole('button',{name:'Load scale tab',exact:true}).click();await expect(page.locator('#score-title')).toContainText('Pentatonic box 5');await expect(page.locator('#score svg').first()).toBeVisible();
  await page.getByRole('button',{name:'Play-along',exact:true}).click();await page.getByRole('button',{name:'Score',exact:true}).click();await expect(page.locator('#score svg').first()).toBeVisible();
  await page.getByRole('link',{name:'← Back to scales',exact:true}).click();await expect(page.getByLabel('Scale pattern')).toHaveValue('box5');await page.getByLabel('Scale pattern').selectOption('neck');
  await expect(page.locator('.trainer-scale-description')).toContainText('Three octaves');
  await page.getByRole('button',{name:'Practise scale with microphone',exact:true}).click();await expect(page.getByLabel('Play-along mode')).toHaveValue('wait');await expect(page.locator('#score-title')).toContainText('Across the neck');await expect(page.locator('#play-along')).toBeVisible();
  await page.getByRole('link',{name:'← Back to scales',exact:true}).click();await page.getByLabel('Scale type').selectOption('major');await expect(page.getByLabel('Scale pattern').locator('option')).toHaveCount(6);await expect(page.getByLabel('Scale pattern')).toHaveValue('neck');
});


test('scale pattern choices fit a phone without losing the selected notes',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/practice.html#scales');
 await page.getByLabel('Scale key').selectOption('9');await page.getByLabel('Scale type').selectOption('majorPentatonic');await page.getByLabel('Scale pattern').selectOption('box5');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await expect(page.locator('#scale-map-board .scale-pattern')).toHaveCount(12);
 await page.screenshot({path:'test-results/scale-patterns-phone.png',fullPage:true});
});
