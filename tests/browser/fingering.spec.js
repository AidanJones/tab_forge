import { test, expect } from '@playwright/test';
import { importer, exporter, Settings } from '@coderline/alphatab';

test('fretboard follows notes, previews the next beat, mirrors and switches tracks', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/practice.html');
  await page.locator('#demo').click();
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#fretboard-diagram .current-note')).toHaveCount(1);
  await expect(page.locator('#fretboard-diagram .current-note')).toHaveAttribute('data-string', '6');
  await expect(page.locator('#finger-notes')).toContainText('open string');
  await expect(page.locator('#fretboard-diagram .next-note')).toHaveCount(1);
  await page.locator('#finger-guide').screenshot({ path: 'test-results/finger-guide.png' });
  const originalX = await page.locator('.current-note circle').getAttribute('cx');
  await page.locator('#left-handed').check();
  expect(await page.locator('.current-note circle').getAttribute('cx')).not.toBe(originalX);
  await page.locator('#note-names').check();
  await expect(page.locator('.pitch-label')).toHaveText('E');
  await page.locator('#speed').fill('50');
  await page.locator('#play').click();
  await expect(page.locator('.current-note')).toHaveAttribute('data-fret', '2');
  await expect(page.locator('#finger-notes')).toContainText('suggested');
  await page.locator('#play').click();
  await page.locator('#finger-suggestions').uncheck();
  await expect(page.locator('.current-note')).toHaveAttribute('data-origin', 'unknown');
  await page.locator('#stop').click();
  await expect(page.locator('.current-note')).toHaveAttribute('data-fret', '0');
  await page.locator('#track').selectOption('1');
  await expect(page.locator('#finger-status')).toContainText('Bass');
  await expect(page.locator('#fretboard-diagram .string-label')).toHaveCount(4);
  await expect(page.locator('.current-note')).toHaveAttribute('data-string', '4');
  expect(errors).toEqual([]);
});

test('file-supplied fingers, capo, rests and seek previews are honoured', async ({ page }) => {
  const settings = new Settings();
  const score = importer.ScoreLoader.loadAlphaTex(String.raw`\title "Finger hints" . :4 3.1 0.2 r 2.3 |`, settings);
  score.tracks[0].staves[0].capo = 2;
  score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0].leftHandFinger = 4;
  const bytes = new exporter.Gp7Exporter().export(score, settings);
  await page.goto('/practice.html');
  await page.locator('#file').setInputFiles({ name: 'fingers.gp', mimeType: 'application/octet-stream', buffer: Buffer.from(bytes) });
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('.current-note')).toHaveAttribute('data-finger', '4');
  await expect(page.locator('#finger-notes')).toContainText('little · written');
  await expect(page.locator('#finger-status')).toContainText('capo 2');
  await page.locator('#finger-suggestions').uncheck();
  await expect(page.locator('.current-note')).toHaveAttribute('data-finger', '4');
  await page.locator('#note-names').check();
  await expect(page.locator('.pitch-label')).toHaveText('A');
  await page.locator('#speed').fill('25');
  await page.locator('#play').click();
  await expect(page.locator('#finger-notes')).toContainText('Rest');
  await page.locator('#stop').click();
  await expect(page.locator('.current-note')).toHaveAttribute('data-finger', '4');
});

test('editor matches Practice and still renders lesson notes on desktop and mobile', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: 'A place for your playing.' })).toBeVisible();
  await page.getByRole('button', { name: 'Load example', exact: true }).click();
  await expect(page.locator('#score-title')).toHaveText('Example Song');
  await page.locator('#score-viewport').scrollIntoViewIfNeeded();
  await expect(page.locator('#score svg').first()).toBeVisible();
  await expect(page.locator('.tab-line')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/editor-desktop.png', fullPage: true });
  await page.locator('#input').fill('title: My lesson\n[Intro]\n3f1s 0s2\nnote: slowly');
  await page.locator('#input').press('Control+Enter');
  await expect(page.locator('#score-title')).toHaveText('My lesson');
  await page.locator('#score-viewport').scrollIntoViewIfNeeded();
  await expect(page.locator('#score')).toContainText('slowly');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/editor-mobile.png', fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.input-section')).toBeHidden();
  await expect(page.locator('#score')).toBeVisible();
});

test('editor share URLs retain percent text and metadata renders as text', async ({ page }) => {
  const source = 'title: 50% practice\nkey: <img src=x onerror=alert(1)>\n[Intro]\n0s1';
  await page.goto(`/index.html?tab=${encodeURIComponent(source)}`);
  await expect(page.locator('#input')).toHaveValue(source);
  await expect(page.locator('#score-title')).toHaveText('50% practice');
  await page.locator('#score-viewport').scrollIntoViewIfNeeded();
  await expect(page.locator('#score')).toContainText('<img');
  await expect(page.locator('#score img')).toHaveCount(0);
});
