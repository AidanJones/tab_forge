import {CHORD_LIBRARY} from './chord-library.js';
import {STANDARD_TUNING} from './exercises.js';

const strums='https://musescore.com/articles/materials/guitar/guitar-strumming-patterns';
const travis='https://www.fender.com/articles/techniques/travis-picking-on-guitar';
const fingerstyle='https://www.andyguitar.co.uk/videos/introduction-to-fingerstyle';
// Short, original practice variations of standard techniques. References teach
// the technique; these are not transcriptions of the lessons or named songs.
export const RHYTHM_PRESETS={
  offbeats:{name:'Picking · 1 2+3+4',technique:'picking',hits:[1,0,1,1,1,1,1,0],strings:['bass',null,3,2,'bass',3,1,null],description:'Your requested rhythm, using the chosen chord. Edit the sounded slots or picking strings.'},
  quarters:{name:'Strum · four downstrokes',technique:'strumming',hits:[1,0,1,0,1,0,1,0],source:strums,description:'One downstroke on each number. Keep the empty up motions moving.'},
  eighths:{name:'Strum · straight eighths (D U D U D U D U)',technique:'strumming',hits:[1,1,1,1,1,1,1,1],source:strums,description:'Sound every down and up motion evenly.'},
  strum:{name:'Strum · common / island (D D U U D U)',technique:'strumming',hits:[1,0,1,1,0,1,1,1],source:strums,description:'Miss the upstroke after 1 and the downstroke on 3. Keep the arm moving.'},
  dduu:{name:'Strum · D D U U preparation',technique:'strumming',hits:[1,0,1,1,0,1,0,0],description:'A shortened syncopated practice variation. Sound 1, 2, 2 + and 3 +.'},
  pairs:{name:'Strum · down, down-up (D D U D D U)',technique:'strumming',hits:[1,0,1,1,1,0,1,1],source:strums,description:'Miss the upstrokes after 1 and 3.'},
  faithful:{name:'Strum · D D U U D',technique:'strumming',hits:[1,0,1,1,0,1,1,0],source:'https://www.justinguitar.com/guitar-lessons/the-strumming-pattern-b1-404',description:'Five sounded strokes; keep 3 silent while its upstroke sounds. A common folk/pop variation.'},
  pause:{name:'Strum · skip beat 3 (D U D U U D U)',technique:'strumming',hits:[1,1,1,1,0,1,1,1],source:strums,description:'Straight eighths with the downstroke on 3 left silent.'},
  reggae:{name:'Strum · offbeat upstrokes',technique:'strumming',hits:[0,1,0,1,0,1,0,1],source:strums,description:'Sound only the + slots. Practise short, light upstrokes; muting quality is not graded.'},
  arpeggio:{name:'Picking · forward P I M A roll',technique:'picking',hits:[1,1,1,1,1,1,1,1],strings:['bass',3,2,1,'bass',3,2,1],source:fingerstyle,description:'Thumb on the chord bass, then index, middle and ring on strings 3, 2 and 1. Repeat twice per bar.'},
  reverse:{name:'Picking · reverse P A M I roll',technique:'picking',hits:[1,1,1,1,1,1,1,1],strings:['bass',1,2,3,'bass',1,2,3],source:fingerstyle,description:'An original reverse-roll variation: bass, then strings 1, 2 and 3.'},
  bass:{name:'Picking · alternating-bass thumb foundation',technique:'picking',hits:[1,0,1,0,1,0,1,0],strings:['bass',null,'alt',null,'bass',null,'alt',null],source:travis,description:'Keep a steady thumb pulse on two bass strings. Start with C or Am; the bass strings follow the chord shape.'},
  travis:{name:'Picking · Travis preparation (single notes)',technique:'picking',hits:[1,1,1,1,1,1,1,1],strings:['bass',2,'alt',3,'bass',2,'alt',3],source:travis,description:'Alternate thumb bass notes on the numbers, with treble notes in between. This preparatory variation uses single notes, not simultaneous pinches.'},
  inside:{name:'Picking · inside-out preparation',technique:'picking',hits:[1,1,1,1,1,1,1,1],strings:['bass',3,'alt',2,'bass',3,'alt',1],source:fingerstyle,description:'An original inside-out variation: alternate bass notes with the higher strings. P = thumb, I = index, M = middle, A = ring.'},
};

export function pickingTargets(chord,selectors,hits=Array(8).fill(true)){
  const frets=CHORD_LIBRARY[chord];if(!frets)throw new Error('Choose a supported chord shape.');
  const sounded=[6,5,4,3,2,1].filter(string=>frets[6-string]>=0);
  const bass=sounded[0],alternate=sounded.find(string=>string<= (bass===6?4:bass-1));
  return selectors.map((selector,i)=>{
    if(!hits[i]||selector===null||selector===undefined||selector==='any')return null;
    const string=selector==='bass'?bass:selector==='alt'?alternate:Number(selector);
    const fret=frets[6-string];
    if(!Number.isInteger(string)||string<1||string>6||fret<0||fret===undefined)throw new Error(`${chord} mutes string ${string}. Choose a sounding string at ${Math.floor(i/2)+1}${i%2?' +':''}.`);
    return {string,fret,midi:STANDARD_TUNING[string-1]+fret,finger:selector==='bass'||selector==='alt'||string>=4?'P':{3:'I',2:'M',1:'A'}[string]};
  });
}
