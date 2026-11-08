import { ProjectStore } from './project-store.js';
import { catalogueEntries, filterSongs, safeResourceUrl, captureSession, LEARNING_STATUSES } from './song-catalog.js';
import { download } from './download.js';
import { exportLibrary, importLibrary } from './library-backup.js';

const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
const button=(text,action)=>{const el=node('button',text);el.type='button';el.addEventListener('click',action);return el;};
export class ProjectLibrary {
  constructor({host,status,onOpen,onFile,onRestore,getView,onOpeningChanged}) {
    Object.assign(this,{host,status,onOpen,onFile,onRestore,getView,onOpeningChanged});
    this.store=new ProjectStore();this.songs=[];this.projects=[];this.states={};this.view='recent';this.page=0;this.selected=null;
    if(host)this.mount();
    this.initialise();
  }
  message(text) { this.status.textContent=text;if(this.host)this.host.querySelector('.project-library-status').textContent=text; }
  async initialise() {
    const jobs=[this.refresh()];
    if(this.host)jobs.push((async()=>{
      try{const response=await fetch(`${import.meta.env.BASE_URL}song-library/catalog.json`,{cache:'no-store'});if(!response.ok)throw new Error('The song catalogue could not be read.');this.songs=catalogueEntries(await response.json());this.fillGenres();}
      catch(error){this.message(error.message);}
    })());
    await Promise.all(jobs);this.render();
  }
  async refresh() {
    try{const [projects,states]=await Promise.all([this.store.all('projects'),this.store.all('entries')]);this.projects=projects.sort((a,b)=>(b.lastOpenedAt||0)-(a.lastOpenedAt||0));this.states=Object.fromEntries(states.map(s=>[s.id,s]));}
    catch{this.message('Browser storage is unavailable. Scores still play, but projects cannot be kept here.');}
  }
  mount() {
    this.host.innerHTML=`<div class="project-library-tabs" role="group" aria-label="Song library views"></div><div class="project-library-filters"><label>Search <input id="song-search" type="search" placeholder="Title, artist, chord or technique"></label><label>Genre <select id="song-genre"><option value="">All genres</option></select></label><label>Progress <select id="song-status"><option value="">Any progress</option></select></label></div><p class="project-library-count"></p><div class="project-library-results"></div><div class="project-library-pages"></div><p class="project-library-status" role="status"></p><input id="attach-score-file" type="file" accept=".gp3,.gp4,.gp5,.gpx,.gp,.xml,.musicxml,.mxl,.tex,.alphatex" hidden>`;
    for(const [key,label]of [['recent','Recent projects'],['songs','My songs'],['suggestions','Suggestions']]){
      const tab=button(label,()=>{this.view=key;this.page=0;this.selected=null;this.render();});tab.dataset.libraryView=key;this.host.querySelector('.project-library-tabs').append(tab);
    }
    for(const status of LEARNING_STATUSES)this.host.querySelector('#song-status').append(new Option(status,status));
    for(const input of this.host.querySelectorAll('.project-library-filters input,.project-library-filters select'))input.addEventListener(input.tagName==='INPUT'?'input':'change',()=>{this.page=0;this.selected=null;this.render();});
    this.host.querySelector('#attach-score-file').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';if(file)this.onFile(file,this.attachSong);});
    const backups=node('details',undefined,'library-backups');backups.append(node('summary','Backup & refresh'));
    backups.append(button('Export library backup',()=>this.action(async()=>{this.message('Preparing library backup…');download(await exportLibrary(this.store),'tab-forge-library.json','application/json');this.message('Backup downloaded, including your saved scores and practice notes.');})));
    const input=document.createElement('input');input.type='file';input.id='import-library-backup';input.accept='.json';input.hidden=true;
    backups.append(button('Import library backup',()=>input.click()),button('Refresh catalogue',()=>{this.selected=null;this.initialise();}),input);
    input.addEventListener('change',()=>{const file=input.files[0];input.value='';if(file)this.action(async()=>{const result=await importLibrary(this.store,file);await this.refresh();this.selected=null;this.view='recent';this.render();this.message(`Imported ${result.projects} projects and ${result.entries} practice entries.`);});});
    backups.append(node('p','Projects are saved in this browser, separately from songs.json. Export a backup before clearing browser data or moving to another browser.'));this.host.append(backups);
  }
  fillGenres() {
    const select=this.host.querySelector('#song-genre'),previous=select.value;select.replaceChildren(new Option('All genres',''));
    for(const genre of [...new Set(this.songs.map(s=>s.genre).filter(Boolean))].sort())select.append(new Option(genre,genre));
    if([...select.options].some(option=>option.value===previous))select.value=previous;
  }
  render() {
    if(!this.host)return;
    for(const tab of this.host.querySelectorAll('[data-library-view]'))tab.setAttribute('aria-pressed',String(tab.dataset.libraryView===this.view));
    const target=this.host.querySelector('.project-library-results'),pages=this.host.querySelector('.project-library-pages');target.replaceChildren();pages.replaceChildren();
    target.classList.toggle('is-detail',Boolean(this.selected));
    this.host.querySelector('.project-library-filters').hidden=Boolean(this.selected);
    const recent=this.view==='recent';
    this.host.querySelector('#song-genre').closest('label').hidden=recent;
    this.host.querySelector('#song-status').closest('label').hidden=recent;
    if(this.selected){this.host.querySelector('.project-library-count').textContent='Song details & practice';this.detail(target,this.selected);return;}
    const query=this.host.querySelector('#song-search').value;
    const list=recent?this.projects.filter(p=>{
      const linked=this.songs.find(s=>s.catalogueId===p.songId);
      return `${p.title} ${p.artist} ${p.filename} ${linked?.title||''} ${linked?.artist||''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    }):filterSongs(this.songs,{query,view:this.view,genre:this.host.querySelector('#song-genre').value,status:this.host.querySelector('#song-status').value,states:this.states});
    this.host.querySelector('.project-library-count').textContent=recent?`${list.length} saved ${list.length===1?'project':'projects'}${query?` matching · ${this.projects.length} total`:''} in this browser`:`${list.length} ${this.view==='suggestions'?'suggestions':list.length===1?'song':'songs'} · ${this.songs.filter(s=>!s.suggested&&!s.archived).length} in your source catalogue`;
    if(!list.length){target.append(node('p',recent?'Open a score to keep it here, or browse My songs to attach a score to your list.':'No matches. Try another search or filter.','library-empty'));return;}
    this.page=Math.min(this.page,Math.max(0,Math.ceil(list.length/12)-1));
    const start=this.page*12;
    for(const item of list.slice(start,start+12)){
      const row=node('article',undefined,'project-library-row');const text=node('div');text.append(node('strong',item.title),node('span',item.artist||item.filename||''));
      if(recent){text.append(node('small',`${item.filename} · last opened ${new Date(item.lastOpenedAt).toLocaleDateString()}`));row.append(text,button('Resume',()=>this.open(item)),button('Details',()=>{this.selected={project:item};this.render();}));}
      else {const progress=this.states[item.catalogueId]?.practice||item.practice;text.append(node('small',`${item.genre||'Unsorted'} · ${progress?.learning_status||'not started'}${item.needs_check?' · details need checking':''}`));row.append(text,button('View song',()=>{this.selected={song:item};this.render();}));}
      target.append(row);
    }
    if(list.length>12){pages.append(button('Previous',()=>{this.page--;this.render();}),node('span',`${this.page+1} / ${Math.ceil(list.length/12)}`),button('Next',()=>{this.page++;this.render();}));pages.firstChild.disabled=this.page===0;pages.lastChild.disabled=start+12>=list.length;}
  }
  detail(target,{song,project}) {
    song=song||this.songs.find(s=>s.catalogueId===project.songId)||{catalogueId:project.id,title:project.title,artist:project.artist,practice:{}};
    const id=song.catalogueId,practice={...song.practice,...this.states[id]?.practice};
    target.append(button('← Back to results',()=>{this.selected=null;this.render();}),node('h3',song.title),node('p',song.artist));
    if(song.needs_check)target.append(node('p','Some catalogue details need checking.','library-notice'));
    if(song.archived)target.append(node('p','This entry was removed from the updated catalogue. Your saved score and practice notes are still available here.','library-notice'));
    const facts=[song.genre&&`Genre: ${song.genre}`,song.album&&`Album: ${song.album}${song.year?` (${song.year})`:''}`,song.original_artist&&`Originally by: ${song.original_artist}`,song.source&&`From: ${song.source}`,song.key&&`Key: ${song.key}`,song.bpm&&`Original tempo: ${song.bpm} BPM`,song.tuning&&`Tuning: ${song.tuning}`,song.capo!==null&&song.capo!==undefined&&`Capo: ${song.capo}`,song.techniques?.length&&`Techniques: ${song.techniques.join(', ')}`,song.chords?.length&&`Chords: ${song.chords.join(', ')}`].filter(Boolean);
    for(const fact of facts)target.append(node('p',fact,'song-fact'));
    if(song.notes)target.append(node('p',song.notes));
    const projects=project?[project]:this.projects.filter(p=>p.songId===id);
    const saved=node('div',undefined,'song-saved-projects');
    for(const item of projects){const row=node('div');row.append(node('span',item.filename),button('Resume saved score',()=>this.open(item)));saved.append(row);}
    if(project)saved.append(button('Download saved score',()=>this.action(async()=>download(await this.store.scoreFile(project),project.filename,project.fileType||'application/octet-stream'))));
    target.append(saved);
    target.append(button('Attach downloaded score',()=>{this.attachSong=this.songs.some(s=>s.catalogueId===id)?id:null;this.host.querySelector('#attach-score-file').click();}));
    if(!projects.length)target.append(node('p','Tab links below open the source website. To play here, attach a downloaded Guitar Pro, MusicXML or alphaTex file.','song-fact'));
    if(song.suggested&&!this.states[id]?.promoted)target.append(button('Add to my songs',async()=>{await this.action(async()=>{await this.store.putEntry(id,{}, {promoted:true});await this.refresh();this.render();this.message('Added to My songs.');});}));
    const resources=node('details');resources.append(node('summary','Tab links, lessons & videos'));
    const link=(label,url)=>{const safe=safeResourceUrl(url);if(!safe)return;const a=node('a',label);a.href=safe;a.target='_blank';a.rel='noopener noreferrer';resources.append(a);};
    for(const tab of song.tabs||[])link(`${tab.site||'Tab'} · ${tab.type||'score'}${tab.paywalled?' · subscription':''}`,tab.url);
    link('Search for tabs',song.tab_search);link('Official video / audio',song.videos?.official?.url);
    for(const [i,video]of (song.videos?.tutorials||[]).entries())link(`Lesson ${i+1}${video.channel?` · ${video.channel}`:''}`,video.url);
    link('Backing track',song.videos?.backing_track?.url);target.append(resources);
    const form=node('form',undefined,'song-practice-form');
    const field=(title,input)=>{const label=node('label',title);input.setAttribute('aria-label',title);label.append(input);form.append(label);return input;};
    const status=field('Learning status',document.createElement('select'));for(const value of [...new Set([...LEARNING_STATUSES,practice.learning_status].filter(Boolean))])status.append(new Option(value,value));status.value=practice.learning_status||'not started';
    const goal=field('Practice goal',document.createElement('input'));goal.value=practice.goal||'';goal.maxLength=500;
    const bpm=field('Target BPM',document.createElement('input'));bpm.type='number';bpm.min=20;bpm.max=300;bpm.value=practice.target_bpm||'';
    const notes=field('Practice notes',document.createElement('textarea'));notes.value=practice.notes||'';notes.maxLength=10000;
    const save=node('button','Save practice notes');save.type='submit';form.append(save);
    form.addEventListener('submit',event=>{event.preventDefault();this.action(async()=>{await this.store.putEntry(id,{learning_status:status.value,goal:goal.value,target_bpm:bpm.value?Number(bpm.value):null,notes:notes.value});await this.refresh();this.message('Practice notes saved in this browser.');});});
    target.append(form);
    if(project?.lessonNotes){const a=node('a','Open original lesson notes in editor');a.href=`./index.html?tab=${encodeURIComponent(project.lessonNotes)}#write`;target.append(a);}
    if(project){
      const removal=node('details');removal.append(node('summary','Remove saved copy'),node('p','This removes the score and checkpoint from this browser. The original file and catalogue practice notes are kept.'));
      removal.append(button('Remove from browser',()=>this.action(async()=>{
        if(this.active?.id===project.id)this.begin();await this.store.remove(project.id);await this.refresh();this.selected=null;this.render();this.message('Saved copy removed. The original file is unchanged.');
      })));target.append(removal);
    }
  }
  async action(callback) { try{await callback();}catch(error){this.message(`Library: ${error.message}`);} }
  async open(project) {
    this.opening=true;this.onOpeningChanged?.();
    try{await this.action(()=>this.onOpen(project));}finally{this.opening=false;this.onOpeningChanged?.();}
  }
  begin() { this.flush();this.active=null;this.pending=null;this.session=null;this.practised=false;clearTimeout(this.timer);this.message(''); }
  activate(project,{restore=false}={}) {this.active=project;this.pending=restore?project:null;this.session=null;this.practised=false;this.suspended=false;this.message(`Saved project: ${project.title} · kept in this browser.`);this.render();}
  async remember(file,state,songId=null,lessonNotes=null,isCurrent=()=>true,restore=true) {
    if(isCurrent())this.message('Saving score in this browser…');
    try{
      const project=await this.store.remember(file,{title:state.title,artist:state.artist,songId,lessonNotes,session:captureSession(state,this.getView())});
      if(songId)await this.store.putEntry(songId,{}, {promoted:true});
      await this.refresh();if(isCurrent())this.activate(project,{restore});this.render();return project;
    }catch{if(isCurrent())this.message('The score is open, but could not be saved in this browser. Use Save Guitar Pro to keep a file copy.');return null;}
  }
  update(state) {
    this.latest=state;
    if(!this.active || this.suspended)return;
    if(this.pending){if(!state.ready||state.source!==this.active.filename)return;const session=this.pending.session;this.pending=null;if(session)this.onRestore(session);return;}
    if(!state.ready)return;
    this.session=captureSession(state,this.getView());
    this.practised=this.practised||state.playing||state.waiting?.active&&state.waiting.index>0;
    if(!this.timer)this.timer=setTimeout(()=>this.flush(),800);
  }
  flush(state) {
    clearTimeout(this.timer);this.timer=null;
    if(state&&this.active&&!this.pending)this.session=captureSession(state,this.getView());
    if(!this.active||!this.session||this.pending||this.suspended)return Promise.resolve(false);
    const id=this.active.id,session=this.session,practised=this.practised;this.practised=false;this.session=null;
    const songId=this.active.songId||id;
    return this.store.saveSession(id,session,{practised}).then(()=>{
      const project=this.projects.find(p=>p.id===id);if(project)project.session=session;
      if(practised){const previous=this.states[songId]||{},practice=previous.practice||{};this.states[songId]={...previous,id:songId,promoted:true,practice:{...practice,learning_status:practice.learning_status&&practice.learning_status!=='not started'?practice.learning_status:'learning',last_practised:new Date().toISOString().slice(0,10)}};}
      return true;
    }).catch(()=>{this.message('Practice settings could not be saved. Your score can still be played.');return false;});
  }
}
