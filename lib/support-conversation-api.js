"use strict";
/* Private, adult-only training threads: NOT customer messaging, NO outbound delivery. */
const express=require("express"),crypto=require("node:crypto");
const Core=require("./support-case-core");
const Messages=require("./support-conversation-core");
const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
function router({poolForStaff,rateLimit,requireOrigin}){
 const r=express.Router(),db=()=>poolForStaff();
 const failure=(res,e)=>{
  console.error("Support training thread unavailable:",e?.code||e?.name||"unknown");
  return res.status(503).json({error:"Training conversation unavailable."});
 };
 const isManager=req=>req.staff.role==="manager";
 r.use((req,res,next)=>Core.isSupportRole(req.staff?.role)?next():res.status(403).json({error:"Human support permissions required."}));
 r.get("/cases/:caseId/training-thread",async(req,res)=>{
  if(!uuid(req.params.caseId))return res.status(400).json({error:"Invalid case ID."});
  try{
   const exists=await db().query("SELECT id,subject,status FROM industry_support_cases WHERE id=$1 AND "+(isManager(req)?"TRUE":"assigned_staff_id=$2"),
    isManager(req)?[req.params.caseId]:[req.params.caseId,req.staff.id]);
   if(!exists.rowCount)return res.status(404).json({error:"Training case not found."});
   const messages=await db().query(
    "SELECT id,speaker,body,created_at FROM industry_support_training_messages WHERE case_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100",
    [req.params.caseId]);
   return res.json({case:exists.rows[0],data:messages.rows.reverse(),
    syntheticAdultTest:true,outboundDelivery:false,customerAuthenticated:false,realCustomerMessagingEnabled:false,
    limitedToLast:100});
  }catch(e){return failure(res,e);}
 });
 r.post("/cases/:caseId/training-thread",rateLimit,requireOrigin,async(req,res)=>{
  if(!uuid(req.params.caseId))return res.status(400).json({error:"Invalid case ID."});
  let values;
  try{values=Messages.validateTrainingMessage(req.body,req.staff.role);}
  catch(e){return res.status(400).json({error:e.message});}
  let client;try{client=await db().connect();}catch(e){return failure(res,e);}
  try{
   await client.query("BEGIN");
   // Row lock serializes post/reassign/close for one ticket and prevents authorization races.
   const item=await client.query(
    "SELECT id,assigned_staff_id,status FROM industry_support_cases WHERE id=$1 FOR UPDATE",
    [req.params.caseId]);
   if(!item.rowCount||(!isManager(req)&&item.rows[0].assigned_staff_id!==req.staff.id)){
    await client.query("ROLLBACK");return res.status(404).json({error:"Training case not found."});
   }
   if(["closed","resolved","escalated"].includes(item.rows[0].status)){
    await client.query("ROLLBACK");return res.status(409).json({error:"This case is read-only in its current status."});
   }
   const written=await client.query(
    "INSERT INTO industry_support_training_messages(id,case_id,actor_staff_id,request_id,speaker,body) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(case_id,actor_staff_id,request_id) DO NOTHING RETURNING id,speaker,body,created_at",
    [crypto.randomUUID(),req.params.caseId,req.staff.id,values.requestId,values.speaker,values.body]);
   if(!written.rowCount){
    const prev=await client.query(
     "SELECT id,speaker,body,created_at FROM industry_support_training_messages WHERE case_id=$1 AND actor_staff_id=$2 AND request_id=$3",
     [req.params.caseId,req.staff.id,values.requestId]);
    if(!prev.rowCount||prev.rows[0].speaker!==values.speaker||prev.rows[0].body!==values.body){
     await client.query("ROLLBACK");return res.status(409).json({error:"Duplicate request ID cannot be used with different content."});
    }
    await client.query("COMMIT");
    return res.json({data:prev.rows[0],idempotentReplay:true,outboundDelivery:false,syntheticAdultTest:true});
   }
   await client.query(
    "INSERT INTO industry_support_case_events(id,case_id,actor_id,event_type,body) VALUES($1,$2,$3,'training_message_posted',$4)",
    [crypto.randomUUID(),req.params.caseId,req.staff.id,values.speaker]);
   await client.query("COMMIT");
   return res.status(201).json({data:written.rows[0],outboundDelivery:false,syntheticAdultTest:true,idempotentReplay:false});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return failure(res,e);}
  finally{client.release();}
 });
 return r;
}
module.exports={router};