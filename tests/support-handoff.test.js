"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const Policy=require("../lib/support-handoff-core");
const read=n=>fs.readFileSync(path.join(__dirname,"../public",n),"utf8");
test("AI may offer human contact only after trusted unresolved or restricted request",()=>{
 const resolved=Policy.decisionFromVerifiedAI({origin:"trusted_ai_service",verifiedServerSide:true,status:"answered"});
 assert.equal(resolved.offerHuman,false);
 assert.equal(resolved.customerLink,null);
 for(const reason of Object.values(Policy.REASONS)){
  const outcome=Policy.decisionFromVerifiedAI({origin:"trusted_ai_service",verifiedServerSide:true,status:"needs_human",reason});
  assert.equal(outcome.offerHuman,true);
  assert.equal(outcome.requiresVerifiedCustomerSession,true);
  assert.equal(outcome.requiresOneUseGrant,true);
 }
 for(const body of [
  {origin:"browser",verifiedServerSide:true,status:"needs_human",reason:"cannot_answer"},
  {origin:"trusted_ai_service",verifiedServerSide:false,status:"needs_human",reason:"cannot_answer"},
  {origin:"trusted_ai_service",verifiedServerSide:true,status:"needs_human",reason:"client_selected"},
  {origin:"trusted_ai_service",verifiedServerSide:true,status:"make_staff",reason:"cannot_answer"}
 ])assert.throws(()=>Policy.decisionFromVerifiedAI(body));
});
test("customer handoff requires same server-verified session and valid unused grant",()=>{
 const grant={serverVerified:true,consumed:false,customerId:"synthetic-001",caseId:"fictional-case",
    reason:"cannot_answer",aiAssessmentVerified:true,expiresAt:120000};
 assert.equal(Policy.validateRedemption(grant,{customerId:"synthetic-001",caseId:"fictional-case",now:100000}),true);
 assert.equal(Policy.validateRedemption({...grant,consumed:true},{customerId:"synthetic-001",caseId:"fictional-case",now:100000}),false);
 assert.equal(Policy.validateRedemption({...grant,serverVerified:false},{customerId:"synthetic-001",caseId:"fictional-case",now:100000}),false);
 assert.equal(Policy.validateRedemption(grant,{customerId:"different",caseId:"fictional-case",now:100000}),false);
 assert.equal(Policy.validateRedemption(grant,{customerId:"synthetic-001",caseId:"other",now:100000}),false);
 assert.equal(Policy.validateRedemption(grant,{customerId:"synthetic-001",caseId:"fictional-case",now:130000}),false);
 assert.equal(Policy.validateRedemption({...grant,reason:"customer_claimed"},{customerId:"synthetic-001",caseId:"fictional-case",now:100000}),false);
});
test("customer preview starts in AI chat, never exposes direct human access",()=>{
 const html=read("ai-first-support-lab.html"),js=read("ai-first-support-lab.js");
 for(const term of ['id="supportThread"','id="supportForm"','id="handoffOffer"','id="contactHuman"','id="humanPerspective"']){
  assert.ok(html.includes(term),term);
 }
 assert.match(html,/id="handoffOffer"[^>]*hidden/);
 assert.match(html,/id="humanPerspective"[^>]*hidden/);
 assert.match(js,/let mode="ai",perspective="customer",authorized=false/);
 assert.match(js,/if\(!authorized\|\|mode!=="ai"\)return/);
 assert.match(js,/status:"needs_human"/);
 assert.match(js,/authorized=false/);
 assert.match(html,/No AI model, accounts, staff, databases, outbound messaging/);
 for(const ban of [/fetch\s*\(/i,/XMLHttpRequest/i,/WebSocket/i,/localStorage/i,/sessionStorage/i,/indexedDB/i,/innerHTML\s*=/i,/document\.cookie/i]){
  assert.doesNotMatch(js,ban,"Offline demo must not leak data.");
 }
 assert.match(js,/textContent/);
});
