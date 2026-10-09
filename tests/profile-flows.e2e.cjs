"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const {setTimeout: sleep}=require("node:timers/promises");
const PORT=3891;
const base="http://127.0.0.1:"+PORT;
const server=spawn(process.execPath,["server.js"],{env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
async function waitForServer(){
  for(let i=0;i<75;i++){try{if((await fetch(base+"/health")).ok)return;}catch(_){}await sleep(180);}
  throw Error("Server did not start");
}
async function testProfile(width,browser){
  const page=await browser.newPage({viewport:{width,height:820},deviceScaleFactor:1});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("dialog",dialog=>dialog.accept());
  try{
    await page.goto(base+"/",{waitUntil:"domcontentloaded"});
    assert.ok(await page.locator("#signupPanel").isVisible());
    await page.locator("#loginTab").click();
    assert.ok(await page.locator("#loginPanel").isVisible());
    assert.equal(await page.locator("#loginPasswordPreview").isDisabled(),true);
    assert.equal(await page.locator("#loginPanel .gate-submit").isDisabled(),true);
    await page.locator("#loginToSignup").click();
    assert.ok(await page.locator("#signupPanel").isVisible());
    assert.equal(await page.locator("#signupPasswordPreview").isDisabled(),true);

    await page.locator("#signupNickname").fill("Sample");
    await page.locator("#signupAge").selectOption("18+");
    await page.locator("#signupEmail").fill("sample@example.com");
    await page.locator("#signupCountry").fill("Nigeria");
    await page.locator("#signupAcknowledge").check();
    await page.locator("#signupForm button[type=submit]").click();
    assert.ok(await page.locator("#view-home").isVisible(),"signup should still enter demo");
    await page.evaluate(()=>document.querySelector('button[data-nav="profile"]').click());
    assert.ok(await page.locator("#view-profile").isVisible());
    assert.equal(await page.locator("#profileForm").isVisible(),false,"editor must not share the profile view");
    assert.equal(await page.locator("#profileDisplayName").innerText(),"Sample");
    await page.locator("#editProfileJump").click();
    assert.ok(await page.locator("#view-profile-edit").isVisible());
    assert.equal(await page.locator("#view-profile").isVisible(),false);
    await page.locator("#handle").fill("sample.dev");
    await page.locator("#profileBioInput").fill("Building better project ideas.");
    await page.locator('input[name="skills"][value="Coding"]').check();
    const transparentPng=Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nm7QAAAAASUVORK5CYII=","base64");
    await page.locator("#avatarUpload").setInputFiles({name:"me.png",mimeType:"image/png",buffer:transparentPng});
    await page.waitForFunction(()=>/Picture added|could not be processed|Could not read/.test(document.querySelector("#avatarStatus").textContent),{timeout:5000});
    assert.match(await page.locator("#avatarStatus").textContent(),/Picture added/);
    assert.ok(await page.locator("#editAvatarImage").isVisible());
    await page.locator("#profileForm button[type=submit]").click();
    assert.ok(await page.locator("#view-profile").isVisible(),"Save returns to profile overview");
    assert.equal(await page.locator("#profileDisplayHandle").textContent(),"@sample.dev");
    assert.match(await page.locator("#profileDisplayBio").textContent(),/better project ideas/);
    assert.equal(await page.locator("#profileStatsSkills").textContent(),"1");
    assert.ok(await page.locator("#profilePreviewImage").isVisible());
    await page.locator("#editProfileJump").click();
    await page.locator("#cancelProfileEdit").click();
    assert.ok(await page.locator("#view-profile").isVisible(),"Cancel returns to profile");
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+2,"horizontal overflow");
    await page.locator("#profileLogout").click();
    assert.ok(await page.locator("#loginPanel").isVisible(),"Logout should lead to login preview");
    assert.equal(await page.locator("#siteShell").isVisible(),false);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem("asd-industry-v03-demo-session")),null);
    assert.deepEqual(errors,[]);
    console.log("PASS profile flow "+width+"px");
  }finally{await page.close();}
}
(async()=>{
  await waitForServer();const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{await testProfile(390,browser);await testProfile(768,browser);}
  finally{await browser.close();}
})().then(()=>{server.kill();process.exit(0);}).catch(error=>{
  console.error(error.stack || error);server.kill();process.exit(1);
});
