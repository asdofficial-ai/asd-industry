"use strict";
/* Restricted human staff support tickets. No public submissions, outgoing replies or live recovery. */
const express=require("express"),crypto=require("node:crypto");
const Core=require("./support-case-core");
const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const fields="id,subject,requester_alias,category,priority,status,assigned_staff_id,created_at,updated_at";
function router({poolForStaff,requireOrigin,rateLimit}){
 const r=express.Router(),db=()=>poolForStaff();
 const mutation=[rateLimit,requireOrigin];
 const error=(res,e)=>{console.error("Support API issue:",e?.code||e?.name||"error");return res.status(503).json({error:"Support service unavailable."});};
 const manager=req=>req.staff.role==="manager";
 const visibility=req=>manager(req)?"TRUE":"(assigned_staff_id IS NULL OR assigned_staff_id=$2)";
 const workAllowed=(row,req)=>manager(req)||row.assigned_staff_id===req.staff.id;
 async function event(client,caseId,actorId,type,body=null,from=null,to=null){
  await client.query("INSERT INTO industry_support_case_events(id,case_id,actor_id,event_type,body,old_status,new_status) VALUES($1,$2,$3,$4,$5,$6,$7)",
   [crypto.randomUUID(),caseId,actorId,type,body,from,to]);
 }
 r.use((req,res,next)=>Core.isSupportRole(req.staff?.role)?next():res.status(403).json({error:"Human support role required."}));
 r.get("/dashboard",async(req,res)=>{
  try{
   const rows=await db().query("SELECT count(*)::int AS total,count(*) FILTER(WHERE status='open')::int AS open,count(*) FILTER(WHERE status='in_progress')::int AS in_progress,count(*) FILTER(WHERE status='escalated')::int AS escalated,count(*) FILTER(WHERE status='resolved')::int AS resolved FROM industry_support_cases WHERE "+visibility(req),manager(req)?[]:[req.staff.id,req.staff.id]);
   return res.json({mode:"synthetic_adult_test_only",data:rows.rows[0],agentRole:req.staff.role,outboundMessagingEnabled:false,passwordRecoveryEnabled:false,aiMayResolveCases:false});
  }catch(e){return error(res,e);}
 });
 r.get("/agents",async(req,res)=>{
  if(!manager(req))return res.status(403).json({error:"Manager permissions required."});
  try{
   const rows=await db().query("SELECT id FROM industry_staff_accounts WHERE role='support' AND enabled=true ORDER BY created_at ASC LIMIT 75");
   return res.json({data:rows.rows});
  }catch(e){return error(res,e);}
 });
 r.get("/cases",async(req,res)=>{
  try{
   const rows=await db().query("SELECT "+fields+" FROM industry_support_cases WHERE "+visibility(req)+" ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,updated_at DESC LIMIT 75",manager(req)?[]:[req.staff.id,req.staff.id]);
   return res.json({data:rows.rows,mode:"synthetic_adult_test_only"});
  }catch(e){return error(res,e);}
 });
 r.post("/cases",...mutation,async(req,res)=>{
  let data;try{data=Core.validateNewCase(req.body);}catch(e){return res.status(400).json({error:e.message});}
  let client;try{client=await db().connect();}catch(e){return error(res,e);}
  const id=crypto.randomUUID();
  try{
   await client.query("BEGIN");
   const rows=await client.query("INSERT INTO industry_support_cases(id,subject,requester_alias,description,category,priority,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING "+fields,
    [id,data.subject,data.requesterAlias,data.description,data.category,data.priority,req.staff.id]);
   await event(client,id,req.staff.id,"created");
   await client.query("COMMIT");
   return res.status(201).json({data:rows.rows[0],synthetic:true,delivery:"not_sent"});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return error(res,e);}finally{client.release();}
 });
 r.get("/cases/:id",async(req,res)=>{
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid case ID."});
  try{
   const rows=await db().query("SELECT "+fields+",description FROM industry_support_cases WHERE id=$1 AND "+(manager(req)?"TRUE":"assigned_staff_id=$2"),manager(req)?[req.params.id]:[req.params.id,req.staff.id]);
   if(!rows.rowCount)return res.status(404).json({error:"Support case not found."});
   const notes=await db().query("SELECT event_type,body,old_status,new_status,created_at FROM industry_support_case_events WHERE case_id=$1 ORDER BY created_at ASC LIMIT 120",[req.params.id]);
   return res.json({data:rows.rows[0],events:notes.rows,internalOnly:true,outboundSent:false});
  }catch(e){return error(res,e);}
 });
 r.post("/cases/:id/claim",...mutation,async(req,res)=>{
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid case ID."});
  let client;try{client=await db().connect();}catch(e){return error(res,e);}
  try{
   await client.query("BEGIN");
   const rows=await client.query("UPDATE industry_support_cases SET assigned_staff_id=$2,status='in_progress',updated_at=now() WHERE id=$1 AND assigned_staff_id IS NULL AND status='open' RETURNING "+fields,[req.params.id,req.staff.id]);
   if(!rows.rowCount){await client.query("ROLLBACK");return res.status(409).json({error:"Case already claimed or unavailable."});}
   await event(client,req.params.id,req.staff.id,"claimed",null,"open","in_progress");
   await client.query("COMMIT");return res.json({data:rows.rows[0]});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return error(res,e);}finally{client.release();}
 });
 r.post("/cases/:id/assign",...mutation,async(req,res)=>{
  if(!manager(req))return res.status(403).json({error:"Manager permissions required."});
  if(!uuid(req.params.id)||!uuid(req.body?.agentId))return res.status(400).json({error:"Invalid case or agent ID."});
  let client;try{client=await db().connect();}catch(e){return error(res,e);}
  try{
   await client.query("BEGIN");
   const valid=await client.query("SELECT id FROM industry_staff_accounts WHERE id=$1 AND enabled=true AND role='support'",[req.body.agentId]);
   if(!valid.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Support agent not found."});}
   const rows=await client.query("UPDATE industry_support_cases SET assigned_staff_id=$2,status='in_progress',updated_at=now() WHERE id=$1 AND status IN ('open','in_progress','waiting_on_customer','escalated') RETURNING "+fields,[req.params.id,req.body.agentId]);
   if(!rows.rowCount){await client.query("ROLLBACK");return res.status(409).json({error:"Case cannot be reassigned."});}
   await event(client,req.params.id,req.staff.id,"assigned");
   await client.query("COMMIT");return res.json({data:rows.rows[0]});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return error(res,e);}finally{client.release();}
 });
 r.post("/cases/:id/note",...mutation,async(req,res)=>{
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid case ID."});
  let note;try{note=Core.validateNote(req.body);}catch(e){return res.status(400).json({error:e.message});}
  let client;try{client=await db().connect();}catch(e){return error(res,e);}
  try{
   await client.query("BEGIN");
   const item=await client.query("SELECT assigned_staff_id,status FROM industry_support_cases WHERE id=$1 FOR UPDATE",[req.params.id]);
   if(!item.rowCount||!workAllowed(item.rows[0],req)){await client.query("ROLLBACK");return res.status(404).json({error:"Support case not found."});}
   if(item.rows[0].status==="closed"){await client.query("ROLLBACK");return res.status(409).json({error:"Closed cases are read-only."});}
   await event(client,req.params.id,req.staff.id,"internal_note",note);
   await client.query("COMMIT");return res.status(201).json({ok:true,internalOnly:true,outboundSent:false});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return error(res,e);}finally{client.release();}
 });
 r.post("/cases/:id/status",...mutation,async(req,res)=>{
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid case ID."});
  let client;try{client=await db().connect();}catch(e){return error(res,e);}
  try{
   await client.query("BEGIN");
   const item=await client.query("SELECT assigned_staff_id,status FROM industry_support_cases WHERE id=$1 FOR UPDATE",[req.params.id]);
   if(!item.rowCount||!workAllowed(item.rows[0],req)){await client.query("ROLLBACK");return res.status(404).json({error:"Support case not found."});}
   const from=item.rows[0].status,to=req.body?.status;
   try{Core.authorizeTransition({role:req.staff.role,from,to});}
   catch(e){await client.query("ROLLBACK");return res.status(403).json({error:e.message});}
   const rows=await client.query("UPDATE industry_support_cases SET status=$2,updated_at=now(),closed_at=CASE WHEN $2='closed' THEN now() ELSE NULL END WHERE id=$1 RETURNING "+fields,[req.params.id,to]);
   await event(client,req.params.id,req.staff.id,"status_changed",null,from,to);
   await client.query("COMMIT");return res.json({data:rows.rows[0]});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return error(res,e);}finally{client.release();}
 });
 return r;
}
module.exports={router};