function quote(value) {
  return JSON.stringify(String(value).replace(/[\u0000-\u001f]/g, ' '));
}

function chordNotes(name, custom, builtIn) {
  const customName = Object.keys(custom).find(key => key.toLowerCase() === name.toLowerCase());
  const builtInName = Object.keys(builtIn).find(key => key.toLowerCase() === name.toLowerCase());
  if (customName === undefined && builtInName === undefined) return null;
  if (customName !== undefined && !/^[xX0-9]{6}$/.test(custom[customName])) {
    throw new Error(`The chord ${name} needs six fret digits or x, from low E to high e.`);
  }
  const frets = customName === undefined ? builtIn[builtInName]
    : [...custom[customName]].map(value => /x/i.test(value) ? -1 : Number(value));
  return frets.flatMap((fret, i) => fret < 0 ? [] : [{ fret, string: 6 - i }]);
}

export function lessonToAlphaTex(data, builtInChords, { tempo = 80, duration = 4 } = {}) {
  if (!Number.isInteger(tempo) || tempo < 40 || tempo > 240) throw new Error('Choose a base tempo from 40 to 240 BPM.');
  if (![4, 8, 16].includes(duration)) throw new Error('Choose quarter, eighth or sixteenth notes.');
  const tuning = (data.metadata.tuning || 'standard').trim().toLowerCase();
  if (!['standard', 'standard tuning', 'eadgbe', 'e a d g b e'].includes(tuning)) {
    throw new Error(`Playback does not yet understand tuning "${data.metadata.tuning}". Set tuning: standard to use this lesson preview, or open a properly tuned score in Practice.`);
  }
  const beats = [];
  let annotations = 0;
  for (const section of data.sections) {
    for (const line of section.content) {
      if (!line || /^note:/i.test(line) || /^".*"$/.test(line)) continue;
      const tokens = line.replace(/\s*\+\s*/g, '+').split(/\s+/).filter(Boolean);
      const looksMusical = tokens.some(token => /\d+f\d+s|0s\d+/.test(token) || /^(r|rest)$/i.test(token))
        || tokens.every(token => chordNotes(token, data.chords, builtInChords));
      if (!looksMusical) { ++annotations; continue; }
      for (const token of tokens) {
        if (/^(r|rest)$/i.test(token)) { beats.push(`r.${duration}`); continue; }
        const chord = chordNotes(token, data.chords, builtInChords);
        const notes = chord ?? token.split('+').map(part => {
          let match = /^(\d+)f([1-6])s$/.exec(part);
          if (match) return { fret: Number(match[1]), string: Number(match[2]) };
          match = /^0s([1-6])$/.exec(part);
          if (match) return { fret: 0, string: Number(match[1]) };
          throw new Error(`Cannot play "${part}". Use notes such as 3f1s, 0s3, a defined chord, or rest.`);
        });
        if (!notes.length) throw new Error(`The chord "${token}" has no played strings.`);
        if (notes.some(note => note.fret > 36)) throw new Error(`Check the fret number in "${token}" (maximum 36).`);
        if (new Set(notes.map(note => note.string)).size !== notes.length) throw new Error(`A chord cannot play two frets on the same string: ${token}`);
        const notation = notes.map(note => `${note.fret}.${note.string}`).join(' ');
        beats.push(`${notes.length > 1 ? `(${notation})` : notation}.${duration}`);
      }
    }
  }
  if (!beats.length) throw new Error('Add a section such as [Intro] and a few notes, then update the preview.');
  const padding = (duration - beats.length % duration) % duration;
  const bars = [...beats, ...Array(padding).fill(`r.${duration}`)];
  const body = [];
  for (let i = 0; i < bars.length; i += duration) body.push(`${bars.slice(i, i + duration).join(' ')} |`);
  return {
    tex: `\\title ${quote(data.metadata.title || 'Your lesson')}\n\\subtitle ${quote(`Draft rhythm: uniform ${({ 4: 'quarter', 8: 'eighth', 16: 'sixteenth' })[duration]} notes at ${tempo} BPM`)}\n\\artist ${quote(data.metadata.artist || '')}\n\\tempo ${tempo}\n.\n\\track "Guitar"\n\\instrument 25\n\\tuning E4 B3 G3 D3 A2 E2\n\\ts 4 4\n${body.join('\n')}`,
    beatCount: beats.length, paddedRests: padding, annotations,
  };
}
