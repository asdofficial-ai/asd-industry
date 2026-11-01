"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto"),fs=require("node:fs"),path=require("node:path");
const Store=require("../lib/support-handoff-store");
const session={source:"verified_customer_session",serverAuthenticated:true,subjectHash:"a".repeat(64)};
const assessment={origin:"trusted_ai_service",verifiedServerSide:true,status:"needs_human",reason:"cannot_answer",assessmentId:crypto.randomUUID()};
const caseId=crypto.randomUUID();
test("handoff cannot originate from browser, solved AI answer, or unauthenticated customer",()=>{
 assert.throws(()=>Store.verifiedContext({subjectHash:"a".repeat(64)}),/Verified/);
 assert.throws(()=>Store.verifiedContext({...session,subjectHash:"customer@example.com"}),/Verified/);
 assert.throws(()=>Store.aiContext({...assessment,origin:"browser"}),/Untrusted/);
 assert.throws(()=>Store.aiContext({...assessment,status:"answered"}),/unresolved/);
 assert.throws(()=>Store.aiContext({...assessment,assessmentId:"forged"}),/unique/);
});
test("grant issuance binds verified session, case and unique AI assessment",async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{calls.push({sql,args});return {rowCount:1,rows:[{id:args?.[0],case_id:caseId,reason:"cannot_answer"}]};}};
 await Store.issue(db,{session,assessment,caseId});
 assert.match(calls[0].sql,/INSERT INTO industry_support_handoff_grants/);
 assert.equal(calls[0].args[1],session.subjectHash);
 assert.equal(calls[0].args[2],caseId);
 assert.equal(calls[0].args[3],assessment.assessmentId);
 assert.equal(calls.length,2);
 assert.match(calls[1].sql,/event_type/);
});
test("redemption uses single conditional UPDATE; replay or expired grant cannot succeed",async()=>{
 const grantId=crypto.randomUUID(),calls=[];
 let consumed=false;
 const db={query:async(sql,args)=>{
  calls.push({sql,args});
  if(sql.startsWith("UPDATE")){
   if(consumed)return {rowCount:0,rows:[]};
   consumed=true;return {rowCount:1,rows:[{id:grantId,case_id:caseId}]};
  }
  return {rowCount:1,rows:[]};
 }};
 const first=await Store.redeem(db,{session,grantId,caseId});
 const second=await Store.redeem(db,{session,grantId,caseId});
 assert.deepEqual(first,{accepted:true,caseId});
 assert.deepEqual(second,{accepted:false});
 assert.equal(calls.filter(x=>x.sql.startsWith("INSERT")).length,1);
 assert.match(calls[0].sql,/consumed_at IS NULL/);
 assert.match(calls[0].sql,/revoked_at IS NULL/);
 assert.match(calls[0].sql,/expires_at>now\(\)/);
 assert.equal(calls[0].args[1],session.subjectHash);
 assert.equal(calls[0].args[2],caseId);
});
test("handoff is not mounted on a public route, staff route or demo AI",()=>{
 const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
 const staff=fs.readFileSync(path.join(__dirname,"../lib/human-staff-api.js"),"utf8");
 const ai=fs.readFileSync(path.join(__dirname,"../lib/customer-support-ai.js"),"utf8");
 for(const s of [server,staff,ai])assert.doesNotMatch(s,/support-handoff-store|handoff_grants/);
 const sql=fs.readFileSync(path.join(__dirname,"../db/migrations/007_ai_human_handoff_grants.sql"),"utf8");
 assert.match(sql,/consumed_at/);
 assert.match(sql,/ai_assessment_id uuid NOT NULL UNIQUE/);
 assert.match(sql,/15 minutes/);
});
