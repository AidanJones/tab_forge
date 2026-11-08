const requestResult=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const committed=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||new Error('Library save was interrupted.'));});
export class ProjectStore {
  constructor(name='tab-forge-library') { this.name=name; }
  async database() {
    if(!this.connection)this.connection=new Promise((resolve,reject)=>{
      if(!globalThis.indexedDB){reject(new Error('Browser storage is unavailable.'));return;}
      const request=indexedDB.open(this.name,1);
      request.onupgradeneeded=()=>{for(const name of ['projects','scores','entries'])request.result.createObjectStore(name,{keyPath:'id'});};
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error('Close other tab_forge tabs, then reload to open the library.'));
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();this.connection=null;};db.onclose=()=>{this.connection=null;};resolve(db);};
    });
    return this.connection;
  }
  async all(store) { const db=await this.database();return requestResult(db.transaction(store).objectStore(store).getAll()); }
  async get(store,id) {const db=await this.database();return requestResult(db.transaction(store).objectStore(store).get(id));}
  async putEntry(id,practice,extra={}) {
    const db=await this.database(),tx=db.transaction('entries','readwrite'),done=committed(tx),store=tx.objectStore('entries');
    const previous=await requestResult(store.get(id));store.put({...previous,...extra,id,practice:{...previous?.practice,...practice},updatedAt:Date.now()});await done;
  }
  async remember(file, {title,artist='',songId=null,lessonNotes=null,session=null}={}) {
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
    const id=`project:${songId||'local'}:${hash}`;
    const db=await this.database(),tx=db.transaction(['projects','scores'],'readwrite'),done=committed(tx);
    const previous=await requestResult(tx.objectStore('projects').get(id)),now=Date.now();
    const project={...previous,id,title:title||previous?.title||file.name,artist:artist||previous?.artist||'',songId,
      filename:file.name,fileType:file.type,size:file.size,lessonNotes:lessonNotes||previous?.lessonNotes||null,
      createdAt:previous?.createdAt||now,updatedAt:now,lastOpenedAt:now,session:previous?.session||session};
    tx.objectStore('projects').put(project);if(!previous)tx.objectStore('scores').put({id,blob:file});await done;return {...project,wasNew:!previous};
  }
  async restoreDates(id,source) {
    const db=await this.database(),tx=db.transaction('projects','readwrite'),done=committed(tx),store=tx.objectStore('projects');
    const project=await requestResult(store.get(id));
    if(project){for(const key of ['createdAt','updatedAt','lastOpenedAt','lastPractisedAt'])if(Number.isFinite(source[key])&&source[key]>=0)project[key]=source[key];store.put(project);}
    await done;
  }
  async scoreFile(project) {
    const item=await this.get('scores',project.id);
    if(!item?.blob)throw new Error('The saved score is missing. Attach the original file again.');
    return new File([item.blob],project.filename,{type:project.fileType});
  }
  async saveSession(id,session,{practised=false}={}) {
    const db=await this.database(),tx=db.transaction(['projects','entries'],'readwrite'),done=committed(tx);
    const store=tx.objectStore('projects'),project=await requestResult(store.get(id));
    if(!project){tx.abort();await done;return;}
    const now=Date.now();store.put({...project,session,updatedAt:now,...(practised?{lastPractisedAt:now}:{})});
    if(practised){
      const entryId=project.songId||project.id;
      const entries=tx.objectStore('entries'),previous=await requestResult(entries.get(entryId));
      entries.put({...previous,id:entryId,promoted:true,updatedAt:now,practice:{...previous?.practice,
        learning_status:previous?.practice?.learning_status&&previous.practice.learning_status!=='not started'?previous.practice.learning_status:'learning',started:previous?.practice?.started||new Date(now).toISOString().slice(0,10),last_practised:new Date(now).toISOString().slice(0,10)}});
    }
    await done;
  }
  async remove(id) {
    const db=await this.database(),tx=db.transaction(['projects','scores'],'readwrite'),done=committed(tx);
    for(const name of ['projects','scores'])tx.objectStore(name).delete(id);await done;
  }
}
