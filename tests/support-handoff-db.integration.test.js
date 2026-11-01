"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto"),{Pool}=require("pg");
const Store=require("../lib/support-handoff-store");
if(!process.env.STAFF_TEST_DATABASE_URL){
 test("handoff SQL requires disposable PostgreSQL",{skip:true},()=>{});
}else{
 const url=process.env.STAFF_TEST_DATABASE_URL;
 if(!url.includes("/asd_industry_staff"))throw Error("Refusing non-disposable database.");
 test("Postgres: trusted AI handoff is customer-bound, expires, is single-use and audited",async()=>{
  const pool=new Pool({connectionString:url});
  const customer={source:"verified_customer_session",serverAuthenticated:true,subjectHash:crypto.randomBytes(32).toString("hex")};
  const assessment=()=>({origin:"trusted_ai_service",verifiedServerSide:true,status:"needs_human",reason:"cannot_answer",assessmentId:crypto.randomUUID()});
  let client;
  try{
   client=await pool.connect();await client.query("BEGIN");
   // All data rolled back; the CI database contains no actual customers.
   const staffId=crypto.randomUUID(),caseId=crypto.randomUUID();
   await client.query("INSERT INTO industry_staff_accounts(id,email,password_hash,role) VALUES($1,$2,$3,'support')",
    [staffId,"handoff-"+staffId+"@ci.invalid","synthetic-hash-not-a-login"]);
   await client.query("INSERT INTO industry_support_cases(id,subject,requester_alias,description,category,priority,status,created_by) VALUES($1,$2,$3,$4,'technical','normal','open',$5)",
    [caseId,"Fictional AI escalation","SampleAdult","Entirely fictional adult support scenario for security testing.",staffId]);
   const assessment1=assessment();
   const grant=await Store.issue(client,{session:customer,assessment:assessment1,caseId});
   assert.equal(grant.case_id,caseId);
   await client.query("SAVEPOINT before_duplicate");
   await assert.rejects(Store.issue(client,{session:customer,assessment:assessment1,caseId}),/duplicate key/);
   await client.query("ROLLBACK TO SAVEPOINT before_duplicate");
   const wrong={...customer,subjectHash:crypto.randomBytes(32).toString("hex")};
   assert.deepEqual(await Store.redeem(client,{session:wrong,grantId:grant.id,caseId}),{accepted:false});
   const ok=await Store.redeem(client,{session:customer,grantId:grant.id,caseId});
   assert.deepEqual(ok,{accepted:true,caseId});
   assert.deepEqual(await Store.redeem(client,{session:customer,grantId:grant.id,caseId}),{accepted:false});
   const second=await Store.issue(client,{session:customer,assessment:assessment(),caseId});
   await client.query("UPDATE industry_support_handoff_grants SET issued_at=now()-interval '12 minutes',expires_at=now()-interval '2 minutes' WHERE id=$1",[second.id]);
   assert.deepEqual(await Store.redeem(client,{session:customer,grantId:second.id,caseId}),{accepted:false});
   const third=await Store.issue(client,{session:customer,assessment:assessment(),caseId});
   assert.deepEqual(await Store.revoke(client,{session:customer,grantId:third.id,caseId}),{revoked:true});
   assert.deepEqual(await Store.redeem(client,{session:customer,grantId:third.id,caseId}),{accepted:false});
   const events=await client.query("SELECT event_type FROM industry_support_handoff_events WHERE grant_id=$1 ORDER BY created_at",[grant.id]);
   assert.deepEqual(events.rows.map(x=>x.event_type),["issued","redeemed"]);
  }finally{
   if(client){await client.query("ROLLBACK").catch(()=>{});client.release();}
   await pool.end();
  }
 });
}
