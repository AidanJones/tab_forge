// Restore the catalogue's known public downloads, not a general-purpose crawler.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {importer,Settings} from '@coderline/alphatab';

const data=JSON.parse(await readFile(new URL('../songs/songs.json',import.meta.url),'utf8'));
const directory=fileURLToPath(new URL('../public/scores/',import.meta.url));await mkdir(directory,{recursive:true});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
let downloaded=0,existing=0,failed=0;
for(const song of [...data.songs,...data.suggestions])for(const source of song.guitar_pro_files||[]){
  if(source.format!=='gp4'||!source.download_url)continue;
  try{
    if(!source.filename||/[<>:"\\/|?*\x00-\x1f]/.test(source.filename)||!source.filename.toLowerCase().endsWith('.gp4'))throw new Error('Unsafe filename');
    const url=new URL(source.download_url);
    if(url.protocol!=='https:'||url.hostname!=='guitarprotabs.org'||url.username||url.password)throw new Error('Download host is not supported');
    const path=join(directory,source.filename);
    let previous;try{previous=await readFile(path);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(previous){existing++;console.log(`Kept existing: ${source.filename}${digest(previous)!==source.sha256?' (different bytes; not overwritten)':''}`);continue;}
    await new Promise(resolve=>setTimeout(resolve,400));
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    if(response.url&&!response.url.startsWith('https://guitarprotabs.org/'))throw new Error('Download redirected to another host');
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length>5*1024*1024||!new TextDecoder().decode(bytes.slice(0,32)).includes('FICHIER GUITAR PRO v4'))throw new Error('Not a GP4 file');
    if(digest(bytes)!==source.sha256)throw new Error('Source file changed; recheck it before downloading');
    importer.ScoreLoader.loadScoreFromBytes(bytes,new Settings());
    await writeFile(path,bytes,{flag:'wx'});downloaded++;console.log(`Downloaded: ${source.filename}`);
  }catch(error){failed++;console.error(`${song.title}: ${error.message}`);}
}
console.log(`${downloaded} downloaded, ${existing} existing, ${failed} failed.`);
if(failed)process.exitCode=1;
