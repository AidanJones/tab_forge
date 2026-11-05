import { FINGER_NAMES, fretWindow, noteName } from './fingering.js';

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
    this.options = { leftHanded: false, showNames: false, suggestions: true, frets: 12 };
    this.key = '';
  }

  update(view) {
    this.view = view;
    const key = JSON.stringify([view, this.options]);
    if (key === this.key) return;
    this.key = key;
    const board = this.root.querySelector('#fretboard-diagram');
    const list = this.root.querySelector('#finger-notes');
    board.replaceChildren();
    list.replaceChildren();
    const status = this.root.querySelector('#finger-status');
    if (!view?.tuning?.length) {
      status.textContent = view?.unavailable || 'Load a score to see finger positions.';
      this.root.querySelector('#finger-caution').textContent = 'Suggested fingers are starting points; written finger hints take priority.';
      return;
    }
    const current = view.current.map(note => this.visibleNote(note));
    const next = view.next.map(note => this.visibleNote(note));
    const window = fretWindow([...current, ...next], this.options.frets);
    status.textContent = `${view.mode} · ${view.track} · frets ${window.start}–${window.end}${view.capo ? ` · capo ${view.capo} (frets relative to capo)` : ''}`;
    const width = 920;
    const gap = 34;
    const height = 60 + view.tuning.length * gap;
    const cell = 770 / this.options.frets;
    const x = value => this.options.leftHanded ? width - value : value;
    const svg = element('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Fretting-hand positions. Solid circles are this beat; outlined circles are the next beat.' });
    svg.append(element('rect', { x: this.options.leftHanded ? 45 : 105, y: 40, width: 770, height: (view.tuning.length - 1) * gap + 28, rx: 4, fill: '#f3ede0' }));
    for (let i = 0; i <= this.options.frets; ++i) {
      const fret = window.start + i - 1;
      svg.append(element('line', { x1: x(105 + i * cell), y1: 40, x2: x(105 + i * cell), y2: height - 26, stroke: '#b2aa95', 'stroke-width': i === 0 && window.start === 1 ? 5 : 1 }));
      if (i < this.options.frets) {
        svg.append(element('text', { x: x(105 + (i + 0.5) * cell), y: 24, 'text-anchor': 'middle', class: 'fret-number' }, String(fret + 1)));
      }
    }
    svg.append(element('text', { x: x(73), y: 24, 'text-anchor': 'middle', class: 'fret-number' }, 'Open'));
    view.tuning.forEach((pitch, i) => {
      const y = 54 + i * gap;
      svg.append(element('text', { x: x(28), y: y + 4, 'text-anchor': 'middle', class: 'string-label' }, `${noteName(pitch, true)}`));
      svg.append(element('line', { x1: x(105), y1: y, x2: x(875), y2: y, stroke: '#827e6b', 'stroke-width': 1 + i * 0.3 }));
    });
    const draw = (note, ghost) => {
      if (note.fret > 0 && (note.fret < window.start || note.fret > window.end)) return;
      const cx = x(note.fret === 0 ? 73 : 105 + (note.fret - window.start + 0.5) * cell);
      const cy = 54 + (note.string - 1) * gap;
      const color = COLORS[note.fret === 0 ? 'open' : note.finger ?? 'unknown'];
      const group = element('g', { class: `finger-marker ${ghost ? 'next-note' : 'current-note'}`, 'data-string': note.string, 'data-fret': note.fret, 'data-finger': note.finger ?? '', 'data-origin': note.origin });
      group.append(element('title', {}, `${ghost ? 'Next' : 'This beat'}: string ${note.string}, fret ${note.fret}, ${fingerDescription(note)}`));
      group.append(element('circle', { cx, cy, r: ghost ? 14 : 12, fill: ghost ? '#fff' : color, stroke: color, 'stroke-width': 2, 'stroke-dasharray': ghost ? '4 3' : note.origin === 'suggested' ? '2 2' : '', opacity: ghost ? 0.6 : 1 }));
      const label = note.dead ? '×' : note.fret === 0 ? '○' : note.finger === 0 ? 'T' : note.finger ?? '?';
      group.append(element('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', fill: ghost ? color : '#fff', class: 'finger-number' }, String(label)));
      if (this.options.showNames && !ghost) {
        group.append(element('text', { x: cx, y: cy - 17, 'text-anchor': 'middle', class: 'pitch-label' }, noteName(view.tuning[note.string - 1] + view.capo + note.fret)));
      }
      svg.append(group);
    };
    next.forEach(note => draw(note, true));
    current.forEach(note => draw(note, false));
    board.append(svg);
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
