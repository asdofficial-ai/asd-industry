"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const pub=path.join(__dirname,"../public");
const themes=["command-red","luxury-gold","global-blue","visionary-green","command-purple","industrial-orange","executive-white"];
test("Founder command has eight management destinations plus a theme studio and no signup form",()=>{
 const html=fs.readFileSync(path.join(pub,"founder.html"),"utf8");
 for(const section of ["overview","projects","ai","people","workspaces","analytics","security","themes","settings"])
  assert.match(html,new RegExp('id="screen-'+section+'"'));
 assert.match(html,/id="themeGallery"/);assert.match(html,/id="themeMiniGrid"/);
 assert.match(html,/id="founderStatus"/);
 assert.match(html,/src="\/founder.js"/);
 assert.doesNotMatch(html,/id="signupForm"/);
});
test("All seven founder design assets are committed and use distinct palettes",()=>{
 const css=fs.readFileSync(path.join(pub,"founder.css"),"utf8");
 const js=fs.readFileSync(path.join(pub,"founder.js"),"utf8");
 for(const id of themes){
  const svg=fs.readFileSync(path.join(pub,"founder-themes",id+".svg"),"utf8");
  assert.match(svg,/^<svg/);assert.match(svg,/<\/svg>$/);
  assert.match(svg,/FOUNDER COMMAND CENTER/);
  assert.match(css,new RegExp('data-founder-theme="'+id+'"'));
  assert.ok(js.includes('/founder-themes/'+id+'.svg'));
 }
 assert.match(js,/localStorage\.setItem\(storageKey/);
 assert.match(js,/document\.body\.dataset\.founderTheme=theme\.id/);
 assert.match(js,/buildThemeGallery\(\);buildMiniThemes\(\)/);
});
test("Unverified founder account cannot load records; browser theme is not authentication",()=>{
 const js=fs.readFileSync(path.join(pub,"founder.js"),"utf8");
 assert.match(js,/profile\?\.staff\?\.role!=="founder"/);
 assert.match(js,/\/api\/staff\/founder\/overview/);
 assert.match(js,/isAuthenticatedFounder=false/);
 assert.doesNotMatch(js,/localStorage\.getItem\(.*role/);
 const api=fs.readFileSync(path.join(__dirname,"../lib/human-staff-api.js"),"utf8");
 assert.match(api,/req\.staff\.role!=="founder"/);
 assert.match(api,/r\.use\(currentStaff\)/);
 assert.match(api,/r\.get\("\/founder\/overview"/);
});
test("The independent founder page is not the normal public member page",()=>{
 const html=fs.readFileSync(path.join(pub,"founder.html"),"utf8");
 const main=fs.readFileSync(path.join(pub,"home.html"),"utf8");
 assert.notEqual(html,main);
 assert.match(html,/FOUNDER OPERATIONS/);
 assert.doesNotMatch(main,/founder-themes/);
});

test("Founder review and staff management controls require a verified session",()=>{
 const html=fs.readFileSync(path.join(pub,"founder.html"),"utf8");
 const js=fs.readFileSync(path.join(pub,"founder.js"),"utf8");
 const api=fs.readFileSync(path.join(__dirname,"../lib/human-staff-api.js"),"utf8");
 for(const id of ["founderReviewPanel","founderDecisionForm","founderDecisionReason","founderDecision",
     "reviewProjectName","reviewPacket","prepareFounderPacket","submitFounderDecision"]){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(js,/function closeReview/);
 assert.match(js,/async function openReview/);
 assert.match(js,/async function decideReview/);
 assert.match(js,/function setTheme\(id,\{skipSync=false\}=\{\}\)/);
 assert.match(js,/isAuthenticatedFounder/);
 for(const route of ['/founder/preferences','/founder/agents/:id','/founder/staff/:id']){
  assert.ok(api.includes(route));
 }
 assert.match(api,/req\.staff\.role!=="founder"/);
 assert.match(api,/r\.use\(currentStaff\)/);
 assert.match(api,/founder\.staff\.access/);
 assert.match(api,/founder\.agent\.policy/);
});
test("Account preferences and AI controls are persisted separately from user profile data",()=>{
 const migration=fs.readFileSync(path.join(__dirname,"../db/migrations/002_founder_operations.sql"),"utf8");
 const migrator=fs.readFileSync(path.join(__dirname,"../scripts/staff-migrate.js"),"utf8");
 assert.match(migration,/industry_founder_preferences/);
 assert.match(migration,/industry_ai_agent_controls/);
 assert.match(migrator,/002_founder_operations\.sql/);
});

test("Founder has a distinct sign-in route and no public self-provisioning",()=>{
 const html=fs.readFileSync(path.join(pub,"founder-login.html"),"utf8");
 const app=fs.readFileSync(path.join(pub,"founder-login.js"),"utf8");
 const founder=fs.readFileSync(path.join(pub,"founder.html"),"utf8");
 assert.match(html,/PRIVATE FOUNDER ACCESS/);
 assert.match(html,/id="founderLoginForm"/);
 assert.match(html,/id="founderLoginEmail"/);
 assert.match(html,/id="founderLoginPassword"/);
 assert.match(app,/\.staff\?\.role!=="founder"/);
 assert.match(app,/location\.assign\("\/founder\.html"\)/);
 assert.match(app,/if\(!current\.enabled\)/);
 assert.match(founder,/href="\/founder-login\.html"/);
 assert.doesNotMatch(html,/type="text" name="founderRole"/);
});

test("Founder sign-in requires a six-digit authenticator code in addition to password",()=>{
 const html=fs.readFileSync(path.join(pub,"founder-login.html"),"utf8");
 const js=fs.readFileSync(path.join(pub,"founder-login.js"),"utf8");
 const api=fs.readFileSync(path.join(__dirname,"../lib/human-staff-api.js"),"utf8");
 assert.match(html,/id="founderLoginTotp"/);
 assert.match(html,/autocomplete="one-time-code"/);
 assert.match(js,/totp:document\.getElementById\("founderLoginTotp"\)/);
 assert.match(api,/record\.rows\[0\]\.role==="founder"/);
 assert.match(api,/industry_staff_mfa/);
 assert.match(api,/last_accepted_counter<\$2/);
});
