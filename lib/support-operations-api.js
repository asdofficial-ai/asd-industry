"use strict";
/* Agent availability and manager oversight; never changes authentication role or verified employee badge. */
const express=require("express"),crypto=require("node:crypto");
const Core=require("./support-case-core"),Ops=require("./support-operations-core");
const uuid=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function router({poolForStaff,rateLimit,requireOrigin}){
 const r=express.Router(),db=()=>poolForStaff(),changes=[rateLimit,requireOrigin];
 const error=(res,e)=>{console.error("Support operations failure:",e?.code||e?.name||"error");return res.status(503).json({error:"Support operations unavailable."});};
 const manager=req=>req.staff.role==="manager";
 r.use((req,res,next)=>Core.isSupportRole(req.staff?.role)?next():res.status(403).json({error:"Human support permissions required."}));
 r.get("/profile",async(req,res)=>{
  try{
   const rows=await db().query(
    "SELECT staff_id,display_name,avatar_preset,department,availability,updated_at FROM industry_support_agent_profiles WHERE staff_id=$1",[req.staff.id]);
   const profile=rows.rows[0]||{staff_id:req.staff.id,display_name:"Support Team Member",avatar_preset:"orbit",department:"general",availability:"offline",updated_at:null};
   return res.json({data:profile,role:req.staff.role,verifiedPublicBadge:!!req.staff.verified_public_badge,
    employeeVerificationEditable:false});
  }catch(e){return error(res,e);}
 });
 r.patch("/profile",...changes,async(req,res)=>{
  let data;try{data=Ops.validateAgentProfile(req.body);}catch(e){return res.status(400).json({error:e.message});}
  let client;try{client=await db().connect();}catch(e){return error(res,e);}
  try{
   await client.query("BEGIN");
   const r0=await client.query(
    "INSERT INTO industry_support_agent_profiles(staff_id,display_name,avatar_preset,availability) VALUES($1,$2,$3,$4) ON CONFLICT(staff_id) DO UPDATE SET display_name=EXCLUDED.display_name,avatar_preset=EXCLUDED.avatar_preset,availability=EXCLUDED.availability,updated_at=now() RETURNING staff_id,display_name,avatar_preset,department,availability,updated_at",
    [req.staff.id,data.displayName,data.avatarPreset,data.availability]);
   await client.query("INSERT INTO industry_support_team_audit(id,actor_id,target_id,action) VALUES($1,$2,$2,'profile_updated')",
    [crypto.randomUUID(),req.staff.id]);
   await client.query("COMMIT");
   return res.json({data:r0.rows[0],role:req.staff.role,verifiedPublicBadge:!!req.staff.verified_public_badge});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return error(res,e);}finally{client.release();}
 });
 r.get("/team",async(req,res)=>{
  if(!manager(req))return res.status(403).json({error:"Manager permissions required."});
  try{
   const rows=await db().query(
    "SELECT a.id AS staff_id,coalesce(p.display_name,'Support Team Member') AS display_name,coalesce(p.avatar_preset,'orbit') AS avatar_preset,coalesce(p.department,'general') AS department,coalesce(p.availability,'offline') AS availability,COUNT(c.id) FILTER (WHERE c.status NOT IN ('resolved','closed'))::int AS active_cases FROM industry_staff_accounts a LEFT JOIN industry_support_agent_profiles p ON p.staff_id=a.id LEFT JOIN industry_support_cases c ON c.assigned_staff_id=a.id WHERE a.role='support' AND a.enabled=true GROUP BY a.id,p.display_name,p.avatar_preset,p.department,p.availability ORDER BY display_name ASC,a.id LIMIT 75");
   return res.json({data:rows.rows});
  }catch(e){return error(res,e);}
 });
 r.patch("/team/:id/department",...changes,async(req,res)=>{
  if(!manager(req))return res.status(403).json({error:"Manager permissions required."});
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid staff identity."});
  let department;try{department=Ops.validateDepartment(req.body);}catch(e){return res.status(400).json({error:e.message});}
  let client;try{client=await db().connect();}catch(e){return error(res,e);}
  try{
   await client.query("BEGIN");
   const eligible=await client.query("SELECT id FROM industry_staff_accounts WHERE id=$1 AND role='support' AND enabled=true FOR UPDATE",[req.params.id]);
   if(!eligible.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Support employee not found."});}
   const r0=await client.query(
    "INSERT INTO industry_support_agent_profiles(staff_id,display_name,department) VALUES($1,'Support Team Member',$2) ON CONFLICT(staff_id) DO UPDATE SET department=EXCLUDED.department,updated_at=now() RETURNING staff_id,display_name,department,availability",
    [req.params.id,department]);
   await client.query("INSERT INTO industry_support_team_audit(id,actor_id,target_id,action) VALUES($1,$2,$3,'department_assigned')",
    [crypto.randomUUID(),req.staff.id,req.params.id]);
   await client.query("COMMIT");return res.json({data:r0.rows[0]});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return error(res,e);}finally{client.release();}
 });
 r.get("/escalations",async(req,res)=>{
  if(!manager(req))return res.status(403).json({error:"Manager permissions required."});
  try{
   const rows=await db().query(
    "SELECT e.id,e.case_id,e.category,e.reason,e.created_at,c.subject,c.priority,c.status,c.assigned_staff_id FROM industry_support_escalations e JOIN industry_support_cases c ON c.id=e.case_id WHERE e.state='pending' ORDER BY e.created_at ASC LIMIT 75");
   return res.json({data:rows.rows});
  }catch(e){return error(res,e);}
 });
 r.post("/cases/:id/escalation-review",...changes,async(req,res)=>{
  if(!manager(req))return res.status(403).json({error:"Manager permissions required."});
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid case ID."});
  let values;try{values=Ops.validateEscalationReview(req.body);}catch(e){return res.status(400).json({error:e.message});}
  let client;try{client=await db().connect();}catch(e){return error(res,e);}
  try{
   await client.query("BEGIN");
   // Case first, escalation second: same lock ordering as support's escalation writer.
   const target=await client.query("SELECT id,status FROM industry_support_cases WHERE id=$1 FOR UPDATE",[req.params.id]);
   if(!target.rowCount||target.rows[0].status!=="escalated"){await client.query("ROLLBACK");return res.status(409).json({error:"No active escalated case."});}
   const item=await client.query(
    "SELECT id,raised_by FROM industry_support_escalations WHERE case_id=$1 AND state='pending' FOR UPDATE",[req.params.id]);
   if(!item.rowCount){await client.query("ROLLBACK");return res.status(409).json({error:"No pending escalation."});}
   if(item.rows[0].raised_by===req.staff.id){await client.query("ROLLBACK");return res.status(403).json({error:"A different manager must review the escalation."});}
   const next=values.decision==="resolve"?"resolved":"in_progress";
   await client.query(
    "UPDATE industry_support_escalations SET state='reviewed',reviewed_by=$2,reviewed_at=now(),review_note=$3 WHERE id=$1",
    [item.rows[0].id,req.staff.id,values.note]);
   await client.query(
    "UPDATE industry_support_cases SET status=$2,updated_at=now() WHERE id=$1",
    [req.params.id,next]);
   await client.query(
    "INSERT INTO industry_support_case_events(id,case_id,actor_id,event_type,body,old_status,new_status) VALUES($1,$2,$3,'escalation_reviewed',$4,'escalated',$5)",
    [crypto.randomUUID(),req.params.id,req.staff.id,values.note,next]);
   await client.query("COMMIT");return res.json({status:next,reviewed:true,customerMessageSent:false});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return error(res,e);}finally{client.release();}
 });
 return r;
}
module.exports={router};