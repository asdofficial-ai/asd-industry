"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const pub=path.join(__dirname,"..","public");
const read=filename=>fs.readFileSync(path.join(pub,filename),"utf8");
test("private Founder dashboard mounts only through separately authorized staff session",()=>{
 const h=read("founder-console.html");
 assert.match(h,/data-console="founder"/);
 assert.match(h,/id="privateArea" hidden/);
 assert.match(h,/id="loginBox" hidden/);
 assert.match(h,/id="serviceStatus"/);
 assert.match(h,/id="loginForm"/);
 assert.match(h,/id="privateStats"/);
 assert.match(h,/id="policyText"/);
 for(const file of ["founder-design.css","founder-private.css","founder-private.js","identity-console.js"]){
  assert.ok(fs.existsSync(path.join(pub,file)),"Missing script/style: "+file);
  assert.match(h,new RegExp(file.replaceAll(".","\\.")));
 }
 const runtime=read("identity-console.js");
 assert.match(runtime,/me\.staff\.role!=="founder"/);
 assert.match(runtime,/\/founder\/overview/);
 assert.match(runtime,/if\(!status\.enabled\)/);
});
test("seven Founder styles are interactive on both the protected and fictional previews",()=>{
 const real=read("founder-console.html"),demo=read("founder-design-lab.html");
 const js=read("founder-private.js");
 for(const theme of ["obsidian","crimson","titanium","solar","monarch","spectre","ivory"]){
  assert.match(real,new RegExp('data-private-theme="'+theme+'"'));
  assert.match(demo,new RegExp('data-theme-choice="'+theme+'"'));
  assert.match(js,new RegExp('"'+theme+'"'));
 }
 for(const tab of ["overview","management","security","alternate"]){
  assert.match(real,new RegExp('id="private-'+tab+'"'));
  assert.match(js,new RegExp('"'+tab+'"'));
 }
});
test("executive assistant is labeled offline, does not fabricate manager updates or use network/secret storage",()=>{
 const h=read("founder-console.html"),js=read("founder-private.js");
 assert.match(h,/SCRIPTED DEMONSTRATION/);
 assert.match(h,/manager reports or private data are sent to a model/);
 assert.match(js,/cannot read managers' messages/);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB/i);
});
test("public customer identity directory does not link to Founder login",()=>{
 const hub=read("identity-hub.html");
 assert.doesNotMatch(hub,/href="\/founder-console\.html"/);
 const staff=read("staff-console.html"),staffScript=read("staff-console.js");
 assert.match(staff,/id="founderNav" hidden/);
 assert.match(staffScript,/user\.role!=="founder"/);
});
