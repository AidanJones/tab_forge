import {test,expect} from '@playwright/test';

test('rhythm pattern editing, count-in, tap rewards and manual tempo work on a phone',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.goto('/practice.html#rhythm');
  await expect(page.locator('#rhythm-grid button[aria-pressed=true]')).toHaveCount(6);
  await page.getByRole('combobox',{name:'Input',exact:true}).selectOption('tap');await page.getByLabel('Starting / manual BPM').fill('180');
  await page.locator('.rhythm-options > summary').click();await page.getByLabel('Maximum BPM',{exact:true}).fill('180');
  await page.locator('#rhythm-start').click();await expect(page.locator('#rhythm-count')).toContainText('Ready');
  await expect(page.locator('.rhythm-session')).toBeFocused();
  await expect(page.locator('#rhythm-tap')).toBeEnabled();
  await page.keyboard.press('Space');await expect(page.locator('#rhythm-attacks')).toHaveText('1 attacks tapped');await expect(page.locator('#rhythm-stop')).toBeEnabled();
  const header=await page.locator('.page-header').boundingBox(),stop=await page.locator('#rhythm-stop').boundingBox(),rewards=await page.locator('.rhythm-rewards').boundingBox();
  expect(stop.y).toBeGreaterThanOrEqual(header.y+header.height);expect(rewards.y+rewards.height).toBeLessThanOrEqual(844);
  await page.screenshot({path:'test-results/rhythm-live-phone.png'});
  // Use the real audio clock, with an intentional extra stroke as well as hits.
  for(let i=0;i<8;i++){await page.locator('#rhythm-tap').click();await page.waitForTimeout(140);}
  await expect(page.locator('#rhythm-attacks')).not.toHaveText('0 attacks heard');
  await expect.poll(()=>page.locator('#rhythm-points').textContent()).not.toBe('0');
  await page.getByLabel('Starting / manual BPM').fill('120');await page.getByLabel('Starting / manual BPM').press('Tab');await expect(page.locator('#rhythm-adaptive')).not.toBeChecked();
  await page.locator('#rhythm-stop').click();await expect(page.locator('#rhythm-start')).toBeEnabled();
  await page.getByRole('combobox',{name:'Pattern',exact:true}).selectOption('dduu');await expect(page.getByRole('combobox',{name:'Technique',exact:true})).toHaveValue('strumming');
  await expect(page.locator('.rhythm-targets')).toBeHidden();await expect(page.locator('#rhythm-grid button[aria-pressed=true]')).toHaveCount(4);
  await page.locator('#rhythm-start').click();await expect(page.locator('#rhythm-count')).toContainText('Ready');
  await expect(page.locator('#rhythm-attacks')).toHaveText('0 attacks tapped');await page.locator('#rhythm-stop').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);expect(errors).toEqual([]);
  await page.screenshot({path:'test-results/rhythm-phone.png',fullPage:true});
});

test('blocked microphone access explains the problem and leaves Start available',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{throw new DOMException('Denied','NotAllowedError');}}));
  await page.goto('/practice.html#rhythm');await page.locator('#rhythm-start').click();await expect(page.locator('#rhythm-status')).toContainText('blocked');
  await expect(page.locator('#rhythm-start')).toBeEnabled();await expect(page.locator('#rhythm-stop')).toBeDisabled();
});

test('common picking templates follow chord shapes, custom targets remain possible and strums are timing-only',async({page})=>{
  await page.goto('/practice.html#rhythm');await page.getByRole('combobox',{name:'Pattern',exact:true}).selectOption('arpeggio');
  await expect(page.locator('#rhythm-preset option')).toHaveCount(14);
  await page.getByLabel('Practice chord',{exact:true}).selectOption('C');
  await expect(page.locator('#rhythm-grid button').first()).toContainText('P · s5');await expect(page.locator('#rhythm-grid button').first()).toContainText('3f C3');
  await page.getByLabel('Practice chord',{exact:true}).selectOption('D');await expect(page.locator('#rhythm-grid button').first()).toContainText('P · s4');await expect(page.locator('#rhythm-grid button').first()).toContainText('0f D3');
  await page.locator('.rhythm-targets > summary').click();await page.getByLabel('Picking string 1',{exact:true}).selectOption('6');await page.locator('#rhythm-start').click();
  await expect(page.locator('#rhythm-status')).toContainText('mutes string 6');await expect(page.locator('#rhythm-start')).toBeEnabled();
  await page.getByLabel('Picking targets',{exact:true}).selectOption('custom');await expect(page.locator('#rhythm-notes')).toBeVisible();
  await page.getByRole('combobox',{name:'Pattern',exact:true}).selectOption('reggae');await page.getByLabel('Practice chord',{exact:true}).selectOption('any');
  await expect(page.locator('.rhythm-targets')).toBeHidden();await expect(page.locator('#rhythm-grid button[aria-pressed=true]')).toHaveCount(4);
  await expect(page.locator('#rhythm-reference a')).toHaveAttribute('href',/musescore/);
});

test('microphone attack detection ignores a sustained note and releases capture on navigation',async({page})=>{
  await page.addInitScript(()=>{
    window.rhythmStops=0;
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{
      const context=new AudioContext(),tone=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();tone.frequency.value=196;gain.gain.value=0;tone.connect(gain);gain.connect(destination);tone.start();await context.resume();
      window.rhythmSound=()=>gain.gain.setValueAtTime(.1,context.currentTime);
      for(const track of destination.stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{window.rhythmStops++;stop();context.close().catch(()=>{});};}return destination.stream;
    }});
  });
  await page.goto('/practice.html#rhythm');await page.getByLabel('Starting / manual BPM').fill('180');await page.locator('.rhythm-options > summary').click();await page.getByLabel('Maximum BPM',{exact:true}).fill('180');
  await page.locator('#rhythm-start').click();await expect(page.locator('#rhythm-count')).not.toContainText('Ready');await page.evaluate(()=>window.rhythmSound());
  await expect(page.locator('#rhythm-attacks')).toHaveText('1 attacks heard');await page.waitForTimeout(700);await expect(page.locator('#rhythm-attacks')).toHaveText('1 attacks heard');
  await page.getByRole('link',{name:'Spider',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.rhythmStops)).toBe(1);await expect(page.locator('#rhythm-trainer')).toBeHidden();
});

test('permission errors and cancelled requests do not start a late rhythm session',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>new Promise(resolve=>{window.resolveRhythm=()=>{const stream=new MediaStream();resolve(stream);};})}));
  await page.goto('/practice.html#rhythm');await page.locator('#rhythm-start').click();await expect(page.locator('#rhythm-stop')).toBeEnabled();await expect(page.locator('#rhythm-start')).toBeDisabled();
  await page.locator('#rhythm-stop').click();await page.evaluate(()=>window.resolveRhythm());await expect(page.locator('#rhythm-start')).toBeEnabled();await expect(page.locator('#rhythm-count')).toHaveText('Stopped');
});

test('a real generated guitar-range pitch on the first click earns timing plus note rewards',async({page})=>{
  await page.addInitScript(()=>{
    let micContext,gain,accents=0;
    const oscillator=AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator=function(){
      const tone=oscillator.call(this),start=tone.start.bind(tone),context=this;
      tone.start=at=>{
        if(tone.frequency.value===1200&&gain&&++accents===2){
          const when=micContext.currentTime+Math.max(0,at-context.currentTime);
          gain.gain.setValueAtTime(.2,when);gain.gain.setValueAtTime(0,when+.16);
        }
        start(at);
      };return tone;
    };
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{
      micContext=new AudioContext();const tone=oscillator.call(micContext),destination=micContext.createMediaStreamDestination();gain=micContext.createGain();gain.gain.value=0;tone.frequency.value=440*2**((43-69)/12);tone.connect(gain);gain.connect(destination);tone.start();await micContext.resume();return destination.stream;
    }});
  });
  await page.goto('/practice.html#rhythm');await page.getByLabel('Starting / manual BPM').fill('120');await page.locator('#rhythm-start').click();
  await expect(page.locator('#rhythm-bonus')).toHaveText('1');await expect.poll(async()=>Number(await page.locator('#rhythm-points').textContent())).toBeGreaterThanOrEqual(110);
  await page.locator('#rhythm-stop').click();
});
