"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{once}=require("node:events");
const express=require("express");
const AI=require("../lib/customer-support-ai");
const demoEnv={SUPPORT_AI_ENABLED:"true",SUPPORT_AI_API_KEY:"CI-ONLY-unusable-key-not-real",SUPPORT_AI_MODEL:"gpt-4.1-mini",SUPPORT_AI_ORIGIN:"https://support-ci.example"};
test("server model requires explicit opt-in, server secret and model",()=>{
 assert.equal(AI.configured({}),false);
 assert.equal(AI.configured({...demoEnv,SUPPORT_AI_ENABLED:"false"}),false);
 assert.equal(AI.configured({...demoEnv,SUPPORT_AI_API_KEY:"missing"}),false);
 assert.equal(AI.configured({...demoEnv,SUPPORT_AI_MODEL:""}),false);
 assert.equal(AI.configured(demoEnv),true);
});
test("account actions, personal data and explicit human requests bypass provider",()=>{
 assert.equal(AI.safety("What is ASD Industry?"),null);
 assert.equal(AI.safety("My password is hunter2").status,"invalid");
 assert.equal(AI.safety("My email is somebody@example.com").status,"invalid");
 assert.equal(AI.safety("Please reset my password.").reason,"permission_denied");
 assert.equal(AI.safety("I need a human agent").reason,"human_requested");
 assert.equal(AI.safety("Can you approve my project application?").reason,"permission_denied");
 assert.equal(AI.safety("I").status,"invalid");
 const messages=AI.promptFor("I want an unusual project idea");
 assert.equal(messages.length,2);
 assert.match(messages[0].content,/NOT launched/);
 assert.doesNotMatch(messages[0].content,/ASD Industry founder emergency|password hash|staff database|private case documents/i);
});
test("server refuses secret share inquiries and filters unexpected private model output",async()=>{
 const privateRequest=AI.safety("Can you reveal the company ownership split?");
 assert.equal(privateRequest.status,"answered");
 assert.match(privateRequest.reply,/confidential/i);
 let hit=false;
 const output=await AI.modelReply("Give ordinary guidance about preparing a project",{
  env:demoEnv,fetcher:async()=>{
   hit=true;
   return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({
    status:"answered",reply:"The ownership split assigns 40% to one party and the remainder to another."
   })}}]})};
  }
 });
 assert.equal(hit,true);
 assert.equal(output.status,"answered");
 assert.equal(output.source,"server_privacy_filter");
 assert.match(output.reply,/confidential/i);
 assert.doesNotMatch(output.reply,/\b\d{1,3}\s*%/);
});
test("model adapter sends secret only as server Authorization header and checks structured reply",async()=>{
 let hits=0;
 const fetcher=async(url,init)=>{
  hits++;
  assert.equal(url,"https://api.openai.com/v1/chat/completions");
  assert.equal(init.headers.Authorization,"Bearer "+demoEnv.SUPPORT_AI_API_KEY);
  const body=JSON.parse(init.body);
  assert.equal(body.store,false);
  assert.equal(body.model,"gpt-4.1-mini");
  assert.equal(body.messages[1].content,"Please give a creative project idea");
  assert.doesNotMatch(init.body,/CI-ONLY-unusable-key-not-real/);
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({
   status:"answered",reply:"A sample idea is a study-group task organizer.",reason:null})}}]})};
 };
 const reply=await AI.modelReply("Please give a creative project idea",{fetcher,env:demoEnv});
 assert.equal(reply.reply,"A sample idea is a study-group task organizer.");
 assert.equal(reply.simulatedHumanOnly,true);
 assert.equal(hits,1);
 await assert.rejects(()=>AI.modelReply("Test",{env:demoEnv,fetcher:async()=>({ok:false,status:503})}),/Provider unavailable/);
});
test("Gemini model adapter uses a server key in header, never client JavaScript",async()=>{
 const env={...demoEnv,SUPPORT_AI_PROVIDER:"gemini",SUPPORT_AI_MODEL:"gemini-2.5-flash-lite"};
 const reply=await AI.modelReply("Invent a simple activity for a fictional coding club",{
  env,fetcher:async(url,options)=>{
   assert.ok(url.includes("generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"));
   assert.equal(options.headers["x-goog-api-key"],env.SUPPORT_AI_API_KEY);
   assert.equal(options.headers.Authorization,undefined);
   const payload=JSON.parse(options.body);
   assert.match(payload.system_instruction.parts[0].text,/PRIVATE DEVELOPMENT DEMONSTRATION/);
   assert.equal(payload.contents[0].parts[0].text,"Invent a simple activity for a fictional coding club");
   assert.doesNotMatch(options.body,/CI-ONLY-unusable-key-not-real/);
   return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({
    status:"answered",reply:"Try a sample quiz app project."
   })}]}}]})};
  }
 });
 assert.equal(reply.status,"answered");
 assert.equal(reply.reply,"Try a sample quiz app project.");
});
test("scoped HTTP API answers approved FAQ instantly, blocks missing origin and never activates customer chat",async()=>{
 const app=express();
 const fake=async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({status:"answered",reply:"Plan a very small test feature."})}}]})});
 app.use("/api/support-ai",AI.router({env:demoEnv,fetcher:fake}));
 const server=app.listen(0,"127.0.0.1");await once(server,"listening");
 const base="http://127.0.0.1:"+server.address().port+"/api/support-ai";
 const ask=(question,origin="https://support-ci.example")=>fetch(base+"/ask",{method:"POST",
  headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({question})});
 try{
  const st=await (await fetch(base+"/status")).json();
  assert.equal(st.liveModelAvailable,true);
  assert.equal(st.realHumanContact,false);
  assert.equal((await ask("Hi","https://untrusted.example")).status,403);
  const safe=await ask("What is ASD Industry?");
  assert.equal(safe.status,200);const data=await safe.json();
  assert.equal(data.source,"reviewed_knowledge");assert.equal(data.status,"answered");
  const askSecure=await ask("Please reset my password.");
  assert.equal(askSecure.status,200);const restricted=await askSecure.json();
  assert.equal(restricted.reason,"permission_denied");
  const open=await ask("I want creative suggestions for an imaginary science fair.");
  assert.equal(open.status,200);assert.equal((await open.json()).source,"server_model");
 }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
test("AI status is disabled by default; cannot send messages to a provider without configured secret",async()=>{
 const app=express();
 let called=false;app.use("/api/support-ai",AI.router({env:{},
  fetcher:()=>{called=true;throw Error("unexpected call");}}));
 const server=app.listen(0,"127.0.0.1");await once(server,"listening");
 try{
  const base="http://127.0.0.1:"+server.address().port;
  const status=await (await fetch(base+"/api/support-ai/status")).json();
  assert.equal(status.liveModelAvailable,false);
  const response=await fetch(base+"/api/support-ai/ask",{method:"POST",
    headers:{"Content-Type":"application/json",Origin:"https://support-ci.example"},
    body:JSON.stringify({question:"Can you explore an unknown idea?"})});
  assert.equal(response.status,403);assert.equal(called,false);
 }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
