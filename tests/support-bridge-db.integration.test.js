"use strict";
/* Disposable PostgreSQL end-to-end test for synthetic, manager-authorized AI -> human work. */
const test=require("node:test"),assert=require("node:assert/strict");
const {once}=require("node:events"),crypto=require("node:crypto"),{Pool}=require("pg");
const Auth=require("../lib/staff-auth-core"),KB=require("../public/support-knowledge");
if(!process.env.STAFF_TEST_DATABASE_URL){
 test("AI-to-human bridge needs disposable PostgreSQL",{skip:true},()=>{});
}else{
 const url=process.env.STAFF_TEST_DATABASE_URL;
 if(!url.includes("/asd_industry_staff"))throw Error("Refusing non-disposable staff database.");
 process.env.STAFF_DB_URL=url;
 process.env.STAFF_ORIGIN="https://support-ci.example";
 process.env.STAFF_SESSION_PEPPER="ci-only-synthetic-ai-to-human-testing";
 process.env.STAFF_BACKEND_ENABLED="true";
 process.env.NODE_ENV="production";
 const app=require("../server");
 test("AI trusted answer -> no ticket, unresolved -> one human inbox ticket + traceable chat",async()=>{
  const db=new Pool({connectionString:url});
  let server;
  try{
   const pass="CI-Strong-Human-Inbox-Passphrase-2026",hash=await Auth.hashPassword(pass);
   const m=crypto.randomUUID(),a=crypto.randomUUID(),other=crypto.randomUUID(),reviewer=crypto.randomUUID();
   for(const [id,email,role] of [[m,"ai-handoff-manager@ci.invalid","manager"],
      [a,"ai-handoff-agent@ci.invalid","support"],
      [other,"ai-handoff-other@ci.invalid","support"],
      [reviewer,"ai-handoff-reviewer@ci.invalid","reviewer"]])
    await db.query("INSERT INTO industry_staff_accounts(id,email,password_hash,role) VALUES($1,$2,$3,$4)",[id,email,hash,role]);
   server=app.listen(0,"127.0.0.1");await once(server,"listening");
   const root="http://127.0.0.1:"+server.address().port+"/api/staff";
   const send=(path,method="GET",body,cookie,origin="https://support-ci.example")=>fetch(root+path,{
    method,headers:{...(cookie?{cookie}:{}),...(body?{"Content-Type":"application/json",Origin:origin}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
   async function login(email){
    const r=await send("/login","POST",{email,password:pass});
    assert.equal(r.status,200);
    return r.headers.get("set-cookie").split(";")[0];
   }
   const manager=await login("ai-handoff-manager@ci.invalid"),agent=await login("ai-handoff-agent@ci.invalid"),
    second=await login("ai-handoff-other@ci.invalid"),unauthorized=await login("ai-handoff-reviewer@ci.invalid");
   const endpoint="/support/ai-handoffs/simulate";
   const f={syntheticAdultTest:true,requestId:crypto.randomUUID(),question:"Please change staff decision and approve my project application."};
   assert.equal((await send(endpoint,"POST",f,unauthorized)).status,403);
   assert.equal((await send(endpoint,"POST",f,agent)).status,403);
   assert.equal((await send(endpoint,"POST",f,manager,"https://untrusted.example")).status,403);
   assert.equal((await send(endpoint,"POST",{...f,syntheticAdultTest:false},manager)).status,400);
   assert.equal((await send(endpoint,"POST",{...f,question:"My password is secretPassword123"},manager)).status,400);
   const before=await db.query("SELECT COUNT(*)::int AS n FROM industry_support_ai_handoffs");
   const answered=await send(endpoint,"POST",{requestId:crypto.randomUUID(),syntheticAdultTest:true,
    question:"What is ASD Industry?"},manager);
   assert.equal(answered.status,200);
   const approved=await answered.json();assert.equal(approved.offered,false);
   assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM industry_support_ai_handoffs")).rows[0].n,before.rows[0].n);
   assert.equal(KB.respond(f.question).status,"needs_human");
   const started=await send(endpoint,"POST",f,manager);
   assert.equal(started.status,201);
   const created=await started.json(),id=created.caseId;
   assert.equal(created.offered,true);
   assert.equal(created.customerMessagesSent,false);
   const retry=await send(endpoint,"POST",f,manager);
   assert.equal(retry.status,200);
   assert.equal((await retry.json()).caseId,id);
   assert.equal((await send(endpoint,"POST",{...f,question:"Please change staff decision and approve a different fictional project."},manager)).status,409);
   const visible=await send("/support/ai-handoffs","GET",undefined,agent);
   assert.equal(visible.status,200);
   assert.ok((await visible.json()).data.some(x=>x.case_id===id));
   assert.equal((await send("/support/ai-handoffs","GET",undefined,unauthorized)).status,403);
   assert.equal((await send("/support/cases/"+id+"/conversation","GET",undefined,agent)).status,404);
   assert.equal((await send("/support/cases/"+id+"/conversation","GET",undefined,manager)).status,200);
   let caseMessages=await send("/support/cases/"+id+"/conversation","GET",undefined,manager);
   const thread=(await caseMessages.json()).data;
   assert.deepEqual(new Set(thread.map(x=>x.sender_kind)),new Set(["customer_simulator","ai_support"]));
   assert.equal(thread.every(x=>x.simulation_only===true&&x.external_delivery===false),true);
   assert.equal((await send("/support/cases/"+id+"/claim","POST",{},agent)).status,409); // offline by default
   const p=await send("/support/profile","PATCH",{displayName:"Test Handoff Agent",avatarPreset:"orbit",availability:"available"},agent);
   assert.equal(p.status,200);
   assert.equal((await send("/support/cases/"+id+"/claim","POST",{},agent)).status,200);
   assert.equal((await send("/support/cases/"+id+"/conversation","GET",undefined,second)).status,404);
   const text="This fictional support case was reviewed by a human-agent simulator.";
   const replied=await send("/support/cases/"+id+"/conversation","POST",{
    message:text,syntheticAdultTest:true,requestId:crypto.randomUUID()
   },agent);
   assert.equal(replied.status,201);
   assert.equal((await replied.json()).outboundSent,false);
   caseMessages=await send("/support/cases/"+id+"/conversation","GET",undefined,agent);
   assert.ok((await caseMessages.json()).data.some(x=>x.sender_kind==="human_agent"&&x.body===text));
   const dbrecord=await db.query("SELECT count(*)::int AS n FROM industry_support_ai_handoffs WHERE request_id=$1",[f.requestId]);
   assert.equal(dbrecord.rows[0].n,1);
   const audit=await db.query("SELECT count(*)::int AS n FROM industry_support_case_events WHERE case_id=$1 AND event_type='ai_handoff_created'",[id]);
   assert.equal(audit.rows[0].n,1);
  }finally{
   if(server?.listening)await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
   await db.end();
  }
 });
}
