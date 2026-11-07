function quote(value) {
  return JSON.stringify(String(value).replace(/[\u0000-\u001f]/g, ' '));
}

export function lessonToAlphaTex(data, builtInChords, { tempo = 80, duration = 4 } = {}) {
  if (!Number.isInteger(tempo) || tempo < 40 || tempo > 240) throw new Error('Choose a base tempo from 40 to 240 BPM.');
  if (![4, 8, 16].includes(duration)) throw new Error('Choose quarter, eighth or sixteenth notes.');
  const tuning = (data.metadata.tuning || 'standard').trim().toLowerCase();
  if (!['standard', 'standard tuning', 'eadgbe', 'e a d g b e'].includes(tuning)) {
    throw new Error(`Playback does not yet understand tuning "${data.metadata.tuning}". Set tuning: standard to use this lesson preview, or open a properly tuned score in Practice.`);
  }
  const definitions = new Map();
  function chord(name, required = false, register = true) {
    const customName = Object.keys(data.chords).find(key => key.toLowerCase() === name.toLowerCase());
    const builtInName = Object.keys(builtInChords).find(key => key.toLowerCase() === name.toLowerCase());
    if (customName === undefined && builtInName === undefined) {
      if (required) throw new Error(`Define the shape for "${name}" in chords: before using it as a hand-shape hint.`);
      return null;
    }
    if (customName !== undefined && !/^[xX0-9]{6}$/.test(data.chords[customName])) throw new Error(`The chord ${name} needs six fret digits or x, from low E to high e.`);
    const canonical = customName ?? builtInName;
    const frets = customName === undefined ? builtInChords[builtInName] : [...data.chords[customName]].map(value => /x/i.test(value) ? -1 : Number(value));
    const value = { name: canonical, frets, notes: frets.flatMap((fret,i) => fret < 0 ? [] : [{ fret, string:6-i }]) };
    if (register) definitions.set(canonical, value);
    return value;
  }
  for (const name of Object.keys(data.chords)) chord(name, true);
  const beats = [], sections = new Map();
  let annotations = 0, lyricLines = 0, padding = 0, played = 0;
  let pendingText = [], pendingLyrics = [], pendingSections = [];
  let shape = null, lastShape = null, phrase = null;
  function padBar() {
    while (beats.length % duration) { beats.push({ notation:`r.${duration}`, texts:[], lyrics:[] }); ++padding; }
  }
  function addLyrics(target, lines) {
    for (const line of lines) {
      const words = line.trim().split(/\s+/).filter(Boolean);
      const verse = Math.max(0, ...target.map(beat => beat.lyrics.length));
      for (let i=0; i<words.length && i<target.length; ++i) target[i].lyrics[verse] = i === target.length-1 ? words.slice(i).join(' ') : words[i];
    }
  }
  function annotate(text, lyric = false) {
    if (lyric) {
      ++lyricLines;
      if (phrase?.length) addLyrics(phrase,[text]); else pendingLyrics.push(text);
    } else {
      ++annotations;
      if (phrase?.length) phrase[0].texts.push(text); else pendingText.push(text);
    }
  }
  for (const section of data.sections) {
    phrase = null;
    const namedChord = section.name ? chord(section.name) : null;
    shape = section.chord ? chord(section.chord,true) : namedChord;
    if (section.name && !namedChord) pendingSections.push(section.name);
    for (const raw of section.content) {
      const line = raw.trim();
      if (!line) continue;
      if (/^(shape|chord):/i.test(line)) {
        const name = line.slice(line.indexOf(':')+1).trim();
        shape = /^(none|off)$/i.test(name) ? null : chord(name,true);
        phrase = null;
        continue;
      }
      if (/^note:/i.test(line)) { annotate(line.slice(5).trim()); continue; }
      if (/^lyrics:/i.test(line) || /^".*"$/.test(line)) {
        annotate(line.startsWith('"') ? line.slice(1,-1) : line.slice(line.indexOf(':')+1).trim(),true);
        continue;
      }
      const tokens = line.replace(/\s*\+\s*/g,'+').split(/\s+/).filter(Boolean);
      const musical = tokens.some(token => /\d+f\d+s|0s\d+/.test(token) || /^(r|rest|\|)$/i.test(token)) || tokens.every(token => chord(token,false,false));
      if (!musical) { annotate(line); continue; }
      if (pendingSections.length) {
        padBar();
        sections.set(beats.length,pendingSections.join(' · '));
        pendingSections = [];
        lastShape = null;
      }
      phrase = [];
      for (const token of tokens) {
        if (token === '|') { padBar(); continue; }
        const named = chord(token);
        let notation;
        if (/^(r|rest)$/i.test(token)) notation = `r.${duration}`;
        else {
          if (named) shape = named;
          const notes = named?.notes ?? token.split('+').map(part => {
            let match = /^(\d+)f([1-6])s$/.exec(part);
            if (match) return { fret:Number(match[1]), string:Number(match[2]) };
            match = /^0s([1-6])$/.exec(part);
            if (match) return { fret:0, string:Number(match[1]) };
            throw new Error(`Cannot play "${part}". Use notes such as 3f1s, 0s3, a defined chord, or rest.`);
          });
          if (!notes.length) throw new Error(`The chord "${token}" has no played strings.`);
          if (notes.some(n => n.fret > 36)) throw new Error(`Check the fret number in "${token}" (maximum 36).`);
          if (new Set(notes.map(n=>n.string)).size !== notes.length) throw new Error(`A chord cannot play two frets on the same string: ${token}`);
          const text = notes.map(n=>`${n.fret}.${n.string}`).join(' ');
          notation = `${notes.length>1?`(${text})`:text}.${duration}`;
        }
        const beat = { notation, texts:[], lyrics:[], chord:shape && (named || beats.length%duration===0 || lastShape!==shape.name) ? shape.name : null };
        if (shape) lastShape = shape.name; else lastShape = null;
        beats.push(beat); phrase.push(beat); ++played;
      }
      if (phrase.length) {
        phrase[0].texts.push(...pendingText); pendingText=[];
        addLyrics(phrase,pendingLyrics); pendingLyrics=[];
      }
    }
  }
  if (!played) throw new Error('Add a section such as [Intro] and a few notes, then update the preview.');
  if (pendingText.length || pendingLyrics.length) {
    const last = beats.at(-1);
    last.texts.push(...pendingText);
    addLyrics([last],pendingLyrics);
  }
  padBar();
  const body=[];
  for(let i=0;i<beats.length;i+=duration) {
    const bar = beats.slice(i,i+duration).map(beat=>{
      const effects=[];
      if(beat.chord) effects.push(`ch ${quote(beat.chord)}`);
      if(beat.texts.length) effects.push(`txt ${quote(beat.texts.join(' · '))}`);
      beat.lyrics.forEach((text,verse)=>{if(text) effects.push(`lyrics ${verse} ${quote(text)}`);});
      return `${beat.notation}${effects.length?` {${effects.join(' ')}}`:''}`;
    });
    body.push(`${sections.has(i)?`\\section ${quote(sections.get(i))}\n`:''}${bar.join(' ')} |`);
  }
  const diagrams = [...definitions.values()].map(value=>{
    const fretted=value.frets.filter(fret=>fret>0);
    const first=fretted.length && Math.max(...fretted)>5 && Math.min(...fretted)>1 ? Math.min(...fretted) : 1;
    return `\\chord (${quote(value.name)} ${[...value.frets].reverse().map(fret=>fret<0?'x':fret).join(' ')})${first>1?` {firstfret ${first}}`:''}`;
  }).join('\n');
  const subtitle = [data.metadata.key ? `Key: ${data.metadata.key}` : '', `Draft rhythm: uniform ${({4:'quarter',8:'eighth',16:'sixteenth'})[duration]} notes at ${tempo} BPM`].filter(Boolean).join(' · ');
  return {
    tex:`\\title ${quote(data.metadata.title||'Your lesson')}\n\\subtitle ${quote(subtitle)}\n\\artist ${quote(data.metadata.artist||'')}\n\\tempo ${tempo}\n.\n\\track "Guitar"\n\\instrument 25\n\\tuning E4 B3 G3 D3 A2 E2\n${diagrams}\n\\ts 4 4\n${body.join('\n')}`,
    beatCount:played, paddedRests:padding, annotations, lyricLines,
  };
}
