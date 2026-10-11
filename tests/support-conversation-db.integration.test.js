"use strict";
/* Disposable staff PostgreSQL only. No real customer accounts, personal details or outbound sends. */
const test=require("node:test"),assert=require("node:assert/strict"),{once}=require("node:events");
const crypto=require("node:crypto"),{Pool}=require("pg"),Auth=require("../lib/staff-auth-core");
if(!process.env.STAFF_TEST_DATABASE_URL){
 test("simulated customer↔human thread integration requires disposable Postgres",{skip:true},()=>{});
}else{
 const url=process.env.STAFF_TEST_DATABASE_URL;
 if(!url.includes("/asd_industry_staff"))throw Error("Refusing unexpected database.");
 process.env.STAFF_DB_URL=url;
 process.env.STAFF_ORIGIN="https://support-conversations-ci.example";
 process.env.STAFF_SESSION_PEPPER="disposable-ci-only-conversation-pepper-never-used-in-production";
 process.env.STAFF_BACKEND_ENABLED="true";
 process.env.NODE_ENV="production";
 const app=require("../server");
 const password="Training-Support-Conversation-Only-Strong-2026";
 test("simulated thread: role, access, no delivery, idempotency, safety and closed case",async()=>{
  const pool=new Pool({connectionString:url});let server;
  try{
   const ids=Array.from({length:4},()=>crypto.randomUUID());
   const roles=["support","support","manager","reviewer"],emails=["testthread-a@ci.invalid","testthread-b@ci.invalid","testthread-m@ci.invalid","testthread-r@ci.invalid"];
   const hash=await Auth.hashPassword(password);
   for(let i=0;i<ids.length;i++)await pool.query(
    "INSERT INTO industry_staff_accounts(id,email,password_hash,role) VALUES($1,$2,$3,$4)",[ids[i],emails[i],hash,roles[i]]);
   server=app.listen(0,"127.0.0.1");
   await once(server,"listening");
   const base="http://127.0.0.1:"+server.address().port;
   async function call(path,method="GET",body,cookie,origin="https://support-conversations-ci.example"){
    return fetch(base+"/api/staff"+path,{method,headers:{
     ...(cookie?{cookie}:{}),...(body?{"Content-Type":"application/json",origin}:{})},
     ...(body?{body:JSON.stringify(body)}:{})});
   }
   async function login(email){
    const res=await call("/login","POST",{email,password});
    assert.equal(res.status,200);
    const cookie=res.headers.get("set-cookie");
    assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
    return cookie.split(";")[0];
   }
   const a=await login(emails[0]),b=await login(emails[1]),mgr=await login(emails[2]),reviewer=await login(emails[3]);
   const created=await call("/support/cases","POST",{
    subject:"Fictional customer training question",requesterAlias:"ImaginaryBuilder",
    description:"An invented adult asks how to find illustrative onboarding steps.",
    category:"general",priority:"normal",syntheticAdultTest:true
   },mgr);
   assert.equal(created.status,201);
   const cid=(await created.json()).data.id;
   const invalidCase=await call("/support/cases","POST",{
    subject:"Second fictional training sample",requesterAlias:"ImaginaryGuest",
    description:"Another imaginary adult case for testing invalid training inputs.",
    category:"general",priority:"low",syntheticAdultTest:true
   },mgr);
   assert.equal(invalidCase.status,201);
   const validationPath="/support/cases/"+(await invalidCase.json()).data.id+"/training-thread";
   const path="/support/cases/"+cid+"/training-thread";
   assert.equal((await call(path)).status,401);
   assert.equal((await call(path,"GET",undefined,reviewer)).status,403);
   assert.equal((await call(path,"GET",undefined,a)).status,404);
   assert.equal((await call(path,"GET",undefined,b)).status,404);
   let thread=await call(path,"GET",undefined,mgr);
   assert.equal(thread.status,200);
   let initial=await thread.json();
   assert.deepEqual(initial.data,[]);assert.equal(initial.outboundDelivery,false);assert.equal(initial.customerAuthenticated,false);
   const question={speaker:"customer_simulated",body:"Hello, where are the sample project onboarding instructions?",requestId:crypto.randomUUID(),syntheticAdultTest:true};
   assert.equal((await call(validationPath,"POST",question,mgr,"https://other.example")).status,403);
   assert.equal((await call(validationPath,"POST",{...question,sendToEmail:true},mgr)).status,400);
   assert.equal((await call(validationPath,"POST",{...question,body:"Call 12345678900"},mgr)).status,400);
   assert.equal((await call(validationPath,"POST",{...question,speaker:"real_customer"},mgr)).status,400);
   const sent=await call(path,"POST",question,mgr);
   assert.equal(sent.status,201);
   const first=await sent.json();
   assert.equal(first.outboundDelivery,false);assert.equal(first.syntheticAdultTest,true);
   const replay=await call(path,"POST",question,mgr);
   assert.equal(replay.status,200);
   assert.equal((await replay.json()).idempotentReplay,true);
   assert.equal((await call(path,"POST",{...question,body:"Different simulated text must not reuse the message request."},mgr)).status,409);
   const agentUp=await call("/support/profile","PATCH",{
    displayName:"Training Agent One",availability:"available",avatarPreset:"orbit"
   },a);
   assert.equal(agentUp.status,200);
   assert.equal((await call("/support/cases/"+cid+"/claim","POST",{},a)).status,200);
   assert.equal((await call(path,"GET",undefined,b)).status,404);
   assert.equal((await call(path,"POST",{speaker:"customer_simulated",
    body:"A fake customer cannot be impersonated by regular support agents.",
    requestId:crypto.randomUUID(),syntheticAdultTest:true},a)).status,400);
   const agentReply={
    speaker:"agent_simulated",body:"In this fictional training case, please open the sample checklist.",
    requestId:crypto.randomUUID(),syntheticAdultTest:true
   };
   const replied=await call(path,"POST",agentReply,a);
   assert.equal(replied.status,201);
   assert.equal((await replied.json()).outboundDelivery,false);
   assert.equal((await call(path,"POST",agentReply,b)).status,404);
   thread=await call(path,"GET",undefined,a);
   assert.equal(thread.status,200);
   const stored=await thread.json();
   assert.equal(stored.data.length,2);
   assert.equal(stored.data.some(x=>x.speaker==="agent_simulated"),true);
   assert.equal(stored.data.some(x=>x.speaker==="customer_simulated"),true);
   assert.equal(JSON.stringify(stored).includes("@ci.invalid"),false);
   const messageCount=await pool.query("SELECT COUNT(*)::int AS n,BOOL_OR(external_delivery) AS outbound FROM industry_support_training_messages WHERE case_id=$1",[cid]);
   assert.equal(messageCount.rows[0].n,2);
   assert.equal(messageCount.rows[0].outbound,false);
   const eventCount=await pool.query(
    "SELECT COUNT(*)::int AS n FROM industry_support_case_events WHERE case_id=$1 AND event_type='training_message_posted'",[cid]);
   assert.equal(eventCount.rows[0].n,2);
   assert.equal((await call("/support/cases/"+cid+"/status","POST",{status:"resolved"},a)).status,200);
   assert.equal((await call(path,"POST",{...agentReply,requestId:crypto.randomUUID()},a)).status,409);
   assert.equal((await call("/support/cases/"+cid+"/status","POST",{status:"closed"},mgr)).status,200);
   assert.equal((await call(path,"GET",undefined,a)).status,200);
   assert.equal((await call(path,"POST",{...agentReply,requestId:crypto.randomUUID()},mgr)).status,409);
  }finally{
   if(server?.listening)await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
   await pool.end();
  }
 });
}
