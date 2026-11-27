import {test,expect} from '@playwright/test';

test('rhythm opens with conventional tab, optional notation and a separate editable grid',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/practice.html#rhythm');
  await expect(page.locator('#rhythm-score svg').first()).toBeVisible();await expect(page.getByLabel('Rhythm notation')).toHaveValue('tab');
  await expect(page.locator('.rhythm-pattern-editor')).not.toHaveAttribute('open');
  const tabHeight=await page.locator('#rhythm-score').evaluate(n=>n.getBoundingClientRect().height);
  await page.getByLabel('Rhythm notation').selectOption('both');await expect.poll(()=>page.locator('#rhythm-score').evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThan(tabHeight+35);
  await page.getByLabel('Rhythm notation').selectOption('sheet');await expect(page.locator('#rhythm-score svg').first()).toBeVisible();
  await page.getByRole('combobox',{name:'Pattern',exact:true}).selectOption('arpeggio');await page.getByLabel('Practice chord',{exact:true}).selectOption('C');
  await expect(page.locator('#rhythm-score')).toContainText('C');
  await page.locator('.rhythm-pattern-editor > summary').click();await page.locator('#rhythm-grid button').first().click();await expect(page.locator('#rhythm-grid button').first()).toHaveAttribute('aria-pressed','false');
  await page.getByRole('combobox',{name:'Pattern',exact:true}).selectOption('strum');await page.getByLabel('Rhythm notation').selectOption('both');
  await expect(page.locator('#rhythm-score svg').first()).toBeVisible();expect(errors).toEqual([]);
  await page.locator('.rhythm-score-preview').screenshot({path:'test-results/rhythm-chord-score.png'});
});

test('phone tab highlights in time without a second audio player or page overflow',async({page})=>{
  await page.addInitScript(()=>{const Native=window.AudioContext;window.rhythmContexts=0;window.AudioContext=class extends Native{constructor(...args){super(...args);window.rhythmContexts++;}};});
  await page.setViewportSize({width:390,height:844});await page.goto('/practice.html#rhythm');
  await expect(page.locator('#rhythm-score svg').first()).toBeVisible();expect(await page.evaluate(()=>window.rhythmContexts)).toBe(0);
  await page.getByRole('combobox',{name:'Input',exact:true}).selectOption('tap');await page.getByLabel('Starting / manual BPM').fill('180');
  await page.locator('.rhythm-options > summary').click();await page.getByLabel('Maximum BPM',{exact:true}).fill('180');await page.locator('#rhythm-start').click();
  const cursor=page.locator('.rhythm-score-cursor');await expect(cursor).toBeVisible();const first=await cursor.evaluate(n=>n.style.left);
  await expect.poll(()=>cursor.evaluate(n=>n.style.left)).not.toBe(first);expect(await page.evaluate(()=>window.rhythmContexts)).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'test-results/rhythm-tab-phone.png'});await page.locator('#rhythm-stop').click();await expect(cursor).toBeHidden();
});
