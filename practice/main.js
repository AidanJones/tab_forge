import { DEMO } from './demo.js';
import { formatTime, isTypingTarget } from './transport.js';
import { Fretboard } from './fretboard.js';
import { MidiOutput } from './midi-output.js';
import { download, scoreFilename } from './download.js';

export function mountPractice(root = document, { embedded = false } = {}) {
  const $ = id => root.querySelector(`#${id}`);
  const fretboard = new Fretboard($('finger-guide'));
  let player;
  let pendingPlayer;
  let localError = '';
  let mixerKey = '';
  let barKey = '';
  let latest;
  let loadingTimer;
  let library = [];
  let libraryRequest = 0;
  let sourceRequest = 0;
  let midiKey = '';
  let scoreDisplay = { chordDiagrams: true, shapeHints: false, notation: 'both', fingerExamples: false };
  try {
    const saved = JSON.parse(localStorage.getItem('tab-forge:score-display'));
    if (typeof saved?.chordDiagrams === 'boolean') scoreDisplay.chordDiagrams = saved.chordDiagrams;
    if (typeof saved?.shapeHints === 'boolean') scoreDisplay.shapeHints = saved.shapeHints;
    if (typeof saved?.fingerExamples === 'boolean') scoreDisplay.fingerExamples = saved.fingerExamples;
    if (['tab','sheet','both'].includes(saved?.notation)) scoreDisplay.notation = saved.notation;
  } catch { /* Preferences are optional when browser storage is unavailable. */ }
  $('score-chords').checked = scoreDisplay.chordDiagrams;
  $('score-shapes').checked = scoreDisplay.shapeHints;
  $('score-notation').value = scoreDisplay.notation;
  $('score-finger-examples').checked = scoreDisplay.fingerExamples;
  $('score-finger-examples').disabled = !scoreDisplay.shapeHints;
  for (const [id,key] of [['score-chords','chordDiagrams'],['score-shapes','shapeHints'],['score-notation','notation'],['score-finger-examples','fingerExamples']]) {
    $(id).addEventListener('change', () => {
      scoreDisplay[key] = id === 'score-notation' ? $(id).value : $(id).checked;
      $('score-finger-examples').disabled = !scoreDisplay.shapeHints;
      try { localStorage.setItem('tab-forge:score-display',JSON.stringify(scoreDisplay)); } catch { /* Optional preference. */ }
      player?.setScoreDisplay(scoreDisplay);
    });
  }
  const midi = new MidiOutput(renderMidi);
  $('midi-channel').replaceChildren(...Array.from({ length: 16 }, (_, i) => option(i + 1, String(i + 1))));

  function renderMidi() {
    const outputs = midi.outputs;
    const key = JSON.stringify(outputs.map(port => [port.id, port.name]));
    if (key !== midiKey) {
      midiKey = key;
      const previous = $('midi-output').value;
      $('midi-output').replaceChildren(...(outputs.length ? outputs.map(port => option(port.id, port.name || port.id)) : [option('', 'No MIDI outputs available')]));
      const preferred = outputs.find(port => port.id === previous) || outputs.find(port => /fm.?1|m.?vave/i.test(port.name || '')) || outputs[0];
      if (preferred) $('midi-output').value = preferred.id;
    }
    $('midi-output').disabled = !outputs.length;
    $('midi-enabled').disabled = !outputs.length;
    $('midi-enabled').checked = midi.enabled;
    $('midi-test').disabled = !midi.enabled;
    $('midi-panic').disabled = !midi.enabled;
    $('midi-status').textContent = midi.status;
    player?.setBrowserSound(!midi.enabled || $('midi-monitor').checked);
  }

  $('connect-midi').addEventListener('click', () => run(async () => {
    player?.stop();
    await midi.connect();
  }));
  $('midi-enabled').addEventListener('change', event => run(async () => {
    const enabled = event.target.checked;
    player?.stop();
    if (enabled) await midi.arm($('midi-output').value);
    else midi.disarm();
  }));
  $('midi-output').addEventListener('change', () => { player?.stop(); midi.disarm(); });
  $('midi-channel').addEventListener('change', event => run(() => { player?.stop(); midi.setChannel(event.target.value); }));
  $('midi-monitor').addEventListener('change', renderMidi);
  $('midi-test').addEventListener('click', () => run(() => { player?.stop(); midi.testNote(); }));
  $('midi-panic').addEventListener('click', () => { player?.stop(); midi.panic(); });
  if (!navigator.requestMIDIAccess) {
    $('connect-midi').disabled = true;
    $('midi-status').textContent = 'USB MIDI requires a browser with Web MIDI, such as Chrome or Edge, over localhost/HTTPS.';
  }

  function showError(message) {
    localError = message;
    $('error').textContent = message;
    $('error').hidden = false;
  }

  async function run(action) {
    localError = '';
    $('error').hidden = true;
    try { await action(); return true; }
    catch (error) {
      clearTimeout(loadingTimer);
      showError(error.message || 'Something went wrong. Please try again.');
      return false;
    }
  }

  async function ensurePlayer() {
    if (!pendingPlayer) {
      $('status').textContent = 'Preparing the score player…';
      pendingPlayer = import('./alpha-tab-player.js').then(({ PracticePlayer }) => {
        player = new PracticePlayer($('score'), render, {
          onMidiEvents: events => midi.forward(events), onSilence: () => midi.panic(),
        });
        player.setScoreDisplay(scoreDisplay);
        player.setBrowserSound(!midi.enabled || $('midi-monitor').checked);
        return player;
      }).catch(error => {
        pendingPlayer = undefined;
        throw new Error(`Could not start the player. Check that the app is served over localhost or HTTPS. ${error.message}`);
      });
    }
    return pendingPlayer;
  }

  function option(value, text) {
    const item = document.createElement('option');
    item.value = String(value);
    item.textContent = text;
    return item;
  }

  function checkbox(label, checked, index, kind) {
    const container = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.dataset.track = String(index);
    input.dataset.kind = kind;
    input.setAttribute('aria-label', `${label} ${latest.tracks[index].name}`);
    container.append(input, ` ${label}`);
    return container;
  }

  function render(state) {
    latest = state;
    midi.setVolume(state.volume);
    fretboard.update(state.fingering);
    $('score-title').textContent = state.title;
    $('score-artist').textContent = state.artist;
    $('source-label').textContent = state.source || 'Your practice space';
    $('empty-state').hidden = state.tracks.length > 0;
    $('status').textContent = state.error ? 'Playback needs attention.' : state.loading
      ? 'Reading the score…' : state.ready
        ? (state.playing ? 'Playing · follow the cursor.' : 'Ready when you are.')
        : 'Loading score, fonts and guitar sounds…';
    const error = state.error || localError;
    $('error').textContent = error;
    $('error').hidden = !error;

    for (const id of ['play', 'stop', 'speed', 'loop', 'count-in', 'metronome', 'volume', 'track', 'save-gp', 'save-alphatex', 'save-midi', 'print-score']) {
      $(id).disabled = !state.ready;
    }
    for (const id of ['from-bar', 'to-bar', 'select-bars', 'clear-range']) {
      $(id).disabled = !state.ready || !state.bars.length;
    }
    $('play').textContent = state.playing ? 'Pause' : 'Play';
    $('shape-hint-status').textContent = state.suggestedShapes
      ? `${state.suggestedShapes} suggested ${state.suggestedShapes===1?'grip':'grips'} labelled in the score. Written shapes take priority.`
      : 'Written shapes take priority; suggestions need an unambiguous fixed grip.';
    $('speed').value = state.speed;
    $('speed-value').textContent = `${state.speed}%`;
    $('loop').checked = state.looping;
    $('count-in').checked = state.countIn;
    $('metronome').checked = state.metronome;
    $('volume').value = state.volume;
    $('time').textContent = `${formatTime(state.position.currentTime)} / ${formatTime(state.position.endTime)}`;
    $('position').max = state.position.endTick || 1;
    $('position').value = state.position.currentTick;
    $('tempo').textContent = state.ready ? `${state.speed}% tempo` : '';

    const newMixerKey = JSON.stringify(state.tracks);
    if (newMixerKey !== mixerKey) {
      mixerKey = newMixerKey;
      $('track').replaceChildren(...state.tracks.map(track => option(track.index, track.name)));
      $('mixer').replaceChildren(...state.tracks.map(track => {
        const row = document.createElement('div');
        row.className = 'mixer-row';
        const name = document.createElement('span');
        name.textContent = track.name;
        row.append(name, checkbox('Mute', track.muted, track.index, 'mute'), checkbox('Solo', track.solo, track.index, 'solo'));
        return row;
      }));
    }
    $('track').value = state.selectedTrack;
    for (const input of $('mixer').querySelectorAll('input')) input.disabled = !state.ready;

    const newBarKey = JSON.stringify([state.source, state.bars]);
    if (newBarKey !== barKey) {
      barKey = newBarKey;
      const repeated = new Set(state.bars.map(bar => bar.number)).size !== state.bars.length;
      for (const id of ['from-bar', 'to-bar']) {
        $(id).replaceChildren(...state.bars.map((bar, i) => option(i, repeated ? `${i + 1} · Bar ${bar.number}` : `Bar ${bar.number}`)));
      }
      $('from-bar').value = 0;
      $('to-bar').value = Math.max(0, state.bars.length - 1);
    }
    if (state.range) {
      const first = state.bars.findIndex(bar => bar.end > state.range.startTick);
      const last = state.bars.findLastIndex(bar => bar.start < state.range.endTick);
      $('range-label').textContent = first >= 0 && last >= 0
        ? `Selected: bar ${state.bars[first].number}–${state.bars[last].number}${state.looping ? ' · looping' : ' · plays once'}`
        : 'Selected passage';
    } else {
      $('range-label').textContent = `Whole score${state.looping ? ' · looping' : ' · turn on Loop to repeat.'}`;
    }
    if (state.ready) clearTimeout(loadingTimer);
  }

  function watchLoading() {
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      if (!latest?.ready) showError('The player is taking longer than expected. Check the local server and reload to retry loading the score, fonts and SoundFont.');
    }, 25000);
  }

  $('open-file')?.addEventListener('click', () => $('file').click());
  $('file')?.addEventListener('change', () => {
    const [file] = $('file').files;
    $('file').value = ''; // Allow selecting the same file again after an error.
    if (file) openFile(file);
  });

  function openFile(file) {
    const request = ++sourceRequest;
    return run(async () => {
      const instance = await ensurePlayer();
      if (request !== sourceRequest) return;
      watchLoading();
      await instance.loadFile(file);
    });
  }

  async function refreshLibrary() {
    const request = ++libraryRequest;
    $('refresh-library').disabled = true;
    $('library-status').textContent = 'Reading your scores…';
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}scores/catalog.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not read the score library. Check the local server and try Refresh library.');
      const scores = await response.json();
      if (request !== libraryRequest) return;
      const selected = $('library-score').value;
      library = scores;
      $('library-score').replaceChildren(...(scores.length
        ? scores.map(score => option(score.url, score.name))
        : [option('', 'No scores in the folder yet')]));
      if (scores.some(score => score.url === selected)) $('library-score').value = selected;
      $('library-score').disabled = !scores.length;
      $('load-library').disabled = !scores.length;
      $('library-status').textContent = scores.length
        ? `${scores.length} ${scores.length === 1 ? 'score' : 'scores'} available. Choose one to practise.`
        : 'The folder is ready. Add your .gp4 files to public/scores and click Refresh library.';
    } catch (error) {
      if (request === libraryRequest) $('library-status').textContent = error.message;
    } finally {
      if (request === libraryRequest) $('refresh-library').disabled = false;
    }
  }

  $('refresh-library')?.addEventListener('click', refreshLibrary);
  $('load-library')?.addEventListener('click', () => run(async () => {
    const request = ++sourceRequest;
    const score = library.find(item => item.url === $('library-score').value);
    if (!score) return;
    $('load-library').disabled = true;
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${score.url}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('That score could not be opened. It may have moved; refresh the library and try again.');
      const file = new File([await response.arrayBuffer()], score.name);
      const instance = await ensurePlayer();
      if (request !== sourceRequest) return;
      watchLoading();
      await instance.loadFile(file);
    } finally {
      $('load-library').disabled = !library.length;
    }
  }));

  $('demo')?.addEventListener('click', () => run(async () => {
    const request = ++sourceRequest;
    const instance = await ensurePlayer();
    if (request !== sourceRequest) return;
    watchLoading();
    instance.loadTex(DEMO, 'Original demo · First steps');
  }));

  $('play').addEventListener('click', () => run(() => player.playPause()));
  $('print-score').addEventListener('click', () => run(() => player.printScore()));
  for (const [id, format, type] of [['save-gp', 'gp', 'application/octet-stream'], ['save-alphatex', 'alphatex', 'text/plain;charset=utf-8'], ['save-midi', 'mid', 'audio/midi']]) {
    $(id).addEventListener('click', () => run(() => {
      download(player.exportFile(format), scoreFilename(latest.title, format), type);
    }));
  }
  $('stop').addEventListener('click', () => run(() => player.stop()));
  $('speed').addEventListener('input', event => player?.setSpeed(event.target.value));
  $('volume').addEventListener('input', event => player?.setVolume(event.target.value));
  $('loop').addEventListener('change', event => player?.setLoop(event.target.checked));
  $('count-in').addEventListener('change', event => player?.setCountIn(event.target.checked));
  $('metronome').addEventListener('change', event => player?.setMetronome(event.target.checked));
  $('snap').addEventListener('change', event => player?.setSnap(event.target.value));
  for (const [id, key] of [['left-handed', 'leftHanded'], ['note-names', 'showNames'], ['finger-suggestions', 'suggestions'], ['fret-count', 'frets'], ['show-hand', 'hand']]) {
    $(id).addEventListener('change', event => {
      fretboard.options[key] = id === 'fret-count' ? Number(event.target.value) : event.target.checked;
      fretboard.update(latest?.fingering);
    });
  }
  const viewTabs = [...$('finger-guide').querySelectorAll('[role="tab"]')];
  $('hand-opacity').addEventListener('input', event => {
    fretboard.options.handOpacity = Number(event.target.value) / 100;
    fretboard.update(latest?.fingering);
  });
  function selectView(tab) {
    fretboard.options.mode = tab.dataset.view;
    fretboard.update(latest?.fingering);
  }
  for (const tab of viewTabs) {
    tab.addEventListener('click', () => selectView(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - viewTabs.indexOf(tab);
      selectView(viewTabs[index]);
      viewTabs[index].focus();
    });
  }
  $('track').addEventListener('change', event => run(() => player.selectTrack(Number(event.target.value))));
  $('mixer').addEventListener('change', event => {
    const { track, kind } = event.target.dataset;
    run(() => player.setTrackState(Number(track), kind, event.target.checked));
  });
  $('select-bars').addEventListener('click', () => run(() => player.selectBars(Number($('from-bar').value), Number($('to-bar').value))));
  $('clear-range').addEventListener('click', () => run(() => player.clearRange()));

  let dragDepth = 0;
  $('drop-zone').addEventListener('dragenter', event => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    ++dragDepth;
    $('drop-zone').classList.add('dragging');
  });
  $('drop-zone').addEventListener('dragover', event => event.preventDefault());
  $('drop-zone').addEventListener('dragleave', () => {
    if (--dragDepth <= 0) $('drop-zone').classList.remove('dragging');
  });
  $('drop-zone').addEventListener('drop', event => {
    event.preventDefault();
    if (embedded) return;
    dragDepth = 0;
    $('drop-zone').classList.remove('dragging');
    const [file] = event.dataTransfer.files;
    if (file) openFile(file);
  });
  // Prevent a missed drop from navigating away and losing the current practice.
  window.addEventListener('dragover', event => event.preventDefault());
  window.addEventListener('drop', event => event.preventDefault());

  document.addEventListener('keydown', event => {
    if (embedded && !root.contains(event.target)) return;
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target) || !latest?.ready) return;
    if (event.code === 'Space') { event.preventDefault(); run(() => player.playPause()); }
    else if (event.key.toLowerCase() === 'l') { event.preventDefault(); player.setLoop(!latest.looping); }
    else if (event.key === '[' || event.key === ']') {
      event.preventDefault();
      player.setSpeed(latest.speed + (event.key === '[' ? -5 : 5));
    }
  });

  window.addEventListener('pagehide', event => {
    midi.disarm();
    if (event.persisted) player?.stop();
    else { clearTimeout(loadingTimer); player?.dispose(); }
  });

  if (location.protocol === 'file:') {
    showError('Start the local development server and open Practice over http://localhost. Browser audio workers cannot run reliably from a file URL.');
  }
  else if (!embedded) refreshLibrary();

  return {
    loadTex(text, source) {
      const request = ++sourceRequest;
      return run(async () => {
        const instance = await ensurePlayer();
        if (request !== sourceRequest) return;
        watchLoading();
        instance.loadTex(text, source);
      });
    },
    invalidate() {
      ++sourceRequest;
      clearTimeout(loadingTimer);
      player?.stop();
    },
  };
}
