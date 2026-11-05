import { FINGER_NAMES, fretWindow, noteName } from './fingering.js';
import { fretboardLayout, handPose } from './fretboard-layout.js';
import { drawHand } from './hand-guide.js';
import { FretboardScene } from './fretboard-scene.js';

const SVG = 'http://www.w3.org/2000/svg';
const COLORS = { 0: '#536254', 1: '#b16920', 2: '#276da3', 3: '#7853a2', 4: '#ac4668', open: '#397752', unknown: '#6e756e' };
function element(tag, attributes = {}, text) {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function fingerDescription(note) {
  if (note.dead) return 'muted note';
  if (note.fret === 0) return 'open string — no fretting finger';
  if (note.finger === null) return 'choose a comfortable fingering';
  return `${note.finger === 0 ? 'T' : note.finger} ${FINGER_NAMES[note.finger]} · ${note.origin}`;
}

export class Fretboard {
  constructor(root) {
    this.root = root;
    this.options = { leftHanded: false, showNames: false, suggestions: true, frets: 12, mode: 'diagram', hand: false, handOpacity: 0.42 };
    this.key = '';
    this.handWasVisible = false;
    window.addEventListener('pagehide', () => { this.scene?.dispose(); this.scene = null; });
    window.addEventListener('pageshow', event => {
      if (event.persisted) { this.key = ''; this.update(this.view); }
    });
  }

  update(view) {
    this.view = view;
    const key = JSON.stringify([view, this.options]);
    if (key === this.key) return;
    this.key = key;
    const video = this.options.mode === 'video';
    this.root.querySelector('#hand-option').hidden = !video;
    this.root.querySelector('#hand-opacity-option').hidden = !video || !this.options.hand;
    const tabs = this.root.querySelectorAll('[role="tab"]');
    tabs.forEach(tab => {
      const selected = tab.dataset.view === this.options.mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    const board = this.root.querySelector('#fretboard-diagram');
    this.scene?.pause();
    board.classList.toggle('video-fretboard', video);
    board.setAttribute('aria-labelledby', video ? 'fretboard-video-tab' : 'fretboard-diagram-tab');
    const list = this.root.querySelector('#finger-notes');
    board.replaceChildren();
    list.replaceChildren();
    const status = this.root.querySelector('#finger-status');
    if (!view?.tuning?.length) {
      status.textContent = view?.unavailable || 'Load a score to see finger positions.';
      this.root.querySelector('#finger-caution').textContent = 'Suggested fingers are starting points; written finger hints take priority.';
      this.root.querySelector('#hand-status').textContent = '';
      this.handWasVisible = false;
      this.previousHandPose = null;
      return;
    }
    const current = view.current.map(note => this.visibleNote(note));
    const next = view.next.map(note => this.visibleNote(note));
    const window = fretWindow([...current, ...next], this.options.frets);
    status.textContent = `${view.mode} · ${view.track} · frets ${window.start}–${window.end}${view.capo ? ` · capo ${view.capo} (frets relative to capo)` : ''}`;
    const layout = fretboardLayout({ strings: view.tuning.length, frets: this.options.frets, start: window.start, video, leftHanded: this.options.leftHanded });
    const { width, gap, height, cell, x } = layout;
    const showHand = video && this.options.hand;
    const svg = element('svg', { viewBox: `0 0 ${width} ${height - (video ? 16 : 0)}`, role: 'img', 'aria-label': `${video ? 'Video view: highest string at the bottom; nut on the ' + (layout.mirrored ? 'right' : 'left') + '. ' : ''}Fretting-hand positions. Solid circles are this beat; outlined circles are the next beat.` });
    if (video) {
      const defs = element('defs');
      const gradient = element('linearGradient', { id: 'neck-wood', x1: '0', y1: '0', x2: '0', y2: '1' });
      gradient.append(element('stop', { offset: '0%', 'stop-color': '#e3c495' }), element('stop', { offset: '100%', 'stop-color': '#f3dfbb' }));
      defs.append(gradient);
      svg.append(defs);
    }
    svg.append(element('rect', { class: 'neck-surface', x: Math.min(x(105), x(875)), y: 40, width: 770, height: (view.tuning.length - 1) * gap + 28, rx: 4, fill: video ? 'url(#neck-wood)' : '#f3ede0' }));
    for (let i = 0; i <= this.options.frets; ++i) {
      const fret = window.start + i - 1;
      svg.append(element('line', { class: 'neck-fret', x1: x(105 + i * cell), y1: 40, x2: x(105 + i * cell), y2: height - 26, stroke: '#b2aa95', 'stroke-width': i === 0 && window.start === 1 ? 5 : 1 }));
      if (i < this.options.frets) {
        svg.append(element('text', { x: x(105 + (i + 0.5) * cell), y: 24, 'text-anchor': 'middle', class: 'fret-number' }, String(fret + 1)));
      }
    }
    svg.append(element('text', { x: x(73), y: 24, 'text-anchor': 'middle', class: 'fret-number' }, video ? '0' : 'Open'));
    view.tuning.forEach((pitch, i) => {
      const y = layout.y(i + 1);
      svg.append(element('text', { x: x(28), y: y + 4, 'text-anchor': 'middle', class: 'string-label' }, `${noteName(pitch, true)}`));
      svg.append(element('line', { class: 'neck-string', x1: x(105), y1: y, x2: x(875), y2: y, stroke: '#827e6b', 'stroke-width': 1 + i * 0.3 }));
    });
    let hand = null, transition = {};
    if (showHand) {
      const frame = JSON.stringify([view.track, view.tuning, window, this.options.frets, this.options.leftHanded]);
      const previous = frame === this.handFrame ? this.previousHandPose : null;
      const pose = handPose(current, layout, window, { next, previousPosition: previous?.position });
      const duration = view.playing && previous && !globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches ? view.handTransitionMs ?? 80 : 0;
      hand = pose;
      transition = { previous, duration, opacity: this.options.handOpacity };
      drawHand(svg, pose, layout, element, { previous, duration, opacity: this.options.handOpacity });
      this.previousHandPose = pose;
      this.handFrame = frame;
      this.root.querySelector('#hand-status').textContent = pose.open
        ? 'Open strings — release the strings; the fingers hover above the neck, ready for the next notes.'
        : pose.contacts.length ? `${pose.preset} — pressed fingertips meet the solid notes. The other fingers hover; the thumb supports the back of the neck.`
          : current.length ? 'No confident pose for this beat. Enable suggestions or check the written hints; the hand is shown relaxed.' : 'Rest — release the strings.';
    } else {
      this.previousHandPose = null;
      this.root.querySelector('#hand-status').textContent = video ? 'Front-of-neck view for mirroring a video lesson. Turn on Show hand to add an illustrated pose.' : '';
    }
    this.handWasVisible = showHand;
    const draw = (note, ghost) => {
      if (note.fret > 0 && (note.fret < window.start || note.fret > window.end)) return;
      const { x: cx, y: cy } = layout.point(note.string, note.fret);
      const color = COLORS[note.fret === 0 ? 'open' : note.finger ?? 'unknown'];
      const group = element('g', { class: `finger-marker ${ghost ? 'next-note' : 'current-note'}`, 'data-string': note.string, 'data-fret': note.fret, 'data-finger': note.finger ?? '', 'data-origin': note.origin });
      group.append(element('title', {}, `${ghost ? 'Next' : 'This beat'}: string ${note.string}, fret ${note.fret}, ${fingerDescription(note)}`));
      group.append(element('circle', { cx, cy, r: ghost ? 14 : showHand ? 9 : 12, fill: ghost ? '#fff' : showHand ? '#ffffffb0' : color, stroke: color, 'stroke-width': 2, 'stroke-dasharray': ghost ? '4 3' : note.origin === 'suggested' ? '2 2' : '', opacity: ghost ? 0.6 : 1 }));
      const label = note.dead ? '×' : note.fret === 0 ? '○' : note.finger === 0 ? 'T' : note.finger ?? '?';
      group.append(element('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', fill: ghost || showHand ? color : '#fff', class: 'finger-number' }, String(label)));
      if (this.options.showNames && !ghost) {
        group.append(element('text', { x: cx, y: cy - 17, 'text-anchor': 'middle', class: 'pitch-label' }, noteName(view.tuning[note.string - 1] + view.capo + note.fret)));
      }
      svg.append(group);
    };
    next.forEach(note => draw(note, true));
    current.forEach(note => draw(note, false));
    const stage = document.createElement('div');
    stage.className = video ? 'fretboard-stage' : '';
    stage.append(svg);
    board.append(stage);
    if (video && !this.sceneUnavailable) {
      try {
        this.scene ??= new FretboardScene();
        this.scene.update(stage, layout, hand, transition);
        stage.classList.add('has-3d');
        board.dataset.renderer = 'webgl';
      } catch (error) {
        this.scene?.dispose();
        this.scene = null;
        this.sceneUnavailable = true;
        board.dataset.renderer = 'svg';
        console.warn('3D fretboard unavailable; using the illustrated guide.', error);
      }
    } else board.dataset.renderer = 'svg';
    const panKey = JSON.stringify([video, this.options.leftHanded, this.options.frets, showHand, window, current.map(note => [note.string, note.fret])]);
    if (video && panKey !== this.panKey && board.scrollWidth > board.clientWidth) {
      const focus = current.find(note => note.fret >= window.start && note.fret <= window.end) || current[0];
      if (focus) {
        const scale = svg.getBoundingClientRect().width / width;
        board.scrollLeft = layout.point(focus.string, focus.fret).x * scale - board.clientWidth / 2;
      }
    }
    this.panKey = panKey;
    for (const note of current) {
      const item = document.createElement('li');
      item.textContent = `String ${note.string} · fret ${note.dead ? '×' : note.fret} · ${fingerDescription(note)}`;
      list.append(item);
    }
    if (!current.length) {
      const item = document.createElement('li');
      item.textContent = 'Rest — no fretting notes in this beat.';
      list.append(item);
    }
    this.root.querySelector('#finger-caution').textContent = current.some(note => note.uncertain)
      ? 'This passage needs a fingering check (stretch, harmonic or conflicting finger hints). ? means no suggestion.'
      : 'Suggested fingers are starting points; written finger hints take priority. This guide shows beat positions, not individual note-off timing.';
  }

  visibleNote(note) {
    return !this.options.suggestions && note.origin === 'suggested'
      ? { ...note, finger: null, origin: 'unknown' } : note;
  }
}
