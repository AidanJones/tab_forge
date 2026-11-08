// Task navigation changes presentation, never replaces the mounted score or
// trainer state. Hashes make browser Back/Forward useful within a session.
export function mountWorkflow(root, { embedded, pause, stopMicrophone, checkChord }) {
  const doc=root.ownerDocument||root;
  const $=selector=>doc.querySelector(selector);
  const main=$('main'), intro=$('.intro'), workspace=$('#drop-zone');
  const editor=$('.editor-workspace');
  const tools=doc.createElement('section');tools.id='tools-panel';tools.hidden=true;tools.setAttribute('aria-label','Guitar practice tools');
  main.insertBefore(tools,embedded?editor:workspace);
  const riffs=doc.createElement('section');riffs.id='riff-library';riffs.hidden=true;main.insertBefore(riffs,tools);
  const tuner=$('#guitar-tuner');tools.append(tuner);tuner.open=true;
  const summary=tuner.querySelector(':scope > summary');summary.hidden=true;
  const source=$('.library');
  let songPicker,songPickerTitle;
  if(source){songPicker=doc.createElement('details');songPicker.className='song-picker';songPicker.id='song-picker';songPicker.open=true;songPickerTitle=doc.createElement('summary');songPickerTitle.textContent='Choose from your score library';source.before(songPicker);songPicker.append(songPickerTitle,source);}
  let libraryHost;
  if(songPicker){
    libraryHost=doc.createElement('section');libraryHost.id='project-library';libraryHost.setAttribute('aria-label','Persistent song library');songPicker.insertBefore(libraryHost,source);
    const folder=doc.createElement('details');folder.id='folder-library';folder.className='folder-library';const heading=doc.createElement('summary');heading.textContent='Files in your score folder';source.before(folder);folder.append(heading,source);
    songPickerTitle.textContent='Your songs & saved projects';
  }

  const nav=doc.createElement('nav');nav.className='task-navigation';nav.setAttribute('aria-label','Main tasks');
  const tasks=[['write','Write',embedded?'#write':'./index.html#write'],['songs','Songs',embedded?'./practice.html#songs':'#songs'],['tuner','Tune','#tuner'],['chords','Chords','#chords'],['scales','Scales','#scales'],['riffs','Riffs','#riffs'],['notes','Learn notes','./notes.html']];
  for(const [task,label,href]of tasks){const a=doc.createElement('a');a.href=href;a.textContent=label;a.dataset.task=task;nav.append(a);}
  $('.page-header').lastElementChild?.remove();$('.page-header').append(nav);
  $('.practice-link')?.remove();
  const title=$('.intro h1'), description=intro.querySelector('h1 + p'), eyebrow=intro.querySelector('.eyebrow');
  const copy={riffs:['Learn a riff','Find a short phrase, hear an example and practise until each note is clean.'],write:['Write a guitar tab','Keep the notes, chords and lyrics together. Update the preview, then practise what you wrote.'],songs:['Play a song','Open a score, slow it down and work on one passage at a time.'],play:['Practise your tab','Your writing is kept. Choose Score or Play-along, then press Play.'],tuner:['Tune your guitar','Start the microphone and pluck one string at a time. No song needed.'],chords:['Build a clean chord','Choose a shape, hold it, then check the sounding strings from low to high.'],scales:['Choose your next scale','Pick a key and pattern. Hear it played or let the microphone guide you note by note.']};

  // Put the thing being played before the optional helpers and configuration.
  const switcher=$('.player-view-switch'), view=$('#play-along'), score=$('#score-viewport');
  const position=$('.position');position.after(switcher);switcher.after(view);view.after(score);
  const wrap=(selector,id,label)=>{
    const item=$(selector),details=doc.createElement('details');details.id=id;details.className='workspace-disclosure';
    const heading=doc.createElement('summary');heading.textContent=label;details.append(heading);item.before(details);details.append(item);return details;
  };
  const appearance=wrap('.score-display-options','score-appearance','Score appearance · notation & chord hints');
  const hand=wrap('#finger-guide','hand-guide-settings','Hand guide · finger positions & 3D view');
  score.after(appearance);appearance.after(hand);
  $('.practice-settings').open=false;
  $('.practice-settings').id='passage-tracks';
  hand.after($('.practice-settings'));$('.practice-settings').after($('.midi-settings'));
  const exports=wrap('.score-actions > div','score-exports','Save / export');
  exports.classList.add('export-menu');
  exports.querySelector('div').append($('#print-score'));
  const back=doc.createElement('div');back.id='practice-context';back.className='practice-context';back.hidden=true;
  const returnLink=doc.createElement('a');returnLink.textContent='← Back to scales';returnLink.href='#scales';back.append(returnLink);workspace.prepend(back);
  const startChord=doc.createElement('button');startChord.type='button';startChord.className='primary';startChord.id='start-chord-check';startChord.textContent='Check this chord';startChord.addEventListener('click',checkChord);
  $('.trainer-chord-panel > label').after(startChord);
  $('.trainer-mode').closest('label').hidden=true;
  $('.independent-trainers h3').hidden=true;
  $('.trainer-practise').classList.add('primary');
  const trainer=$('.independent-trainers');
  const inline=doc.createElement('details');inline.className='inline-note-check';
  const inlineSummary=doc.createElement('summary');inlineSummary.textContent='Quick note check · stay on this page';inline.append(inlineSummary);
  const checkControls=$('.trainer-listen').closest('.tuner-controls');
  checkControls.before(inline);inline.append(checkControls,$('.trainer-next'),$('.trainer-progress'),$('.trainer-sequence'));
  $('.trainer-scale-panel').after(inline);
  const micSettings=doc.createElement('details');micSettings.className='microphone-settings';const micHeading=doc.createElement('summary');micHeading.textContent='Microphone input & sensitivity';micSettings.append(micHeading);
  const level=$('.tuner-level').closest('.tuner-controls'),levelHelp=level.nextElementSibling;
  level.before(micSettings);micSettings.append($('.tuner-input').closest('label'),level,levelHelp);
  const reading=doc.createElement('div');reading.className='tuner-reading';$('.tuner-display').before(reading);reading.append($('.tuner-display'),$('.tuner-meter'),$('.tuner-meter-labels'));
  const checkHelp=$('.independent-trainers > p:last-child');
  inline.append(checkHelp);
  $('.trainer-scale-panel > p:last-child').hidden=!embedded;
  const micPanel=doc.createElement('section');micPanel.className='tool-microphone';micPanel.setAttribute('aria-label','Microphone controls');
  for(const node of [...tuner.children])if(node!==summary && node!==trainer)micPanel.append(node);
  tuner.append(micPanel);

  const guide=doc.createElement('p');guide.className='session-next';guide.textContent=embedded?'Update the preview to hear your tab. Use Practise this tab for a focused player.':'Open a score or try the demo. Then press Play, or choose Play-along to follow the strings.';
  if(embedded){
    const actions=doc.createElement('div');actions.className='editor-flow-actions';
    const rehearse=doc.createElement('a');rehearse.href='#play';rehearse.className='task-primary';rehearse.textContent='Practise this tab →';
    const write=doc.createElement('a');write.href='#write';write.textContent='← Back to writing';write.className='back-to-writing';
    actions.append(rehearse,write);$('.preview-panel > .panel-heading').append(actions);
    $('.lesson-timing').after(guide);
    const input=$('#input');
    const restore=doc.createElement('button');restore.type='button';restore.textContent='Restore previous lesson';restore.hidden=true;$('.button-row').append(restore);
    const backup=value=>{if(!value)return;try{sessionStorage.setItem('tab-forge:previous-lesson',value);restore.hidden=false;}catch{/* File saves remain available if session storage is full. */}};
    doc.addEventListener('tab-forge:before-replace',event=>backup(event.detail));
    try{
      restore.hidden=!sessionStorage.getItem('tab-forge:previous-lesson');
      const shared=new URLSearchParams(location.search).get('tab'),draft=localStorage.getItem('tab-forge:editor-draft');
      if(shared && draft && shared!==draft)backup(draft);
    }catch{/* Optional browser history. */}
    restore.addEventListener('click',()=>{
      let previous;try{previous=sessionStorage.getItem('tab-forge:previous-lesson');}catch{return;}
      if(!previous)return;backup(input.value);input.value=previous;input.dispatchEvent(new Event('input',{bubbles:true}));window.updateOutput();
    });
    if(!new URLSearchParams(location.search).has('tab')&&!input.value){
      try{const saved=localStorage.getItem('tab-forge:editor-draft');if(saved)input.value=saved;}catch{/* Local drafts are optional. */}
    }
    const saved=doc.createElement('span');saved.id='draft-status';$('.editor-help').append(saved);
    const save=()=>{try{localStorage.setItem('tab-forge:editor-draft',input.value);saved.textContent='Draft saved in this browser';}catch{saved.textContent='Use Save notes to keep a copy';}};
    input.addEventListener('input',save);doc.addEventListener('tab-forge:editor-update',save);
  } else {
    intro.after(guide);
    const libraryHelp=$('.library > div > p');libraryHelp.textContent='Choose a score from your folder, or open a file above.';
    const instructions=doc.createElement('details');instructions.className='library-help';const s=doc.createElement('summary');s.textContent='Add files to this library';const p=doc.createElement('p');p.innerHTML='Put downloaded Guitar Pro files in <code>public/scores</code>, then choose Refresh library.';instructions.append(s,p);source.append(instructions);
  }

  let task;
  inline.addEventListener('toggle',()=>{if(!inline.open && task==='scales')stopMicrophone();});
  function apply({ focus=false, keepMicrophone=false }={}) {
    const hash=location.hash.slice(1);
    const next=['tuner','chords','scales','riffs',...(embedded?['write','play']:['songs'])].includes(hash)?hash:embedded?'write':'songs';
    if(task && task!==next){pause();if(!keepMicrophone)stopMicrophone();}
    task=next;doc.body.dataset.task=task;
    const brandContext=$('.brand span');if(brandContext)brandContext.textContent=`/ ${task==='play'?'Your tab':tasks.find(entry=>entry[0]===task)?.[1]||task}`;
    if(task==='write')back.hidden=true;
    const tool=['tuner','chords','scales','riffs'].includes(task);
    riffs.hidden=task!=='riffs';
    tools.hidden=!tool||task==='riffs';
    if(embedded){editor.hidden=tool;editor.classList.toggle('focused-practice',task==='play');}
    else {workspace.hidden=tool;source.hidden=tool;songPicker.hidden=tool;$('.file-actions').hidden=tool;guide.hidden=tool;}
    title.textContent=copy[task][0];description.textContent=copy[task][1];eyebrow.textContent=tool?'Your guitar toolkit':embedded?'Write · hear · practise':'Your practice session';
    for(const a of nav.querySelectorAll('a')){if(a.dataset.task===(task==='play'?'write':task))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
    if(tool && task!=='riffs'){
      $('.independent-trainers').hidden=task==='tuner';
      if(task!=='tuner'){$('.trainer-mode').value=task==='chords'?'chord':'scale';$('.trainer-mode').dispatchEvent(new Event('change'));}
      tuner.dataset.tool=task;
      checkHelp.textContent=task==='chords'?'Choose Check this chord above, then pick each displayed string from low to high. Reset checks starts the exercise again. Sequence labels are fret / string.':'For a quick check here, enable checking and start the microphone below. Sequence labels are fret / string. Use the scrolling player for a larger practice view.';
      $('.tuner-target').closest('label').hidden=task!=='tuner';
      inline.open=task==='chords';inlineSummary.hidden=task==='chords';
      if(task==='scales'||task==='chords')tuner.prepend(trainer);else tuner.append(trainer);
      if(task==='scales')inline.append(micPanel);else tuner.append(micPanel);
    }
    $('.footnote')?.toggleAttribute('hidden',tool);$('.page-footnote')?.toggleAttribute('hidden',tool);
    if(focus){main.scrollIntoView({block:'start'});title.tabIndex=-1;title.focus({preventScroll:true});}
  }
  window.addEventListener('hashchange',()=>apply({focus:true}));
  doc.addEventListener('tab-forge:practice-open',event=>{
    if(songPicker)songPicker.open=false;
    const from=event.detail.from;returnLink.href=from==='riffs'?'#riffs':'#scales';returnLink.textContent=from==='riffs'?'← Back to riffs':'← Back to scales';back.hidden=!['scales','riffs'].includes(from);
    // Apply immediately so the caller can focus the now-visible player. The
    // following hashchange sees the same task and does not stop the microphone.
    const destination=embedded?'#play':'#songs';
    if(location.hash!==destination)history.pushState(null,'',destination);
    apply({keepMicrophone:event.detail.wait});
  });
  window.addEventListener('popstate',()=>apply({focus:true}));
  apply();
  let hadScore=false,wasReady=false;
  songPicker?.addEventListener('toggle',()=>{if(songPicker.open&&hadScore)pause();});
  return { libraryHost, riffHost:riffs, update(state) {
    workspace.classList.toggle('has-score',state.tracks.length>0);
    if(embedded)guide.textContent=state.ready?'Your tab is ready. Practise this tab for a focused player; Back to writing returns to your notes.':'Update the preview to hear your tab. Your draft is kept in this browser.';
    if(!embedded)guide.hidden=tools.hidden?state.tracks.length>0:true;
    if(!embedded){
      if(state.tracks.length && !hadScore){songPicker.open=false;songPickerTitle.textContent='Change song · saved projects & library';}
      if(state.ready && !wasReady && task==='songs')workspace.scrollIntoView({block:'start'});
    }
    hadScore=state.tracks.length>0;wasReady=state.ready;
  } };
}
