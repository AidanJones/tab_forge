import { detectPitch, StablePitch, DEFAULT_NOISE_FLOOR } from './pitch.js';

export class MicrophonePitch {
  constructor(onChange) {
    this.onChange = onChange;
    this.request = 0;
    this.stable = new StablePitch();
    this.noiseFloor = DEFAULT_NOISE_FLOOR;
  }
  emit(state, extra = {}) { this.onChange({ state, ...extra }); }
  async start(deviceId = '') {
    this.stop();
    const request = this.request;
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.AudioContext) {
      this.emit('error', { message: 'Microphone tuning needs a browser with Web Audio on localhost or HTTPS.' });
      return;
    }
    this.emit('requesting');
    let stream;
    try {
      const context = this.context = new AudioContext();
      await context.resume();
      if (request !== this.request) return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        channelCount: { ideal: 1 }, echoCancellation: false,
        noiseSuppression: false, autoGainControl: false,
      }, video: false });
      if (request !== this.request) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      // Device/permission changes can suspend the context after the initial
      // user-gesture resume. Resume again once capture has been established.
      await context.resume();
      if (request !== this.request) return;
      const track = stream.getAudioTracks()[0];
      if (!track || track.readyState === 'ended') throw new Error('Microphone disconnected. Choose an input and try again.');
      track.addEventListener('ended', () => {
        if (request === this.request) this.stop('Microphone disconnected. Choose an input and start again.');
      });
      this.source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 8192;
      this.source.connect(analyser); // Deliberately no connection to speakers.
      const samples = new Float32Array(analyser.fftSize);
      const inputName = track.label || 'Selected microphone';
      this.emit('listening', { inputName, signal:'starting' });
      this.timer = setInterval(() => {
        const blocked = context.state !== 'running' ? 'suspended' : track.muted || !track.enabled ? 'muted' : '';
        if (blocked) {
          this.stable.reset();
          this.emit('listening', { inputName, signal:blocked, rms:0 });
          return;
        }
        analyser.getFloatTimeDomainData(samples);
        const raw = detectPitch(samples, context.sampleRate, { noiseFloor: this.noiseFloor });
        const reading = this.stable.update(raw);
        const signal = reading ? 'detected' : raw.frequency ? 'settling' : raw.rms < 1e-5 ? 'silent' : raw.rms < this.noiseFloor ? 'quiet' : 'unclear';
        this.emit('listening', { inputName, signal, reading, candidate:raw.frequency ? raw : null, rms:raw.rms });
      }, 60);
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      if (request !== this.request) return;
      this.stop();
      const message = error.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in your browser’s site settings, then try again.'
        : error.name === 'NotFoundError' ? 'No microphone found. Connect one and try again.'
        : error.name === 'NotReadableError' ? 'The microphone is busy or unavailable. Check other audio apps and try again.'
        : error.name === 'OverconstrainedError' ? 'That microphone is unavailable. Choose another input and try again.'
        : error.message || 'Could not start the microphone. Try again.';
      this.emit('error', { message });
    }
  }
  async resumeAudio() {
    try { await this.context?.resume(); } catch { /* The signal status shows whether resuming succeeded. */ }
  }
  stop(message = '') {
    ++this.request;
    clearInterval(this.timer);
    this.stream?.getTracks().forEach(track => track.stop());
    this.source?.disconnect();
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    this.stream = this.source = this.context = null;
    this.stable.reset();
    this.emit('idle', { message });
  }
}
