export async function exportLibrary(store) {
  const [projects,entries]=await Promise.all([store.all('projects'),store.all('entries')]);
  if(projects.reduce((sum,p)=>sum+p.size,0)>60*1024*1024)throw new Error('This library is too large for one backup. Download saved scores individually from Details.');
  const scores=[];
  for(const project of projects){
    const file=await store.scoreFile(project);
    const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
    scores.push({...project,file:base64});
  }
  return JSON.stringify({format:'tab-forge-library',version:1,exportedAt:new Date().toISOString(),entries,projects:scores});
}
export async function importLibrary(store,file) {
  if(file.size>100*1024*1024)throw new Error('Choose a library backup smaller than 100 MB.');
  const data=JSON.parse(await file.text());
  if(data.format!=='tab-forge-library'||data.version!==1||!Array.isArray(data.projects)||!Array.isArray(data.entries)||data.projects.length>500||data.entries.length>10000)throw new Error('This is not a supported tab_forge library backup.');
  // Validate and decode before writing anything, so malformed input cannot
  // overwrite an existing score. Scores are re-keyed by their actual bytes.
  const decoded=data.projects.map(project=>{
    if(typeof project.id!=='string'||typeof project.title!=='string'||typeof project.filename!=='string'||!(/\.(gp[345]?|gpx|xml|musicxml|mxl|tex|alphatex)$/i.test(project.filename))||typeof project.file!=='string'||project.file.length>70*1024*1024)throw new Error('A score in this backup is invalid.');
    const bytes=Uint8Array.from(atob(project.file),c=>c.charCodeAt(0));
    if(!bytes.length||bytes.length>50*1024*1024)throw new Error('A saved score is empty or exceeds 50 MB.');
    return [project,new File([bytes],project.filename,{type:typeof project.fileType==='string'?project.fileType:'application/octet-stream'})];
  });
  for(const entry of data.entries)if(typeof entry.id!=='string'||entry.id.length>500||!entry.practice||typeof entry.practice!=='object')throw new Error('Invalid practice data in the backup.');
  const ids=new Map();
  for(const [project,score]of decoded){
    const saved=await store.remember(score,{title:project.title,artist:typeof project.artist==='string'?project.artist:'',songId:typeof project.songId==='string'?project.songId:null,lessonNotes:typeof project.lessonNotes==='string'?project.lessonNotes:null,session:project.session});
    if(saved.wasNew)await store.restoreDates(saved.id,project);
    ids.set(project.id,saved.id);
  }
  for(const entry of data.entries){
    const id=ids.get(entry.id)||entry.id,existing=await store.get('entries',id);
    if(!existing||(entry.updatedAt||0)>=(existing.updatedAt||0))await store.putEntry(id,entry.practice,{promoted:Boolean(entry.promoted)});
  }
  return {projects:decoded.length,entries:data.entries.length};
}
