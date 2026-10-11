"use strict";
/* Staff-only synthetic conversation trainer. No network send, real customer inbox, or external delivery. */
const express=require("express"),crypto=require("node:crypto");
const Core=require("./support-case-core"),Training=require("./support-training-core");
const uuid=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const fields="id,sender_kind,body,created_at,simulation_only,external_delivery";
function router({poolForStaff,requireOrigin,rateLimit}){
 const r=express.Router(),db=()=>poolForStaff();
 const fail=(res,e)=>{console.error("Training chat error:",e?.code||e?.name||"unknown");return res.status(503).json({error:"Training conversation unavailable."});};
 r.use((req,res,next)=>Core.isSupportRole(req.staff?.role)?next():res.status(403).json({error:"Human support role required."}));
 async function selectCase(client,id,staff,lock=false){
  const row=await client.query("SELECT id,assigned_staff_id,status FROM industry_support_cases WHERE id=$1"+(lock?" FOR UPDATE":""),[id]);
  if(!row.rowCount||!Training.canRead(row.rows[0],staff))return null;
  return row.rows[0];
 }
 r.get("/cases/:id/conversation",async(req,res)=>{
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid case ID."});
  try{
   const item=await selectCase(db(),req.params.id,req.staff);
   if(!item)return res.status(404).json({error:"Training conversation not found."});
   const messages=await db().query(
    "SELECT "+fields+" FROM industry_support_training_messages WHERE case_id=$1 ORDER BY created_at DESC,id DESC LIMIT 60",[req.params.id]);
   return res.json({data:messages.rows.reverse(),caseStatus:item.status,simulationOnly:true,
    realCustomerConnected:false,outboundMessagingEnabled:false});
  }catch(e){return fail(res,e);}
 });
 async function insert(req,res,senderKind){
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid case ID."});
  if(senderKind==="customer_simulator"&&req.staff.role!=="manager")
   return res.status(403).json({error:"Manager training simulator permission required."});
  let input;try{input=Training.validate(req.body);}catch(e){return res.status(400).json({error:e.message});}
  let client;try{client=await db().connect();}catch(e){return fail(res,e);}
  try{
   await client.query("BEGIN");
   const item=await selectCase(client,req.params.id,req.staff,true);
   if(!item){await client.query("ROLLBACK");return res.status(404).json({error:"Training conversation not found."});}
   if(!Training.canWrite(item,req.staff)){
    await client.query("ROLLBACK");return res.status(409).json({error:"Case is read-only until reopened or reviewed."});
   }
   const result=await client.query(
    "INSERT INTO industry_support_training_messages(id,case_id,sender_kind,actor_staff_id,body,idempotency_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING "+fields,
    [crypto.randomUUID(),req.params.id,senderKind,req.staff.id,input.message,input.requestId]);
   if(!result.rowCount){
    const prior=await client.query(
     "SELECT "+fields+" FROM industry_support_training_messages WHERE case_id=$1 AND actor_staff_id=$2 AND idempotency_key=$3",
     [req.params.id,req.staff.id,input.requestId]);
    await client.query("ROLLBACK");
    if(!prior.rowCount||prior.rows[0].sender_kind!==senderKind||prior.rows[0].body!==input.message)
     return res.status(409).json({error:"Request ID already used for a different training message."});
    return res.json({data:prior.rows[0],deduplicated:true,simulationOnly:true,outboundSent:false});
   }
   await client.query(
    "INSERT INTO industry_support_case_events(id,case_id,actor_id,event_type) VALUES($1,$2,$3,'training_message_added')",
    [crypto.randomUUID(),req.params.id,req.staff.id]);
   await client.query("COMMIT");
   return res.status(201).json({data:result.rows[0],simulationOnly:true,outboundSent:false});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return fail(res,e);}finally{client.release();}
 }
 r.post("/cases/:id/conversation",rateLimit,requireOrigin,(req,res)=>insert(req,res,"human_agent"));
 r.post("/cases/:id/simulate-customer",rateLimit,requireOrigin,(req,res)=>insert(req,res,"customer_simulator"));
 return r;
}
module.exports={router};
