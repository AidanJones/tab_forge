import {exportLibrary} from './library-backup.js';

const requestResult=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
export class LocalProjectFolder {
  get supported(){return typeof globalThis.showDirectoryPicker==='function';}
  async database(){
    const request=indexedDB.open('tab-forge-local-folder',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('settings');
    return requestResult(request);
  }
  async restore(){
    if(!this.supported)return;
    try{const db=await this.database();this.handle=await requestResult(db.transaction('settings').objectStore('settings').get('folder'));db.close();}catch{/* Choosing a folder remains available. */}
    return this.handle;
  }
  async choose(){
    const parent=await globalThis.showDirectoryPicker({id:'tab-forge-projects',mode:'readwrite'});
    this.handle=await parent.getDirectoryHandle('tab_forge',{create:true});
    try{const db=await this.database(),tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(this.handle,'folder');await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch{/* A real directory handle is remembered when supported by storage. */}
    return this.handle;
  }
  async backup(store){
    if(!this.handle)throw new Error('Choose a local folder first.');
    if(await this.handle.queryPermission({mode:'readwrite'})!=='granted'&&await this.handle.requestPermission({mode:'readwrite'})!=='granted')throw new Error('Folder access was not granted. You can still download a backup.');
    const backup=await exportLibrary(store),projects=await store.all('projects');
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    // A new directory for each snapshot avoids replacing earlier/user-edited files.
    const directory=await this.handle.getDirectoryHandle(`backup-${stamp}-${crypto.randomUUID().slice(0,8)}`,{create:true});
    const scores=await directory.getDirectoryHandle('scores',{create:true});
    const write=async(dir,name,data)=>{const file=await dir.getFileHandle(name,{create:true});const stream=await file.createWritable();try{await stream.write(data);await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}};
    for(const project of projects){
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(project.id)))].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,12);
      const name=String(project.filename||'score.gp').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').slice(0,140);
      await write(scores,`${hash}-${name}`,await store.scoreFile(project));
      if(project.lessonNotes)await write(scores,`${hash}-lesson.md`,project.lessonNotes);
    }
    await write(directory,'tab-forge-library.json',backup);
    return {name:directory.name,projects:projects.length};
  }
}
