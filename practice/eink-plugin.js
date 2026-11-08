import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readerCatalogue,readerScale,readerScore,readerSong} from './eink-data.js';
import {songCatalogue,listScores} from './score-library-plugin.js';
import {SCALES} from './exercises.js';
const directory=fileURLToPath(new URL('../public/scores/',import.meta.url));
async function files(){return (await listScores()).map(file=>({...file,id:createHash('sha256').update(file.name).digest('hex').slice(0,16)}));}
const scoreCache=new Map();
async function score(id,track,notation,available){
  if(id==='demo')return readerScore(null,{track,notation});
  const file=available.find(f=>f.id===id);if(!file)throw new Error('Score not found. Refresh the score list.');
  const path=join(directory,file.name),info=await stat(path),key=`${id}-${track}-${notation}-${info.mtimeMs}-${info.size}`;
  if(scoreCache.has(key))return scoreCache.get(key);
  const bytes=await readFile(path);if(bytes.length>50*1024*1024)throw new Error('This score is too large for the reader (50 MB limit).');
  const result=readerScore(bytes,{name:file.name,track,notation});
  scoreCache.set(key,result);if(scoreCache.size>3)scoreCache.delete(scoreCache.keys().next().value);return result;
}
export function einkReader(){return {
  name:'tab-forge-eink-reader',
  configureServer(server){server.middlewares.use(async(req,res,next)=>{
    const path=req.url?.split('?')[0];if(!path?.startsWith('/eink/'))return next();
    if(!['GET','HEAD'].includes(req.method))return next();
    try{
      let data;
      if(path==='/eink/catalog.json')data=readerCatalogue(await songCatalogue(),await files());
      else if(/^\/eink\/song\/[a-f0-9]{16}\.json$/.test(path))data=readerSong(await songCatalogue(),path.split('/').pop().slice(0,-5));
      else if(/^\/eink\/scale\/\d+-[A-Za-z]+\.json$/.test(path)){
        const match=path.match(/\/(\d+)-([A-Za-z]+)\.json$/);data=readerScale(Number(match[1]),match[2]);
      }else if(/^\/eink\/score\/(demo|[a-f0-9]{16})-\d+-(both|tab|sheet)(?:-\d+)?\.json$/.test(path)){
        const match=path.match(/\/(demo|[a-f0-9]{16})-(\d+)-(both|tab|sheet)(?:-(\d+))?\.json$/);const rendered=await score(match[1],Number(match[2]),match[3],await files());data=match[4]!==undefined?rendered.pages[Number(match[4])]:{title:rendered.title,artist:rendered.artist,tracks:rendered.tracks,track:rendered.track,pageCount:rendered.pages.length};if(!data)throw new Error('Score page not found.');
      }else{res.statusCode=404;return res.end('Reader resource not found.');}
      res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(req.method==='HEAD'?undefined:JSON.stringify(data));
    }catch(error){res.setHeader('Content-Type','application/json');res.statusCode=400;res.end(JSON.stringify({error:error.message}));}
  });},
  async generateBundle(){
    const available=await files(),source=await songCatalogue(),catalogue=readerCatalogue(source,available);
    for(const song of catalogue.songs)this.emitFile({type:'asset',fileName:`eink/song/${song.readerId}.json`,source:JSON.stringify(readerSong(source,song.readerId))});
    this.emitFile({type:'asset',fileName:'eink/catalog.json',source:JSON.stringify(catalogue)});
    for(let root=0;root<12;root++)for(const type of Object.keys(SCALES))this.emitFile({type:'asset',fileName:`eink/scale/${root}-${type}.json`,source:JSON.stringify(readerScale(root,type))});
    for(const id of ['demo',...available.map(f=>f.id)]){
      let initial;try{initial=await score(id,0,'both',available);}catch(error){this.emitFile({type:'asset',fileName:`eink/score/${id}-0-both.json`,source:JSON.stringify({error:error.message})});continue;}
      for(const track of initial.tracks)for(const notation of ['both','tab','sheet']){
        let result;try{result=track.id===0&&notation==='both'?initial:await score(id,track.id,notation,available);}catch(error){result={error:error.message};}
        if(!result.error){for(const [page,item]of result.pages.entries())this.emitFile({type:'asset',fileName:`eink/score/${id}-${track.id}-${notation}-${page}.json`,source:JSON.stringify(item)});result={title:result.title,artist:result.artist,tracks:result.tracks,track:result.track,pageCount:result.pages.length};}
        this.emitFile({type:'asset',fileName:`eink/score/${id}-${track.id}-${notation}.json`,source:JSON.stringify(result)});
      }
    }
  },
};}
