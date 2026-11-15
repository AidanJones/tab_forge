import {defineConfig} from '@playwright/test';
import base from './playwright.config.js';
export default defineConfig({...base,testDir:'./tests/pages',outputDir:'./test-results/pages',use:{...base.use,baseURL:'http://127.0.0.1:5175/tab_forge/'},webServer:{
  command:'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5175 --strictPort --base /tab_forge/',
  url:'http://127.0.0.1:5175/tab_forge/',reuseExistingServer:false,
}});
