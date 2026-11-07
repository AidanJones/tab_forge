import { openSection } from './workflow-helpers.js';
import { test, expect } from '@playwright/test';

async function fakeMicrophone(page, mode='tone') {
  await page.addInitScript(mode=>{
    window.micRequests=[];window.micStops=0;
    const mediaSource=AudioContext.prototype.createMediaStreamSource;
    AudioContext.prototype.createMediaStreamSource=function(...args){window.analysisContext=this;return mediaSource.apply(this,args);};
    const stream=async()=>{
      const context=new AudioContext(),oscillator=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();
      oscillator.frequency.value=110;gain.gain.value=mode==='silent'?0:mode==='quiet'?.001:.2;oscillator.connect(gain);gain.connect(destination);oscillator.start();await context.resume();
      window.testPitch=(frequency,amplitude=.2)=>{oscillator.frequency.value=frequency;gain.gain.value=amplitude;};
      for(const track of destination.stream.getTracks()){
        const stop=track.stop.bind(track);track.stop=()=>{++window.micStops;stop();context.close().catch(()=>{});};
      }
      return destination.stream;
    };
    Object.defineProperty(navigator.mediaDevices,'enumerateDevices',{configurable:true,value:async()=>[{kind:'audioinput',deviceId:'laptop',label:'Laptop microphone'}]});
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async constraints=>{
      window.micRequests.push(constraints);
      if(mode==='denied')throw new DOMException('Denied','NotAllowedError');
      if(mode==='pending')return new Promise(resolve=>{window.resolveMicrophone=async()=>resolve(await stream());});
      return stream();
    }});
  },mode);
}
const frequency=midi=>440*2**((midi-69)/12);

test('microphone tuner detects real Web Audio pitches, guides tuning, and releases capture',async({page})=>{
  await fakeMicrophone(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/practice.html');
  expect(await page.evaluate(()=>window.micRequests.length)).toBe(0);
  await page.getByRole('link',{name:'Tune',exact:true}).click();
  await page.getByRole('button',{name:'Start microphone',exact:true}).click();
  await expect(page.locator('.tuner-note')).toHaveText('A2');
  await expect(page.locator('.tuner-guidance')).toHaveText('In tune');
  await openSection(page, '.microphone-settings');
  await expect(page.getByLabel('Tuner microphone')).toContainText('Laptop microphone');
  expect(await page.evaluate(()=>window.micRequests[0])).toEqual({audio:{channelCount:{ideal:1},echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  await page.getByLabel('Tuner target').selectOption('45');
  await page.evaluate(()=>window.testPitch(110*2**(-20/1200)));
  await expect(page.locator('.tuner-guidance')).toHaveText('Flat · tune up');
  await page.evaluate(()=>window.testPitch(110*2**(20/1200)));
  await expect(page.locator('.tuner-guidance')).toHaveText('Sharp · tune down');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#guitar-tuner').screenshot({path:'test-results/tuner-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.evaluate(()=>window.testPitch(110,0));
  await expect(page.locator('.tuner-note')).toHaveText('—');
  await page.getByRole('button',{name:'Stop microphone',exact:true}).click();
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','idle');
  expect(await page.evaluate(()=>window.micStops)).toBe(1);
  expect(errors).toEqual([]);
});

test('chord and scale trainers wait for the correct notes and scale tabs play in either page',async({page})=>{
  await fakeMicrophone(page);await page.goto('/practice.html');
  await page.getByRole('link',{name:'Tune',exact:true}).click();
  await page.getByRole('link',{name:'Chords',exact:true}).click();
  await page.getByLabel('Training chord').selectOption('C');
  await openSection(page, '.inline-note-check');
  await page.getByRole('button',{name:'Check this chord',exact:true}).click();
  await expect(page.locator('.tuner-note')).toHaveText('A2');
  await expect(page.locator('.trainer-progress')).toHaveText('0 / 5 notes checked');
  for(const [i,midi] of [48,52,55,60,64].entries()){
    await page.evaluate(f=>window.testPitch(f),frequency(midi));
    await expect(page.locator('.trainer-progress')).toHaveText(`${i+1} / 5 notes checked`);
  }
  await expect(page.locator('.trainer-next')).toContainText('All sounding strings checked');
  await page.getByRole('link',{name:'Scales',exact:true}).click();
  await page.getByLabel('Scale key').selectOption('9');await page.getByLabel('Scale type').selectOption('minorPentatonic');
  await openSection(page, '.inline-note-check');
  await page.getByRole('button',{name:'Start microphone',exact:true}).click();
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','listening');
  await expect(page.locator('.trainer-progress')).toHaveText('0 / 21 notes checked');
  await page.evaluate(f=>window.testPitch(f),frequency(45));
  await expect(page.locator('.trainer-progress')).toHaveText('1 / 21 notes checked');
  await page.getByRole('button',{name:'Load scale tab',exact:true}).click();
  await expect(page.locator('#score-title')).toContainText('A minor pentatonic');await expect(page.locator('#play')).toBeEnabled();
  await page.getByRole('button',{name:'Play-along',exact:true}).click();await expect(page.locator('#play-along .highway-event').first()).toBeVisible();
  await page.getByRole('link',{name:'Tune',exact:true}).click();
  expect(await page.evaluate(()=>window.micStops)).toBe(2);
  await page.goto('/index.html');
  await page.locator('#input').fill('');
  await page.getByRole('link',{name:'Tune',exact:true}).click();
  await expect(page.getByRole('button',{name:'Start microphone',exact:true})).toBeEnabled();
  await page.getByRole('link',{name:'Scales',exact:true}).click();
  await page.getByRole('button',{name:'Load scale tab',exact:true}).click();
  await expect(page.locator('#input')).toHaveValue(/C major/);
  await expect(page.locator('#score-title')).toContainText('C major');await expect(page.locator('#play')).toBeEnabled();
});

test('permission denial and cancelling a pending microphone request leave the app usable',async({page})=>{
  await fakeMicrophone(page,'denied');await page.goto('/practice.html');
  await page.getByRole('link',{name:'Tune',exact:true}).click();await page.getByRole('button',{name:'Start microphone',exact:true}).click();
  await expect(page.locator('.tuner-status')).toContainText('Microphone access was blocked');
  await expect(page.getByRole('button',{name:'Start microphone',exact:true})).toBeEnabled();
  await page.getByRole('link',{name:'Songs',exact:true}).click();await page.locator('#demo').click();await expect(page.locator('#play')).toBeEnabled();
});

test('a late permission response after cancel immediately stops its stream',async({page})=>{
  await fakeMicrophone(page,'pending');await page.goto('/practice.html');
  await page.getByRole('link',{name:'Tune',exact:true}).click();await page.getByRole('button',{name:'Start microphone',exact:true}).click();
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','requesting');
  await expect.poll(()=>page.evaluate(()=>Boolean(window.resolveMicrophone))).toBe(true);
  await page.getByRole('button',{name:'Stop microphone',exact:true}).click();
  await page.evaluate(()=>window.resolveMicrophone());
  await expect.poll(()=>page.evaluate(()=>window.micStops)).toBe(1);
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','idle');
});

test('quiet notes register on a readable meter and an adjustable gate explains rejection',async({page})=>{
  await fakeMicrophone(page,'quiet');await page.goto('/practice.html');
  await page.getByRole('link',{name:'Tune',exact:true}).click();await page.getByRole('button',{name:'Start microphone',exact:true}).click();
  await expect(page.locator('.tuner-note')).toHaveText('A2');
  await expect(page.locator('.tuner-guidance')).toHaveText('In tune');
  await expect.poll(()=>page.getByLabel('Microphone level').evaluate(n=>n.value)).toBeGreaterThan(-70);
  await openSection(page, '.microphone-settings');
  await page.getByLabel('Microphone noise floor').fill('-50');
  await expect(page.locator('.tuner-status')).toContainText('below the noise gate');
  await expect(page.locator('.tuner-note')).toHaveText('—');
  await openSection(page, '.microphone-settings');
  await page.getByLabel('Microphone noise floor').fill('-65');
  await expect(page.locator('.tuner-guidance')).toHaveText('In tune');
  await page.locator('#guitar-tuner').screenshot({path:'test-results/tuner-quiet-signal.png'});
});

test('zero input and suspended capture have actionable feedback, and the live microphone can be changed',async({page})=>{
  await fakeMicrophone(page,'silent');await page.goto('/practice.html');
  await page.getByRole('link',{name:'Tune',exact:true}).click();await page.getByRole('button',{name:'Start microphone',exact:true}).click();
  await expect(page.locator('.tuner-status')).toContainText('No audio reaching the tuner');
  await expect(page.getByLabel('Microphone level')).toHaveJSProperty('value',-90);
  await openSection(page, '.microphone-settings');
  await page.getByLabel('Tuner microphone').selectOption('laptop');
  await expect.poll(()=>page.evaluate(()=>window.micRequests.length)).toBe(2);
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','listening');
  expect(await page.evaluate(()=>window.micRequests[1].audio.deviceId)).toEqual({exact:'laptop'});
  await page.evaluate(()=>window.testPitch(110,.001));
  await expect(page.locator('.tuner-guidance')).toHaveText('In tune');
  await page.evaluate(()=>window.analysisContext.suspend());
  await expect(page.locator('.tuner-status')).toContainText('Browser audio is paused');
  await page.getByRole('button',{name:'Resume audio',exact:true}).click();
  await expect(page.locator('.tuner-guidance')).toHaveText('In tune');
  await page.getByRole('button',{name:'Stop microphone',exact:true}).click();
  expect(await page.evaluate(()=>window.micStops)).toBe(2);
});

test('a scale flows into microphone-driven scrolling: wrong notes hold, correct notes advance, and completion can restart',async({page})=>{
  await fakeMicrophone(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/practice.html');await page.getByRole('link',{name:'Tune',exact:true}).click();
  await page.getByRole('link',{name:'Scales',exact:true}).click();
  await page.getByLabel('Scale key').selectOption('4');await page.getByLabel('Scale type').selectOption('minorPentatonic');await page.getByLabel('Scale direction').selectOption('up');
  await page.getByRole('button',{name:'Practise scale with microphone',exact:true}).click();
  await expect(page.getByLabel('Play-along mode')).toHaveValue('wait');await expect(page.locator('#play-along')).toBeVisible();
  await expect(page.locator('#play')).toBeDisabled();
  await page.locator('#follow-microphone').click();
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#play')).toBeFocused();
  await page.getByLabel('Play-along start delay').selectOption('0');await page.locator('#play').focus();await page.keyboard.press('Space');
  await expect(page.locator('.play-along-status')).toContainText('0 / 11 played · Play E2');
  const initial=await page.locator('#position').evaluate(n=>n.value);
  await expect(page.locator('.play-along-status')).toContainText('Heard A2');
  expect(await page.locator('#position').evaluate(n=>n.value)).toBe(initial);
  const notes=[40,43,45,47,50,52,55,57,59,62,64];
  for(const [index,midi] of notes.entries()){
    await page.evaluate(f=>window.testPitch(f),frequency(midi));
    if(index<notes.length-1)await expect(page.locator('.play-along-status')).toContainText(`${index+1} / 11 played`);
  }
  await expect(page.locator('.play-along-status')).toContainText('Complete · 11 notes played');
  await expect(page.locator('#play')).toHaveText('Start listening');
  await page.locator('#play').click();await expect(page.locator('.play-along-status')).toContainText('0 / 11 played');
  await page.locator('#play').click();await expect(page.locator('#play')).toHaveText('Start listening');
  const paused=await page.locator('#position').evaluate(n=>n.value);
  await page.evaluate(f=>window.testPitch(f),frequency(40));await page.waitForTimeout(350);
  expect(await page.locator('#position').evaluate(n=>n.value)).toBe(paused);
  await page.getByLabel('Play-along start delay').selectOption('3');
  await page.locator('#play').click();await expect(page.locator('#play-along-countdown')).toBeVisible();
  await page.locator('#follow-microphone').click();await expect(page.locator('#play-along-countdown')).toBeHidden();
  await expect(page.locator('#play')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('editor scale shortcut opens wait mode, shows the target at the line and stops following when the mic stops',async({page})=>{
  await fakeMicrophone(page);await page.setViewportSize({width:390,height:844});await page.goto('/index.html');
  await page.getByRole('link',{name:'Tune',exact:true}).click();await page.getByRole('link',{name:'Scales',exact:true}).click();
  await page.getByRole('button',{name:'Practise scale with microphone',exact:true}).click();
  await expect(page.getByLabel('Play-along mode')).toHaveValue('wait');await expect(page.locator('#score-title')).toContainText('C major');
  await page.locator('#follow-microphone').click();await expect(page.locator('#play')).toBeEnabled();
  await page.getByLabel('Play-along start delay').selectOption('0');await page.locator('#play').click();
  await expect(page.locator('.play-along-status')).toContainText('0 / 29 played · Play C3');
  await page.evaluate(f=>window.testPitch(f),frequency(48));await expect(page.locator('.play-along-status')).toContainText('1 / 29 played · Play D3');
  await page.waitForTimeout(200);await expect(page.locator('.play-along-status')).not.toContainText('try again');
  await page.locator('#play-along').screenshot({path:'test-results/scale-wait-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#follow-microphone').click();await expect(page.locator('#play')).toBeDisabled();
  await page.getByLabel('Play-along mode').selectOption('timed');await expect(page.locator('#play')).toBeEnabled();
});

test('tuning does not advance a hidden chord check',async({page})=>{
  await fakeMicrophone(page);await page.goto('/practice.html#chords');
  await page.getByLabel('Training chord').selectOption('C');await page.getByRole('button',{name:'Check this chord',exact:true}).click();
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','listening');
  await page.evaluate(f=>window.testPitch(f),frequency(48));await expect(page.locator('.trainer-progress')).toHaveText('1 / 5 notes checked');
  await page.getByRole('link',{name:'Tune',exact:true}).click();await page.getByRole('button',{name:'Start microphone',exact:true}).click();
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','listening');
  await page.evaluate(f=>window.testPitch(f),frequency(52));await expect(page.locator('.tuner-note')).toHaveText('E3');
  await page.getByRole('link',{name:'Chords',exact:true}).click();await expect(page.locator('.trainer-progress')).toHaveText('1 / 5 notes checked');
});

test('closing the optional scale quick check releases microphone capture',async({page})=>{
  await fakeMicrophone(page);await page.goto('/practice.html#scales');
  await openSection(page,'.inline-note-check');await page.getByRole('button',{name:'Start microphone',exact:true}).click();
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','listening');
  await page.locator('.inline-note-check > summary').click();
  await expect.poll(()=>page.evaluate(()=>window.micStops)).toBe(1);
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','idle');
});
