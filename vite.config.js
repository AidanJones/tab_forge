import { defineConfig } from 'vite';
import { alphaTab } from '@coderline/alphatab-vite';
import { fileURLToPath } from 'node:url';
import { einkReader } from './practice/eink-plugin.js';
import { scoreLibrary } from './practice/score-library-plugin.js';

export default defineConfig({
  base: './',
  publicDir: process.env.TAB_FORGE_PUBLIC_DIR || 'public',
  plugins: [alphaTab(), scoreLibrary(), einkReader(),{
    name:'public-creator-links',
    transformIndexHtml(html){return process.env.TAB_FORGE_PUBLIC_BUILD==='true'?html.replaceAll('./index.html','./create.html'):html;},
    transform(code,id){if(process.env.TAB_FORGE_PUBLIC_BUILD==='true'&&!id.includes('node_modules')&&/\.(?:js|html)(?:\?|$)/.test(id))return code.replaceAll('./index.html','./create.html');},
  }],
  build: {
    rollupOptions: {
      input: {
        editor: fileURLToPath(new URL('./index.html', import.meta.url)),
        home: fileURLToPath(new URL('./home.html', import.meta.url)),
        files: fileURLToPath(new URL('./my-files.html', import.meta.url)),
        notes: fileURLToPath(new URL('./notes.html', import.meta.url)),
        practice: fileURLToPath(new URL('./practice.html', import.meta.url)),
      },
    },
  },
});
