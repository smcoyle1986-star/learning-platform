// Run against the local server: node tests/free-games-browser.mjs
// Account states and all writes are mocked; this never signs up or changes real users.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin = 'http://127.0.0.1:3000';
const topics = JSON.parse(fs.readFileSync(new URL('../lib/games/topics.json', import.meta.url)));
const browser = await chromium.launch({headless:true});
const errors = [];
const guestAccess = {userId:null,isAuthenticated:false,isPremium:false,accountPlan:'guest',premiumAccessSource:null,administratorRole:null,isAdministrator:false,complimentaryPremiumAccess:null,featuredGameId:'image-reveal',featuredWorksheetType:'matching',dashboardSaveLimit:6,subscription:null,welcomeTrial:{active:false,startedAt:null,endsAt:null,used:false,daysRemaining:0,expiredNoticeRequired:false}};
const fakeId='00000000-0000-4000-8000-000000000123';
async function context(plan='guest') {
  const ctx=await browser.newContext({viewport:{width:1440,height:1050}});
  const access={...guestAccess,...(plan==='guest'?{}:{userId:fakeId,isAuthenticated:true,accountPlan:plan==='trial'?'welcome_trial':plan==='premium'?'premium':'basic',isPremium:['trial','premium'].includes(plan),premiumAccessSource:plan==='trial'?'welcome_trial':plan==='premium'?'stripe':null,welcomeTrial:{...guestAccess.welcomeTrial,used:plan==='expired'||plan==='trial',active:plan==='trial',daysRemaining:plan==='trial'?14:0}})};
  await ctx.route('**/api/**', async route=>{
    const path=new URL(route.request().url()).pathname;
    let data={ok:true};
    if(path==='/api/billing/access')data=access;
    else if(path==='/api/games/popularity')data={weekly:[],allTime:[]};
    else if(path==='/api/auth/verification/status')data={verified:!['guest','basic'].includes(plan)};
    else if(route.request().method()==='GET')return route.continue();
    return route.fulfill({json:data});
  });
  if(plan!=='guest'){
    const user={id:fakeId,aud:'authenticated',role:'authenticated',email:'local-test@example.invalid',app_metadata:{provider:'email'},user_metadata:{username:'Local Teacher'},created_at:new Date().toISOString()};
    const jwtPart=Buffer.from(JSON.stringify({sub:fakeId,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
    const session={access_token:`eyJhbGciOiJIUzI1NiJ9.${jwtPart}.localtest`,refresh_token:'local-only',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
    const storageHost=new URL(topics[0].cards[0].image).hostname;
    await ctx.addInitScript(({session,key})=>{localStorage.setItem(key,JSON.stringify(session));},{session,key:`sb-${storageHost.split('.')[0]}-auth-token`});
    await ctx.route('**/auth/v1/**', route=>route.fulfill({json:user}));
    await ctx.route('**/rest/v1/**', route=>route.fulfill({json:{id:fakeId,username:'Local Teacher',display_name:'Local Teacher'}}));
    // Keep fake test sessions in the client; never send them to real Supabase via middleware.
    await ctx.route(`${origin}/**`, async route=>{
      if(new URL(route.request().url()).pathname.startsWith('/api/'))return route.fallback();
      const headers={...route.request().headers()};delete headers.cookie;
      await route.continue({headers});
    });
  }
  const page=await ctx.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  return {ctx,page,access};
}
async function go(page,path){await page.goto(origin+path);await page.waitForLoadState('networkidle');}
async function dismissCookies(page){const button=page.getByRole('button',{name:'Reject non-essential'});if(await button.isVisible())await button.click();}
try {
  const {ctx,page}=await context();
  await go(page,'/');await dismissCookies(page);
  await page.getByRole('link',{name:'Play Free Games',exact:true}).click();
  await page.getByRole('heading',{name:'Free Classroom Games',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'My Lesson Tray',exact:true}).count(),0);
  await page.getByRole('button',{name:'Choose topic',exact:true}).first().click();
  await page.getByRole('heading',{name:'Choose a topic for Image Reveal',exact:true}).waitFor();
  assert.equal(await page.locator('article').count(),8);
  const columns=await page.locator('[aria-label="Vocabulary topics"]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  assert.equal(columns,4);
  for(const num of [2,3]){await page.getByRole('button',{name:`Page ${num}`,exact:true}).click();await page.waitForURL(`**page=${num}`);assert.equal(await page.locator('article').count(),8);}
  await page.getByRole('button',{name:'Phonics',exact:true}).click();
  await page.waitForURL('**filter=phonics');assert.equal(await page.locator('article').count(),4);
  await page.getByRole('button',{name:'Preview Short A Words',exact:true}).click();
  const preview=page.getByRole('dialog');await preview.waitFor();assert.equal(await preview.locator('img').count(),8);
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.getByRole('button',{name:'All topics',exact:true}).click();
  await page.waitForURL('**filter=all');
  await page.evaluate(()=>localStorage.setItem('classendo-lesson-tray',JSON.stringify([{id:'private',word:'Private account card'}])));
  await page.getByRole('button',{name:'Start game with Animals',exact:true}).click();
  await page.waitForURL('**/games/image-reveal?topic=animals');
  await page.getByRole('button',{name:'Animals · 12 cards · Change topic'}).waitFor();
  assert.equal(await page.getByText('two-minute',{exact:false}).count(),0);
  await page.getByRole('button',{name:'Exit',exact:true}).first().click();
  await page.waitForURL('**/games?source=topics&topic=animals');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('classendo-lesson-tray'))[0].id),'private');
  await page.getByRole('button',{name:'Choose topic',exact:true}).first().click();
  await page.getByRole('button',{name:'Play with Animals',exact:true}).waitFor();
  await page.getByRole('link',{name:'Choose another topic',exact:true}).click();
  console.log('PASS guest landing, grid, 3 pages, filters, preview, launch, isolated tray, retained topic');
  // Every existing game accepts canonical topic cards without an account gate.
  for(const game of ['image-reveal','kaboom','spin-and-speak','yes-or-no','choose-your-side','four-corners','memory-flip','connect-four','conquer','whack-a-word']){
    await go(page,`/games/${game}?topic=short-a`);
    await page.getByRole('button',{name:'Short A Words · 8 cards · Change topic'}).waitFor();
    assert.equal(await page.getByRole('heading',{name:/Sign in to use/}).count(),0);
  }
  console.log('PASS all 10 game routes load guest phonics topic');
  await go(page,'/games/yes-or-no?topic=animals');
  const input=page.getByPlaceholder('Enter sentence for this card...').first();
  const textareas=page.locator('textarea');
  const sentenceInput=await input.count()?input:textareas.first();
  await sentenceInput.fill('This is a cat.');
  await page.reload();await page.getByRole('button',{name:'Animals · 12 cards · Change topic'}).waitFor();
  assert.equal(await page.getByPlaceholder('Enter sentence for this card...').first().inputValue(),'This is a cat.');
  assert.equal(await page.getByRole('button',{name:'Save set',exact:true}).count(),0);
  console.log('PASS Yes/No guest preparation survives refresh');
  await go(page,'/games/topics?game=image-reveal');await dismissCookies(page);
  await page.screenshot({path:'/tmp/classendo-topics-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/classendo-topics-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await ctx.close();
  for(const plan of ['basic','trial','expired','premium']){
    const {ctx,page}=await context(plan);
    await go(page,'/games');await dismissCookies(page);
    await page.getByRole('button',{name:'My Lesson Tray',exact:true}).waitFor();
    await page.getByRole('button',{name:'My Lesson Tray',exact:true}).click();
    await page.getByText('Click flashcards to add',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Topics',exact:true}).click();
    await page.getByText('Choose a game, then pick a topic.',{exact:true}).waitFor();
    await go(page,'/games/topics?game=image-reveal');
    await page.evaluate(()=>localStorage.setItem('classendo-lesson-tray',JSON.stringify([{id:'old',word:'Old tray'}])));
    await page.getByRole('button',{name:'Preview Animals',exact:true}).click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('classendo-lesson-tray'))[0].id),'old');
    await page.getByRole('button',{name:'Close dialog',exact:true}).click();
    await page.getByRole('button',{name:'Start game with Animals',exact:true}).click();
    await page.getByRole('button',{name:'Replace tray & start',exact:true}).click();
    await page.waitForURL('**/games/image-reveal?topic=animals');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('classendo-lesson-tray')).length),12);
    await page.getByRole('button',{name:'Exit',exact:true}).first().click();
    await page.waitForURL('**/games?source=topics&topic=animals');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('classendo-lesson-tray')).length),12);
    await go(page,'/games/custom?game=kaboom&topic=animals');
    if(plan==='trial'||plan==='premium')await page.getByRole('link',{name:'Choose my vocabulary',exact:true}).waitFor();
    else if(plan==='basic')await page.getByRole('button',{name:'Send confirmation email',exact:true}).waitFor();
    else await page.getByRole('link',{name:'Get Premium',exact:true}).waitFor();
    console.log(`PASS ${plan}: toggle, preview isolation, tray replacement/retention, custom access CTA`);
    await ctx.close();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS no uncaught browser errors');
} finally { await browser.close(); }
