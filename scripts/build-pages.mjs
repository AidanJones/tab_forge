import {cp,mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const temporary=await mkdtemp(join(tmpdir(),'tab-forge-pages-'));
try{
  // Explicit allowlist: downloaded scores and arbitrary public-folder files
  // must never enter the public deployment, including their rendered pages.
  for(const name of ['kindle.html','kindle','licenses'])await cp(join(root,'public',name),join(temporary,name),{recursive:true});
  const base=process.env.PAGES_BASE_PATH||'/tab_forge/';
  if(!base.startsWith('/')||!base.endsWith('/')||base.includes('..'))throw new Error('Pages base path must be an absolute URL path ending with /.');
  const exitCode=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'build','--base',base],{
      cwd:root,stdio:'inherit',env:{...process.env,TAB_FORGE_PUBLIC_BUILD:'true',VITE_PUBLIC_SITE:'true',TAB_FORGE_PUBLIC_DIR:temporary},
    });child.on('error',reject);child.on('exit',code=>resolve(code??1));
  });
  if(exitCode)throw new Error(`Public build failed (${exitCode}).`);
  const dist=join(root,'dist');
  // Keep existing editor URLs locally; the published entry is the Practice home.
  await cp(join(dist,'index.html'),join(dist,'create.html'));
  await cp(join(dist,'home.html'),join(dist,'index.html'));
  await writeFile(join(dist,'.nojekyll'),'');
  const names=await readdir(dist,{recursive:true});
  if(names.some(name=>/\.(?:gp[345]?|gpx|musicxml|mxl|tex|alphatex)$/i.test(name)))throw new Error('A private score entered the public artifact.');
  const scores=JSON.parse(await readFile(join(dist,'scores/catalog.json'),'utf8'));
  const availability=JSON.parse(await readFile(join(dist,'scores/availability.json'),'utf8'));
  const reader=JSON.parse(await readFile(join(dist,'eink/catalog.json'),'utf8'));
  if(scores.length||availability.some(file=>file.local)||reader.files.some(file=>file.id!=='demo'))throw new Error('Public artifact contains local score data.');
  if(names.some(name=>name.replaceAll('\\','/').startsWith('eink/score/')&&!name.split(/[\\/]/).pop().startsWith('demo-')))throw new Error('A private rendered score entered the public artifact.');
  console.log(`Public Pages build verified at ${base}: app, catalogue and original exercises only.`);
}finally{
  if(dirname(resolve(temporary))!==resolve(tmpdir())||!basename(temporary).startsWith('tab-forge-pages-'))throw new Error('Refusing to remove an unexpected temporary directory.');
  await rm(temporary,{recursive:true,force:true});
}
