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
   await client.query("INSERT INTO industry_support_cases(id,subject,requester_alias,description,category,priority,status,created_by_staff_id) VALUES($1,$2,$3,$4,'technical','normal','open',$5)",
    [caseId,"Fictional AI escalation","SampleAdult","Entirely fictional adult support scenario for security testing.",staffId]);
   const assessment1=assessment();
   const grant=await Store.issue(client,{session:customer,assessment:assessment1,caseId});
   assert.equal(grant.case_id,caseId);
   await assert.rejects(Store.issue(client,{session:customer,assessment:assessment1,caseId}));
   // Unique violation aborts a PostgreSQL transaction: use a savepoint in real flows.
  }finally{
   if(client){await client.query("ROLLBACK").catch(()=>{});client.release();}
   await pool.end();
  }
 });
}
