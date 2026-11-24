import {test,expect} from '@playwright/test';

async function microphone(page,mode){
  await page.addInitScript(mode=>{
    window.listeningRequests=0;
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{
      ++window.listeningRequests;
      if(mode==='denied')throw new DOMException('Denied','NotAllowedError');
      if(mode==='pending')return new Promise(resolve=>{window.resolveListeningMic=()=>resolve(new MediaStream());});
      const context=new AudioContext(),tone=context.createOscillator(),destination=context.createMediaStreamDestination();
      tone.frequency.value=440;tone.connect(destination);tone.start();await context.resume();return destination.stream;
    }});
  },mode);
}

test('phone spider listening keeps start, microphone and strings in one place',async({page})=>{
  await microphone(page,'tone');await page.setViewportSize({width:390,height:844});await page.goto('/practice.html#spider');
  await page.getByRole('button',{name:'Practise spider with microphone',exact:true}).click();
  await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#play')).toBeFocused();
  await expect(page.locator('.transport')).toBeHidden();
  const before=await page.evaluate(()=>window.scrollY);
  const start=await page.locator('#play').boundingBox(),stage=await page.locator('.play-along-stage').boundingBox();
  const header=await page.locator('.page-header').boundingBox();
  expect(start.y).toBeGreaterThanOrEqual(header.y+header.height);expect(stage.y+stage.height).toBeLessThanOrEqual(844);
  await page.locator('#play').click();await expect(page.locator('#play-along-countdown')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.listeningRequests)).toBe(1);
  expect(Math.abs(await page.evaluate(()=>window.scrollY)-before)).toBeLessThan(10);
  await expect(page.locator('.play-along-status')).toContainText('0 / 42 played');
  await page.locator('#play').click();await expect(page.locator('#play')).toHaveText('Start listening');
  await page.screenshot({path:'test-results/spider-listening-phone.png'});
  await page.getByRole('button',{name:'Score',exact:true}).click();await expect(page.locator('.transport #play')).toBeVisible();
  await page.getByRole('button',{name:'Play-along',exact:true}).click();await expect(page.locator('#follow-controls #play')).toBeVisible();
  expect(await page.locator('#play').count()).toBe(1);
});

test('microphone denial stays beside Start listening and allows a retry',async({page})=>{
  await microphone(page,'denied');await page.goto('/practice.html#spider');
  await page.getByRole('button',{name:'Practise spider with microphone',exact:true}).click();await page.locator('#play').click();
  await expect(page.locator('#follow-mic-status')).toContainText('blocked');await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#play-along-countdown')).toBeHidden();await expect(page.locator('.play-along-status')).not.toContainText('played');
  await page.locator('#play').click();await expect.poll(()=>page.evaluate(()=>window.listeningRequests)).toBe(2);
});

test('cancelling permission or leaving Spider prevents a late permission result from starting',async({page})=>{
  await microphone(page,'pending');await page.goto('/practice.html#spider');
  await page.getByRole('button',{name:'Practise spider with microphone',exact:true}).click();await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveText('Cancel microphone');await page.locator('#play').click();
  await page.evaluate(()=>window.resolveListeningMic());await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','idle');
  await expect(page.locator('#play-along-countdown')).toBeHidden();await expect(page.locator('#play')).toHaveText('Start listening');
  await page.locator('#play').click();await expect(page.locator('#play')).toHaveText('Cancel microphone');
  await page.getByRole('link',{name:'← Back to spider',exact:true}).click();await page.evaluate(()=>window.resolveListeningMic());
  await expect(page.locator('#guitar-tuner')).toHaveAttribute('data-state','idle');await expect(page.locator('#play-along')).toBeHidden();
});
