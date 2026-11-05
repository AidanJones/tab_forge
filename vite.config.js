import { defineConfig } from 'vite';
import { alphaTab } from '@coderline/alphatab-vite';
import { fileURLToPath } from 'node:url';
import { scoreLibrary } from './practice/score-library-plugin.js';

export default defineConfig({
  base: './',
  plugins: [alphaTab(), scoreLibrary()],
  build: {
    rollupOptions: {
      input: {
        editor: fileURLToPath(new URL('./index.html', import.meta.url)),
        practice: fileURLToPath(new URL('./practice.html', import.meta.url)),
      },
    },
  },
});
