import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { mergeCatalogues } from './merge-catalogue.js';

const defaultDirectory = fileURLToPath(new URL('../public/scores/', import.meta.url));
const scoreExtension = /\.(gp[345]?|gpx|xml|musicxml|mxl|tex|alphatex)$/i;
const songList=fileURLToPath(new URL('../songs/songs.json',import.meta.url));
const updatedSongList=fileURLToPath(new URL('../songs/songs2.json',import.meta.url));

export async function songCatalogue() {
  const original=JSON.parse(await readFile(songList,'utf8'));
  let update;
  try{update=await readFile(updatedSongList,'utf8');}
  catch(error){if(error.code==='ENOENT')return original;throw error;}
  return mergeCatalogues(original,JSON.parse(update));
}

export async function listScores(directory = defaultDirectory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter(entry => entry.isFile() && scoreExtension.test(entry.name))
    .map(entry => ({ name: entry.name, url: `scores/${encodeURIComponent(entry.name)}` }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

// Serve library files explicitly in development: Vite's public-file cache and
// decodeURI routing can miss newly added files or names containing '#' / '%'.
// Production gets a static catalog beside Vite's copied score files.
export function scoreLibrary() {
  return {
    name: 'tab-forge-score-library',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = request.url?.split('?')[0];
        if(path==='/song-library/catalog.json' && ['GET','HEAD'].includes(request.method)){
          try{const bytes=JSON.stringify(await songCatalogue());response.setHeader('Content-Type','application/json; charset=utf-8');response.setHeader('Cache-Control','no-store');return response.end(request.method==='HEAD'?undefined:bytes);}
          catch{response.statusCode=404;return response.end('Song catalogue not found.');}
        }
        if (!path?.startsWith('/scores/')) return next();
        if (!['GET', 'HEAD'].includes(request.method)) return next();
        try {
          const scores = await listScores();
          response.setHeader('Cache-Control', 'no-store');
          if (path === '/scores/catalog.json') {
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            return response.end(request.method === 'HEAD' ? undefined : JSON.stringify(scores));
          }
          const name = decodeURIComponent(path.slice('/scores/'.length));
          // Only serve regular score files found directly in our fixed folder.
          if (name.includes('/') || name.includes('\\') || !scores.some(score => score.name === name)) {
            response.statusCode = 404;
            return response.end('Score not found.');
          }
          const bytes = await readFile(join(defaultDirectory, name));
          response.setHeader('Content-Type', 'application/octet-stream');
          response.setHeader('X-Content-Type-Options', 'nosniff');
          response.end(request.method === 'HEAD' ? undefined : bytes);
        } catch {
          response.statusCode = 500;
          response.end('Could not read the local scores folder.');
        }
      });
    },
    async generateBundle() {
      this.emitFile({type:'asset',fileName:'song-library/catalog.json',source:JSON.stringify(await songCatalogue())});
      this.emitFile({ type: 'asset', fileName: 'scores/catalog.json', source: JSON.stringify(await listScores()) });
    },
  };
}
