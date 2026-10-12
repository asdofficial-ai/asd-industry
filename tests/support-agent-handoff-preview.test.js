"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const location=path.join(__dirname,"../public/");
const html=fs.readFileSync(path.join(location,"support-conversation-lab.html"),"utf8");
const script=fs.readFileSync(path.join(location,"support-chat-v2.js"),"utf8");
class FakeNode {
 constructor(tag="div",id=""){
  this.tagName=tag.toUpperCase();this.id=id;this.dataset={};this.children=[];
  this.hidden=false;this.disabled=false;this.value="";this.textContent="";this.className="";
  this.listeners={};this.attributes={};this.scrollHeight=300;this.scrollTop=0;this.classes=new Set();
  this.classList={
   add:(...names)=>names.forEach(name=>this.classes.add(name)),
   remove:(...names)=>names.forEach(name=>this.classes.delete(name)),
   toggle:(name,on)=>{const want=on===undefined?!this.classes.has(name):!!on;
    if(want)this.classes.add(name);else this.classes.delete(name);return want;},
   contains:name=>this.classes.has(name)
  };
 }
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 fire(type){for(const fn of this.listeners[type]||[])fn({target:this,preventDefault(){},key:"",isComposing:false});}
 click(){this.fire("click");}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(name,value){this.attributes[name]=String(value);}
 focus(){}
 reportValidity(){return true;}
}
function boot(){
 const matches=[...html.matchAll(/\bid="([^"]+)"/g)];
 const byId=Object.fromEntries(matches.map(m=>[m[1],new FakeNode("div",m[1])]));
 for(const m of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
  if(/\shidden(?:\s|>|$)/.test(m[0]))byId[m[1]].hidden=true;
 }
 const quickCustomer=[],quickHuman=[];
 for(const m of html.matchAll(/<button[^>]*data-quick-(customer|human)="([^"]+)"[^>]*>/g)){
  const el=new FakeNode("button");
  if(m[1]==="customer"){el.dataset.quickCustomer=m[2];quickCustomer.push(el);}
  else{el.dataset.quickHuman=m[2];quickHuman.push(el);}
 }
 const document={
  getElementById:id=>{if(!byId[id])throw Error("Missing DOM "+id);return byId[id];},
  createElement:tag=>new FakeNode(tag),
  querySelectorAll:selector=>{
   if(selector==="[data-quick-customer]")return quickCustomer;
   if(selector==="[data-quick-human]")return quickHuman;
   throw Error("Unexpected document selector "+selector);
  },
  addEventListener:()=>{}
 };
 vm.runInNewContext(script,{document,Date,console,Set,String,Number},{timeout:2500});
 const walk=n=>typeof n==="string"?n:(n?.textContent||"")+" "+(n?.children||[]).map(walk).join(" ");
 const textOf=id=>walk(byId[id]);
 const ask=text=>{byId.customerInput.value=text;byId.customerForm.fire("submit");};
 const agentSend=text=>{byId.agentInput.value=text;byId.agentForm.fire("submit");};
 return {byId,textOf,ask,agentSend,quickCustomer,quickHuman,
  click:id=>byId[id].click(),
  set:(id,value)=>{byId[id].value=value;byId[id].fire("change");}
 };
}
test("AI answers FAQs and only later offers human help for an unauthorized request",()=>{
 const x=boot();
 assert.equal(x.byId.customerScreen.hidden,false);
 assert.equal(x.byId.agentScreen.hidden,true);
 assert.equal(x.byId.humanOffer.hidden,true);
 assert.equal(x.byId.customerHeading.textContent,"ASD AI Support Assistant");
 x.ask("How can I start a sample project?");
 assert.equal(x.byId.humanOffer.hidden,true,"Basic AI answer must not directly open humans");
 assert.match(x.textOf("customerMessages"),/define your idea/);
 x.ask("Please approve my fictional project.");
 assert.equal(x.byId.humanOffer.hidden,false,"Unauthorized AI request should offer human help");
 assert.match(x.textOf("customerMessages"),/no permission/i);
 const before=x.byId.customerMessages.children.length;
 x.click("contactHuman");
 assert.equal(x.byId.customerScreen.hidden,false,"Customer should not leave the existing page");
 assert.equal(x.byId.humanOffer.hidden,true);
 assert.equal(x.byId.waitingBox.hidden,false);
 assert.ok(x.byId.customerMessages.children.length>before);
 assert.match(x.textOf("customerMessages"),/HANDOFF ACCEPTED/);
 x.click("viewAgent");
 assert.equal(x.byId.agentScreen.hidden,false);
 assert.equal(x.byId.customerScreen.hidden,true);
 assert.match(x.textOf("agentInbox"),/Example project guidance/);
 assert.equal(x.byId.caseTitle.textContent,"Example project guidance");
 assert.equal(x.byId.claimCase.hidden,false);
});
test("agent claims AI handoff, replies in the SAME customer thread, and keeps notes private",()=>{
 const x=boot();
 x.ask("My fictional account needs a password reset.");
 x.click("contactHuman");x.click("viewAgent");
 x.click("claimCase");
 assert.equal(x.byId.caseStatusPill.textContent,"IN PROGRESS");
 assert.equal(x.byId.agentActionsArea.hidden,false);
 x.agentSend("Hello fictional customer, I can explain this training account process.");
 assert.match(x.textOf("agentMessages"),/Hello fictional customer/);
 x.click("privateNoteTab");
 x.agentSend("Internal agent-only note about the simulated project support case.");
 assert.match(x.textOf("agentMessages"),/Internal agent-only note/);
 x.click("viewCustomer");
 assert.match(x.textOf("customerMessages"),/Hello fictional customer/);
 assert.match(x.textOf("customerMessages"),/HANDOFF ACCEPTED/);
 assert.doesNotMatch(x.textOf("customerMessages"),/Internal agent-only note/);
 assert.equal(x.byId.customerHeading.textContent,"ASD Human Support · Demo");
 x.quickHuman[0].click();
 assert.match(x.textOf("customerMessages"),/next step/);
 x.click("viewAgent");
 assert.match(x.textOf("agentMessages"),/next step/);
});
test("agent actions and independent simulated Manager review update case status and activity",()=>{
 const x=boot();
 x.ask("Please override a staff review decision.");
 x.click("contactHuman");x.click("viewAgent");x.click("claimCase");
 x.click("waitingCase");
 assert.equal(x.byId.caseStatusPill.textContent,"WAITING ON CUSTOMER");
 x.click("waitingCase");
 assert.equal(x.byId.caseStatusPill.textContent,"IN PROGRESS");
 x.click("escalateCase");
 assert.equal(x.byId.dialogBackdrop.hidden,false);
 x.byId.dialogInput.value="This sample issue needs an independent manager review.";
 x.click("dialogConfirm");
 assert.equal(x.byId.caseStatusPill.textContent,"ESCALATED TO MANAGER");
 assert.equal(x.byId.agentActionsArea.hidden,true);
 assert.equal(x.byId.reviewCase.hidden,true,"Agent cannot approve own escalation");
 x.set("agentRole","manager");
 assert.equal(x.byId.reviewCase.hidden,false);
 x.click("reviewCase");
 x.byId.dialogInput.value="Manager reviewed this synthetic training case in the isolated preview.";
 x.click("dialogConfirm");
 assert.equal(x.byId.caseStatusPill.textContent,"IN PROGRESS");
 x.click("resolveCase");
 assert.equal(x.byId.caseStatusPill.textContent,"RESOLVED");
 x.click("resolveCase");
 assert.equal(x.byId.caseStatusPill.textContent,"CLOSED");
 assert.match(x.textOf("agentAudit"),/Manager closed/);
 x.click("resetPreview");
 assert.equal(x.byId.customerScreen.hidden,false);
 assert.equal(x.byId.agentScreen.hidden,true);
 assert.equal(x.byId.humanOffer.hidden,true);
});
test("all new controls exist and the simulator never connects or stores real messages",()=>{
 for(const id of ["viewCustomer","viewAgent","customerScreen","agentScreen","customerMessages",
  "contactHuman","humanOffer","agentInbox","agentAudit","claimCase","waitingCase",
  "resolveCase","reopenCase","escalateCase","reviewCase","resetPreview","customerForm",
  "customerReset","agentRole","agentAvailability","saveDraft","dialogConfirm","caseSearch","caseFilter"]){
  assert.match(html,new RegExp('id="'+id+'"'),"Missing control "+id);
 }
 for(const pattern of [/fetch\s*\(/i,/XMLHttpRequest/i,/WebSocket/i,/localStorage/i,/sessionStorage/i,/indexedDB/i,/innerHTML\s*=/i,/document\.cookie/i]){
  assert.doesNotMatch(script,pattern,"Preview must remain entirely offline");
 }
});
