import {test,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {openSection} from './workflow-helpers.js';
const fixture=fileURLToPath(new URL('../fixtures/original-four-notes.gp4',import.meta.url));

test('My files uploads privately, survives reload and reopens a project for practice',async({page})=>{
  const writes=[];page.on('request',r=>{if(['POST','PUT','PATCH'].includes(r.method()))writes.push(r.url());});
  await page.goto('/my-files.html');await page.locator('#private-file').setInputFiles(fixture);await expect(page.locator('.private-file-row h3')).toHaveText('Original four notes');
  await page.reload();await expect(page.locator('.private-file-row')).toHaveCount(1);await page.getByRole('link',{name:'Open / practise'}).click();await expect(page.locator('#score-title')).toHaveText('Original four notes');await expect(page.locator('#play')).toBeEnabled();
  expect(writes).toEqual([]);
});

test('folder backup uses only a chosen app folder and writes a dated snapshot',async({page})=>{
  await page.addInitScript(()=>{
    window.folderWrites=[];
    function dir(path){return {name:path.split('/').pop(),queryPermission:async()=> 'granted',requestPermission:async()=> 'granted',getDirectoryHandle:async(name)=>dir(path+'/'+name),getFileHandle:async(name)=>({createWritable:async()=>({write:async(data)=>{window.folderWrites.push({path:path+'/'+name,bytes:typeof data==='string'?data.length:data.size});},close:async()=>{},abort:async()=>{}})})};}
    window.showDirectoryPicker=async()=>dir('chosen');
  });
  await page.goto('/my-files.html');await page.locator('#private-file').setInputFiles(fixture);await expect(page.locator('.private-file-row')).toHaveCount(1);
  await page.getByRole('button',{name:'Choose local folder'}).click();await expect(page.locator('#folder-status')).toContainText('tab_forge');await page.getByRole('button',{name:'Back up My files to folder'}).click();await expect(page.locator('#folder-status')).toContainText('Saved 1 projects');
  const files=await page.evaluate(()=>window.folderWrites);expect(files).toHaveLength(2);expect(files.every(f=>f.path.startsWith('chosen/tab_forge/backup-'))).toBe(true);expect(files.some(f=>f.path.endsWith('tab-forge-library.json'))).toBe(true);expect(files.some(f=>f.path.endsWith('.gp4'))).toBe(true);
});

test('unsupported folder access offers downloads and portable library backup still works',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'showDirectoryPicker',{value:undefined,configurable:true}));
  await page.setViewportSize({width:390,height:844});await page.goto('/my-files.html');await expect(page.locator('#folder-connect')).toBeHidden();await expect(page.locator('#folder-status')).toContainText('Download library backup');
  await page.locator('#private-file').setInputFiles(fixture);await expect(page.locator('.private-file-row')).toHaveCount(1);
  const saved=page.waitForEvent('download');await page.getByRole('button',{name:'Download library backup'}).click();expect((await saved).suggestedFilename()).toBe('tab-forge-library.json');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('quick riff builder inserts notes without replacing the current lesson and exports Guitar Pro',async({page})=>{
  await page.goto('/index.html');const existing='title: My existing song\n[Intro]\n0s6';await page.locator('#input').fill(existing);
  await openSection(page,'.quick-riff-builder');await page.getByRole('button',{name:'String 6, fret 3',exact:true}).click();await page.getByRole('button',{name:'String 5, fret 2',exact:true}).click();await page.getByRole('button',{name:'Insert riff into lesson'}).click();
  await expect(page.locator('#input')).toHaveValue(existing+'\n\n[My riff]\n3f6s 2f5s');await expect(page.locator('#play')).toBeEnabled();await openSection(page,'#score-exports');
  const saved=page.waitForEvent('download');await page.locator('#save-gp').click();expect((await saved).suggestedFilename()).toMatch(/\.gp$/);
});
