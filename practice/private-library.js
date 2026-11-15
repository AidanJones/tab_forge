import {ProjectStore} from './project-store.js';
import {exportLibrary,importLibrary} from './library-backup.js';
import {download} from './download.js';
import {LocalProjectFolder} from './local-folder.js';

const $=id=>document.getElementById(id),store=new ProjectStore(),folder=new LocalProjectFolder();
let projects=[];
const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
const action=async callback=>{try{await callback();}catch(error){$('private-status').textContent=error.message||'The file operation could not finish.';}};
const message=value=>{$('private-status').textContent=value;};
async function refresh(){projects=(await store.all('projects')).sort((a,b)=>(b.lastOpenedAt||0)-(a.lastOpenedAt||0));render();}
function render(){
  const query=$('private-search').value.toLowerCase().trim(),list=projects.filter(p=>`${p.title} ${p.artist} ${p.filename}`.toLowerCase().includes(query));
  $('private-projects').replaceChildren();
  if(!list.length)$('private-projects').append(text('p',projects.length?'No matching projects.':'No files here yet. Upload a score or create a new song.'));
  for(const project of list){
    const row=text('article','');row.className='private-file-row';const info=text('div','');info.append(text('h3',project.title),text('p',`${project.artist||''}${project.artist?' · ':''}${project.filename}`));
    const actions=text('div','');actions.className='private-file-actions';const open=text('a','Open / practise');open.href=`./practice.html?project=${encodeURIComponent(project.id)}#songs`;
    const save=text('button','Download score');save.type='button';save.addEventListener('click',()=>action(async()=>download(await store.scoreFile(project),project.filename,project.fileType)));
    actions.append(open,save);row.append(info,actions);
    if(project.lessonNotes){const edit=text('a','Edit original lesson');edit.href=`./index.html?tab=${encodeURIComponent(project.lessonNotes)}#write`;actions.append(edit);}
    const remove=text('details','');remove.append(text('summary','Remove this browser copy'),text('p','Your original file and folder backups are kept.'));
    const button=text('button','Remove file');button.type='button';button.addEventListener('click',()=>action(async()=>{await store.remove(project.id);await refresh();message('Removed from this browser.');}));remove.append(button);row.append(remove);$('private-projects').append(row);
  }
}
$('private-search').addEventListener('input',render);
$('private-upload').addEventListener('click',()=>$('private-file').click());
$('private-file').addEventListener('change',event=>action(async()=>{
  const files=[...event.target.files];event.target.value='';if(!files.length)return;
  $('private-upload').disabled=true;
  try{
    const alphaTab=await import('@coderline/alphatab');let count=0;
    for(const file of files){
      if(!/\.(gp[345]?|gpx|xml|musicxml|mxl|tex|alphatex)$/i.test(file.name)||file.size>50*1024*1024)throw new Error('Choose a supported score smaller than 50 MB.');
      const bytes=new Uint8Array(await file.arrayBuffer()),settings=new alphaTab.Settings();
      const score=/\.(tex|alphatex)$/i.test(file.name)?alphaTab.importer.ScoreLoader.loadAlphaTex(new TextDecoder().decode(bytes),settings):alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes,settings);
      await store.remember(file,{title:score.title||file.name,artist:score.artist||''});count++;
    }
    message(`${count} ${count===1?'file':'files'} saved privately in this browser.`);
  }finally{$('private-upload').disabled=false;await refresh();}
}));
$('private-backup').addEventListener('click',()=>action(async()=>{download(await exportLibrary(store),'tab-forge-library.json','application/json');message('Library backup downloaded.');}));
$('private-import').addEventListener('click',()=>$('private-backup-file').click());
$('private-backup-file').addEventListener('change',event=>action(async()=>{const file=event.target.files[0];event.target.value='';if(!file)return;const result=await importLibrary(store,file);await refresh();message(`Imported ${result.projects} projects.`);}));
if(!folder.supported){$('folder-connect').hidden=true;$('folder-save').hidden=true;$('folder-status').textContent='Direct folder access is unavailable in this browser. Use Download library backup and Download score instead.';}
else{
  folder.restore().then(handle=>{if(handle){$('folder-status').textContent=`Selected folder: ${handle.name}. Folder access may need reconnecting when you back up.`;$('folder-save').disabled=false;}});
  $('folder-connect').addEventListener('click',()=>action(async()=>{try{const handle=await folder.choose();$('folder-status').textContent=`Selected folder: ${handle.name}. Ready to back up.`;$('folder-save').disabled=false;}catch(error){if(error.name!=='AbortError')throw error;}}));
  $('folder-save').addEventListener('click',()=>action(async()=>{$('folder-save').disabled=true;try{const result=await folder.backup(store);$('folder-status').textContent=`Saved ${result.projects} projects in ${result.name}.`;}finally{$('folder-save').disabled=false;}}));
}
action(async()=>{await refresh();message(`${projects.length} projects stored privately in this browser.`);});
