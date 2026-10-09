"use strict";
const test=require("node:test"), assert=require("node:assert/strict"), fs=require("node:fs"),path=require("node:path");
const Core=require("../public/portal-core.js");
const start=()=>Core.newState("FutureBuilder","15-17");
const data={title:"FarmLink",description:"Build a small marketplace to help local growers connect with buyers through a simple website.",category:"Agriculture",seats:2,roles:["Developer"]};
test("sign-up initializes a local builder without a public project",()=>{
 const s=start();assert.equal(s.projects.length,0);assert.equal(s.viewer.nickname,"FutureBuilder");
 assert.throws(()=>Core.newState("A","15-17"));assert.throws(()=>Core.newState("Builder","wrong"));
});
test("applications start pending and no founder can grant approval",()=>{
 const s=start(),p=Core.submitProject(s,data);assert.equal(p.stage,"pending");assert.equal(p.groupCreated,false);
 assert.equal(Core.canAccess(p,"FutureBuilder","chat"),false);
 assert.throws(()=>Core.decide(s,p,"approved","founder"),/Only the staff review simulation/);
 assert.throws(()=>Core.recruit(s,p,"sample-dev","FutureBuilder"),/must be approved/);
 assert.throws(()=>Core.createGroup(s,p,"FutureBuilder"),/Recruit/);
});
test("founder decides teammates needed between 1 and 12",()=>{
 const s=start();
 for(const seats of [0,13,2.5,"not number"])assert.throws(()=>Core.submitProject(s,{...data,seats}));
 const p=Core.submitProject(s,{...data,seats:3});assert.equal(p.seats,3);
});
test("approved demo project requires full recruitment before group creation",()=>{
 const s=start(),p=Core.submitProject(s,data);Core.decide(s,p,"approved","demo-staff-preview","Demo only");
 assert.equal(p.stage,"approved");assert.equal(Core.canAccess(p,"FutureBuilder","workspace"),false);
 assert.throws(()=>Core.createGroup(s,p,"FutureBuilder"),/Recruit/);
 assert.throws(()=>Core.recruit(s,p,"sample-dev","OtherUser"),/founder/);
 Core.recruit(s,p,"sample-dev","FutureBuilder");
 assert.equal(p.stage,"recruiting");assert.equal(p.members.length,1);
 assert.throws(()=>Core.recruit(s,p,"sample-dev","FutureBuilder"),/already recruited/);
 assert.throws(()=>Core.createGroup(s,p,"FutureBuilder"),/Recruit/);
 Core.recruit(s,p,"sample-market","FutureBuilder");
 Core.createGroup(s,p,"FutureBuilder");
 assert.equal(p.stage,"active");assert.equal(p.groupCreated,true);
 assert.equal(Core.canAccess(p,"FutureBuilder","workspace"),true);
 assert.equal(Core.canAccess(p,"OtherUser","chat"),false);
 assert.throws(()=>Core.recruit(s,p,"sample-sales","FutureBuilder"));
 assert.throws(()=>Core.createGroup(s,p,"FutureBuilder"));
});
test("private messaging and tasks reject non-members and uncreated groups",()=>{
 const s=start(),p=Core.submitProject(s,{...data,seats:1});
 assert.throws(()=>Core.addMessage(p,"FutureBuilder","Hello"));
 Core.decide(s,p,"approved","demo-staff-preview");Core.recruit(s,p,"sample-dev","FutureBuilder");Core.createGroup(s,p,"FutureBuilder");
 assert.throws(()=>Core.addMessage(p,"stranger","Hello"));
 assert.throws(()=>Core.addTask(p,"stranger","Remove work"));
 Core.addMessage(p,"FutureBuilder","Work update");Core.addTask(p,"FutureBuilder","Draft wireframes");
 assert.equal(p.messages.length,1);assert.equal(p.tasks.length,1);
 assert.equal(Core.canAccess(p,"FutureBuilder","feed"),false);
});
test("staff demo can request changes and founder may resubmit",()=>{
 const s=start(),p=Core.submitProject(s,data);
 Core.decide(s,p,"changes-requested","demo-staff-preview","Reduce the scope");
 assert.equal(p.stage,"changes-requested");
 assert.throws(()=>Core.recruit(s,p,"sample-dev","FutureBuilder"));
 Core.resubmit(s,p);assert.equal(p.stage,"pending");
});
test("community posts are separate from private projects",()=>{
 const s=start();Core.addPost(s,"I built a prototype today.","photo");
 assert.equal(s.posts.length,1);assert.equal(s.projects.length,0);
 assert.throws(()=>Core.addPost(s,"x","progress"));
});
test("each portal destination is an actual separate HTML page",()=>{
 const names=["home","discover","projects","team","workspace","profile","notifications","review"];
 for(const name of names){
   const html=fs.readFileSync(path.join(__dirname,"../public",name+".html"),"utf8");
   assert.match(html,new RegExp('data-page="'+name+'"'));
   assert.match(html,/src="\/portal-core.js"/);
   assert.match(html,/src="\/portal.js"/);
 }
 const legacy=fs.readFileSync(path.join(__dirname,"../public/app.js"),"utf8");
 assert.match(legacy,/location\.assign\("\/home\.html"\)/);
});

test("browser page controller binds only to IDs present in one of the page documents",()=>{
 const pages=["home","discover","projects","team","workspace","profile","notifications","review"];
 const all=pages.map(name=>fs.readFileSync(path.join(__dirname,"../public",name+".html"),"utf8")).join("\n");
 const ids=new Set([...all.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 const controller=fs.readFileSync(path.join(__dirname,"../public/portal.js"),"utf8");
 const referenced=[...controller.matchAll(/\$\("([^"]+)"\)/g)].map(m=>m[1]);
 const missing=[...new Set(referenced.filter(x=>!ids.has(x)))];
 assert.deepEqual(missing,[]);
});
test("review actions are not linked from user-facing navigation",()=>{
 for(const name of ["home","discover","projects","team","workspace","profile","notifications"]){
  const html=fs.readFileSync(path.join(__dirname,"../public",name+".html"),"utf8");
  assert.doesNotMatch(html,/href="\/review\.html"/);
 }
 const script=fs.readFileSync(path.join(__dirname,"../public/portal.js"),"utf8");
 assert.doesNotMatch(script,/View staff review preview/);
});
