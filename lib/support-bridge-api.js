"use strict";
/**
 * PRIVATE human-support AI handoff training bridge.
 * Manager creates a synthetic inquiry. SERVER-OWNED approved knowledge evaluates it;
 * only a needs_human outcome becomes an actual staff inbox case and AI-labeled message.
 * NEVER mounted on public customer route; no real human delivery, email or model calls.
 */
const express=require("express"),crypto=require("node:crypto");
const KB=require("../public/support-knowledge");
const Core=require("./support-case-core");
const Handoff=require("./support-handoff-core");
const isUuid=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function router({poolForStaff,rateLimit,requireOrigin}){
 const r=express.Router();
 const db=()=>poolForStaff();
 const fail=(res,e)=>{console.error("AI handoff training bridge:",e?.code||e?.name||"unknown");
  return res.status(503).json({error:"Staff handoff training inbox unavailable."});};
 r.use((req,res,next)=>Core.isSupportRole(req.staff?.role)?next():res.status(403).json({error:"Human staff permissions required."}));
 r.get("/ai-handoffs",async(req,res)=>{
  try{
   const manager=req.staff.role==="manager";
   const rows=await db().query(
    "SELECT h.id,h.case_id,h.assessment_reason,h.created_at,c.subject,c.priority,c.status,c.assigned_staff_id "+
    "FROM industry_support_ai_handoffs h JOIN industry_support_cases c ON c.id=h.case_id "+
    "WHERE "+(manager?"TRUE":"(c.assigned_staff_id IS NULL OR c.assigned_staff_id=$1)")+
    " ORDER BY h.created_at DESC LIMIT 50",
    manager?[]:[req.staff.id]);
   return res.json({data:rows.rows,syntheticOnly:true,customerMessagesSent:false});
  }catch(e){return fail(res,e);}
 });
 r.post("/ai-handoffs/simulate",rateLimit,requireOrigin,async(req,res)=>{
  if(req.staff.role!=="manager")return res.status(403).json({error:"Only a human Manager can run the AI handoff simulator."});
  const data=req.body;
  if(!data||typeof data!=="object"||Array.isArray(data)||
   Object.keys(data).some(k=>!["question","requestId","syntheticAdultTest"].includes(k))||
   data.syntheticAdultTest!==true||!isUuid(data.requestId))
   return res.status(400).json({error:"A synthetic adult-test question and unique request ID are required."});
  let question;
  try{
   question=Core.validateNote({internalOnly:true,note:data.question});
   if(question.length<15||question.length>500)throw Error("Synthetic question must be 15–500 characters.");
  }catch(e){return res.status(400).json({error:e.message});}
  // Never trust the browser to assert what the AI answered or whether a human is eligible.
  const assessment=KB.respond(question);
  const decision=Handoff.decisionFromVerifiedAI({
   origin:"trusted_ai_service",verifiedServerSide:true,status:assessment.status,
   reason:assessment.status==="needs_human"?(assessment.reason||"cannot_answer"):null
  });
  if(!decision.offerHuman)
   return res.json({offered:false,aiAnswer:assessment.text,syntheticOnly:true,customerMessagesSent:false});
  const caseId=crypto.randomUUID(),handoffId=crypto.randomUUID();
  const message="AI Support could not resolve this fictional request. Reason: "+
   decision.reason+". Please review the sample question after claiming the case. "+
   "No real customer or AI model is connected.";
  let client;try{client=await db().connect();}catch(e){return fail(res,e);}
  try{
   await client.query("BEGIN");
   // Lock serializes repeated manager requests by requestId within this transaction.
   const pre=await client.query("SELECT h.id,h.case_id,h.question,h.created_by_manager "+
    "FROM industry_support_ai_handoffs h WHERE h.request_id=$1 FOR UPDATE",[data.requestId]);
   if(pre.rowCount){
    await client.query("ROLLBACK");
    if(pre.rows[0].created_by_manager!==req.staff.id||pre.rows[0].question!==question)
     return res.status(409).json({error:"Request ID belongs to a different handoff."});
    return res.json({offered:true,caseId:pre.rows[0].case_id,deduplicated:true,syntheticOnly:true});
   }
   await client.query(
    "INSERT INTO industry_support_cases(id,subject,requester_alias,description,category,priority,created_by) "+
    "VALUES($1,'AI handoff: sample request','SyntheticCustomer',$2,'general','normal',$3)",
    [caseId,question,req.staff.id]);
   await client.query(
    "INSERT INTO industry_support_ai_handoffs(id,request_id,case_id,created_by_manager,question,assessment_reason,knowledge_version) "+
    "VALUES($1,$2,$3,$4,$5,$6,$7)",
    [handoffId,data.requestId,caseId,req.staff.id,question,decision.reason,KB.version]);
   const messages=[
    {kind:"customer_simulator",body:question},
    {kind:"ai_support",body:message}
   ];
   for(const m of messages)
    await client.query("INSERT INTO industry_support_training_messages "+
     "(id,case_id,sender_kind,actor_staff_id,body,idempotency_key) VALUES($1,$2,$3,$4,$5,$6)",
     [crypto.randomUUID(),caseId,m.kind,req.staff.id,m.body,crypto.randomUUID()]);
   await client.query("INSERT INTO industry_support_case_events(id,case_id,actor_id,event_type) "+
    "VALUES($1,$2,$3,'ai_handoff_created')",[crypto.randomUUID(),caseId,req.staff.id]);
   await client.query("COMMIT");
   return res.status(201).json({offered:true,caseId,reason:decision.reason,
    inbox:"human_support",syntheticOnly:true,customerMessagesSent:false});
  }catch(e){
   await client.query("ROLLBACK").catch(()=>{});
   if(e?.code==="23505"){
    try{
     const previous=await db().query("SELECT case_id,question,created_by_manager "+
      "FROM industry_support_ai_handoffs WHERE request_id=$1",[data.requestId]);
     if(previous.rowCount&&previous.rows[0].created_by_manager===req.staff.id&&previous.rows[0].question===question)
      return res.json({offered:true,caseId:previous.rows[0].case_id,deduplicated:true,syntheticOnly:true});
     return res.status(409).json({error:"Request ID conflict."});
    }catch(x){return fail(res,x);}
   }
   return fail(res,e);
  }finally{client.release();}
 });
 return r;
}
module.exports={router};
