"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const {setTimeout:delay}=require("node:timers/promises");
const PORT=3898,origin="http://127.0.0.1:"+PORT;
const server=spawn(process.execPath,["server.js"],{env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
async function ready(){
  for(let i=0;i<80;i++){try{if((await fetch(origin+"/health")).ok)return;}catch(_){}await delay(175);}
  throw Error("server not ready");
}
async function widthTest(browser,width){
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  page.on("dialog",dialog=>dialog.accept());
  const goto=async view=>{
    await page.evaluate(view=>document.querySelector('[data-nav="'+view+'"]').click(),view);
  };
  try{
    await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>sessionStorage.setItem("asd-industry-v03-demo-session",JSON.stringify({
      entryCompleted:true,profile:{id:"ASD-DEMO-0001",nickname:"DemoCreator",ageGroup:"18+",
        email:"builder@example.com",country:"Nigeria",role:"",availability:"",interests:[]},
      idea:null,project:null
    })));
    await page.reload({waitUntil:"domcontentloaded"});
    await goto("manager");
    assert.ok(await page.locator("#managerEmpty").isVisible(),"dashboard empty before project");
    await goto("ideas");
    await page.locator("#ideaTitleInput").fill("Mentor Study Hub");
    await page.locator("#ideaDescription").fill("An educational app to help learners plan their study hours and practice questions.");
    await page.locator("#ideaTopic").selectOption("Education");
    await page.locator("#neededRole").selectOption("Developer");
    await page.locator("#ideaRole").selectOption("Project leader");
    await page.locator('input[name="ideaInterests"][value="Education"]').check();
    await page.locator("#ideaAvailability").selectOption("flexible");
    await page.locator('#ideaForm button[type="submit"]').click();
    await page.locator(".match-action").click();
    assert.ok(await page.locator("#workspaceContent").isVisible());
    assert.equal(await page.locator("#workspaceMembers .member").count(),1,"only project creator initially");
    await goto("manager");
    assert.ok(await page.locator("#managerContent").isVisible(),"dashboard opened");
    assert.equal(await page.locator(".manager-applicant").count(),3,"three fictional applications seeded");
    assert.equal(await page.locator("#managerCountPending").textContent(),"3");
    assert.equal(await page.locator("#managerCountMembers").textContent(),"1 / 4");
    assert.equal(await page.locator("#managerCountOpen").textContent(),"3");
    assert.match(await page.locator("#managerProjectStage").textContent(),/RECRUITING/);
    let candidate=page.locator(".manager-applicant").first();
    await candidate.locator(".manager-reject").click();
    assert.equal(await page.locator("#managerCountPending").textContent(),"2");
    assert.equal(await candidate.locator(".manager-application-badge").textContent(),"REJECTED");
    await candidate.locator(".manager-restore").click();
    assert.equal(await page.locator("#managerCountPending").textContent(),"3");
    // Approve each pending fictional builder for a distinct available role.
    for(let k=0;k<3;k++){
      const pending=page.locator(".manager-applicant:has(.manager-application-badge.pending)").first();
      const select=pending.locator(".manager-role-select");
      const openOptions=await select.locator('option:not([disabled])').evaluateAll(options=>
        options.filter(option=>option.value).map(option=>option.value));
      assert.ok(openOptions.length>0,"there is a vacant role");
      await select.selectOption(openOptions[0]);
      await pending.locator(".manager-approve").click();
      assert.equal(await page.locator("#managerCountMembers").textContent(),(k+2)+" / 4");
    }
    assert.equal(await page.locator("#managerCountPending").textContent(),"0");
    assert.equal(await page.locator("#managerCountOpen").textContent(),"0");
    assert.match(await page.locator("#managerProjectStage").textContent(),/TEAM FULL.*STARTED/);
    assert.equal(await page.locator("#managerRoster .manager-member").count(),4);
    const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("asd-industry-v03-demo-session")));
    assert.ok(saved.project.manager.startedAt,"full squad records a demo start");
    assert.equal(saved.project.members.filter(m=>m.demo).length,3);
    assert.equal(await page.locator("#managerRoster .manager-owner .manager-remove").count(),0,"cannot remove owner");
    // The creator can reopen recruitment by removing a sample member.
    let rosterMember=page.locator("#managerRoster .manager-member:not(.manager-owner)").first();
    await rosterMember.locator(".manager-remove").click();
    assert.equal(await page.locator("#managerCountMembers").textContent(),"3 / 4");
    assert.equal(await page.locator("#managerCountOpen").textContent(),"1");
    assert.equal(await page.locator("#managerCountPending").textContent(),"1","removed member becomes sample applicant again");
    assert.match(await page.locator("#managerProjectStage").textContent(),/RECRUITING/);
    const pending=page.locator(".manager-applicant:has(.manager-application-badge.pending)").first();
    const available=await pending.locator(".manager-role-select").locator('option:not([disabled])')
      .evaluateAll(options=>options.filter(option=>option.value).map(option=>option.value));
    await pending.locator(".manager-role-select").selectOption(available[0]);
    await pending.locator(".manager-approve").click();
    assert.equal(await page.locator("#managerCountOpen").textContent(),"0");
    assert.match(await page.locator("#managerProjectStage").textContent(),/STARTED/);
    await page.reload({waitUntil:"domcontentloaded"});
    await goto("manager");
    assert.equal(await page.locator("#managerCountMembers").textContent(),"4 / 4","manager roster persisted");
    assert.match(await page.locator("#managerHistory").textContent(),/Approved/);
    await goto("workspace");
    assert.equal(await page.locator("#workspaceMembers .member").count(),4,"workspace reflects approved squad");
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+2,"no horizontal page overflow");
    assert.deepEqual(errors,[],"no JS runtime errors");
    console.log("PASS manager dashboard "+width+"px");
  }finally{await page.close();}
}
(async()=>{
  await ready();
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{for(const width of [320,390,768,1280])await widthTest(browser,width);}
  finally{await browser.close();}
})().then(()=>{server.kill();process.exit(0);}).catch(e=>{
  console.error(e.stack||e);server.kill();process.exit(1);
});
