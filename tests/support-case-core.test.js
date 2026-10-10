"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const Core=require("../lib/support-case-core");
const sample={subject:"Example training issue",requesterAlias:"SampleBuilder",
 description:"This is a completely fictional adult support issue for testing.",
 category:"technical",priority:"normal",syntheticAdultTest:true};
test("human support has a separate permission matrix",()=>{
 for(const role of ["ai","support_assistant","project_assistant","reviewer","safety","founder","builder"]){
  assert.equal(Core.isSupportRole(role),false);
  assert.equal(Core.canAssignSupport(role),false);
 }
 assert.equal(Core.isSupportRole("support"),true);
 assert.equal(Core.isSupportRole("manager"),true);
 assert.equal(Core.canAssignSupport("support"),false);
 assert.equal(Core.canAssignSupport("manager"),true);
});
test("support cases reject real accounts, secrets and direct identifiers",()=>{
 assert.equal(Core.validateNewCase(sample).priority,"normal");
 assert.throws(()=>Core.validateNewCase({...sample,syntheticAdultTest:false}),/synthetic/);
 assert.throws(()=>Core.validateNewCase({...sample,requesterAlias:"real@example.com"}),/Sensitive/);
 assert.throws(()=>Core.validateNewCase({...sample,description:"My password is 123456; do this for me."}),/Sensitive/);
 assert.throws(()=>Core.validateNewCase({...sample,description:"Use my BVN to create an account."}),/Sensitive/);
 assert.throws(()=>Core.validateNewCase({...sample,description:"Short"}),/synthetic/);
 assert.throws(()=>Core.validateNewCase({...sample,priority:"super"}),/category or priority/);
 assert.doesNotThrow(()=>Core.validateNewCase({...sample,description:"An adult test training guide explains workflow steps for fictional project management."}));
});
test("internal notes are not outbound and support agents cannot close cases",()=>{
 assert.equal(Core.validateNote({internalOnly:true,note:"Synthetic issue resolved internally."}).length>5,true);
 assert.throws(()=>Core.validateNote({note:"Try troubleshooting next."}),/internal-only/);
 assert.throws(()=>Core.validateNote({internalOnly:true,note:"Call 12345678900."}),/Sensitive/);
 assert.equal(Core.authorizeTransition({role:"support",from:"open",to:"in_progress"}),true);
 assert.equal(Core.authorizeTransition({role:"support",from:"in_progress",to:"resolved"}),true);
 assert.throws(()=>Core.authorizeTransition({role:"support",from:"resolved",to:"closed"}),/Only a manager/);
 assert.equal(Core.authorizeTransition({role:"manager",from:"resolved",to:"closed"}),true);
 for(const role of ["ai","reviewer","safety","founder"])assert.throws(()=>Core.authorizeTransition({role,from:"open",to:"in_progress"}),/not permitted/);
});
test("human support UI and fictional design remain separate and safe",()=>{
 const src=fs.readFileSync(path.join(__dirname,"../public/support-console.html"),"utf8");
 const preview=fs.readFileSync(path.join(__dirname,"../public/support-design-lab.html"),"utf8");
 const demo=fs.readFileSync(path.join(__dirname,"../public/support-lab.js"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../public/support-workspace.js"),"utf8");
 for(const id of ["supportLogin","supportWorkspace","supportCases","caseDetail","supportCaseForm","supportStats"]){
  assert.match(src,new RegExp('id="'+id+'"'));
 }
 assert.match(src,/id="supportLogin"[^>]* hidden/);
 assert.match(src,/id="supportWorkspace" hidden/);
 assert.match(preview,/DESIGN PREVIEW ONLY/);
 assert.doesNotMatch(preview,/type="password"|type="email"/);
 assert.doesNotMatch(demo,/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB/);
 assert.doesNotMatch(app,/localStorage|sessionStorage/);
 assert.match(app,/internalOnly:true/);
});
