"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const {setTimeout:wait}=require("node:timers/promises");
const PORT=3913,base="http://127.0.0.1:"+PORT;
const server=spawn(process.execPath,["server.js"],{env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
async function ready(){
  for(let i=0;i<80;i++){try{if((await fetch(base+"/health")).ok)return;}catch(_){}await wait(160);}
  throw Error("server failed");
}
async function testWidth(browser,width){
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const goto=async(name)=>page.evaluate(view=>document.querySelector('[data-nav="'+view+'"]').click(),name);
  try{
    await page.goto(base+"/",{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>sessionStorage.setItem("asd-industry-v03-demo-session",JSON.stringify({
      entryCompleted:true,profile:{id:"ASD-DEMO-0001",nickname:"Builder",ageGroup:"18+",
        email:"demo@example.com",country:"Nigeria",role:"",availability:"",interests:[]},
      idea:null,project:null
    })));
    await page.reload({waitUntil:"domcontentloaded"});
    await goto("chat");
    assert.ok(await page.locator("#chatEmpty").isVisible());
    assert.match(await page.locator("#chatHubRooms").textContent(),/No chats yet/);
    await goto("ideas");
    await page.locator('[data-project-id="agrolink"] .open-project-interest').click();
    assert.match(await page.locator("#joinProjectAim").textContent(),/farmers/i);
    assert.match(await page.locator("#joinProjectOutcome").textContent(),/Prototype listings/);
    assert.match(await page.locator("#joinProjectHelp").textContent(),/research/i);
    assert.match(await page.locator("#joinProjectProfit").textContent(),/250,000/);
    assert.match(await page.locator("#joinProjectProfit").textContent(),/non-binding|No guaranteed/i);
    const developer=page.locator('#projectJoinRoleList label:has(input[value="Developer"])');
    assert.match(await developer.textContent(),/12%/);
    assert.match(await developer.textContent(),/30,000/);
    await page.locator("#closeProjectJoinDialog").click();
    await page.locator('[data-project-id="science-fair"] .open-project-interest').click();
    assert.match(await page.locator("#joinProjectProfit").textContent(),/No net-profit share has been proposed/);
    await page.locator('#projectJoinRoleList input[value="Researcher"]').check();
    await page.locator("#confirmProjectJoin").click();
    await page.locator("#joinedSquadChatShortcut").click();
    assert.ok(await page.locator("#view-squad-chat").isVisible());
    await page.locator("#squadChatMessage").fill("Research notes stay in this room.");
    await page.locator("#squadChatSend").click();
    await goto("chat");
    assert.ok(await page.locator("#view-chat").isVisible());
    assert.equal(await page.locator("#chatEmpty").isVisible(),false,
      "joining a squad must not show create-your-own-project empty state");
    assert.equal(await page.locator("#chatHubRooms .chat-hub-room").count(),1);
    const science=page.locator('[data-chat-project-id="science-fair"]');
    assert.match(await science.textContent(),/Science Fair Planner/);
    assert.match(await science.textContent(),/1 private demo messages/);
    await science.locator(".chat-hub-open").click();
    assert.ok(await page.locator("#view-squad-chat").isVisible());
    assert.match(await page.locator("#squadChatMessages").textContent(),/Research notes/);
    await page.reload({waitUntil:"domcontentloaded"});
    await goto("chat");
    assert.equal(await page.locator("#chatHubRooms .chat-hub-room").count(),1,"hub persists after refresh");
    await goto("ideas");
    await page.locator("#ideaTitleInput").fill("My Learning Tool");
    await page.locator("#ideaDescription").fill("Build an educational app to organize study materials, reminders and practice plans.");
    await page.locator("#ideaAim").fill("Make revision planning easier for learners without complicated tools.");
    await page.locator("#ideaOutcome").fill("A lightweight app that organizes revision and short quizzes.");
    await page.locator("#ideaHelp").fill("Developers make the prototype and designers improve the interface.");
    await page.locator("#ideaMemberShare").fill("10");
    await page.locator("#ideaProfitEstimate").fill("100000");
    await page.locator("#ideaTopic").selectOption("Education");
    await page.locator("#neededRole").selectOption("Developer");
    await page.locator("#ideaRole").selectOption("Project leader");
    await page.locator('input[name="ideaInterests"][value="Education"]').check();
    await page.locator("#ideaAvailability").selectOption("flexible");
    await page.locator('#ideaForm button[type="submit"]').click();
    const ownCard=page.locator(".own-project-card");
    assert.ok(await ownCard.isVisible());
    await ownCard.locator(".open-project-interest").click();
    assert.ok(await page.locator("#projectJoinDialog").isVisible());
    assert.match(await page.locator("#joinProjectAim").textContent(),/revision planning easier/);
    assert.match(await page.locator("#joinProjectOutcome").textContent(),/short quizzes/);
    assert.match(await page.locator("#joinProjectHelp").textContent(),/Developers make the prototype/);
    assert.match(await page.locator("#joinProjectProfit").textContent(),/10% per person/);
    assert.match(await page.locator("#projectJoinCapacity").textContent(),/NOT PUBLISHED/);
    assert.equal(await page.locator("#projectJoinForm").isVisible(),false,"creator cannot join private draft");
    await page.locator("#closeProjectJoinDialog").click();
    await page.locator(".match-action").click();
    await goto("manager");
    assert.ok(await page.locator("#managerBriefForm").isVisible());
    assert.equal(await page.locator("#managerBriefAim").inputValue(),
      "Make revision planning easier for learners without complicated tools.");
    const shares=page.locator("#managerProfitShares input");
    assert.equal(await shares.count(),3);
    assert.deepEqual(await shares.evaluateAll(list=>list.map(input=>input.value)),["10","10","10"]);
    assert.match(await page.locator("#managerProfitSplitSummary").textContent(),/30.00%/);
    await shares.nth(0).fill("80");
    await shares.nth(1).fill("50");
    await page.locator('#managerBriefForm button[type="submit"]').click();
    assert.match(await page.locator("#managerBriefStatus").textContent(),/at most 100/);
    await shares.nth(0).fill("15");
    await shares.nth(1).fill("12");
    await page.locator("#managerBriefAim").fill("An improved creator-written mission statement for study groups.");
    await page.locator('#managerBriefForm button[type="submit"]').click();
    assert.match(await page.locator("#managerBriefStatus").textContent(),/Saved locally/);
    await page.locator("#managerPreviewListing").click();
    assert.match(await page.locator("#joinProjectAim").textContent(),/creator-written mission/);
    assert.match(await page.locator("#joinProjectProfit").textContent(),/15%/);
    assert.match(await page.locator("#joinProjectProfit").textContent(),/12%/);
    assert.equal(await page.locator("#projectJoinForm").isVisible(),false);
    await page.locator("#closeProjectJoinDialog").click();
    await goto("chat");
    assert.equal(await page.locator("#chatHubRooms .chat-hub-room").count(),2,
      "main Group Chat lists creator room and joined squad together");
    assert.match(await page.locator("#chatHubRooms").textContent(),/Science Fair Planner/);
    assert.match(await page.locator("#chatHubRooms").textContent(),/My Learning Tool/);
    assert.deepEqual(errors,[],"no browser script failures");
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+2,
      "no horizontal overflow");
    console.log("PASS chat hub and project proposals "+width+"px");
  }finally{await page.close();}
}
(async()=>{
 await ready();const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{for(const width of [320,390,1280])await testWidth(browser,width);}
 finally{await browser.close();}
})().then(()=>{server.kill();process.exit(0);}).catch(error=>{
 console.error(error.stack||error);server.kill();process.exit(1);
});
