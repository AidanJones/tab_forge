// Web MIDI adapter. It receives already-played note events from alphaTab; it
// does not create a second score clock or send patches / system-exclusive data.
export class MidiOutput {
  constructor(onChange = () => {}, requestAccess = () => navigator.requestMIDIAccess({ sysex: false })) {
    this.onChange = onChange;
    this.requestAccess = requestAccess;
    this.access = null;
    this.port = null;
    this.channel = 0;
    this.volume = 65;
    this.generation = 0;
    this.held = new Map();
    this.status = 'Connect your FM1 by USB, then connect MIDI and choose its output.';
  }

  get enabled() { return Boolean(this.port && this.port.state === 'connected'); }
  get outputs() { return [...(this.access?.outputs.values() ?? [])].filter(port => port.state === 'connected'); }
  emit() { this.onChange(this); }

  async connect() {
    if (!this.access) {
      try { this.access = await this.requestAccess(); }
      catch (error) { throw new Error(`MIDI access was unavailable or denied. Use Chrome or Edge over localhost/HTTPS and allow MIDI access. ${error.message || ''}`); }
      this.access.onstatechange = () => {
        if (this.port && this.port.state !== 'connected') {
          this.disarm();
          this.status = 'MIDI device disconnected. Reconnect it, choose the output and enable it again.';
        }
        this.emit();
      };
    }
    this.status = this.outputs.length ? 'Choose the FM1 output and enable Send notes. Only the displayed track is sent.' : 'No MIDI outputs found. Check the USB data cable and device, then reconnect.';
    this.emit();
  }

  async arm(id) {
    this.disarm();
    const generation = this.generation;
    const port = this.access?.outputs.get(id);
    if (!port || port.state !== 'connected') throw new Error('Choose a connected MIDI output first.');
    await port.open();
    if (generation !== this.generation || port.state !== 'connected') {
      await port.close();
      return;
    }
    this.port = port;
    this.status = `Sending the displayed track to ${port.name || 'MIDI output'}, channel ${this.channel + 1}.`;
    this.emit();
  }

  disarm() {
    ++this.generation;
    this.panic();
    const port = this.port;
    this.port = null;
    try { port?.close()?.catch(() => {}); } catch { /* A disconnected port may already be closed. */ }
    this.status = 'MIDI output off. Browser sound is available.';
    this.emit();
  }

  panic() {
    clearTimeout(this.testTimer);
    if (this.port) {
      try { this.port.clear(); } catch { /* Optional on some MIDI implementations. */ }
      const send = bytes => { try { this.port.send(bytes); } catch { /* Port may have been unplugged. */ } };
      for (const key of this.held.keys()) send([0x80 | this.channel, key, 0]);
      send([0xb0 | this.channel, 64, 0]);
      send([0xb0 | this.channel, 123, 0]);
      send([0xb0 | this.channel, 120, 0]);
    }
    this.held.clear();
  }

  setChannel(channel) {
    const value = Number(channel);
    if (!Number.isInteger(value) || value < 1 || value > 16) throw new Error('MIDI channel must be 1–16.');
    this.panic();
    this.channel = value - 1;
    if (this.port) this.status = `Sending the displayed track to ${this.port.name || 'MIDI output'}, channel ${value}.`;
    this.emit();
  }

  setVolume(volume) {
    const previous = this.volume;
    this.volume = Math.max(0, Math.min(100, Number(volume)));
    if (previous && !this.volume) this.panic();
  }

  forward(events) {
    if (!this.enabled) return;
    try {
      for (const event of events) {
        const key = event.key;
        if (!Number.isInteger(key) || key < 0 || key > 127) continue;
        const on = event.kind === 'on' && event.velocity > 0;
        if (on && this.volume > 0) {
          const velocity = Math.max(1, Math.min(127, Math.round(event.velocity * this.volume / 100)));
          this.port.send([0x90 | this.channel, key, velocity]);
          this.held.set(key, (this.held.get(key) || 0) + 1);
        } else if (!on && this.held.has(key)) {
          const remaining = this.held.get(key) - 1;
          if (remaining > 0) this.held.set(key, remaining);
          else { this.port.send([0x80 | this.channel, key, 0]); this.held.delete(key); }
        }
      }
    } catch {
      this.disarm();
      this.status = 'MIDI output failed. Check the USB connection and enable the output again.';
      this.emit();
    }
  }

  testNote() {
    if (!this.enabled) throw new Error('Enable a MIDI output before sending a test note.');
    if (!this.volume) throw new Error('Raise Volume above zero to send a MIDI test note.');
    this.panic();
    this.forward([{ kind: 'on', key: 60, velocity: 80 }]);
    this.testTimer = setTimeout(() => this.forward([{ kind: 'off', key: 60, velocity: 0 }]), 400);
  }
}
