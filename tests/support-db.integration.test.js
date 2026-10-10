"use strict";
/* Disposable Postgres only: no real people, minors, contact details or passwords. */
const test=require("node:test"),assert=require("node:assert/strict"),{once}=require("node:events");
const crypto=require("node:crypto"),{Pool}=require("pg");
const Auth=require("../lib/staff-auth-core");
if(!process.env.STAFF_TEST_DATABASE_URL){
 test("support integration needs disposable Postgres",{skip:true},()=>{});
}else{
 const url=process.env.STAFF_TEST_DATABASE_URL;
 if(!url.includes("/asd_industry_staff"))throw Error("Refusing unexpected database.");
 process.env.STAFF_DB_URL=url;
 process.env.STAFF_ORIGIN="https://support-ci.example";
 process.env.STAFF_SESSION_PEPPER="disposable-ci-only-support-pepper-do-not-use-outside-tests";
 process.env.STAFF_BACKEND_ENABLED="true";
 process.env.NODE_ENV="production";
 const app=require("../server");
 const password="Test-Only-Secure-Support-Passphrase-2026";
 test("human support role isolation, ticket ownership, manager actions and append-only audits",async()=>{
  const pool=new Pool({connectionString:url});
  let server;
  try{
   const ids=Array.from({length:4},()=>crypto.randomUUID());
   const pw=await Auth.hashPassword(password);
   const emails=["agent-one@ci.invalid","agent-two@ci.invalid","manager-help@ci.invalid","reviewer-no-help@ci.invalid"];
   const roles=["support","support","manager","reviewer"];
   for(let i=0;i<4;i++)await pool.query(
    "INSERT INTO industry_staff_accounts(id,email,password_hash,role) VALUES($1,$2,$3,$4)",[ids[i],emails[i],pw,roles[i]]);
   server=app.listen(0,"127.0.0.1");
   await once(server,"listening");
   const base="http://127.0.0.1:"+server.address().port;
   const call=(path,method="GET",body,cookie,origin="https://support-ci.example")=>fetch(base+"/api/staff"+path,{
    method,headers:{...(cookie?{cookie}:{}),...(body?{"Content-Type":"application/json",origin}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
   async function login(email){
    const response=await call("/login","POST",{email,password});
    assert.equal(response.status,200);
    const value=response.headers.get("set-cookie");
    assert.match(value,/HttpOnly; Secure; SameSite=Strict/);
    return value.split(";")[0];
   }
   const a=await login(emails[0]),b=await login(emails[1]),manager=await login(emails[2]),reviewer=await login(emails[3]);
   const path="/support/cases";
   assert.equal((await call(path)).status,401);
   assert.equal((await call(path,"GET",undefined,reviewer)).status,403);
   assert.equal((await call("/support/dashboard","GET",undefined,reviewer)).status,403);
   assert.equal((await call("/support/agents","GET",undefined,a)).status,403);
   assert.equal((await call("/support/team","GET",undefined,a)).status,403);
   assert.equal((await call("/support/escalations","GET",undefined,reviewer)).status,403);
   const profile=await call("/support/profile","PATCH",{
    displayName:"Test Support Agent",avatarPreset:"compass",availability:"available"
   },b);
   assert.equal(profile.status,200);
   assert.equal((await profile.json()).data.availability,"available");
   assert.equal((await call("/support/profile","PATCH",{
    displayName:"Verified Founder",avatarPreset:"shield",availability:"available"
   },b)).status,400);
   assert.equal((await call("/support/profile","PATCH",{
    displayName:"Test Support Agent",avatarPreset:"shield",availability:"available",role:"manager"
   },b)).status,400);
   assert.equal((await call("/support/team/"+ids[1]+"/department","PATCH",{department:"technical"},a)).status,403);
   assert.equal((await call("/support/team/"+ids[1]+"/department","PATCH",{department:"technical"},manager)).status,200);
   assert.equal((await call("/support/team/"+ids[3]+"/department","PATCH",{department:"technical"},manager)).status,404);
   const team=await call("/support/team","GET",undefined,manager);
   assert.equal(team.status,200);
   assert.ok((await team.json()).data.some(x=>x.staff_id===ids[1]&&x.department==="technical"));
   const badOrigin=await call(path,"POST",{
    subject:"Fictional training inquiry",requesterAlias:"ExampleAdult",
    description:"A made up problem for training the human support team.",
    category:"technical",priority:"normal",syntheticAdultTest:true
   },a,"https://untrusted.example");
   assert.equal(badOrigin.status,403);
   const missingSynthetic=await call(path,"POST",{
    subject:"Example help issue",requesterAlias:"ExampleAdult",
    description:"A wholly imaginary adult project question.",
    category:"technical",priority:"normal"
   },a);
   assert.equal(missingSynthetic.status,400);
   const made=await call(path,"POST",{
    subject:"Fictional sample project question",requesterAlias:"ExampleAdult",
    description:"An invented adult participant cannot follow an illustrative tutorial.",
    category:"technical",priority:"high",syntheticAdultTest:true
   },a);
   assert.equal(made.status,201);
   const result=await made.json(),id=result.data.id;
   assert.equal(result.delivery,"not_sent");
   assert.equal(result.synthetic,true);
   assert.equal((await call(path+"/"+id,"GET",undefined,a)).status,404);
   assert.equal((await call(path+"/"+id,"GET",undefined,b)).status,404);
   const agentList=await call(path,"GET",undefined,a);
   assert.equal(agentList.status,200);
   assert.ok((await agentList.json()).data.some(c=>c.id===id));
   assert.equal((await call(path+"/"+id+"/claim","POST",{},a)).status,409);
   const activeAgent=await call("/support/profile","PATCH",{
    displayName:"Example Agent One",avatarPreset:"orbit",availability:"available"
   },a);
   assert.equal(activeAgent.status,200);
   assert.equal((await call(path+"/"+id+"/claim","POST",{},a)).status,200);
   assert.equal((await call(path+"/"+id+"/claim","POST",{},b)).status,409);
   assert.equal((await call(path+"/"+id,"GET",undefined,a)).status,200);
   assert.equal((await call(path+"/"+id,"GET",undefined,b)).status,404);
   assert.equal((await call(path+"/"+id,"GET",undefined,manager)).status,200);
   assert.equal((await call(path+"/"+id+"/note","POST",{internalOnly:true,note:"Synthetic training note; continue checking."},b)).status,404);
   const note=await call(path+"/"+id+"/note","POST",{internalOnly:true,note:"This synthetic test needs a tutorial clarification."},a);
   assert.equal(note.status,201);
   assert.equal((await note.json()).outboundSent,false);
   assert.equal((await call(path+"/"+id+"/status","POST",{status:"closed"},a)).status,403);
   assert.equal((await call(path+"/"+id+"/assign","POST",{agentId:ids[1]},a)).status,403);
   assert.equal((await call(path+"/"+id+"/assign","POST",{agentId:ids[3]},manager)).status,404);
   const assigned=await call(path+"/"+id+"/assign","POST",{agentId:ids[1]},manager);
   assert.equal(assigned.status,200);
   assert.equal((await call(path+"/"+id,"GET",undefined,a)).status,404);
   assert.equal((await call(path+"/"+id,"GET",undefined,b)).status,200);
   assert.equal((await call(path+"/"+id+"/draft","GET",undefined,a)).status,404);
   const initial=await call(path+"/"+id+"/draft","GET",undefined,b);
   assert.equal(initial.status,200);
   assert.equal((await initial.json()).data,null);
   const responseDraft="Hello fictional visitor, please review the simulated tutorial instructions.";
   assert.equal((await call(path+"/"+id+"/draft","PATCH",{draft:responseDraft},b)).status,400);
   const draftSaved=await call(path+"/"+id+"/draft","PATCH",{draft:responseDraft,syntheticAdultTest:true},b);
   assert.equal(draftSaved.status,200);
   assert.equal((await draftSaved.json()).outboundSent,false);
   const readDraft=await call(path+"/"+id+"/draft","GET",undefined,b);
   assert.equal((await readDraft.json()).data.body,responseDraft);
   assert.equal((await call(path+"/"+id+"/status","POST",{status:"escalated"},b)).status,400);
   assert.equal((await call(path+"/"+id+"/status","POST",{
    status:"escalated",category:"technical",reason:"This sample case needs independent manager analysis."
   },b)).status,200);
   assert.equal((await call(path+"/"+id+"/status","POST",{status:"resolved"},manager)).status,409);
   assert.equal((await call(path+"/"+id+"/assign","POST",{agentId:ids[1]},manager)).status,409);
   assert.equal((await call("/support/escalations","GET",undefined,b)).status,403);
   const escalationQueue=await call("/support/escalations","GET",undefined,manager);
   assert.equal(escalationQueue.status,200);
   assert.ok((await escalationQueue.json()).data.some(x=>x.case_id===id));
   assert.equal((await call(path+"/"+id+"/escalation-review","POST",{decision:"resolve",note:"Approve the synthetic tutorial resolution for this sample."},b)).status,403);
   const reviewed=await call(path+"/"+id+"/escalation-review","POST",{
    decision:"resolve",note:"Reviewed the synthetic issue; the example resolution is appropriate."
   },manager);
   assert.equal(reviewed.status,200);
   assert.equal((await reviewed.json()).customerMessageSent,false);
   assert.equal((await call(path+"/"+id+"/escalation-review","POST",{decision:"resolve",note:"Cannot approve again."},manager)).status,409);
   assert.equal((await call(path+"/"+id+"/status","POST",{status:"closed"},b)).status,403);
   assert.equal((await call(path+"/"+id+"/status","POST",{status:"closed"},manager)).status,200);
   assert.equal((await call(path+"/"+id+"/note","POST",{internalOnly:true,note:"Attempt after closure."},b)).status,409);
   assert.equal((await call(path+"/"+id+"/draft","PATCH",{
    draft:"Another fictional training response must be blocked after closure.",syntheticAdultTest:true
   },b)).status,409);
   const detail=await call(path+"/"+id,"GET",undefined,manager);
   const body=await detail.json();
   assert.equal(body.outboundSent,false);
   assert.ok(body.events.some(e=>e.event_type==="internal_note"));
   assert.ok(body.events.some(e=>e.event_type==="claimed"));
   assert.ok(body.events.some(e=>e.event_type==="assigned"));
   assert.ok(body.events.some(e=>e.event_type==="status_changed"));
   assert.ok(body.events.some(e=>e.event_type==="escalated"));
   assert.ok(body.events.some(e=>e.event_type==="escalation_reviewed"));
   assert.ok(body.events.some(e=>e.event_type==="reply_drafted"));
   const auditTeam=await pool.query("SELECT COUNT(*)::int AS count FROM industry_support_team_audit WHERE target_id=$1",[ids[1]]);
   assert.ok(auditTeam.rows[0].count>=2);
   const audits=await pool.query("SELECT COUNT(*)::int AS count FROM industry_support_case_events WHERE case_id=$1",[id]);
   assert.ok(audits.rows[0].count>=6);
   assert.equal((await call("/founder/overview","GET",undefined,a)).status,403);
   assert.equal((await call("/requests/"+crypto.randomUUID(),"GET",undefined,a)).status,403);
  }finally{
   if(server?.listening)await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
   await pool.end();
  }
 });
}