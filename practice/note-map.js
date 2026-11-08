export const NOTE_NAMES=['C','C♯ / D♭','D','D♯ / E♭','E','F','F♯ / G♭','G','G♯ / A♭','A','A♯ / B♭','B'];
export const NATURALS=[0,2,4,5,7,9,11];
export const TUNING=[64,59,55,50,45,40];
export const STRING_NAMES=['High e','B','G','D','A','Low E'];
export function noteAt(string,fret){
  if(!Number.isInteger(string)||string<1||string>6||!Number.isInteger(fret)||fret<0||fret>24)throw new Error('Choose a valid string and fret.');
  const midi=TUNING[string-1]+fret,pc=midi%12;
  return {string,fret,midi,pc,name:NOTE_NAMES[pc],natural:NATURALS.includes(pc),octave:Math.floor(midi/12)-1};
}
export function notePool(strings='bass',maxFret=12,naturals=true){
  const selected=strings==='bass'?[5,6]:strings==='treble'?[1,2]:strings==='all'?[1,2,3,4,5,6]:[Number(strings)];
  return selected.flatMap(string=>Array.from({length:maxFret+1},(_,fret)=>noteAt(string,fret))).filter(n=>!naturals||n.natural);
}
export function nextNote(pool,previous,random=Math.random){
  const choices=pool.filter(n=>!previous||n.string!==previous.string||n.fret!==previous.fret);
  return choices[Math.floor(random()*choices.length)]||pool[0];
}
