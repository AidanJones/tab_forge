import * as alphaTab from '@coderline/alphatab';
import { rangeForBars, sameRange, snapRangeToBars, speedPercent } from './transport.js';
import { suggestFingering } from './fingering.js';

export const SUPPORTED_FILES = /\.(gp[345]?|gpx|xml|musicxml|mxl|tex|alphatex)$/i;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

// alphaTab owns musical state and the audio clock. The UI sees plain view data.
export class PracticePlayer {
  constructor(element, onChange, { onMidiEvents = () => {}, onSilence = () => {} } = {}) {
    this.onChange = onChange;
    this.onSilence = onSilence;
    this.volume = 65;
    this.browserSound = true;
    this.disposed = false;
    this.request = 0;
    this.selectedTrack = 0;
    this.snap = 'bar';
    this.loading = false;
    this.error = '';
    this.source = '';
    this.fingerPlan = new WeakMap();
    this.activeBeats = [];
    this.position = { currentTime: 0, endTime: 0, currentTick: 0, endTick: 0 };
    this.api = new alphaTab.AlphaTabApi(element, {
      core: { fontDirectory: `${import.meta.env.BASE_URL}font/` },
      player: {
        playerMode: alphaTab.PlayerMode.EnabledSynthesizer,
        soundFont: `${import.meta.env.BASE_URL}soundfont/sonivox.sf2`,
        enableCursor: true,
        enableElementHighlighting: true,
        enableSeekToClick: true,
        enablePlaybackRangeSelection: true,
        resetPlaybackRangeOnClick: false,
        scrollElement: '#score-viewport',
      },
    });
    this.api.masterVolume = 0.65;
    this.api.midiEventsPlayedFilter = [alphaTab.midi.MidiEventType.NoteOn, alphaTab.midi.MidiEventType.NoteOff];
    this.api.midiEventsPlayed.on(({ events }) => {
      const track = this.api.score?.tracks[this.selectedTrack];
      const soloed = this.api.score?.tracks.some(item => item.playbackInfo.isSolo);
      if (!track || track.playbackInfo.isMute || (soloed && !track.playbackInfo.isSolo) || this.api.playerState !== alphaTab.synth.PlayerState.Playing) return;
      const notes = events.filter(event => event.track === this.selectedTrack)
        .map(event => ({
          kind: event.type === alphaTab.midi.MidiEventType.NoteOn ? 'on' : 'off',
          key: event.noteKey, velocity: event.noteVelocity, tick: event.tick,
        })).sort((a, b) => a.tick - b.tick || Number(a.kind === 'on') - Number(b.kind === 'on'));
      onMidiEvents(notes);
    });
    this.api.playerFinished.on(() => this.onSilence());
    this.api.playerStateChanged.on(({ state }) => {
      if (state !== alphaTab.synth.PlayerState.Playing) this.onSilence();
    });
    for (const event of ['playerReady', 'renderFinished', 'playerStateChanged']) {
      this.api[event].on(() => this.emit());
    }
    this.api.midiLoaded.on(() => { this.prepareFingering(); this.emit(); });
    this.api.activeBeatsChanged.on(({ activeBeats }) => { this.activeBeats = activeBeats; this.emit(); });
    this.api.playerPositionChanged.on(position => {
      if (position.isSeek) this.activeBeats = [];
      if (position.isSeek) this.onSilence();
      this.position = position;
      this.emit();
    });
    this.api.playbackRangeChanged.on(({ playbackRange }) => {
      this.onSilence();
      if (this.snap === 'bar' && playbackRange) {
        const snapped = snapRangeToBars(playbackRange, this.bars);
        if (!sameRange(playbackRange, snapped)) {
          this.api.playbackRange = snapped;
          return;
        }
      }
      this.emit();
    });
    this.api.error.on(error => {
      this.error = `The score or audio could not load: ${error.message}. Reload the page to retry audio setup, or open another score.`;
      this.loading = false;
      this.emit();
    });
  }

  get bars() {
    return (this.api.tickCache?.masterBars ?? []).map(bar => ({
      start: bar.start, end: bar.end, number: bar.masterBar.index + 1,
    }));
  }

  get snapshot() {
    const score = this.api.score;
    return {
      ready: !this.loading && this.api.isReadyForPlayback,
      loading: this.loading,
      error: this.error,
      source: this.source,
      title: score?.title || this.source || 'Choose a score to begin',
      artist: score?.artist || '',
      playing: this.api.playerState === alphaTab.synth.PlayerState.Playing,
      speed: Math.round(this.api.playbackSpeed * 100),
      looping: this.api.isLooping,
      range: this.api.playbackRange ? { ...this.api.playbackRange } : null,
      countIn: this.api.countInVolume > 0,
      metronome: this.api.metronomeVolume > 0,
      volume: this.volume,
      selectedTrack: this.selectedTrack,
      fingering: this.fingeringView,
      tracks: (score?.tracks ?? []).map(track => ({
        index: track.index, name: track.name || `Track ${track.index + 1}`,
        muted: track.playbackInfo.isMute, solo: track.playbackInfo.isSolo,
      })),
      bars: this.bars,
      position: {
        currentTime: this.position.currentTime, endTime: this.api.endTime,
        currentTick: this.position.currentTick, endTick: this.api.endTick,
      },
    };
  }

  emit() {
    if (!this.disposed) this.onChange(this.snapshot);
  }

  prepareFingering() {
    this.fingerPlan = new WeakMap();
    for (const track of this.api.score?.tracks ?? []) {
      for (const staff of track.staves) {
        if (!staff.tuning.length || staff.isPercussion) continue;
        const groups = new Map();
        for (const bar of staff.bars) for (const voice of bar.voices) for (const beat of voice.beats) {
          const key = beat.absolutePlaybackStart;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(...beat.notes.filter(note => note.string > 0 && note.string <= staff.tuning.length && note.fret >= 0));
        }
        const ordered = [...groups].sort((a, b) => a[0] - b[0]).map(([, notes]) => notes);
        const plan = suggestFingering(ordered.map(notes => notes.map(note => ({
          string: staff.tuning.length + 1 - note.string,
          fret: note.fret, writtenFinger: note.leftHandFinger,
          dead: note.isDead, harmonic: note.isHarmonic,
        }))));
        ordered.forEach((notes, i) => notes.forEach((note, j) => {
          const suggestion = plan[i][j];
          const origin = note.isTieDestination && note.tieOrigin ? this.fingerPlan.get(note.tieOrigin) : null;
          this.fingerPlan.set(note, origin ? { ...suggestion, finger: origin.finger, origin: origin.origin } : suggestion);
        }));
      }
    }
  }

  get fingeringView() {
    const track = this.api.score?.tracks[this.selectedTrack];
    const staff = track?.staves.find(staff => staff.tuning.length && !staff.isPercussion);
    if (!staff) return { unavailable: track ? 'Choose a fretted guitar or bass track to see finger positions.' : '' };
    const lookup = this.api.tickCache?.findBeat(new Set([this.selectedTrack]), this.position.currentTick);
    const onStaff = beat => beat.voice.bar.staff === staff;
    const lookupBeats = entry => (entry?.beatLookup.highlightedBeats ?? []).map(item => item.beat).filter(onStaff);
    const playing = this.api.playerState === alphaTab.synth.PlayerState.Playing;
    const live = this.activeBeats.filter(onStaff);
    const currentBeats = playing && live.length ? live : lookupBeats(lookup);
    let nextLookup = lookup?.nextBeat;
    const range = this.api.playbackRange;
    if (this.api.isLooping && lookup && (!nextLookup || (range && nextLookup.start >= range.endTick))) {
      nextLookup = this.api.tickCache?.findBeat(new Set([this.selectedTrack]), range?.startTick ?? this.bars[0]?.start ?? 0);
    }
    const notesFor = beats => {
      const notes = new Map();
      for (const beat of beats) for (const note of beat.notes) {
        const suggestion = this.fingerPlan.get(note);
        if (suggestion) notes.set(`${suggestion.string}:${suggestion.fret}`, suggestion);
      }
      return [...notes.values()];
    };
    return {
      track: track.name || `Track ${track.index + 1}`,
      tuning: [...staff.tuning], capo: staff.capo,
      mode: playing ? 'This beat' : 'Preview — click a beat or press Play',
      current: notesFor(currentBeats), next: notesFor(lookupBeats(nextLookup)),
    };
  }

  loadScore(score, source) {
    if (this.disposed) return;
    this.onSilence();
    this.api.stop();
    this.api.playbackRange = null;
    this.api.isLooping = false;
    this.selectedTrack = 0;
    this.activeBeats = [];
    this.fingerPlan = new WeakMap();
    this.source = source;
    this.error = '';
    this.position = { currentTime: 0, endTime: 0, currentTick: 0, endTick: 0 };
    this.api.renderScore(score, [0]);
    this.emit();
  }

  loadTex(text, source = 'alphaTex score') {
    ++this.request; // Supersede a pending file read.
    const score = alphaTab.importer.ScoreLoader.loadAlphaTex(text, this.api.settings);
    this.loading = false;
    this.loadScore(score, source);
  }

  async loadFile(file) {
    const request = ++this.request;
    if (!SUPPORTED_FILES.test(file.name)) throw new Error('Choose a Guitar Pro, MusicXML or alphaTex file.');
    if (file.size > MAX_FILE_BYTES) throw new Error('Choose a file smaller than 50 MB.');
    this.api.stop();
    this.loading = true;
    this.error = '';
    this.emit();
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (request !== this.request || this.disposed) return;
      const score = /\.(tex|alphatex)$/i.test(file.name)
        ? alphaTab.importer.ScoreLoader.loadAlphaTex(new TextDecoder().decode(bytes), this.api.settings)
        : alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes, this.api.settings);
      this.loadScore(score, file.name);
    } finally {
      if (request === this.request && !this.disposed) {
        this.loading = false;
        this.emit();
      }
    }
  }

  playPause() {
    if (!this.snapshot.ready) return;
    this.error = '';
    this.onSilence();
    if (this.snapshot.playing) this.api.pause();
    else if (!this.api.play()) throw new Error('Audio is not ready. Try Play again after loading finishes.');
    this.emit();
  }

  stop() { this.onSilence(); this.activeBeats = []; this.api.stop(); this.emit(); }
  setSpeed(value) { this.api.playbackSpeed = speedPercent(value) / 100; this.emit(); }
  setLoop(value) { this.api.isLooping = value; this.emit(); }
  setCountIn(value) { this.api.countInVolume = value ? 0.7 : 0; this.emit(); }
  setMetronome(value) { this.api.metronomeVolume = value ? 0.6 : 0; this.emit(); }
  setVolume(value) {
    this.volume = Math.min(100, Math.max(0, Number(value)));
    this.api.masterVolume = this.browserSound ? this.volume / 100 : 0;
    this.emit();
  }
  setBrowserSound(enabled) {
    this.browserSound = enabled;
    this.api.masterVolume = enabled ? this.volume / 100 : 0;
  }

  selectTrack(index) {
    if (!this.api.score?.tracks[index]) return;
    this.onSilence();
    this.selectedTrack = index;
    this.activeBeats = [];
    this.api.renderTracks([this.api.score.tracks[index]]);
    this.emit();
  }

  setTrackState(index, kind, value) {
    const track = this.api.score?.tracks[index];
    if (!track || !['mute', 'solo'].includes(kind)) return;
    this.onSilence();
    if (kind === 'mute') {
      track.playbackInfo.isMute = value;
      this.api.changeTrackMute([track], value);
    } else {
      track.playbackInfo.isSolo = value;
      this.api.changeTrackSolo([track], value);
    }
    this.emit();
  }

  setSnap(mode) {
    this.snap = mode === 'beat' ? 'beat' : 'bar';
    if (this.api.playbackRange && this.snap === 'bar') {
      this.api.playbackRange = snapRangeToBars(this.api.playbackRange, this.bars);
    }
    this.emit();
  }

  selectBars(from, to) {
    this.onSilence();
    this.api.playbackRange = rangeForBars(this.bars, from, to);
    this.emit();
  }

  clearRange() { this.onSilence(); this.api.playbackRange = null; this.emit(); }

  exportFile(format) {
    if (!this.api.score || !this.snapshot.ready) throw new Error('Load or update a score before saving it.');
    if (format === 'gp') return new alphaTab.exporter.Gp7Exporter().export(this.api.score, this.api.settings);
    if (format === 'alphatex') return new alphaTab.exporter.AlphaTexExporter().exportToString(this.api.score, this.api.settings);
    throw new Error('Choose Guitar Pro (.gp) or alphaTex.');
  }

  dispose() {
    this.disposed = true;
    this.onSilence();
    ++this.request;
    this.api.stop();
    this.api.destroy();
  }
}
