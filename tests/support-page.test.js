"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const pub=path.join(__dirname,"../public");
const read=name=>fs.readFileSync(path.join(pub,name),"utf8");
const FAQ=require("../public/support-knowledge");
function harness(){
 const refs=new Map();
 function element(tag="div"){
  return {tag,children:[],style:{},hidden:false,disabled:false,value:"",
   listeners:{},textContent:"",scrollTop:0,scrollHeight:200,
   get firstElementChild(){return this.children[0];},
   append(...nodes){this.children.push(...nodes);},
   replaceChildren(...nodes){this.children=[...nodes];},
   removeChild(node){this.children.splice(this.children.indexOf(node),1);},
   addEventListener(name,fn){this.listeners[name]=fn;},
   dispatch(name){return this.listeners[name]?.({preventDefault(){}});},
   reportValidity(){return true;}
  };
 }
 const ids=["messages","handoff","humanButton","serviceName","serviceDetail","serviceStatus","question",
  "send","quickQuestions","handoffText","feedback","chatForm","startOver"];
 ids.forEach(id=>refs.set(id,element()));
 const doc={getElementById:id=>{if(!refs.has(id))throw Error("Unknown UI element "+id);return refs.get(id);},
  createElement:element,querySelectorAll:selector=>selector==="[data-prompt]"?[]:[]};
 vm.runInNewContext(read("support-page.js"),{document:doc,window:{ASDSupportKnowledge:FAQ}});
 const get=id=>refs.get(id);
 const ask=text=>{get("question").value=text;get("chatForm").dispatch("submit");};
 return {get,ask,reset:()=>get("startOver").dispatch("click")};
}
test("the public ASD Industry demo has a single visible Need Support destination",()=>{
 const index=read("index.html"),page=read("support.html");
 assert.ok((index.match(/href="\/support\.html"/g)||[]).length>=3);
 assert.match(index,/support-gate-link/);
 assert.match(index,/support-mobile/);
 assert.match(index,/support-nav/);
 assert.match(page,/id="chatForm"/);
 assert.match(page,/id="humanButton"/);
 assert.match(page,/id="handoff"[^>]*hidden/);
 assert.match(page,/2FA/);
 assert.match(page,/No AI model or human employee is connected/);
 assert.doesNotMatch(page,/type="password"|type="email"|\/founder-console\.html|\/support-console\.html/);
});
test("FAQ answers safely, a plain human request automatically enters mock human view",()=>{
 const {get,ask}=harness();
 assert.equal(get("handoff").hidden,true);
 assert.equal(get("serviceStatus").textContent,"AI FIRST");
 ask("What is ASD Industry?");
 assert.equal(get("handoff").hidden,true);
 assert.equal(get("serviceStatus").textContent,"AI FIRST");
 ask("I need human support");
 assert.equal(get("serviceStatus").textContent,"HUMAN DEMO");
 assert.match(get("serviceDetail").textContent,/No real staff connected/);
 assert.equal(get("humanButton").disabled,true);
 ask("This is another fictional question.");
 assert.match(get("feedback").textContent,/not sent/i);
});
test("password recovery and unknown questions offer a human option, never reveal secrets",()=>{
 const {get,ask,reset}=harness();
 ask("I forgot my password.");
 assert.equal(get("handoff").hidden,false);
 assert.match(get("handoffText").textContent,/protected account action/i);
 get("humanButton").dispatch("click");
 assert.equal(get("serviceStatus").textContent,"HUMAN DEMO");
 reset();
 assert.equal(get("handoff").hidden,true);
 ask("What does quantum kiwi theory mean for my project this week?");
 assert.equal(get("handoff").hidden,false);
 reset();
 const count=get("messages").children.length;
 ask("My password is hunter2");
 assert.equal(get("messages").children.length,count);
 assert.match(get("feedback").textContent,/Do not enter passwords/);
});
test("single support page has no live calls or persistent message storage",()=>{
 const script=read("support-page.js");
 for(const disallowed of [/fetch\s*\(/i,/XMLHttpRequest/i,/WebSocket/i,/sendMail/i,/localStorage/i,/sessionStorage/i,/indexedDB/i,/document\.cookie/i,/innerHTML\s*=/i]){
  assert.doesNotMatch(script,disallowed);
 }
 assert.match(script,/window\.ASDSupportKnowledge/);
 assert.match(script,/humanDemo\(\)/);
 assert.match(script,/no real staff/i);
});
