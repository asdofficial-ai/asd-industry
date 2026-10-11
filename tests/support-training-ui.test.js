"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"../public",p),"utf8");
test("simulated customer/agent conversation is visually separate from real employee portal",()=>{
 const preview=read("support-conversation-lab.html");
 const staff=read("support-console.html");
 assert.match(preview,/FICTIONAL, OFFLINE PREVIEW/);
 assert.match(preview,/id="customerView"/);
 assert.match(preview,/id="agentView"/);
 assert.match(preview,/id="conv-thread"/);
 assert.match(preview,/id="conv-form"/);
 assert.doesNotMatch(preview,/type="password"|type="email"|autocomplete="username"/);
 assert.match(staff,/id="supportWorkspace" hidden/);
 const liveUI=read("support-workspace.js");
 assert.match(liveUI,//conversation/);
 assert.match(liveUI,//simulate-customer/);
 assert.match(liveUI,/syntheticAdultTest:true/);
 assert.match(liveUI,/TRAINING SIMULATOR · INTERNAL ONLY/);
});
test("static conversation simulator has no network, persistent storage or unsafe HTML injection",()=>{
 const js=read("support-conversation-lab.js");
 for(const bad of [/fetch\s*\(/i,/XMLHttpRequest/i,/WebSocket/i,/localStorage/i,/sessionStorage/i,/indexedDB/i,/innerHTML\s*=/i,/document\.cookie/i]){
  assert.doesNotMatch(js,bad);
 }
 assert.match(js,/replaceChildren/);
 assert.match(js,/customer_simulator/);
 assert.match(js,/human_agent/);
 assert.match(js,/NOT DELIVERED/);
 const api=fs.readFileSync(path.join(__dirname,"../lib/support-training-api.js"),"utf8");
 assert.match(api,/outboundSent:false/);
 assert.match(api,/realCustomerConnected:false/);
 assert.doesNotMatch(api,/sendMail|smtp|resend|twilio|fetch\s*\(/i);
});
