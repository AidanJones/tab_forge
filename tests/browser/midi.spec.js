import { test, expect } from '@playwright/test';

async function fakeMidi(page, denied = false) {
  await page.addInitScript(denied => {
    window.midiMessages = [];
    const connect = AudioNode.prototype.connect;
    window.midiAnalysers = [];
    AudioNode.prototype.connect = function(destination, ...args) {
      if (destination instanceof AudioDestinationNode) {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 2048;
        connect.call(this, analyser);
        window.midiAnalysers.push(analyser);
      }
      return connect.call(this, destination, ...args);
    };
    window.midiPeak = () => Math.max(0, ...window.midiAnalysers.map(analyser => {
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      return Math.max(...samples.map(Math.abs));
    }));
    const port = {
      id: 'fm1-usb', name: 'M-VAVE FM1 USB', state: 'connected', type: 'output',
      open: async () => port, close: async () => port, clear() {},
      send(bytes) { window.midiMessages.push({ bytes: [...bytes], time: performance.now() }); },
    };
    const access = { outputs: new Map([[port.id, port]]) };
    window.unplugMidi = () => { port.state = 'disconnected'; access.onstatechange?.(); };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async options => {
      window.midiAccessOptions = options;
      if (denied) throw new Error('Permission denied');
      return access;
    } });
  }, denied);
}

test('played score events reach the selected USB MIDI output and Stop releases them', async ({ page }) => {
  await fakeMidi(page);
  await page.goto('/practice.html');
  await page.locator('#demo').click();
  await expect(page.locator('#play')).toBeEnabled();
  await page.locator('.midi-settings summary').click();
  await page.locator('#connect-midi').click();
  await expect(page.locator('#midi-output')).toHaveValue('fm1-usb');
  expect(await page.evaluate(() => window.midiMessages.length)).toBe(0);
  await page.locator('#midi-enabled').check();
  await expect(page.locator('#midi-enabled')).toBeChecked();
  await page.locator('#midi-channel').selectOption('3');
  await page.locator('#speed').fill('50');
  await page.locator('#from-bar').selectOption('0');
  await page.locator('#to-bar').selectOption('0');
  await page.locator('#select-bars').click();
  await page.locator('#loop').check();
  await page.getByRole('button', { name: 'Play-along', exact: true }).click();
  await page.locator('#play').click();
  await expect.poll(() => page.evaluate(() => window.midiMessages.filter(message => message.bytes[0] === 0x92).length)).toBeGreaterThan(0);
  const notes = await page.evaluate(() => window.midiMessages.filter(message => message.bytes[0] === 0x92));
  expect(notes[0].bytes[1]).toBe(40); // Guitar low E, not bass E1 (28).
  expect(notes[0].bytes[2]).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.midiPeak())).toBeLessThan(0.00001);
  await page.locator('#midi-monitor').check();
  await expect.poll(() => page.evaluate(() => window.midiPeak())).toBeGreaterThan(0.001);
  await expect.poll(() => page.evaluate(() => window.midiMessages.filter(message => message.bytes[0] === 0x92 && message.bytes[1] === 40).length)).toBeGreaterThanOrEqual(2);
  const starts = await page.evaluate(() => window.midiMessages.filter(message => message.bytes[0] === 0x92 && message.bytes[1] === 40));
  expect(starts[1].time - starts[0].time).toBeGreaterThan(3600);
  expect(starts[1].time - starts[0].time).toBeLessThan(4400);
  await page.locator('#stop').click();
  await expect.poll(() => page.evaluate(() => window.midiMessages.some(message => message.bytes[0] === 0xb2 && message.bytes[1] === 123))).toBe(true);
  expect(await page.evaluate(() => window.midiAccessOptions.sysex)).toBe(false);
  expect(await page.evaluate(() => window.midiMessages.some(message => (message.bytes[0] & 0xf0) === 0xc0))).toBe(false);
  await page.evaluate(() => window.unplugMidi());
  await expect(page.locator('#midi-enabled')).not.toBeChecked();
  await expect(page.locator('#midi-status')).toContainText('disconnected');
});

test('editor exposes the same MIDI controls and can send a test note', async ({ page }) => {
  await fakeMidi(page);
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Load example', exact: true }).click();
  await expect(page.locator('#play')).toBeEnabled();
  await page.locator('.midi-settings summary').click();
  await page.locator('#connect-midi').click();
  await page.locator('#midi-enabled').check();
  await page.locator('#midi-test').click();
  await expect.poll(() => page.evaluate(() => window.midiMessages.some(message => message.bytes[0] === 0x90 && message.bytes[1] === 60))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.midiMessages.some(message => message.bytes[0] === 0x80 && message.bytes[1] === 60))).toBe(true);
});

test('MIDI permission denial leaves browser playback available', async ({ page }) => {
  await fakeMidi(page, true);
  await page.goto('/practice.html');
  await page.locator('#demo').click();
  await expect(page.locator('#play')).toBeEnabled();
  await page.locator('.midi-settings summary').click();
  await page.locator('#connect-midi').click();
  await expect(page.locator('#error')).toContainText('denied');
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveText('Pause');
});
