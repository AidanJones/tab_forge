// Monophonic YIN-style difference/normalisation, independent of browser APIs so
// the same detector can later feed note-by-note practice as well as the tuner.
export const DEFAULT_NOISE_DB = -65;
export const DEFAULT_NOISE_FLOOR = 10 ** (DEFAULT_NOISE_DB / 20);
export const signalDb = rms => Math.max(-100, Math.min(0, 20 * Math.log10(rms || 1e-5)));

export function detectPitch(input, sampleRate, { noiseFloor = DEFAULT_NOISE_FLOOR, minHz = 35, maxHz = 1400 } = {}) {
  const step = Math.max(1, Math.floor(sampleRate / 24000));
  const length = Math.floor(input.length / step);
  const samples = new Float32Array(length);
  let mean = 0;
  for (let i = 0; i < length; ++i) {
    for (let j = 0; j < step; ++j) samples[i] += input[i * step + j] / step;
    mean += samples[i] / length;
  }
  let power = 0;
  for (let i = 0; i < length; ++i) { samples[i] -= mean; power += samples[i] ** 2; }
  const rms = Math.sqrt(power / length) || 0;
  const rate = sampleRate / step;
  const minLag = Math.max(2, Math.floor(rate / maxHz));
  const maxLag = Math.min(Math.ceil(rate / minHz), Math.floor(length / 2) - 1);
  const empty = { frequency: null, confidence: 0, rms };
  if (rms < noiseFloor || maxLag <= minLag || !Number.isFinite(rate)) return empty;
  const difference = new Float32Array(maxLag + 1);
  let sum = 0;
  for (let lag = 1; lag <= maxLag; ++lag) {
    let value = 0;
    for (let i = 0; i < length - maxLag; ++i) value += (samples[i] - samples[i + lag]) ** 2;
    sum += value;
    difference[lag] = sum ? value * lag / sum : 1;
  }
  for (let lag = minLag; lag < maxLag; ++lag) {
    if (difference[lag] >= 0.15) continue;
    while (lag + 1 <= maxLag && difference[lag + 1] < difference[lag]) ++lag;
    const a = difference[lag - 1], b = difference[lag], c = difference[lag + 1] ?? b;
    const divisor = 2 * (2 * b - a - c);
    const refined = lag + (divisor ? (c - a) / divisor : 0);
    const frequency = rate / refined;
    return frequency >= minHz && frequency <= maxHz ? { frequency, confidence: 1 - b, rms } : empty;
  }
  return empty;
}

export const midiFrequency = midi => 440 * 2 ** ((midi - 69) / 12);
export const centsBetween = (frequency, target) => 1200 * Math.log2(frequency / target);
export function pitchNote(frequency) {
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  return { midi, name: ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents: centsBetween(frequency, midiFrequency(midi)) };
}

export class StablePitch {
  reset() { this.previous = null; this.count = 0; }
  update(reading) {
    if (!reading.frequency) { this.reset(); return null; }
    if (!this.previous || Math.abs(centsBetween(reading.frequency, this.previous)) > 35) {
      this.previous = reading.frequency; this.count = 1;
    } else { this.previous = this.previous * 0.6 + reading.frequency * 0.4; ++this.count; }
    return this.count >= 3 ? { ...reading, frequency: this.previous } : null;
  }
}
