"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const {setTimeout:delay}=require("node:timers/promises");
const PORT=3897,origin="http://127.0.0.1:"+PORT;
const server=spawn(process.execPath,["server.js"],{env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
async function ready(){
  for(let i=0;i<75;i++){try{if((await fetch(origin+"/health")).ok)return;}catch(_){}await delay(180);}
  throw Error("Demo server failed to start");
}
async function testWidth(browser,width){
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>{
      sessionStorage.setItem("asd-industry-v03-demo-session",JSON.stringify({
        entryCompleted:true,profile:{id:"ASD-DEMO-0001",nickname:"Builder",ageGroup:"18+",
          email:"example@example.com",country:"Nigeria",role:"",availability:"",interests:[]},
        idea:null,project:null
      }));
    });
    await page.reload({waitUntil:"domcontentloaded"});
    await page.evaluate(()=>document.querySelector('button[data-nav="ideas"]').click());
    assert.ok(await page.locator("#view-ideas").isVisible(),"matching screen open");
    assert.equal(await page.locator("#openProjectsList .open-project-card").count(),7);
    assert.match(await page.locator("#openProjectsCount").textContent(),/7 example projects/);
    assert.ok(await page.locator("#openProjectsList").evaluate(el=>el.scrollWidth>el.clientWidth),"cards should scroll sideways");
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+2,"page must not scroll horizontally");
    await page.locator("#projectBrowseCategory").selectOption("school");
    assert.equal(await page.locator("#openProjectsList .open-project-card").count(),2,"school filter");
    await page.locator("#projectBrowseSearch").fill("science");
    assert.equal(await page.locator("#openProjectsList .open-project-card").count(),1,"text search");
    assert.match(await page.locator("#openProjectsList").innerText(),/Science Fair Planner/);
    await page.locator("#projectBrowseSearch").fill("no such project ever");
    assert.match(await page.locator("#openProjectsList").innerText(),/No projects match/);
    await page.locator("#projectBrowseSearch").fill("");
    const join=page.locator('[data-project-id="science-fair"] .open-project-interest');
    assert.equal(await join.getAttribute("aria-pressed"),"false");
    await join.click();
    assert.equal(await join.getAttribute("aria-pressed"),"true","interest saved");
    assert.match(await page.locator("#openProjectsStatus").textContent(),/NOT a real join request/);
    let interested=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("asd-industry-v03-demo-session")).sampleProjectInterests);
    assert.deepEqual(interested,["science-fair"]);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.evaluate(()=>document.querySelector('button[data-nav="ideas"]').click());
    assert.equal(await page.locator('[data-project-id="science-fair"] .open-project-interest').getAttribute("aria-pressed"),"true","interest restored after reload");
    await page.locator('[data-project-id="science-fair"] .open-project-interest').click();
    interested=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("asd-industry-v03-demo-session")).sampleProjectInterests);
    assert.deepEqual(interested,[],"interest removal");
    await page.locator("#projectBrowseCategory").selectOption("all");
    await page.locator("#projectsScrollForward").click();
    await page.waitForTimeout(400);
    assert.ok((await page.locator("#openProjectsList").evaluate(el=>el.scrollLeft))>0,"forward scroll works");
    await page.locator("#postProjectJump").click();
    await page.locator("#ideaTitleInput").fill("Student Study Hub");
    await page.locator("#ideaDescription").fill("A free student-focused study planner with sample assignments and reminders.");
    await page.locator("#ideaTopic").selectOption("Education");
    await page.locator("#neededRole").selectOption("Developer");
    await page.locator("#ideaRole").selectOption("Project leader");
    await page.locator('input[name="ideaInterests"][value="Education"]').check();
    await page.locator("#ideaAvailability").selectOption("flexible");
    await page.locator('#ideaForm button[type="submit"]').click();
    assert.equal(await page.locator("#openProjectsList .own-project-card").count(),1,"my own idea should appear in private board");
    assert.match(await page.locator(".own-project-card").innerText(),/ONLY YOU SEE THIS/);
    assert.match(await page.locator(".own-project-card").innerText(),/Student Study Hub/);
    assert.deepEqual(errors,[],"no browser JavaScript errors");
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+2,"no mobile overflow after idea");
    console.log("PASS project browsing "+width+"px");
  }finally{await page.close();}
}
(async()=>{
  await ready();
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{for(const width of [320,390,768,1280])await testWidth(browser,width);}
  finally{await browser.close();}
})().then(()=>{server.kill();process.exit(0);}).catch(e=>{console.error(e.stack||e);server.kill();process.exit(1);});
