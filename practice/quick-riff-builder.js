export function mountQuickRiffBuilder(){
  const input=document.getElementById('input');if(!input)return;
  const host=document.createElement('details');host.className='quick-riff-builder';host.innerHTML=`<summary>Quick riff builder · tap frets instead of typing</summary><p>String 1 is high e. Choose notes, then insert the riff into your lesson.</p><label>Riff section name<input id="quick-riff-name" value="My riff" maxlength="100"></label><label>Play notes<select id="quick-riff-mode"><option value="sequence">One after another</option><option value="chord">Together as one chord</option></select></label><div class="quick-riff-scroll"><div class="quick-riff-neck" role="group" aria-label="Choose riff frets"></div></div><p id="quick-riff-preview" role="status">Tap a fret to add a note.</p><div class="button-row"><button id="quick-riff-undo" type="button">Undo note</button><button id="quick-riff-clear" type="button">Clear riff</button><button id="quick-riff-insert" type="button" class="primary">Insert riff into lesson</button></div>`;
  document.querySelector('.input-section .panel-heading').after(host);
  const $=id=>host.querySelector(`#${id}`);let notes=[];
  const render=()=>{$('quick-riff-preview').textContent=notes.length?notes.map(n=>`${n.fret}f${n.string}s`).join($('quick-riff-mode').value==='chord'?'+':' '):'Tap a fret to add a note.';$('quick-riff-insert').disabled=!notes.length;};
  const board=host.querySelector('.quick-riff-neck');board.append(document.createElement('span'));
  for(let fret=0;fret<=12;fret++){const label=document.createElement('span');label.textContent=fret===0?'Open':fret;board.append(label);}
  for(let string=1;string<=6;string++){
    const label=document.createElement('span');label.textContent=`${string} · ${['e','B','G','D','A','E'][string-1]}`;board.append(label);
    for(let fret=0;fret<=12;fret++){const button=document.createElement('button');button.type='button';button.textContent=fret;button.setAttribute('aria-label',`String ${string}, ${fret===0?'open':`fret ${fret}`}`);button.addEventListener('click',()=>{if($('quick-riff-mode').value==='chord')notes=notes.filter(n=>n.string!==string);notes.push({string,fret});render();});board.append(button);}
  }
  $('quick-riff-undo').addEventListener('click',()=>{notes.pop();render();});$('quick-riff-clear').addEventListener('click',()=>{notes=[];render();});
  $('quick-riff-mode').addEventListener('change',()=>{if($('quick-riff-mode').value==='chord')notes=notes.filter((n,i)=>notes.findLastIndex(other=>other.string===n.string)===i);render();});
  $('quick-riff-insert').addEventListener('click',()=>{
    if(!notes.length)return;
    const name=$('quick-riff-name').value.replace(/[\r\n\[\]]/g,' ').trim()||'My riff';
    const riff=notes.map(n=>`${n.fret}f${n.string}s`).join($('quick-riff-mode').value==='chord'?'+':' ');
    input.value=`${input.value.trim()?`${input.value.trim()}\n\n`:'title: My new song\ntuning: standard\n\n'}[${name}]\n${riff}`;
    input.dispatchEvent(new Event('input',{bubbles:true}));window.updateOutput();
    $('quick-riff-preview').textContent='Riff inserted. Your existing lesson is kept. Update the preview to hear any further changes.';
  });render();
}
