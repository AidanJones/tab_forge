import { STANDARD_TUNING } from './exercises.js';

const permutations = values => values.length ? values.flatMap((value, i) => permutations(values.filter((_, j) => j !== i)).map(rest => [value, ...rest])) : [[]];
export const SPIDER_PATTERNS = permutations([1, 2, 3, 4]).map(p => p.join(''));

export function spiderExercise({pattern='1234', startFret=5, direction='up', returning=true, bpm=60}={}) {
  if (!SPIDER_PATTERNS.includes(pattern) || !Number.isInteger(startFret) || startFret<1 || startFret>21 || !['up','down'].includes(direction) || !Number.isInteger(bpm) || bpm<30 || bpm>240) throw new Error('Choose a spider pattern, first fret (1–21) and tempo (30–240 BPM).');
  const fingers=[...pattern].map(Number);
  if(returning) fingers.push(...fingers.slice(0,-1).reverse());
  const strings=direction==='up'?[6,5,4,3,2,1]:[1,2,3,4,5,6];
  const notes=strings.flatMap(string=>fingers.map(finger=>({string,finger,fret:startFret+finger-1,midi:STANDARD_TUNING[string-1]+startFret+finger-1})));
  const title=`Spider · ${pattern} · frets ${startFret}–${startFret+3}`;
  // One string per bar; the return pattern has seven even quarter notes.
  // alphaTex numbers fingers 1–5 (thumb first); our guitar fingers are 1–4.
  const bars=strings.map(string=>notes.filter(n=>n.string===string).map(n=>`${n.fret}.${n.string}{lf ${n.finger+1}}`).join(' '));
  return {title,from:'spider',notes,tex:`\\title ${JSON.stringify(title)} \\artist "tab_forge spider trainer" \\tempo ${bpm} . \\tuning E4 B3 G3 D3 A2 E2 \\ts ${fingers.length} 4 :4 ${bars.join(' | ')} |`,
    lesson:`title: ${title}\ntuning: standard\n[Spider practice]\nnote: Fingers ${fingers.join('–')}; index at fret ${startFret}, one finger per fret. Standard tuning, no capo.\n${notes.map(n=>`${n.fret}f${n.string}s`).join(' ')}`};
}

export class SpiderTrainer {
  constructor(host, load) {
    host.innerHTML=`<h2>Spider · finger independence</h2><p>Play the pattern on one string, then move to the next. Keep one finger per fret: 1 index, 2 middle, 3 ring, 4 little finger. Start slowly with a relaxed hand; release each note cleanly.</p>
      <div class="tuner-controls"><label>Finger permutation<select id="spider-pattern"></select></label><label>Index finger fret<input id="spider-fret" type="number" min="1" max="21" value="5"></label><label>String direction<select id="spider-direction"><option value="up">Low E → high e (6 → 1)</option><option value="down">High e → low E (1 → 6)</option></select></label><label>Tempo (BPM)<input id="spider-tempo" type="number" min="30" max="240" value="60"></label></div>
      <label><input id="spider-return" type="checkbox" checked> Return through the pattern on each string (1–2–3–4–3–2–1)</label>
      <p id="spider-preview" role="status"></p><p>These are finger numbers, not fret numbers. Moving the index-finger fret moves the whole exercise. The microphone checks pitch, so it cannot tell which finger you used. Use headphones for microphone practice.</p>
      <div class="button-row"><button id="spider-load" type="button">Load spider tab</button><button id="spider-practise" class="primary" type="button">Practise spider with microphone</button><button id="spider-next" type="button">Next permutation</button></div><p id="spider-error" role="alert"></p>`;
    const $=s=>host.querySelector(s);
    $('#spider-pattern').replaceChildren(...SPIDER_PATTERNS.map((p,i)=>new Option(`${p.split('').join('–')} · ${i+1} / 24`,p)));
    const exercise=()=>spiderExercise({pattern:$('#spider-pattern').value,startFret:Number($('#spider-fret').value),direction:$('#spider-direction').value,returning:$('#spider-return').checked,bpm:Number($('#spider-tempo').value)});
    const update=()=>{try{const e=exercise();$('#spider-error').textContent='';$('#spider-preview').textContent=`On each string: ${e.notes.slice(0,e.notes.length/6).map(n=>n.finger).join(' → ')}. Frets ${e.notes.slice(0,e.notes.length/6).map(n=>n.fret).join(' → ')}. ${e.notes.length} notes across six strings.`;}catch(error){$('#spider-error').textContent=error.message;$('#spider-preview').textContent='';}};
    host.addEventListener('change',update);
    $('#spider-next').addEventListener('click',()=>{const select=$('#spider-pattern');select.selectedIndex=(select.selectedIndex+1)%24;update();});
    for(const [selector,wait]of [['#spider-load',false],['#spider-practise',true]]) $(selector).addEventListener('click',()=>{try{load(exercise(),{wait});}catch(error){$('#spider-error').textContent=error.message;}});
    update();
  }
}
