import {test,expect} from '@playwright/test';
test('scale map follows key/type, distinguishes roots, outlines the practice pattern and spans 24 frets',async({page})=>{
  await page.goto('/practice.html#scales');
  await page.getByLabel('Scale key').selectOption('4');await page.getByLabel('Scale type').selectOption('minorPentatonic');
  await expect(page.locator('.scale-map-title')).toContainText('E minor pentatonic');
  await expect(page.locator('#scale-map-board [data-root="true"]')).toHaveCount(8);
  await expect(page.locator('#scale-map-board .scale-pattern')).toHaveCount(11);
  await page.getByLabel('Map labels').selectOption('degrees');await expect(page.locator('#scale-map-board [data-root="true"]').first()).toHaveText('1');
  await page.getByLabel('Map frets').selectOption('24');await expect(page.locator('#scale-map-board [data-fret="24"]')).toHaveCount(6);
});
test('circle keys update the scale and support keyboard tabs and phone layout',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/index.html#scales');
  await page.getByRole('tab',{name:'Circle of fifths',exact:true}).click();
  await page.locator('[data-major="7"]').click();await expect(page.getByLabel('Scale key')).toHaveValue('7');await expect(page.getByLabel('Scale type')).toHaveValue('major');
  await expect(page.locator('#fifths-detail')).toContainText('G major ↔ E natural minor');
  await page.locator('[data-minor="9"]').click();await expect(page.getByLabel('Scale key')).toHaveValue('9');await expect(page.getByLabel('Scale type')).toHaveValue('minor');
  await expect(page.locator('#fifths-detail')).toContainText('C major ↔ A natural minor');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('.scale-explorer').screenshot({path:'test-results/circle-phone.png'});
  await page.getByRole('tab',{name:'Circle of fifths',exact:true}).focus();await page.keyboard.press('ArrowLeft');await expect(page.locator('#scale-map-panel')).toBeVisible();
});
