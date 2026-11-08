import {TUNING,STRING_NAMES} from './note-map.js';
import {ROOTS,SCALES} from './exercises.js';

export const FIFTHS=[
  {pc:0,major:'C',minor:'A',signature:'0'},
  {pc:7,major:'G',minor:'E',signature:'1♯'},
  {pc:2,major:'D',minor:'B',signature:'2♯'},
  {pc:9,major:'A',minor:'F♯',signature:'3♯'},
  {pc:4,major:'E',minor:'C♯',signature:'4♯'},
  {pc:11,major:'B',minor:'G♯',signature:'5♯'},
  {pc:6,major:'F♯ / G♭',minor:'D♯ / E♭',signature:'6♯ / 6♭'},
  {pc:1,major:'D♭',minor:'B♭',signature:'5♭'},
  {pc:8,major:'A♭',minor:'F',signature:'4♭'},
  {pc:3,major:'E♭',minor:'C',signature:'3♭'},
  {pc:10,major:'B♭',minor:'G',signature:'2♭'},
  {pc:5,major:'F',minor:'D',signature:'1♭'},
];
const DEGREE={0:'1',1:'♭2',2:'2',3:'♭3',4:'3',5:'4',6:'♭5',7:'5',8:'♭6',9:'6',10:'♭7',11:'7'};
const SHARPS=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export function scalePositions(root,type,maxFret=12){
  const intervals=SCALES[type]?.intervals;
  if(!intervals||!Number.isInteger(root)||root<0||root>11)throw new Error('Choose a scale and root.');
  return TUNING.flatMap((open,i)=>Array.from({length:maxFret+1},(_,fret)=>{
    const pc=(open+fret)%12,interval=(pc-root+12)%12;
    return {string:i+1,fret,pc,root:interval===0,degree:DEGREE[interval],name:SHARPS[pc],interval};
  }).filter(n=>intervals.includes(n.interval)));
}

export class ScaleMap {
  constructor(panel,onKey){
    this.host=document.createElement('section');this.host.className='scale-explorer';
    this.host.innerHTML=`<div class="scale-explorer-tabs" role="tablist" aria-label="Scale exploration"><button type="button" id="scale-map-tab" role="tab" aria-controls="scale-map-panel" aria-selected="true">Scale map</button><button type="button" id="fifths-tab" role="tab" aria-controls="fifths-panel" aria-selected="false" tabindex="-1">Circle of fifths</button></div>
      <div id="scale-map-panel" role="tabpanel" aria-labelledby="scale-map-tab"><div class="tuner-controls"><label>Map frets<select id="scale-map-range"><option value="12">0–12 · one octave</option><option value="24">0–24 · full neck</option></select></label><label>Map labels<select id="scale-map-labels"><option value="notes">Note names</option><option value="degrees">Scale degrees</option></select></label></div><p class="scale-map-legend"><span class="scale-root-key">● Root / tonic</span> <span class="scale-note-key">● Other scale notes</span> · Outlined notes belong to your current practice pattern.</p><p class="scale-map-title"></p><div class="scale-map-scroll" tabindex="0" aria-label="Scrollable whole-scale fretboard"><div id="scale-map-board" role="group" aria-label="Scale notes across the guitar"></div></div><p class="scale-map-help">High e at the top, low E at the bottom. Fret 0 is open. Scroll sideways on a small screen. Notes repeat after 12 frets. Enharmonic names such as C♯ and D♭ share a pitch. Map labels use sharp spellings; ♭3, ♭5 and ♭7 describe intervals from the root.</p></div>
      <div id="fifths-panel" role="tabpanel" aria-labelledby="fifths-tab" hidden><p>Clockwise: up a perfect fifth (C → G → D). Outside: major key; inside: its relative natural minor. Small labels show their shared key signature.</p><div id="fifths-circle" class="fifths-circle" aria-label="Circle of fifths keys"></div><p id="fifths-detail" role="status"></p><p>Choose a major or minor key to update the scale above. Major and relative natural minor share notes, but have different roots. Other scale types do not necessarily use the displayed major-key signature.</p><p><a href="https://github.com/ljwall/openmusictheory.github.io/blob/master/keySignatures.md" target="_blank" rel="noopener noreferrer">About the circle of fifths ↗</a></p></div>`;
    panel.insertBefore(this.host,panel.lastElementChild);this.$=s=>this.host.querySelector(s);
    const tabs=[...this.host.querySelectorAll('[role="tab"]')];
    const select=tab=>{for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;this.$(`#${item.getAttribute('aria-controls')}`).hidden=!active;}};
    for(const tab of tabs){tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=tabs[event.key==='Home'?0:event.key==='End'?1:1-tabs.indexOf(tab)];select(next);next.focus();});}
    for(const id of ['#scale-map-range','#scale-map-labels'])this.$(id).addEventListener('change',()=>this.draw());
    for(const [index,key]of FIFTHS.entries()){
      const cell=document.createElement('div');cell.className='fifths-key';const place=(node,radius)=>{node.style.left=`${50+radius*Math.sin(index*Math.PI/6)}%`;node.style.top=`${50-radius*Math.cos(index*Math.PI/6)}%`;};
      const major=document.createElement('button');major.type='button';major.textContent=key.major;major.dataset.major=key.pc;major.setAttribute('aria-label',`${key.major} major · ${key.signature} key signature`);major.addEventListener('click',()=>onKey(key.pc,'major'));
      const minor=document.createElement('button');minor.type='button';minor.textContent=key.minor.split(' / ').map(n=>`${n}m`).join(' / ');minor.dataset.minor=(key.pc+9)%12;minor.setAttribute('aria-label',`${key.minor} minor`);minor.addEventListener('click',()=>onKey((key.pc+9)%12,'minor'));
      const signature=document.createElement('small');signature.textContent=key.signature;place(major,38);place(minor,26);place(signature,47);cell.append(major,minor,signature);this.$('#fifths-circle').append(cell);
    }
    const centre=document.createElement('span');centre.className='fifths-centre';centre.textContent='Major / minor';this.$('#fifths-circle').append(centre);
  }
  update(root,type,exercise){if(exercise.maxFret>12)this.$('#scale-map-range').value='24';this.root=root;this.type=type;this.exercise=exercise;this.draw();}
  draw(){
    if(!this.exercise)return;
    const max=Number(this.$('#scale-map-range').value),positions=scalePositions(this.root,this.type,max),board=this.$('#scale-map-board');
    board.style.gridTemplateColumns=`60px repeat(${max+1},44px)`;board.replaceChildren(document.createElement('span'));
    for(let fret=0;fret<=max;fret++){const label=document.createElement('span');label.className='scale-fret-number';label.textContent=fret===0?'Open':fret;board.append(label);}
    for(let string=1;string<=6;string++){
      const label=document.createElement('span');label.className='scale-string-name';label.textContent=`${string} · ${STRING_NAMES[string-1]}`;board.append(label);
      for(let fret=0;fret<=max;fret++){
        const cell=document.createElement('div');cell.className='scale-map-cell';if(fret===0)cell.classList.add('scale-nut');
        const note=positions.find(n=>n.string===string&&n.fret===fret);
        if(note){
          const dot=document.createElement('span');dot.dataset.string=string;dot.dataset.fret=fret;dot.dataset.root=String(note.root);dot.className=note.root?'scale-tonic':'scale-tone';
          if(this.exercise.notes.some(n=>n.string===string&&n.fret===fret))dot.classList.add('scale-pattern');
          dot.textContent=this.$('#scale-map-labels').value==='degrees'?note.degree:note.name;dot.title=`${note.name} · degree ${note.degree} · string ${string}, fret ${fret}${note.root?' · root':''}`;dot.setAttribute('role','img');dot.setAttribute('aria-label',dot.title);cell.append(dot);
        }board.append(cell);
      }
    }
    this.$('.scale-map-title').textContent=`${ROOTS[this.root]} ${SCALES[this.type].name.toLowerCase()} · every position in frets 0–${max}. The outlined practice pattern uses frets ${this.exercise.minFret??this.exercise.base}–${this.exercise.maxFret??this.exercise.base+4}.`;
    for(const button of this.host.querySelectorAll('[data-major],[data-minor]'))button.setAttribute('aria-pressed',String(button.dataset.minor!==undefined?this.type==='minor'&&Number(button.dataset.minor)===this.root:this.type!=='minor'&&Number(button.dataset.major)===this.root));
    const key=FIFTHS.find(k=>k.pc===(this.type==='minor'?(this.root+3)%12:this.root));
    this.$('#fifths-detail').textContent=`${key.major} major ↔ ${key.minor} natural minor · key signature ${key.signature}.${!['major','minor'].includes(this.type)?' The selected scale uses a different interval pattern.':''}`;
  }
}
