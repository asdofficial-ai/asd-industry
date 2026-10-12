"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const location=path.join(__dirname,"../public/");
const html=fs.readFileSync(path.join(location,"support-conversation-lab.html"),"utf8");
const script=fs.readFileSync(path.join(location,"support-conversation-lab.js"),"utf8");
class FakeNode {
 constructor(tag="button",id=""){
  this.tagName=tag.toUpperCase();this.id=id;this.dataset={};this.children=[];
  this.hidden=false;this.disabled=false;this.value="";this.textContent="";
  this.listeners={};this.attributes={};this.scrollHeight=130;this.scrollTop=0;
  this.classes=new Set();
  this.classList={toggle:(name,on)=>{
   const desired=on===undefined?!this.classes.has(name):!!on;
   if(desired)this.classes.add(name);else this.classes.delete(name);return desired;},
   contains:name=>this.classes.has(name)};
 }
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 fire(type,target=this){for(const fn of this.listeners[type]||[])fn({target,preventDefault(){},isComposing:false});}
 click(){this.fire("click");}
 closest(selector){
  if(selector==="[data-perspective]"&&this.dataset.perspective)return this;
  return null;
 }
 append(...items){for(const x of items)this.children.push(x);}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(name,val){this.attributes[name]=String(val);}
 querySelector(selector){
  for(const c of this.children){
   if(typeof c==="object"&&c.tagName===selector.toUpperCase())return c;
   const found=c?.querySelector?.(selector);if(found)return found;
  }return null;
 }
 querySelectorAll(selector){
  if(selector==="[data-perspective]")return this.children.filter(x=>x.dataset?.perspective);
  throw Error("Unexpected nested query "+selector);
 }
 reportValidity(){return true;}
 requestSubmit(){this.fire("submit");}
}
function boot(){
 const ids=["personaTabs","chatLayout","agentInbox","agentContext","agentCaseActions",
 "customerQuickReplies","agentQuickReplies","customerDemoChoices","chatPerspectiveLabel",
 "threadTitle","threadSubtitle","chatSafety","chatInput","chatSend","handoffPrompt",
 "handoffAction","handoffWhy","chatMessages","contextTitle","contextCode","contextCategory",
 "contextPriority","contextOwner","contextStatus","claimCase","markInProgress",
 "markResolved","escalateCase","addInternalNote","internalNotes","agentNote","chatHint",
 "chatForm","resetChat"];
 const byId=Object.fromEntries(ids.map(id=>[id,new FakeNode("div",id)]));
 const things=[];
 function data(key,value,tag="button"){
  const n=new FakeNode(tag);n.dataset[key]=value;things.push(n);return n;
 }
 const customer=data("perspective","customer");
 const agent=data("perspective","agent");
 byId.personaTabs.append(customer,agent);
 const caseRows={};
 for(const name of ["project","security","technical"]){
  const n=data("case",name);n.append(new FakeNode("small"));caseRows[name]=n;
 }
 const quick=data("quick","Could you show the next fictional project step?");
 const agentQuick=data("agentQuick","Thank you; here are the fictional project steps.");
 const exampleProject=data("customerCase","project");
 const exampleAI=data("customerCase","security");
 const document={
  getElementById:id=>{if(!byId[id])throw Error("Missing DOM "+id);return byId[id];},
  createElement:tag=>new FakeNode(tag),
  querySelectorAll:selector=>{
   const key=selector.match(/^\[data-([a-z-]+)\]$/)?.[1];
   if(!key)throw Error("Unexpected document query "+selector);
   const prop=key.replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());
   return things.filter(x=>x.dataset[prop]!==undefined);
  }
 };
 vm.runInNewContext(script,{document,Date,console},{timeout:1500});
 const textOf=(id)=>byId[id].children.map(entry=>{
  if(entry.children?.length){
   const walk=n=>String(n.textContent||"")+" "+(n.children||[]).map(walk).join(" ");
   return walk(entry);
  }
  return entry.textContent||"";
 }).join(" ");
 return {byId,caseRows,customer,agent,quick,agentQuick,exampleProject,exampleAI,textOf,
  switch:(node)=>byId.personaTabs.fire("click",node),
  submit:(value)=>{byId.chatInput.value=value;byId.chatForm.fire("submit");}};
}
test("screenshot customer page shows one conversation; agent sees functional case controls and replies",()=>{
 const x=boot();
 assert.equal(x.byId.agentInbox.hidden,true,"Customers must not see employee inbox");
 assert.equal(x.byId.agentContext.hidden,true,"Customers must not see agent case details");
 assert.equal(x.byId.customerDemoChoices.hidden,false);
 assert.match(x.textOf("chatMessages"),/FICTIONAL AI HANDOFF ACCEPTED/);
 x.switch(x.agent);
 assert.equal(x.byId.agentInbox.hidden,false);
 assert.equal(x.byId.agentContext.hidden,false);
 assert.equal(x.byId.customerDemoChoices.hidden,true);
 assert.equal(x.byId.contextCode.textContent,"DEMO-101");
 x.byId.markResolved.click();
 assert.equal(x.byId.contextStatus.textContent,"resolved");
 assert.equal(x.byId.chatSend.disabled,true,"Resolved case should not accept agent reply");
 x.byId.markInProgress.click();
 assert.equal(x.byId.contextStatus.textContent,"in progress");
 x.agentQuick.click();
 assert.match(x.textOf("chatMessages"),/Thank you; here are the fictional project steps/);
 x.byId.escalateCase.click();
 assert.equal(x.byId.contextStatus.textContent,"escalated");
 assert.equal(x.byId.markInProgress.disabled,true,"Agent may not bypass pending manager escalation");
 assert.equal(x.byId.chatSend.disabled,true,"Agent replies pause while escalated");
 x.byId.agentNote.value="Sample internal staff note";
 x.byId.addInternalNote.click();
 assert.match(x.textOf("internalNotes"),/Sample internal staff note/);
 x.switch(x.customer);
 assert.equal(x.byId.agentContext.hidden,true);
 assert.match(x.textOf("chatMessages"),/fictional project steps/);
 assert.doesNotMatch(x.textOf("chatMessages"),/Sample internal staff note/);
});
test("AI-first entry requires failed or unauthorized AI action before handoff, then preserves the thread",()=>{
 const x=boot();
 x.exampleAI.click();
 assert.equal(x.byId.threadTitle.textContent,"ASD AI Support");
 assert.equal(x.byId.handoffPrompt.hidden,true);
 assert.equal(x.caseRows.security.hidden,true,"AI questions cannot appear in agent inbox yet");
 x.submit("How do I organize this sample project team?");
 assert.equal(x.byId.handoffPrompt.hidden,true,"Answered FAQ must not create human handoff");
 x.submit("I forgot my password and need account recovery help.");
 assert.equal(x.byId.handoffPrompt.hidden,false);
 assert.equal(x.caseRows.security.hidden,true);
 const before=x.byId.chatMessages.children.length;
 x.byId.handoffAction.click();
 assert.equal(x.byId.handoffPrompt.hidden,true);
 assert.ok(x.byId.chatMessages.children.length>before,"Continue thread instead of creating a new one");
 x.switch(x.agent);
 assert.equal(x.caseRows.security.hidden,false,"Case becomes visible after handoff");
 assert.equal(x.byId.contextCode.textContent,"DEMO-102");
 x.submit("I can help review this fictional issue safely.");
 x.switch(x.customer);
 assert.match(x.textOf("chatMessages"),/help review this fictional issue/);
 assert.match(x.textOf("chatMessages"),/AI HANDOFF ACCEPTED/);
 x.byId.resetChat.click();
 assert.equal(x.byId.agentInbox.hidden,true);
 assert.equal(x.byId.contextCode.textContent,"DEMO-101");
});
test("all visible action selectors exist and simulator cannot send real messages",()=>{
 for(const id of ["personaTabs","agentInbox","agentContext","handoffPrompt","handoffAction",
 "markResolved","markInProgress","escalateCase","claimCase","agentNote","addInternalNote",
 "resetChat","customerDemoChoices","chatForm","chatMessages"]){
  assert.match(html,new RegExp('id="'+id+'"'),"Missing control "+id);
 }
 assert.match(html,/data-perspective="agent"/);
 assert.match(html,/data-perspective="customer"/);
 for(const key of ["project","technical","security"])assert.ok(html.includes('data-case="'+key+'"'));
 for(const method of [/fetch\s*\(/i,/XMLHttpRequest/i,/WebSocket/i,/localStorage/i,/sessionStorage/i,/indexedDB/i,/innerHTML\s*=/i,/document\.cookie/i])
  assert.doesNotMatch(script,method,"Demo must remain in-memory only");
 assert.match(html,/No real customer messages, live agents, authentication/);
});
