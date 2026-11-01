"use strict";
/* INTERNAL ONLY: future verified-customer session + trusted AI assessment service.
 * No public route, no browser-controlled customer identity, no demo-issued grants.
 * Call only inside an authenticated customer workflow after independent authorization.
 */
const crypto=require("node:crypto");
const Policy=require("./support-handoff-core");
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function verifiedContext(ctx){
 if(!ctx||ctx.source!=="verified_customer_session"||ctx.serverAuthenticated!==true||
    typeof ctx.subjectHash!=="string"||!/^[a-f0-9]{64}$/.test(ctx.subjectHash))
  throw Error("Verified customer session required.");
 return ctx.subjectHash;
}
function aiContext(assessment){
 const decision=Policy.decisionFromVerifiedAI(assessment);
 if(!decision.offerHuman||!UUID.test(assessment.assessmentId))
  throw Error("A unique trusted unresolved AI assessment is required.");
 return decision;
}
async function issue(client,{session,assessment,caseId}){
 const hash=verifiedContext(session),decision=aiContext(assessment);
 if(!UUID.test(caseId))throw Error("Valid case ID required.");
 const id=crypto.randomUUID();
 // Database constraint and unique AI assessment prevent duplicate issuance and long expiry.
 const result=await client.query(
  "INSERT INTO industry_support_handoff_grants(id,customer_subject_hash,case_id,ai_assessment_id,reason,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes') RETURNING id,case_id,reason,expires_at",
  [id,hash,caseId,assessment.assessmentId,decision.reason]);
 await client.query("INSERT INTO industry_support_handoff_events(id,grant_id,event_type) VALUES($1,$2,'issued')",
  [crypto.randomUUID(),id]);
 return result.rows[0];
}
async function redeem(client,{session,grantId,caseId}){
 const hash=verifiedContext(session);
 if(!UUID.test(grantId)||!UUID.test(caseId))throw Error("Valid handoff and case IDs required.");
 // Atomic UPDATE is the authority. A preliminary JS check is not safe against racing tabs.
 const result=await client.query(
  "UPDATE industry_support_handoff_grants SET consumed_at=now() WHERE id=$1 AND customer_subject_hash=$2 AND case_id=$3 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>now() RETURNING id,case_id",
  [grantId,hash,caseId]);
 if(!result.rowCount)return {accepted:false};
 await client.query("INSERT INTO industry_support_handoff_events(id,grant_id,event_type) VALUES($1,$2,'redeemed')",
  [crypto.randomUUID(),grantId]);
 return {accepted:true,caseId:result.rows[0].case_id};
}
async function revoke(client,{session,grantId,caseId}){
 const hash=verifiedContext(session);
 if(!UUID.test(grantId)||!UUID.test(caseId))throw Error("Valid handoff and case IDs required.");
 const result=await client.query(
  "UPDATE industry_support_handoff_grants SET revoked_at=now() WHERE id=$1 AND customer_subject_hash=$2 AND case_id=$3 AND consumed_at IS NULL AND revoked_at IS NULL RETURNING id",
  [grantId,hash,caseId]);
 if(result.rowCount)await client.query(
  "INSERT INTO industry_support_handoff_events(id,grant_id,event_type) VALUES($1,$2,'revoked')",
  [crypto.randomUUID(),grantId]);
 return {revoked:!!result.rowCount};
}
module.exports={issue,redeem,revoke,verifiedContext,aiContext};
