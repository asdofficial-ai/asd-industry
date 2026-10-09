"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("public/index.html","utf8");
const script=fs.readFileSync("public/app.js","utf8");
const picker=fs.readFileSync("public/country-picker.js","utf8");
const css=fs.readFileSync("public/access.css","utf8");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);

test("HTML IDs are unique and every direct app.js DOM lookup has an element",()=>{
  assert.equal(new Set(ids).size,ids.length,"duplicate DOM id");
  const refs=[...script.matchAll(/byId\("([^"]+)"\)/g)].map(match=>match[1]);
  for(const id of refs) assert.ok(ids.includes(id),"missing HTML id: "+id);
});

test("builder profile has editable identity, avatars, skills, and completed projects",()=>{
  for(const id of ["profileForm","profilePreviewAvatar","profileDisplayName",
    "handle","profileBioInput","profileBioCount","avatarChooseButton","avatarUpload",
    "avatarRemove","skillsChoices","skillsStatus","profileProjectHistory",
    "profilePreviewSkills","profilePreviewInterests","profileStatsCompleted",
    "emailVerificationBadge","country","completeDemoProject","workspaceProjectBadge"]) {
    assert.ok(ids.includes(id),"missing builder profile element "+id);
  }
  assert.match(html,/name="skills"/);
  assert.match(html,/UNVERIFIED/);
  assert.match(html,/SELF-MARKED/);
});

test("demo profile save preserves optional data and doesn't redirect to ideas",()=>{
  const handler=script.slice(script.indexOf('profileForm.addEventListener("submit"'),
    script.indexOf('const ideaForm = byId("ideaForm")'));
  assert.match(handler,/\.\.\.state\.profile/,"save should preserve project history and avatar");
  assert.match(handler,/renderBuilderProfile\(\)/,"save updates profile preview");
  assert.doesNotMatch(handler,/go\("ideas"\)/,"saving profile must stay on profile");
  assert.match(script,/state\.profile\.completedProjects\.unshift/);
  assert.match(script,/state\.project\.completed=true/);
});

test("profile overview is separate from the editor and saves return to overview",()=>{
  const profileStart=html.indexOf('id="view-profile"');
  const editStart=html.indexOf('id="view-profile-edit"');
  const formStart=html.indexOf('id="profileForm"');
  const ideasStart=html.indexOf('id="view-ideas"');
  assert.ok(profileStart>=0 && editStart>profileStart && formStart>editStart && formStart<ideasStart);
  assert.ok(!html.slice(profileStart,editStart).includes('id="profileForm"'));
  assert.match(script,/go\("profile-edit"\)/);
  assert.match(script,/go\("profile"\)/);
  assert.match(script,/byId\("profileLogout"\)\.addEventListener/);
});
test("password and login controls exist but cannot accept real credentials",()=>{
  for(const id of ["signupTab","loginTab","signupPanel","loginPanel",
    "signupPasswordPreview","loginEmailPreview","loginPasswordPreview","profileLogout"]){
    assert.ok(ids.includes(id),"missing auth shell element "+id);
  }
  for(const id of ["signupPasswordPreview","loginPasswordPreview"]){
    assert.match(html,new RegExp('id="'+id+'"[^>]*disabled'));
  }
  assert.match(html,/Log in · Coming soon/);
  assert.match(script,/setAccessMode\("login"\)/);
  assert.doesNotMatch(html,/id="avatarChoices"/);
  assert.doesNotMatch(html,/class="avatar-choice"/);
  assert.match(html,/id="avatarUpload"/);
});
test("country picker accepts 249 country/territory entries and alphabetical selection",()=>{
  const sandbox={document:{querySelectorAll:()=>[]},window:{}};
  vm.runInNewContext(picker,sandbox,{timeout:1000});
  const api=sandbox.window.ASDCountryPicker;
  assert.equal(api.countryCount,249);
  assert.equal(api.canonicalize("Nigeria"),"Nigeria");
  assert.equal(api.canonicalize("nigeria"),"Nigeria");
  assert.equal(api.canonicalize("usa"),"United States");
  assert.equal(api.canonicalize("Unknownland"),"");
  assert.ok(html.includes('id="signupCountryList"'));
  assert.ok(html.includes('id="countryList"'));
});

test("images are resized locally; no real account, chat or upload API in demo JS",()=>{
  assert.match(script,/file\.size>3\*1024\*1024/);
  assert.match(script,/canvas\.width=160;canvas\.height=160/);
  assert.match(script,/sessionStorage/);
  assert.doesNotMatch(script,/\bfetch\s*\(/);
  assert.doesNotMatch(script,/\bXMLHttpRequest\b|\bWebSocket\b/);
  assert.match(html,/PRIVATE PREVIEW/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
