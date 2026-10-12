"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"../public",name),"utf8");
test("customer chat and employee case workspace are separate, with AI-first human handoff",()=>{
 const html=read("support-conversation-lab.html"),agent=read("support-console.html");
 assert.match(html,/href="\/support-chat-v2.css\?v=20261012"/);
 assert.match(html,/src="\/support-chat-v2.js\?v=20261012"/);
 assert.match(html,/id="viewCustomer"/);
 assert.match(html,/id="viewAgent"/);
 assert.match(html,/id="customerScreen"/);
 assert.match(html,/id="agentScreen"[^>]*hidden/);
 assert.match(html,/id="humanOffer"[^>]*hidden/);
 assert.match(html,/id="contactHuman"/);
 assert.match(html,/id="agentInbox"/);
 assert.match(html,/id="agentAudit"/);
 assert.match(html,/id="agentRole"/);
 assert.match(html,/id="caseControls"[^>]*hidden/);
 assert.match(html,/id="agentActionsArea" hidden/);
 assert.match(html,/id="humanQuick"[^>]*hidden/);
 assert.doesNotMatch(html,/type="password"|type="email"|autocomplete="username"/);
 assert.match(agent,/id="supportWorkspace" hidden/);
});
test("offline customer-to-staff flow keeps one history and every action has a listener",()=>{
 const js=read("support-chat-v2.js");
 assert.match(js,/let cases=createCases\(\),view="customer"/);
 assert.match(js,/if\(c.stage!=="ai"\|\|!c.offer\)return/);
 assert.match(js,/c.stage="queued"/);
 assert.match(js,/selectedCase=c.id/);
 assert.match(js,/c.stage="human"/);
 assert.match(js,/history\(\$\("customerMessages"\),c.messages,"customer"\)/);
 assert.match(js,/history\(\$\("agentMessages"\),c.messages,"agent"\)/);
 assert.match(js,/if\(message.kind==="note"&&from!=="agent"\)return null/);
 assert.match(js,/if\(action==="review"&&\(role!=="manager"/);
 for(const button of ["viewCustomer","viewAgent","customerForm","contactHuman","claimCase",
  "waitingCase","resolveCase","reopenCase","escalateCase","reviewCase","agentForm","saveDraft",
  "dialogCancel","dialogConfirm","resetPreview","agentRole","agentAvailability","caseSearch","caseFilter"]){
   assert.ok(js.includes('$("'+button+'").addEventListener('),"Missing handler for "+button);
 }
 assert.match(js,/data-quick-human/);
 assert.match(js,/data-quick-customer/);
 assert.match(js,/audit\(c,/);
 for(const ban of [/fetch\s*\(/i,/XMLHttpRequest/i,/WebSocket/i,/localStorage/i,/sessionStorage/i,/indexedDB/i,/innerHTML\s*=/i,/document\.cookie/i]){
  assert.doesNotMatch(js,ban,"Fictional preview must not transmit or persist messages.");
 }
 assert.match(js,/textContent/);
 assert.match(js,/NOT DELIVERED/);
});
test("real support conversation backend is strictly staff-only and never outbound",()=>{
 const liveUI=read("support-workspace.js"),api=fs.readFileSync(path.join(__dirname,"../lib/support-training-api.js"),"utf8");
 assert.match(liveUI,/\/conversation/);
 assert.match(liveUI,/\/simulate-customer/);
 assert.match(liveUI,/syntheticAdultTest:true/);
 assert.match(liveUI,/TRAINING SIMULATOR · INTERNAL ONLY/);
 assert.match(api,/outboundSent:false/);
 assert.match(api,/realCustomerConnected:false/);
 assert.doesNotMatch(api,/sendMail|smtp|resend|twilio|fetch\s*\(/i);
});
