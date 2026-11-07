import { detectPitch, StablePitch } from './pitch.js';

export class MicrophonePitch {
  constructor(onChange) {
    this.onChange = onChange;
    this.request = 0;
    this.stable = new StablePitch();
    this.noiseFloor = 0.003;
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
      this.emit('listening');
      this.timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const raw = detectPitch(samples, context.sampleRate, { noiseFloor: this.noiseFloor });
        this.emit('listening', { reading: this.stable.update(raw), rms: raw.rms });
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
