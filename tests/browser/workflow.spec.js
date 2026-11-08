import { test, expect } from '@playwright/test';

test('songs put the score first, keep advanced controls optional, and preserve the session across tools',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/practice.html');
  const nav=page.getByRole('navigation',{name:'Main tasks'});
  await expect(nav.getByRole('link')).toHaveCount(7);
  await expect(page.locator('#score-viewport')).toBeVisible();
  expect(await page.locator('#score-viewport').evaluate(n=>n.getBoundingClientRect().top)).toBeLessThan(850);
  await page.locator('#demo').click();await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#hand-guide-settings')).not.toHaveAttribute('open');
  await expect(page.locator('#passage-tracks')).not.toHaveAttribute('open');
  await expect(page.locator('#score-appearance')).not.toHaveAttribute('open');
  await page.locator('#play').click();await expect.poll(()=>page.locator('#position').evaluate(n=>n.value)).toBeGreaterThan(300);
  await nav.getByRole('link',{name:'Tune',exact:true}).click();
  await expect(page.locator('#drop-zone')).toBeHidden();await expect(page.locator('.tuner-reading')).toBeVisible();
  const tick=await page.locator('#position').evaluate(n=>n.value);
  await page.getByRole('heading',{name:'Tune your guitar',exact:true}).focus();await page.keyboard.press('Space');
  await page.waitForTimeout(200);expect(await page.locator('#position').evaluate(n=>n.value)).toBe(tick);
  await nav.getByRole('link',{name:'Songs',exact:true}).click();
  await expect(page.locator('#score-title')).toHaveText('First steps');await expect(page.locator('#play')).toHaveText('Play');
  expect(await page.locator('#position').evaluate(n=>n.value)).toBe(tick);expect(errors).toEqual([]);
});

test('tools are separate destinations and browser Back restores choices',async({page})=>{
  await page.goto('/practice.html#chords');
  await expect(page.getByRole('heading',{name:'Build a clean chord',exact:true})).toBeVisible();
  await expect(page.locator('.trainer-chord-panel')).toBeVisible();await expect(page.locator('.tuner-reading')).toBeHidden();
  await page.getByLabel('Training chord').selectOption('G/B');
  await page.getByRole('link',{name:'Scales',exact:true}).click();
  await expect(page.locator('.trainer-scale-panel')).toBeVisible();await expect(page.locator('.trainer-chord-panel')).toBeHidden();
  await page.getByLabel('Scale key').selectOption('9');
  await page.goBack();await expect(page.getByLabel('Training chord')).toHaveValue('G/B');
  await page.goForward();await expect(page.getByLabel('Scale key')).toHaveValue('9');
  await page.getByRole('button',{name:'Load scale tab',exact:true}).click();await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#score-title')).toContainText('A major');await expect(page.locator('#tools-panel')).toBeHidden();
  await page.getByRole('link',{name:'← Back to scales',exact:true}).click();await expect(page.getByLabel('Scale key')).toHaveValue('9');
});

test('writing has a focused practice step and browser drafts survive moving between pages',async({page})=>{
  await page.goto('/index.html');const source='title: Keep this draft\n[Intro]\n0s6 2f6s 3f6s';
  await page.locator('#input').fill(source);await expect(page.locator('#draft-status')).toContainText('Draft saved');
  await page.getByRole('button',{name:'Update preview',exact:true}).click();await expect(page.locator('#play')).toBeEnabled();
  await page.getByRole('link',{name:'Practise this tab →',exact:true}).click();
  await expect(page.locator('.input-section')).toBeHidden();await expect(page.locator('#score-viewport')).toBeVisible();
  await page.getByRole('link',{name:'← Back to writing',exact:true}).click();await expect(page.locator('#input')).toHaveValue(source);
  await page.getByRole('link',{name:'Songs',exact:true}).click();await expect(page).toHaveURL(/practice\.html/);
  await page.getByRole('link',{name:'Write',exact:true}).click();await expect(page.locator('#input')).toHaveValue(source);
  await expect(page.locator('#score-title')).toHaveText('Keep this draft');
  await page.getByRole('link',{name:'Scales',exact:true}).click();await page.getByRole('button',{name:'Load scale tab',exact:true}).click();
  await expect(page.locator('#score-title')).toContainText('C major');
  await page.getByRole('link',{name:'← Back to writing',exact:true}).click();
  await page.getByRole('button',{name:'Restore previous lesson',exact:true}).click();await expect(page.locator('#input')).toHaveValue(source);
});

test('phone navigation keeps tools focused and scale practice has an obvious return',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/practice.html#scales');
  await expect(page.getByRole('navigation',{name:'Main tasks'})).toBeVisible();
  await page.getByLabel('Scale key').selectOption('4');await page.getByLabel('Scale type').selectOption('minorPentatonic');
  await page.getByRole('button',{name:'Practise scale with microphone',exact:true}).click();
  await expect(page.getByLabel('Play-along mode')).toHaveValue('wait');await expect(page.locator('#play-along')).toBeVisible();
  await expect(page.getByRole('link',{name:'← Back to scales',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'← Back to scales',exact:true}).click();await expect(page.getByLabel('Scale type')).toHaveValue('minorPentatonic');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'test-results/workflow-scales-mobile.png',fullPage:true});
});
