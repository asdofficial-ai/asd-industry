"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const {setTimeout:wait}=require("node:timers/promises");
const PORT=3907,base="http://127.0.0.1:"+PORT;
const server=spawn(process.execPath,["server.js"],{env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
async function ready(){
  for(let i=0;i<80;i++){try{if((await fetch(base+"/health")).ok)return;}catch(_){}await wait(180);}
  throw Error("server not ready");
}
async function widthTest(browser,width){
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  const navigateIdeas=async()=>page.evaluate(()=>{
    document.querySelector('[data-nav="ideas"]').click();
  });
  try{
    await page.goto(base+"/",{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>{
      sessionStorage.setItem("asd-industry-v03-demo-session",JSON.stringify({
        entryCompleted:true,profile:{id:"ASD-DEMO-0001",nickname:"SampleCreator",
          ageGroup:"18+",email:"sample@example.com",country:"Nigeria",
          role:"",availability:"",interests:[]},
        idea:null,project:null
      }));
    });
    await page.reload({waitUntil:"domcontentloaded"});
    // Direct links to joined-only chat must not expose a room to nonmembers.
    await page.evaluate(()=>{location.hash="#squad-chat";window.dispatchEvent(new Event("hashchange"));});
    assert.equal(await page.locator("#view-squad-chat").isVisible(),false);
    assert.ok(await page.locator("#view-ideas").isVisible());
    assert.equal(await page.locator("#myDemoSquads").isVisible(),false);
    assert.equal(await page.locator("#joinedSquadChatShortcut").isVisible(),false);

    // Join the last open role on Science Fair Planner, making the sample team full.
    await page.locator('[data-project-id="science-fair"] .open-project-interest').click();
    assert.ok(await page.locator("#projectJoinDialog").isVisible());
    await page.locator('#projectJoinRoleList input[value="Researcher"]').check();
    await page.locator("#confirmProjectJoin").click();
    assert.match(await page.locator("#projectJoinMessage").textContent(),/FULL and automatically STARTED/);
    assert.ok(await page.locator("#joinedSquadChatShortcut").isVisible());
    assert.equal(await page.locator('[data-project-id="science-fair"]').count(),0,"full squad leaves recruitment");
    await page.locator("#joinedSquadChatShortcut").click();
    assert.ok(await page.locator("#view-squad-chat").isVisible(),"join-dialog shortcut opens squad chat");
    assert.equal(await page.locator("#projectJoinDialog").isVisible(),false);
    assert.match(await page.locator("#squadChatProjectName").textContent(),/Science Fair Planner/);
    assert.match(await page.locator("#squadChatYourRole").textContent(),/Researcher/);
    assert.match(await page.locator("#squadChatProjectStage").textContent(),/STARTED/);
    assert.match(await page.locator(".squad-chat-security").textContent(),/no live squad members here yet/i);
    assert.match(await page.locator("#squadChatMessages").textContent(),/No messages yet/);
    await page.locator("#squadChatMessage").fill("Science fair research checklist.");
    await page.locator("#squadChatSend").click();
    assert.equal(await page.locator("#squadChatMessages .squad-chat-message-row").count(),1);
    assert.match(await page.locator("#squadChatMessages").textContent(),/Science fair research checklist/);
    let state=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("asd-industry-v03-demo-session")));
    assert.equal(state.sampleSquadChatMessages["science-fair"].length,1);
    assert.equal(state.sampleSquadChatMessages["science-fair"][0].text,"Science fair research checklist.");
    assert.equal(state.squadChatActiveId,"science-fair");

    // Rooms reopen from a joined squad's private listing, including after reload.
    await page.locator("#squadChatBack").click();
    assert.ok(await page.locator("#view-ideas").isVisible());
    assert.equal(await page.locator("#myDemoSquads .my-demo-chat-open").count(),1);
    await page.reload({waitUntil:"domcontentloaded"});
    await navigateIdeas();
    await page.locator("#myDemoSquads .my-demo-chat-open").first().click();
    assert.ok(await page.locator("#view-squad-chat").isVisible());
    assert.match(await page.locator("#squadChatMessages").textContent(),/Science fair research checklist/);
    assert.equal(await page.locator('[data-project-id="science-fair"]').count(),0);
    // Keep two different squad chat histories separate.
    await page.locator("#squadChatBack").click();
    await page.locator('[data-project-id="study-guide"] .open-project-interest').click();
    await page.locator('#projectJoinRoleList input[value="Project manager"]').check();
    await page.locator("#confirmProjectJoin").click();
    assert.ok(await page.locator("#joinedSquadChatShortcut").isVisible());
    await page.locator("#joinedSquadChatShortcut").click();
    assert.match(await page.locator("#squadChatProjectName").textContent(),/StudyCircle/);
    assert.match(await page.locator("#squadChatYourRole").textContent(),/Project manager/);
    assert.match(await page.locator("#squadChatProjectStage").textContent(),/RECRUITING/);
    assert.match(await page.locator("#squadChatMessages").textContent(),/No messages yet/);
    assert.doesNotMatch(await page.locator("#squadChatMessages").textContent(),/Science fair research checklist/);
    await page.locator("#squadChatMessage").fill("Planning StudyCircle launch.");
    await page.locator("#squadChatSend").click();
    await page.locator("#squadChatBack").click();
    await page.locator("#myDemoSquads .my-demo-chat-open").first().click();
    assert.match(await page.locator("#squadChatProjectName").textContent(),/StudyCircle|Science Fair Planner/);
    // Explicitly navigate back to each room via card data-name to check isolation.
    await page.locator("#squadChatBack").click();
    const buttons=page.locator("#myDemoSquads .my-demo-squad");
    assert.equal(await buttons.count(),2);
    const science=buttons.filter({hasText:"Science Fair Planner"});
    await science.locator(".my-demo-chat-open").click();
    assert.match(await page.locator("#squadChatMessages").textContent(),/Science fair research checklist/);
    assert.doesNotMatch(await page.locator("#squadChatMessages").textContent(),/Planning StudyCircle launch/);
    await page.locator("#squadChatMessages .squad-chat-delete").first().click();
    assert.match(await page.locator("#squadChatMessages").textContent(),/No messages yet/);
    state=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("asd-industry-v03-demo-session")));
    assert.equal(state.sampleSquadChatMessages["science-fair"].length,0);
    assert.equal(state.sampleSquadChatMessages["study-guide"].length,1,"other squad history unaffected");
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+2,
      "no horizontal overflow on squad chat");
    assert.deepEqual(errors,[],"no runtime JS errors");
    console.log("PASS joined squad chat "+width+"px");
  } finally {await page.close();}
}
(async()=>{
  await ready();
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{for(const width of [320,390,768,1280])await widthTest(browser,width);}
  finally{await browser.close();}
})().then(()=>{server.kill();process.exit(0);}).catch(error=>{
  console.error(error.stack||error);server.kill();process.exit(1);
});
