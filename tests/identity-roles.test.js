"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Identity=require("../lib/identity-roles");
const founder=require("../lib/founder-emergency");
const Auth=require("../lib/staff-auth-core");
test("AI agents never receive human roles, employee badges or approval authority",()=>{
 for(const role of Identity.AI_ROLES){
  assert.equal(Identity.humanRole(role),false);
  assert.equal(Identity.canReadQueue(role),false);
  assert.equal(Auth.canReview(role),false);
  assert.equal(Auth.canPrepare(role),false);
  assert.equal(Identity.publicBadge({role,staffActive:true,verifiedAt:new Date(),directoryOptIn:true}),null);
  assert.equal(Identity.aiBadge(role)?.type,"ai_assistant");
 }
});
test("human roles are isolated by least-privilege",()=>{
 assert.equal(Identity.canHandleRecovery("support"),true);
 assert.equal(Identity.canReadQueue("support"),false);
 assert.equal(Identity.canMakeDecision("support"),false);
 assert.equal(Identity.canReadQueue("manager"),true);
 assert.equal(Identity.canMakeDecision("manager"),false);
 assert.equal(Identity.canMakeDecision("founder"),true);
 assert.equal(Identity.canMakeDecision("reviewer"),true);
 assert.equal(Auth.canPrepare("support"),false);
 for(const r of Identity.HUMAN_ROLES)assert.ok(Auth.ROLES.includes(r));
});
test("employee badge requires enabled, verified, opted-in human account",()=>{
 const role="support";
 assert.equal(Identity.publicBadge({role}),null);
 assert.equal(Identity.publicBadge({role,staffActive:true,verifiedAt:new Date(),directoryOptIn:false}),null);
 assert.equal(Identity.publicBadge({role,staffActive:false,verifiedAt:new Date(),directoryOptIn:true}),null);
 const badge=Identity.publicBadge({role,staffActive:true,verifiedAt:new Date(),directoryOptIn:true});
 assert.equal(badge.type,"verified_human_staff");
 assert.match(badge.label,/Human Support/);
});
test("founder emergency profile is strictly minimal, AES-GCM encrypted and founder-bound",()=>{
 const id="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
 const key="a".repeat(64);
 const profile={preferredName:"Example Founder",backupEmail:"private@example.invalid",contactMethod:"in-app",timeZone:"Africa/Lagos"};
 const cipher=founder.encrypt(id,profile,key);
 assert.doesNotMatch(cipher,/Example Founder|private@example/);
 assert.deepEqual(founder.decrypt(id,cipher,key),profile);
 assert.throws(()=>founder.decrypt(other,cipher,key));
 assert.throws(()=>founder.decrypt(id,cipher,"b".repeat(64)));
 assert.throws(()=>founder.encrypt(id,{password:"nope"},key));
 assert.throws(()=>founder.encrypt(id,{escalationInstructions:"My recovery code is 12345"},key));
 assert.throws(()=>founder.encrypt(id,{emergencyPhone:"not a phone"},key));
 assert.throws(()=>founder.encrypt(id,profile,"short"));
});
test("private founder, support and badge interfaces never collect public signup passwords",()=>{
 const fs=require("node:fs"),path=require("node:path");
 for(const file of ["founder-console.html","support-console.html","verified-team.html"]){
  const html=fs.readFileSync(path.join(__dirname,"../public",file),"utf8");
  assert.match(html,/ASD INDUSTRY/i);
  assert.doesNotMatch(html,/localStorage|sessionStorage/i);
 }
 const source=fs.readFileSync(path.join(__dirname,"../public/identity-console.js"),"utf8");
 assert.doesNotMatch(source,/localStorage|sessionStorage/);
});
