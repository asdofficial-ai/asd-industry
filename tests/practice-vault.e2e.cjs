"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const {setTimeout:delay}=require("node:timers/promises");
const PORT=3917,origin="http://127.0.0.1:"+PORT;
const server=spawn(process.execPath,["server.js"],{env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
async function ready(){
 for(let i=0;i<80;i++){try{if((await fetch(origin+"/health")).ok)return;}catch(_){ }await delay(175);}
 throw Error("ASD demo not ready");
}
async function adult(browser){
 const page=await browser.newPage({viewport:{width:390,height:840}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
 const go=async view=>page.evaluate(view=>document.querySelector('[data-nav="'+view+'"]').click(),view);
 const createProject=async(name)=>{
  await page.locator("#ideaTitleInput").fill(name);
  await page.locator("#ideaDescription").fill("A fictional learning app that teaches basic design and practical study skills for adult teams.");
  await page.locator("#ideaTopic").selectOption("Education");
  await page.locator("#neededRole").selectOption("Developer");
  await page.locator("#ideaRole").selectOption("Project leader");
  await page.locator('input[name="ideaInterests"][value="Education"]').check();
  await page.locator("#ideaAvailability").selectOption("flexible");
  await page.locator('#ideaForm button[type="submit"]').click();
  await page.locator("#managerContent").waitFor({state:"visible"});
  assert.match(await page.locator("#managerProjectName").textContent(),new RegExp(name));
 };
 try{
  await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
  assert.match(await page.locator("#registrationFeePreview").textContent(),/₦2,000/);
  assert.match(await page.locator("#registrationFeePreview").textContent(),/NOT ACCEPTING PAYMENTS/);
  assert.equal(await page.locator("#practicePasswordFields").isVisible(),false);
  await page.locator("#signupNickname").fill("OrbitBuilder");
  await page.locator("#signupAge").selectOption("18+");
  assert.ok(await page.locator("#practicePasswordFields").isVisible());
  await page.locator("#signupEmail").fill("practice@example.com");
  await page.locator("#signupCountry").fill("Nigeria");
  await page.locator("#signupPasswordPreview").fill("OrbitBuilderPassword123");
  assert.match(await page.locator("#passwordStrength").textContent(),/nickname|email|predictable/i);
  await page.locator("#signupPasswordPreview").fill("Cedar River Granite 829!");
  await page.locator("#signupPasswordConfirm").fill("Cedar River Granite 829!");
  await page.locator("#signupAcknowledge").check();
  await page.locator('#signupForm button[type="submit"]').click();
  await page.locator("#view-home").waitFor({state:"visible"});
  await go("manager");
  assert.ok(await page.locator("#managerEmpty").isVisible());
  await page.locator("#managerEmptyCreate").click();
  await createProject("Sample Alpha");
  assert.match(await page.locator("#managerSavedProjects").textContent(),/Sample Alpha/);
  await go("chat");
  assert.ok(await page.locator("#chatContent").isVisible());
  await page.locator("#chatMessage").fill("Sample Alpha team notes saved privately.");
  await page.locator('#chatForm button[type="submit"]').click();
  assert.match(await page.locator("#chatMessages").textContent(),/Sample Alpha team notes/);
  await go("workspace");
  await page.locator("#completeDemoProject").click();
  await go("manager");
  assert.match(await page.locator("#managerSavedProjects").textContent(),/Completed/);
  let saved=await page.evaluate(()=>localStorage.getItem("asd-industry-local-practice-vault-v1"));
  assert.ok(saved&&saved.includes("payload"));
  assert.doesNotMatch(saved,/Cedar River Granite|Sample Alpha|notes saved privately|practice@example.com/);
  await page.locator("#profileLogout").evaluate(el=>el.click());
  await page.locator("#loginPanel").waitFor({state:"visible"});
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#loginTab").click();
  await page.locator("#loginEmailPreview").fill("practice@example.com");
  await page.locator("#loginPasswordPreview").fill("Wrong Demo Passphrase 987");
  await page.locator("#practiceLoginSubmit").click();
  await page.waitForFunction(()=>document.getElementById("loginStatus").textContent.length>0);
  assert.match(await page.locator("#loginStatus").textContent(),/incorrect/i);
  await page.locator("#loginPasswordPreview").fill("Cedar River Granite 829!");
  await page.locator("#practiceLoginSubmit").click();
  await page.locator("#view-home").waitFor({state:"visible"});
  await go("manager");
  assert.match(await page.locator("#managerSavedProjects").textContent(),/Sample Alpha/);
  await go("chat");
  assert.match(await page.locator("#chatMessages").textContent(),/Sample Alpha team notes/);
  await go("manager");
  await page.locator("#managerCreateNewProject").click();
  await createProject("Sample Beta");
  const cards=page.locator("#managerSavedProjects .manager-saved-card");
  assert.equal(await cards.count(),2);
  await cards.filter({hasText:"Sample Alpha"}).locator("button").click();
  await go("chat");
  assert.match(await page.locator("#chatMessages").textContent(),/Sample Alpha team notes/);
  assert.doesNotMatch(await page.locator("#chatMessages").textContent(),/Sample Beta team notes/);
  await go("profile");
  assert.ok(await page.locator("#practiceSecurityPanel").isVisible());
  await page.locator("#practiceSecurityPanel summary").click();
  await page.locator("#currentPracticePassword").fill("Cedar River Granite 829!");
  await page.locator("#newPracticePassword").fill("Moonlight Orchard Quartz 764!");
  await page.locator("#confirmNewPracticePassword").fill("Moonlight Orchard Quartz 764!");
  await page.locator("#savePracticePassword").click();
  await page.waitForFunction(()=>document.getElementById("changePasswordStatus").textContent.length>0);
  assert.match(await page.locator("#changePasswordStatus").textContent(),/changed successfully/i);
  await page.locator("#profileLogout").click();
  await page.locator("#loginPanel").waitFor({state:"visible"});
  await page.locator("#loginEmailPreview").fill("practice@example.com");
  await page.locator("#loginPasswordPreview").fill("Cedar River Granite 829!");
  await page.locator("#practiceLoginSubmit").click();
  await page.waitForFunction(()=>document.getElementById("loginStatus").textContent.length>0);
  assert.match(await page.locator("#loginStatus").textContent(),/incorrect/i);
  await page.locator("#loginPasswordPreview").fill("Moonlight Orchard Quartz 764!");
  await page.locator("#practiceLoginSubmit").click();
  await page.locator("#view-home").waitFor({state:"visible"});
  await go("manager");
  assert.equal(await page.locator("#managerSavedProjects .manager-saved-card").count(),2);
  const box=await page.evaluate(()=>localStorage.getItem("asd-industry-local-practice-vault-v1"));
  assert.doesNotMatch(box,/Moonlight Orchard Quartz|Sample Alpha|Sample Beta/);
  assert.deepEqual(errors,[]);
  console.log("PASS encrypted local practice signup, login, password change, saved chat + two projects");
 }finally{await page.close();}
}
async function guest(browser){
 const page=await browser.newPage({viewport:{width:360,height:820}});
 try{
  await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
  await page.locator("#signupNickname").fill("GuestExample");
  await page.locator("#signupAge").selectOption("15-17");
  assert.equal(await page.locator("#practicePasswordFields").isVisible(),false);
  await page.locator("#signupEmail").fill("guest@example.com");
  await page.locator("#signupCountry").fill("Nigeria");
  await page.locator("#signupAcknowledge").check();
  await page.locator('#signupForm button[type="submit"]').click();
  await page.locator("#view-home").waitFor({state:"visible"});
  const vault=await page.evaluate(()=>localStorage.getItem("asd-industry-local-practice-vault-v1"));
  assert.equal(vault,null,"minor guest demo never persists locally beyond tab");
  await page.locator("#profileLogout").evaluate(el=>el.click());
  await page.locator("#loginPanel").waitFor({state:"visible"});
  console.log("PASS guest demo is temporary, no payment or adult vault");
 }finally{await page.close();}
}
(async()=>{
 await ready();const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{await adult(browser);await guest(browser);}finally{await browser.close();}
})().then(()=>{server.kill();process.exit(0);}).catch(e=>{console.error(e.stack||e);server.kill();process.exit(1);});
