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
