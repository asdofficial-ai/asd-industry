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
    assert.ok(await page.locator("#view-ideas").isVisible(),"Find Your Team is visible");
    assert.equal(await page.locator("#openProjectsList .open-project-card").count(),7);
    assert.match(await page.locator("#openProjectsCount").textContent(),/7 open example projects/);
    assert.ok(await page.locator("#openProjectsList").evaluate(el=>el.scrollWidth>el.clientWidth),"projects scroll sideways");
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+2,"no global overflow");
    await page.locator("#projectBrowseCategory").selectOption("school");
    assert.equal(await page.locator("#openProjectsList .open-project-card").count(),2,"both school projects open");
    await page.locator("#projectBrowseSearch").fill("science");
    assert.equal(await page.locator("#openProjectsList .open-project-card").count(),1,"school search");
    await page.locator("#projectBrowseSearch").fill("");
    await page.locator('[data-project-id="science-fair"] .open-project-interest').click();
    assert.ok(await page.locator("#projectJoinDialog").isVisible());
    assert.match(await page.locator("#projectJoinTitle").textContent(),/Science Fair Planner/);
    assert.match(await page.locator("#projectJoinCapacity").textContent(),/1 of 3 spots open/);
    assert.match(await page.locator("#projectJoinStart").textContent(),/About 6 days/);
    assert.equal(await page.locator('#projectJoinRoleList input[value="Project manager"]').isDisabled(),true);
    assert.equal(await page.locator('#projectJoinRoleList input[value="Designer"]').isDisabled(),true);
    assert.equal(await page.locator('#projectJoinRoleList input[value="Researcher"]').isDisabled(),false);
    assert.equal(await page.locator("#confirmProjectJoin").isDisabled(),true,"must select an open position");
    await page.locator('#projectJoinRoleList input[value="Researcher"]').check();
    assert.equal(await page.locator("#confirmProjectJoin").isDisabled(),false);
    await page.locator("#confirmProjectJoin").click();
    assert.match(await page.locator("#projectJoinMessage").textContent(),/FULL and automatically STARTED/);
    assert.match(await page.locator("#projectJoinStart").textContent(),/Started/);
    assert.equal(await page.locator('[data-project-id="science-fair"]').count(),0,"full squad automatically leaves open projects");
    assert.equal(await page.locator("#openProjectsList .open-project-card").count(),1,"only other open school project remains");
    await page.locator("#closeProjectJoinDialog").click();
    assert.ok(await page.locator("#myDemoSquads").isVisible(),"full joined team accessible outside open-project list");
    assert.match(await page.locator("#myDemoSquadsList").textContent(),/Science Fair Planner/);
    assert.match(await page.locator("#myDemoSquadsList").textContent(),/Team full · started/);
    assert.match(await page.locator("#myDemoSquadsList").textContent(),/Researcher/);
    let joins=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("asd-industry-v03-demo-session")).sampleProjectJoins);
    assert.equal(joins["science-fair"].role,"Researcher");
    assert.ok(joins["science-fair"].startedAt,"automatic demo start is recorded");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.evaluate(()=>document.querySelector('button[data-nav="ideas"]').click());
    assert.equal(await page.locator('[data-project-id="science-fair"]').count(),0,"full team stays hidden after reload");
    assert.ok(await page.locator("#myDemoSquads").isVisible(),"joined role restored after reload");
    await page.locator("#projectBrowseCategory").selectOption("all");
    assert.equal(await page.locator("#openProjectsList .open-project-card").count(),6,"six open sample projects remain");
    await page.locator('[data-project-id="study-guide"] .open-project-interest').click();
    assert.match(await page.locator("#projectJoinCapacity").textContent(),/3 of 4 spots open/);
    assert.match(await page.locator("#projectJoinRoleList").textContent(),/Project manager/);
    await page.locator('#projectJoinRoleList input[value="Project manager"]').check();
    await page.locator("#confirmProjectJoin").click();
    assert.match(await page.locator("#projectJoinMessage").textContent(),/2 positions remain/);
    await page.locator("#cancelProjectJoin").click();
    assert.equal(await page.locator('[data-project-id="study-guide"]').count(),1,"not-full team remains open");
    assert.match(await page.locator('[data-project-id="study-guide"] .open-project-vacancies').textContent(),/2 of 4/);
    await page.locator('[data-project-id="study-guide"] .open-project-interest').click();
    assert.match(await page.locator("#projectJoinMessage").textContent(),/Your chosen role: Project manager/);
    assert.equal(await page.locator("#confirmProjectJoin").isDisabled(),true,"cannot join the same team twice");
    await page.locator("#closeProjectJoinDialog").click();
    await page.locator("#projectBrowseSearch").fill("nonsense xyz");
    assert.match(await page.locator("#openProjectsList").textContent(),/No open projects match/);
    await page.locator("#projectBrowseSearch").fill("");
    await page.locator("#projectsScrollForward").click();
    await page.waitForTimeout(400);
    assert.ok((await page.locator("#openProjectsList").evaluate(el=>el.scrollLeft))>0,"forward scrolling works");
    await page.locator("#postProjectJump").click();
    await page.locator("#ideaTitleInput").fill("Student Study Hub");
    await page.locator("#ideaDescription").fill("A free student-focused study planner with sample assignments and reminders.");
    await page.locator("#ideaTopic").selectOption("Education");
    await page.locator("#neededRole").selectOption("Developer");
    await page.locator("#ideaRole").selectOption("Project leader");
    await page.locator('input[name="ideaInterests"][value="Education"]').check();
    await page.locator("#ideaAvailability").selectOption("flexible");
    await page.locator('#ideaForm button[type="submit"]').click();
    assert.equal(await page.locator("#openProjectsList .own-project-card").count(),1,"private draft remains visible");
    assert.match(await page.locator(".own-project-card").textContent(),/ONLY YOU SEE THIS/);
    assert.deepEqual(errors,[],"no browser JS errors");
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+2,"no horizontal overflow after joins");
    console.log("PASS project roles / full squads "+width+"px");
  }finally{await page.close();}
}
(async()=>{
  await ready();
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{for(const width of [320,390,768,1280])await testWidth(browser,width);}
  finally{await browser.close();}
})().then(()=>{server.kill();process.exit(0);}).catch(e=>{console.error(e.stack||e);server.kill();process.exit(1);});
