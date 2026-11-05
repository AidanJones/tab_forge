import { test, expect } from '@playwright/test';
import { importer, exporter, Settings } from '@coderline/alphatab';
import { DEMO } from '../../practice/demo.js';
import { copyFile, unlink, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

async function demo(page) {
  await page.goto('/practice.html');
  await page.locator('#demo').click();
  await expect(page.locator('#play')).toBeEnabled();
  await page.locator('#score-viewport').scrollIntoViewIfNeeded();
  await expect(page.locator('#score svg').first()).toBeVisible();
}

test('demo renders locally and supports playback, speed, track mixing and stop', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/practice.html');
  await expect(page.locator('#play')).toBeDisabled();
  await page.locator('#demo').click();
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#score-title')).toHaveText('First steps');
  await expect(page.locator('#track option')).toHaveCount(2);
  await expect(page.locator('#play')).toHaveText('Play');
  await page.locator('#speed').fill('50');
  await expect(page.locator('#speed-value')).toHaveText('50%');
  await page.locator('#count-in').check();
  await page.locator('#metronome').check();
  await page.locator('#count-in').uncheck();
  await page.getByLabel('Mute Bass', { exact: true }).check();
  await page.getByLabel('Solo Guitar', { exact: true }).check();
  await page.locator('#track').selectOption('1');
  await expect(page.locator('#track')).toHaveValue('1');
  await expect(page.getByLabel('Mute Bass', { exact: true })).toBeChecked();
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveText('Pause');
  await expect.poll(() => page.locator('#position').evaluate(element => element.value)).toBeGreaterThan(300);
  await page.locator('#play').click();
  const position = await page.locator('#position').evaluate(element => element.value);
  await page.waitForTimeout(400);
  expect(await page.locator('#position').evaluate(element => element.value)).toBe(position);
  await page.locator('#stop').click();
  await expect.poll(() => page.locator('#position').evaluate(element => element.value)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('original Guitar Pro file imports, corrupt files report an error, demo recovers', async ({ page }) => {
  await page.goto('/practice.html');
  const bytes = new exporter.Gp7Exporter().export(importer.ScoreLoader.loadAlphaTex(DEMO, new Settings()));
  await page.locator('#file').setInputFiles({ name: 'original-exercise.gp', mimeType: 'application/octet-stream', buffer: Buffer.from(bytes) });
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#score-title')).toHaveText('First steps');
  await page.locator('#file').setInputFiles({ name: 'broken.gp5', mimeType: 'application/octet-stream', buffer: Buffer.from('not a score') });
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#score-title')).toHaveText('First steps');
  await page.locator('#demo').click();
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#error')).toBeHidden();
});

test('keyboard shortcuts work in the score without stealing input keys', async ({ page }) => {
  await demo(page);
  await page.locator('#score-viewport').focus();
  await page.keyboard.press('[');
  await expect(page.locator('#speed-value')).toHaveText('95%');
  await page.keyboard.press(']');
  await expect(page.locator('#speed-value')).toHaveText('100%');
  await page.keyboard.press('l');
  await expect(page.locator('#loop')).toBeChecked();
  await page.keyboard.press('Space');
  await expect(page.locator('#play')).toHaveText('Pause');
  await page.keyboard.press('Space');
  await expect(page.locator('#play')).toHaveText('Play');
  await page.locator('#from-bar').focus();
  await page.keyboard.press('[');
  await page.keyboard.press('l');
  await expect(page.locator('#speed-value')).toHaveText('100%');
  await expect(page.locator('#loop')).toBeChecked();
});

test('one-bar loop at 50% wraps repeatedly inside the selected tick range', async ({ page }) => {
  await demo(page);
  await page.locator('#speed').fill('50');
  await page.locator('#from-bar').selectOption('1');
  await page.locator('#to-bar').selectOption('1');
  await page.locator('#select-bars').click();
  await page.locator('#loop').check();
  await expect(page.locator('#range-label')).toContainText('bar 2–2 · looping');
  await page.evaluate(() => {
    window.practiceTicks = [];
    const sample = () => {
      const current = document.querySelector('.current-note');
      const next = document.querySelector('.next-note');
      window.practiceTicks.push({ tick: document.querySelector('#position').value, time: performance.now(),
        currentString: current?.dataset.string, currentFret: current?.dataset.fret,
        nextString: next?.dataset.string, nextFret: next?.dataset.fret });
      window.practiceSample = requestAnimationFrame(sample);
    };
    sample();
  });
  await page.locator('#play').click();
  await page.waitForTimeout(10500);
  await page.locator('#play').click();
  const samples = await page.evaluate(() => { cancelAnimationFrame(window.practiceSample); return window.practiceTicks; });
  const playing = samples.filter(sample => sample.tick > 3840);
  expect(playing.length).toBeGreaterThan(100);
  // Position notifications can include the endpoint (and alphaTab's one-tick
  // offset). Verify containment without rejecting that boundary notification.
  expect(playing.every(sample => sample.tick <= 7681)).toBe(true);
  const wraps = samples.filter((sample, i) => i > 0 && samples[i - 1].tick - sample.tick > 2000);
  expect(wraps.length).toBeGreaterThanOrEqual(2);
  // At 120 BPM and 50% speed, a four-quarter-note bar lasts four seconds.
  expect(wraps[1].time - wraps[0].time).toBeGreaterThan(3600);
  expect(wraps[1].time - wraps[0].time).toBeLessThan(4400);
  // At the last beat of bar 2, the preview must point to the start of the loop
  // (string 5, fret 2), rather than the following unselected bar.
  expect(samples.some(sample => sample.currentString === '4' && sample.currentFret === '2' && sample.nextString === '5' && sample.nextFret === '2')).toBe(true);
  await page.locator('#stop').click();
  await expect.poll(() => page.locator('#position').evaluate(element => Math.abs(element.value - 3840))).toBeLessThanOrEqual(1);
  await page.locator('#clear-range').click();
  await expect(page.locator('#range-label')).toContainText('Whole score');
});

test('small screens keep the transport in the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demo(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/practice-mobile.png', fullPage: true });
});

test('adding a GP4 file to the folder makes it loadable after Refresh library', async ({ page }) => {
  await page.goto('/practice.html');
  const name = `test exercise #${randomUUID()}.gp4`;
  const destination = new URL(`../../public/scores/${name.replace('#', '%23')}`, import.meta.url);
  try {
    await copyFile(new URL('../fixtures/original-four-notes.gp4', import.meta.url), destination);
    await page.locator('#refresh-library').click();
    await expect(page.locator('#library-score option', { hasText: name })).toHaveCount(1);
    await page.locator('#library-score').selectOption({ label: name });
    await page.locator('#load-library').click();
    await expect(page.locator('#play')).toBeEnabled();
    await expect(page.locator('#score-title')).toHaveText('Original four notes');
    await page.locator('#play').click();
    await expect(page.locator('#play')).toHaveText('Pause');
  } finally {
    await unlink(destination);
  }
});

test('GP5 picker and alphaTex drag-and-drop both load original scores', async ({ page }) => {
  await page.goto('/practice.html');
  await page.locator('#file').setInputFiles({
    name: 'original.gp5', mimeType: 'application/octet-stream',
    buffer: await readFile(new URL('../fixtures/original-four-notes.gp5', import.meta.url)),
  });
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#score-title')).toHaveText('Original four notes');
  const transfer = await page.evaluateHandle(text => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([text], 'original.tex', { type: 'text/plain' }));
    return transfer;
  }, DEMO);
  await page.locator('#drop-zone').dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.locator('#score-title')).toHaveText('First steps');
  await expect(page.locator('#play')).toBeEnabled();
});

test('synth produces audio after Play and volume zero silences the output', async ({ page }) => {
  await page.addInitScript(() => {
    const connect = AudioNode.prototype.connect;
    window.outputAnalysers = [];
    AudioNode.prototype.connect = function(destination, ...args) {
      if (destination instanceof AudioDestinationNode) {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 2048;
        // Tap the actual production output without replacing or rescheduling it.
        connect.call(this, analyser);
        window.outputAnalysers.push(analyser);
      }
      return connect.call(this, destination, ...args);
    };
    window.outputPeak = () => Math.max(0, ...window.outputAnalysers.map(analyser => {
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      return Math.max(...samples.map(Math.abs));
    }));
  });
  await demo(page);
  expect(await page.evaluate(() => window.outputPeak())).toBe(0);
  await page.locator('#play').click();
  await expect.poll(() => page.evaluate(() => window.outputPeak())).toBeGreaterThan(0.001);
  await page.locator('#volume').fill('0');
  await expect.poll(() => page.evaluate(() => window.outputPeak())).toBeLessThan(0.00001);
  await page.locator('#stop').click();
  await expect(page.locator('#play')).toHaveText('Play');
});

test('dragging across rendered fret numbers selects a passage', async ({ page }) => {
  await demo(page);
  const zeros = page.locator('#score svg text').filter({ hasText: /^0$/ });
  const first = await zeros.nth(0).boundingBox();
  const next = await zeros.nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(next).not.toBeNull();
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  await page.mouse.move(next.x + next.width / 2, next.y + next.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('#range-label')).toContainText('Selected: bar');
  await page.locator('#clear-range').click();
  await expect(page.locator('#range-label')).toContainText('Whole score');
});
