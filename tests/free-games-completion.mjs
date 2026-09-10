import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/games/track-play',r=>r.fulfill({json:{ok:true}}));
try{
  await page.goto('http://127.0.0.1:3000/games/image-reveal?topic=short-a');
  await page.getByRole('button', {name:'Short A Words · 8 cards · Change topic'}).waitFor();
  const cookies=page.getByRole('button',{name:'Reject non-essential'});if(await cookies.isVisible())await cookies.click();
  console.log("Game loaded");
  await page.clock.install();
  console.log("Test clock installed");
  for(let i=0;i<8;i++){
    await page.getByTitle('Remove tile',{exact:true}).first().click();
    await page.clock.fastForward(4500);
    await page.getByTitle('Correct (O)',{exact:true}).first().click();
    await page.getByTitle('Get points',{exact:true}).first().click();
    await page.clock.fastForward(4100);
    await page.clock.fastForward(1600);
    await page.clock.fastForward(700);
    console.log(`Completed card ${i+1}/8`);
  }
  const modal=page.getByRole('dialog');await modal.waitFor();
  for(const name of ['Play Again','Change Topic','Change Game','Use Your Own Vocabulary'])await modal.getByRole(name==='Play Again'?'button':'link',{name,exact:true}).waitFor();
  const signup=await modal.getByRole('link',{name:'Use Your Own Vocabulary'}).getAttribute('href');
  assert.ok(signup.includes('signup?next=')&&signup.includes('short-a'));
  await page.screenshot({path:'/tmp/classendo-game-finish.png'});
  await modal.getByRole('button',{name:'Play Again'}).click();
  await page.getByText('Card 1/8',{exact:true}).waitFor();
  assert.equal(await page.getByRole('dialog').count(),0);
  // The same real completion provides the signup URL; inspect it without creating an account.
  await page.goto('http://127.0.0.1:3000'+signup);
  await page.getByText('Use your own vocabulary in Image Reveal',{exact:true}).waitFor();
  await page.getByText('Start with a free account. Confirm your email to unlock two weeks of Premium. We’ll keep your game selection.',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS complete 8-card game, four completion actions, replay, contextual signup');
}finally{await browser.close();}
