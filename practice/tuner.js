import { MicrophonePitch } from './microphone.js';
import { centsBetween, midiFrequency, pitchNote } from './pitch.js';

export class Tuner {
  constructor(root, { onReading = () => {} } = {}) {
    this.root = root;
    this.onReading = onReading;
    this.$ = selector => root.querySelector(selector);
    this.mic = new MicrophonePitch(state => this.render(state));
    this.$('.tuner-start').addEventListener('click', () => this.mic.start(this.$('.tuner-input').value));
    this.$('.tuner-stop').addEventListener('click', () => this.mic.stop());
    this.$('.tuner-input').addEventListener('change', () => this.mic.stop('Input changed. Start the microphone when ready.'));
    this.$('.tuner-target').addEventListener('change', () => this.render(this.latest));
    this.$('.tuner-floor').addEventListener('input', event => { this.mic.noiseFloor = 10 ** (Number(event.target.value) / 20); });
    root.addEventListener('toggle', () => { if (!root.open) this.mic.stop(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.mic.stop('Microphone stopped while the page was hidden.'); });
    window.addEventListener('pagehide', () => this.mic.stop());
    this.render({ state: 'idle' });
  }
  async inputs() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const select = this.$('.tuner-input'), previous = select.value;
      select.replaceChildren(new Option('System default', ''), ...devices.filter(d => d.kind === 'audioinput' && d.deviceId !== 'default').map((d,i) => new Option(d.label || `Microphone ${i+1}`, d.deviceId)));
      if ([...select.options].some(o => o.value === previous)) select.value = previous;
    } catch { /* Tuning still works when device labels/listing are unavailable. */ }
  }
  render(state = { state: 'idle' }) {
    const prior = this.latest;
    this.latest = state;
    const listening = state.state === 'listening', pending = state.state === 'requesting';
    this.$('.tuner-start').disabled = listening || pending;
    this.$('.tuner-stop').disabled = !listening && !pending;
    this.$('.tuner-input').disabled = pending || listening;
    this.root.dataset.state = state.state;
    if (listening && prior?.state !== 'listening') this.inputs();
    const status = state.message || (pending ? 'Allow microphone access in your browser. You can cancel below.' : listening ? 'Microphone on · pluck one string and let it ring.' : 'Microphone off. Start when you are ready.');
    if (this.$('.tuner-status').textContent !== status) this.$('.tuner-status').textContent = status;
    const reading = state.reading;
    this.$('.tuner-level').value = Math.min(1, (state.rms || 0) * 8);
    const note = reading ? pitchNote(reading.frequency) : null;
    const target = Number(this.$('.tuner-target').value);
    const cents = reading ? (target ? centsBetween(reading.frequency, midiFrequency(target)) : note.cents) : 0;
    this.$('.tuner-note').textContent = note ? note.name + note.octave : '—';
    this.$('.tuner-frequency').textContent = reading ? `${reading.frequency.toFixed(1)} Hz · A4 = 440 Hz` : 'Pluck a single string';
    this.$('.tuner-needle').style.left = `${50 + Math.max(-50, Math.min(50, cents))}%`;
    this.$('.tuner-needle').hidden = !reading;
    this.root.dataset.tuned = String(Boolean(reading && Math.abs(cents) <= 5));
    const guidance = !reading ? (listening ? 'Waiting for a clear, steady note…' : 'Ready to tune') : Math.abs(cents) <= 5 ? 'In tune' : cents < 0 ? 'Flat · tune up' : 'Sharp · tune down';
    this.$('.tuner-guidance').textContent = guidance;
    this.$('.tuner-cents').textContent = reading ? `${cents > 0 ? '+' : ''}${Math.round(cents)} cents${target ? ` from ${pitchNote(midiFrequency(target)).name}${pitchNote(midiFrequency(target)).octave}` : ''}` : '—';
    // Announce changes in guidance, not every pitch fluctuation.
    const announcement = reading ? `${note.name}${note.octave}. ${guidance}.` : listening ? 'Listening for one string.' : state.message || 'Microphone off.';
    if (this.$('.tuner-announcement').textContent !== announcement) this.$('.tuner-announcement').textContent = announcement;
    this.onReading(state);
  }
}
