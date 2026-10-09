"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),{once}=require("node:events");
const Auth=require("../lib/staff-auth-core");
test("staff backend starts closed and requires dedicated production settings",()=>{
 assert.equal(Auth.configured({}),false);
 const good={NODE_ENV:"production",STAFF_BACKEND_ENABLED:"true",
 STAFF_DB_URL:"postgres://localhost/asd_industry_staff",
 STAFF_ORIGIN:"https://staff.asdindustry.example",
 STAFF_SESSION_PEPPER:"Z".repeat(40)};
 assert.equal(Auth.configured(good),true);
 assert.equal(Auth.configured({...good,STAFF_BACKEND_ENABLED:"false"}),false);
 assert.equal(Auth.configured({...good,STAFF_ORIGIN:"http://staff.asdindustry.example"}),false);
 assert.equal(Auth.configured({...good,STAFF_ORIGIN:"https://staff.asdindustry.example/anything"}),false);
 assert.equal(Auth.configured({...good,STAFF_SESSION_PEPPER:"short"}),false);
});
test("only founder and human reviewer roles may approve or decline",()=>{
 for(const role of ["founder","reviewer"]){
  assert.equal(Auth.canReview(role),true);
  assert.equal(Auth.authorizeHumanDecision({role,requestStatus:"pending",reportVersion:2,requestVersion:2}),true);
 }
 for(const role of ["safety","ai","model",""]){
  assert.equal(Auth.canReview(role),false);
  assert.throws(()=>Auth.authorizeHumanDecision({role,requestStatus:"pending",reportVersion:2,requestVersion:2}),/human reviewers/);
 }
});
test("stale packets and already processed requests cannot trigger decisions",()=>{
 const input={role:"reviewer",requestStatus:"pending",reportVersion:1,requestVersion:2};
 assert.throws(()=>Auth.authorizeHumanDecision(input),/current review packet/);
 assert.throws(()=>Auth.authorizeHumanDecision({...input,reportVersion:2,requestStatus:"approved"}),/pending/);
});
test("decision requires a meaningful written human rationale",()=>{
 const sample={reportId:"11223344-5566-4788-aabb-112233445566",decision:"approved",rationale:"I checked the evidence and risks."};
 assert.equal(Auth.validateDecision(sample).decision,"approved");
 assert.equal(Auth.validateDecision({...sample,decision:"declined"}).decision,"declined");
 assert.throws(()=>Auth.validateDecision({...sample,decision:"unknown"}),/human review decision/);
 assert.throws(()=>Auth.validateDecision({...sample,rationale:"fine"}),/at least 12/);
 assert.throws(()=>Auth.validateDecision({...sample,reportId:"missing"}),/valid staff report/);
});
test("synthetic adult-only intake is required and sensitive contact information is blocked",()=>{
 const details={creatorLabel:"TestBuilder",title:"Garden Pilot",
  description:"An adult test proposal for a fictional local garden inventory and planning tool.",
  category:"Apps",seats:3,roles:["Developer"],isAdultTestData:true};
 assert.equal(Auth.validateIntake(details).seats,3);
 assert.throws(()=>Auth.validateIntake({...details,isAdultTestData:false}),/adult-test/);
 assert.throws(()=>Auth.validateIntake({...details,description:details.description+" Reach me at a@b.com"}),/Sensitive/);
 assert.throws(()=>Auth.validateIntake({...details,seats:0}),/Incomplete/);
});
test("salted staff passwords verify and do not produce identical stored hashes",async()=>{
 const p="correct-horse-strength-for-staff-2026";
 const a=await Auth.hashPassword(p),b=await Auth.hashPassword(p);
 assert.notEqual(a,b);
 assert.equal(await Auth.verifyPassword(p,a),true);
 assert.equal(await Auth.verifyPassword("wrong-password-over-16",a),false);
 assert.equal(await Auth.verifyPassword("wrong-password-over-16","invalid"),false);
 await assert.rejects(Auth.hashPassword("short"),/16–256/);
});
test("staff console has separate login, queue and decision controls",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../public/staff-console.html"),"utf8");
 const source=fs.readFileSync(path.join(__dirname,"../public/staff-console.js"),"utf8");
 for(const id of ["loginForm","staffConsole","realReviewQueue","realReviewDetail","refreshQueue","testIntakeForm"]){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(source,/\/decision/);
 assert.match(source,/\/prepare/);
 assert.doesNotMatch(html,/src="\/portal-core.js"/);
});
test("public service returns unavailable status for disabled staff API and never permits anonymous intake",async()=>{
 const app=require("../server");
 const original=process.env.STAFF_BACKEND_ENABLED;
 delete process.env.STAFF_BACKEND_ENABLED;
 const server=app.listen(0,"127.0.0.1");
 try{
  await once(server,"listening");
  const base="http://127.0.0.1:"+server.address().port;
  const status=await fetch(base+"/api/staff/status");
  assert.equal(status.status,200);
  assert.equal((await status.json()).enabled,false);
  const response=await fetch(base+"/api/staff/intake",{method:"POST",
   headers:{"content-type":"application/json","origin":base},body:JSON.stringify({isAdultTestData:true})});
  assert.equal(response.status,503);
  assert.match((await response.json()).error,/disabled/);
 }finally{
  if(original!==undefined)process.env.STAFF_BACKEND_ENABLED=original;
  await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
 }
});
