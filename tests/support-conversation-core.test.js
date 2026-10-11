"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const Messages=require("../lib/support-conversation-core");
const id="11111111-1111-4111-8111-111111111111";
const valid={speaker:"agent_simulated",body:"This is an illustrative support training reply, not a real message.",requestId:id,syntheticAdultTest:true};
test("simulated conversations require staff identity and explicit synthetic label",()=>{
 assert.equal(Messages.validateTrainingMessage(valid,"support").speaker,"agent_simulated");
 assert.equal(Messages.validateTrainingMessage({...valid,speaker:"customer_simulated"},"manager").speaker,"customer_simulated");
 for(const role of ["reviewer","safety","founder","support_assistant","project_assistant","customer"]){
  assert.throws(()=>Messages.validateTrainingMessage(valid,role),/permissions/);
 }
 assert.throws(()=>Messages.validateTrainingMessage({...valid,speaker:"customer_simulated"},"support"),/Only managers/);
 assert.throws(()=>Messages.validateTrainingMessage({...valid,syntheticAdultTest:false},"support"),/Confirm/);
 assert.throws(()=>Messages.validateTrainingMessage({...valid,speaker:"customer"},"manager"),/Only simulated/);
});
test("no identity, routing, delivery, secret or duplicate-ID override fields",()=>{
 for(const key of ["customerId","delivery","send","email","phone","staffId","verified","role","recipient","realCustomerMessagingEnabled"]){
  assert.throws(()=>Messages.validateTrainingMessage({...valid,[key]:true},"manager"),/Unknown/);
 }
 assert.throws(()=>Messages.validateTrainingMessage({...valid,requestId:"123"},"support"),/idempotency/);
 assert.throws(()=>Messages.validateTrainingMessage({...valid,body:"My password is 123456789"},"support"),/Sensitive/);
 assert.throws(()=>Messages.validateTrainingMessage({...valid,body:"Contact real@example.org about this ticket"},"support"),/Sensitive/);
 assert.throws(()=>Messages.validateTrainingMessage({...valid,body:"short"},"support"),/at least 12/);
});
test("training staff preview is not a networked customer inbox",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../public/support-conversation-lab.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../public/support-conversation-lab.html"),"utf8");
 assert.match(html,/FICTIONAL|SIMULATED/i);
 assert.match(html,/No real customer messages/i);
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB/);
 assert.doesNotMatch(html,/type="password"|type="email"/);
});
