// Suggestions only: no changes to the imported score or its written fingering.
// Notes use conventional tab numbering (1 = highest string) at this boundary.
export const FINGER_NAMES = { 0: 'thumb', 1: 'index', 2: 'middle', 3: 'ring', 4: 'little' };

function writtenFinger(note) {
  return Number.isInteger(note.writtenFinger) && note.writtenFinger >= 0 && note.writtenFinger <= 4
    ? note.writtenFinger : null;
}

function validBarre(notes, fingers) {
  const indexNotes = notes.filter((_, i) => fingers[i] === 1);
  if (indexNotes.length < 2) return true;
  const fret = indexNotes[0].fret;
  const low = Math.min(...indexNotes.map(note => note.string));
  const high = Math.max(...indexNotes.map(note => note.string));
  return !notes.some(note => note.string >= low && note.string <= high && note.fret < fret);
}

function candidates(notes) {
  const fretted = notes.filter(note => note.fret > 0 && !note.dead && !note.harmonic);
  if (!fretted.length) return [{ fingers: notes.map(() => null), position: null, cost: 0 }];
  const min = Math.min(...fretted.map(note => note.fret));
  const max = Math.max(...fretted.map(note => note.fret));
  // Do not pretend a wide stretch or more than four independently fretted
  // positions has an ordinary four-finger solution. Keep file hints as supplied.
  if (max - min > 4 || fretted.length > 8) return [];
  const result = [];
  const assignment = notes.map(() => null);
  function visit(i) {
    if (i === notes.length) {
      if (!validBarre(notes, assignment)) return;
      const anchors = notes.flatMap((note, j) => assignment[j] > 0 ? [note.fret - assignment[j] + 1] : []);
      const position = Math.max(1, Math.round(anchors.reduce((a, b) => a + b, 0) / (anchors.length || 1)));
      const reach = anchors.reduce((sum, anchor) => sum + (anchor - position) ** 2, 0);
      const pinkies = assignment.filter(finger => finger === 4).length;
      result.push({ fingers: [...assignment], position, cost: reach * 3 + position * 0.04 + pinkies * 0.15 });
      return;
    }
    const note = notes[i];
    if (note.fret === 0 || note.dead || note.harmonic) { visit(i + 1); return; }
    const written = writtenFinger(note);
    for (const finger of written === null ? [1, 2, 3, 4] : [written]) {
      let valid = true;
      for (let j = 0; j < i; ++j) {
        const other = assignment[j];
        if (other === null || other === 0 || finger === 0) continue;
        // A finger cannot occupy two frets. Only the index can form an inferred
        // barre; other same-fret notes use separate fingers.
        if (other === finger && (finger !== 1 || notes[j].fret !== note.fret)) valid = false;
        if (notes[j].fret < note.fret && other >= finger) valid = false;
        if (notes[j].fret > note.fret && other <= finger) valid = false;
      }
      if (valid) { assignment[i] = finger; visit(i + 1); assignment[i] = null; }
    }
  }
  visit(0);
  return result.sort((a, b) => a.cost - b.cost).slice(0, 12);
}

export function suggestFingering(groups) {
  // A small Viterbi pass chooses positions across the passage, penalising shifts
  // rather than choosing a new hand position independently for every note.
  const layers = [];
  for (let i = 0; i < groups.length; ++i) {
    const notes = groups[i];
    let choices = candidates(notes);
    if (!choices.length) choices.push({ fingers: notes.map(writtenFinger), position: null, cost: 8, uncertain: true });
    const previous = layers.at(-1);
    // Rests and open strings do not force a new hand position. Carry all viable
    // positions across them so later notes still influence the sequence choice.
    if (previous && choices.length === 1 && choices[0].position === null && !choices[0].uncertain) {
      choices = [...new Set(previous.map(prior => prior.position))].map(position => ({ ...choices[0], position }));
    }
    const layer = choices.map(choice => {
      let best = { total: choice.cost, previous: -1 };
      if (previous) {
        best.total = Infinity;
        previous.forEach((prior, j) => {
          const position = choice.position ?? prior.position;
          const shift = position !== null && prior.position !== null ? Math.abs(position - prior.position) : 0;
          const total = prior.total + choice.cost + shift * 1.5;
          if (total < best.total) best = { total, previous: j, position };
        });
      }
      return { ...choice, ...best, position: best.position ?? choice.position };
    });
    layers.push(layer);
  }
  if (!layers.length) return [];
  let selected = layers.at(-1).reduce((best, candidate, i, layer) => candidate.total < layer[best].total ? i : best, 0);
  const result = new Array(groups.length);
  for (let i = layers.length - 1; i >= 0; --i) {
    const choice = layers[i][selected];
    result[i] = groups[i].map((note, j) => {
      const written = writtenFinger(note);
      const open = note.fret === 0 && !note.dead;
      return {
        ...note,
        finger: open || note.dead ? null : written ?? choice.fingers[j],
        origin: open ? 'open' : note.dead ? 'muted' : written !== null ? 'written' : choice.fingers[j] !== null ? 'suggested' : 'unknown',
        uncertain: Boolean(choice.uncertain || note.harmonic),
      };
    });
    selected = choice.previous;
  }
  return result;
}

export function fretWindow(notes, count = 12) {
  const frets = notes.filter(note => note.fret > 0).map(note => note.fret);
  const high = Math.max(1, ...frets);
  const low = Math.min(high, ...frets);
  const start = high <= count ? 1 : Math.max(1, low - 1);
  return { start, end: start + count - 1 };
}

export function noteName(midi, octave = false) {
  const names = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  return `${names[((midi % 12) + 12) % 12]}${octave ? Math.floor(midi / 12) - 1 : ''}`;
}
