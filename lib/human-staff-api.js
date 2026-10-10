"use strict";
/* Server-owned staff API. NEVER mounted for real minors or production decisions
 * without age/privacy legal review, staff MFA, audited procedures and external assessment. */
const express=require("express");
const crypto=require("node:crypto");
const {Pool}=require("pg");
const StaffPreview=require("../public/staff-core");
const Auth=require("./staff-auth-core");
const Identity=require("./identity-roles");
const COOKIE="asd_industry_staff";
const SESSION_MS=4*60*60*1000;
const attempts=new Map();
let pool;
const isOn=()=>Auth.configured();
function poolForStaff(){
 if(!pool)pool=new Pool({connectionString:process.env.STAFF_DB_URL,max:4,connectionTimeoutMillis:5000,
 idleTimeoutMillis:30000});
 return pool;
}
function tokenDigest(token){return crypto.createHmac("sha256",process.env.STAFF_SESSION_PEPPER).update(token).digest("hex");}
function setCookie(res,token,maxAge=SESSION_MS/1000){
 res.setHeader("Set-Cookie",COOKIE+"="+token+"; Path=/api/staff; HttpOnly; Secure; SameSite=Strict; Max-Age="+maxAge);
}
function getToken(req){
 const cookie=req.get("cookie")||"";
 if(cookie.length>4096)return "";
 const part=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));
 const token=part?part.slice(COOKIE.length+1):"";
 return /^[a-zA-Z0-9_-]{43}$/.test(token)?token:"";
}
function failure(res,error){
 if(error?.code==="23505")return res.status(409).json({error:"A matching review record already exists."});
 if(error?.message&&/^(Invalid|Incomplete|Only|Choose|Human|Select|Sensitive)/.test(error.message))
  return res.status(400).json({error:error.message});
 console.error("Staff endpoint unavailable:",error?.code||error?.name||"unknown");
 return res.status(503).json({error:"Staff service temporarily unavailable."});
}
function rateLimit(req,res,next){
 const now=Date.now(),key=(req.ip||"unknown")+":"+req.path;
 if(attempts.size>3000)for(const [k,v] of attempts)if(now-v.start>15*60000)attempts.delete(k);
 const item=attempts.get(key);
 if(!item||now-item.start>15*60000){attempts.set(key,{start:now,count:1});return next();}
 if(++item.count>8){res.set("Retry-After","900");return res.status(429).json({error:"Too many attempts."});}
 next();
}
function requireOrigin(req,res,next){
 if(req.get("origin")!==process.env.STAFF_ORIGIN)return res.status(403).json({error:"Origin blocked."});
 if(req.get("content-type")?.split(";")[0].trim()!=="application/json")
  return res.status(415).json({error:"JSON required."});
 next();
}
async function currentStaff(req,res,next){
 try{
  const token=getToken(req);
  if(!token)return res.status(401).json({error:"Staff sign-in required."});
  const result=await poolForStaff().query(
   `SELECT a.id,a.email,a.role,
      (p.badge_verified_at IS NOT NULL AND p.directory_opt_in=true) AS verified_public_badge
    FROM industry_staff_sessions s
    JOIN industry_staff_accounts a ON a.id=s.staff_id
    LEFT JOIN industry_staff_public_profiles p ON p.staff_id=a.id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND a.enabled=true`,[tokenDigest(token)]);
  if(!result.rowCount)return res.status(401).json({error:"Session expired. Sign in again."});
  req.staff=result.rows[0];next();
 }catch(e){failure(res,e);}
}
const uuid=value=>typeof value==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
function router(){
 const r=express.Router();
 r.use((_req,res,next)=>{res.set("Cache-Control","no-store");next();});
 r.get("/status",(_req,res)=>res.json({enabled:isOn(),mode:isOn()?"adult-staff-testing":"disabled",
    aiMayApprove:false,realMinorAccounts:false,realTeamMessaging:false,
    humanStaffSeparated:true,aiAccountsAreNotEmployees:true,
    passwordRecoveryEnabled:false,founderEmergencyProfileEnabled:false}));
 r.get("/directory",async(_req,res)=>{
  if(!isOn()||process.env.STAFF_PUBLIC_DIRECTORY_ENABLED!=="true")
   return res.status(503).json({error:"Verified staff directory is not enabled."});
  try{
   const people=await poolForStaff().query(`SELECT p.display_name,a.role,p.badge_verified_at
     FROM industry_staff_public_profiles p
     JOIN industry_staff_accounts a ON a.id=p.staff_id
     WHERE p.directory_opt_in=true AND p.badge_verified_at IS NOT NULL AND a.enabled=true
     ORDER BY p.display_name ASC LIMIT 50`);
   return res.json({data:people.rows.map(person=>({
    displayName:person.display_name,
    badge:Identity.publicBadge({role:person.role,verifiedAt:person.badge_verified_at,
      directoryOptIn:true,staffActive:true})
   }))});
  }catch(_){return res.status(503).json({error:"Verified staff directory is unavailable."});}
 });
 r.use((_req,res,next)=>isOn()?next():res.status(503).json({error:"Human staff backend is disabled."}));
 r.use(express.json({limit:"10kb"}));
 r.post("/login",rateLimit,requireOrigin,async(req,res)=>{
  try{
   let email;try{email=Auth.emailAddress(req.body?.email);}catch{return res.status(401).json({error:"Invalid staff credentials."});}
   const password=req.body?.password;
   if(typeof password!=="string"||password.length>256)return res.status(401).json({error:"Invalid staff credentials."});
   const record=await poolForStaff().query("SELECT id,email,role,password_hash FROM industry_staff_accounts WHERE lower(email)=$1 AND enabled=true",[email]);
   const valid=record.rowCount&&await Auth.verifyPassword(password,record.rows[0].password_hash);
   if(!valid)return res.status(401).json({error:"Invalid staff credentials."});
   const token=crypto.randomBytes(32).toString("base64url");
   await poolForStaff().query("INSERT INTO industry_staff_sessions(id,staff_id,token_hash,expires_at) VALUES($1,$2,$3,$4)",
     [crypto.randomUUID(),record.rows[0].id,tokenDigest(token),new Date(Date.now()+SESSION_MS)]);
   setCookie(res,token);res.json({staff:{email:record.rows[0].email,role:record.rows[0].role}});
  }catch(e){failure(res,e);}
 });
 r.use(currentStaff);
 r.get("/me",(req,res)=>res.json({staff:{
  email:req.staff.email,role:req.staff.role,
  identityType:"human_employee",
  badge:req.staff.verified_public_badge?Identity.publicBadge({
   role:req.staff.role,staffActive:true,verifiedAt:new Date(),directoryOptIn:true
  }):null
 }}));
 r.get("/founder/overview",async(req,res)=>{
  if(!Identity.isFounder(req.staff.role))return res.status(403).json({error:"Founder access required."});
  try{
   const result=await poolForStaff().query(`SELECT
    (SELECT COUNT(*)::integer FROM industry_staff_accounts WHERE enabled=true) AS active_staff,
    (SELECT COUNT(*)::integer FROM industry_review_requests WHERE status='pending') AS pending_reviews,
    (SELECT COUNT(*)::integer FROM industry_staff_audit) AS audit_events`);
   return res.json({account:{role:"founder",identityType:"human_employee"},
    counts:result.rows[0],security:{
     emergencyContacts:"not_configured",mfa:"required_before_activation",
     humanRecovery:"not_configured",passwordsReadable:false,aiCanApprove:false
    }});
  }catch(e){return failure(res,e);}
 });
 r.get("/support/overview",(req,res)=>{
  if(!Identity.canHandleRecovery(req.staff.role))
   return res.status(403).json({error:"Human support access required."});
  return res.json({role:req.staff.role,identityType:"human_employee",
   recovery:{enabled:false,policy:"Verify ownership through an independently reviewed process; never retrieve, display or send old passwords."},
   allowPasswordLookup:false,canDecideProject:false});
 });
 r.post("/logout",requireOrigin,async(req,res)=>{
  try{
   const token=getToken(req);
   if(token)await poolForStaff().query("DELETE FROM industry_staff_sessions WHERE token_hash=$1",[tokenDigest(token)]);
   setCookie(res,"",0);res.json({ok:true});
  }catch(e){failure(res,e);}
 });
 // Staff-authenticated, dedicated human customer-support service. Never public or AI-accessible.
 r.use("/support",require("./support-case-api").router({poolForStaff,requireOrigin,rateLimit}));
 r.use("/support",require("./support-operations-api").router({poolForStaff,requireOrigin,rateLimit}));
 r.get("/manager/overview",async(req,res)=>{
  if(!["founder","manager"].includes(req.staff.role))return res.status(403).json({error:"Manager access required."});
  try{
   const r=await poolForStaff().query(`SELECT
    (SELECT COUNT(*)::integer FROM industry_review_requests WHERE status='pending') AS awaiting_human_review,
    (SELECT COUNT(*)::integer FROM industry_staff_reports) AS prepared_advisory_reports`);
   return res.json({role:req.staff.role,counts:r.rows[0],
    permissions:{mayReviewQueue:true,mayApproveProjects:req.staff.role==="founder",
     mayReadCustomerPasswords:false,mayAssignFounder:false,mayActivateHumanSupportRecovery:false}});
  }catch(e){return failure(res,e);}
 });
 r.get("/queue",async(req,res)=>{
  if(!Auth.canSeeReviewQueue(req.staff.role))return res.status(403).json({error:"Review-queue permissions required."});
  try{
   const result=await poolForStaff().query(`SELECT id,creator_label,title,category,requested_seats,status,version,created_at
     FROM industry_review_requests ORDER BY created_at DESC LIMIT 75`);
   res.json({requests:result.rows});
  }catch(e){failure(res,e);}
 });
 r.post("/intake",requireOrigin,async(req,res)=>{
  if(!Auth.canReview(req.staff.role))return res.status(403).json({error:"Reviewer permissions required."});
  try{
   const a=Auth.validateIntake(req.body);
   const id=crypto.randomUUID();
   const client=await poolForStaff().connect();
   try{
    await client.query("BEGIN");
    await client.query(`INSERT INTO industry_review_requests
      (id,creator_label,title,description,category,requested_seats,requested_roles,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id,a.creator,a.title,a.description,a.category,a.seats,a.roles,req.staff.id]);
    await client.query("INSERT INTO industry_staff_audit(id,actor_id,action,request_id) VALUES($1,$2,'intake.created',$3)",
      [crypto.randomUUID(),req.staff.id,id]);
    await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
   res.status(201).json({id,status:"pending"});
  }catch(e){failure(res,e);}
 });
 r.get("/requests/:id",async(req,res)=>{
  if(!Auth.canSeeReviewQueue(req.staff.role))return res.status(403).json({error:"Review access required."});
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid request ID."});
  try{
   const item=await poolForStaff().query("SELECT * FROM industry_review_requests WHERE id=$1",[req.params.id]);
   if(!item.rowCount)return res.status(404).json({error:"Review request not found."});
   const report=await poolForStaff().query(`SELECT id,request_version,engine,packet,created_at
       FROM industry_staff_reports WHERE request_id=$1 ORDER BY created_at DESC LIMIT 1`,[req.params.id]);
   res.json({request:item.rows[0],report:report.rows[0]||null});
  }catch(e){failure(res,e);}
 });
 r.post("/requests/:id/prepare",requireOrigin,async(req,res)=>{
  if(!Auth.canPrepare(req.staff.role))return res.status(403).json({error:"Staff permissions required."});
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid request ID."});
  const client=await poolForStaff().connect().catch(()=>null);
  if(!client)return res.status(503).json({error:"Staff database unavailable."});
  try{
   await client.query("BEGIN");
   const q=await client.query("SELECT * FROM industry_review_requests WHERE id=$1 FOR UPDATE",[req.params.id]);
   if(!q.rowCount||q.rows[0].status!=="pending"){await client.query("ROLLBACK");return res.status(409).json({error:"Request not pending."});}
   const row=q.rows[0], project={
    id:row.id,stage:"pending",title:row.title,description:row.description,category:row.category,
    seats:row.requested_seats,roles:row.requested_roles
   };
   const packet=StaffPreview.createPreviewReport(project);
   const reportId=crypto.randomUUID();
   await client.query(`INSERT INTO industry_staff_reports
    (id,request_id,request_version,engine,packet,prepared_by) VALUES($1,$2,$3,'deterministic-demo',$4,$5)`,
    [reportId,row.id,row.version,JSON.stringify(packet),req.staff.id]);
   await client.query(`INSERT INTO industry_staff_audit(id,actor_id,action,request_id,data)
    VALUES($1,$2,'report.prepared',$3,$4)`,[crypto.randomUUID(),req.staff.id,row.id,JSON.stringify({reportId})]);
   await client.query("COMMIT");
   res.json({report:{id:reportId,request_version:row.version,engine:"deterministic-demo",packet}});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});failure(res,e);}
  finally{client.release();}
 });
 r.post("/requests/:id/decision",requireOrigin,async(req,res)=>{
  if(!Auth.canReview(req.staff.role))return res.status(403).json({error:"Only human reviewers may make decisions."});
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid request ID."});
  let values;try{values=Auth.validateDecision(req.body);}catch(e){return failure(res,e);}
  let client;try{client=await poolForStaff().connect();}catch(e){return failure(res,e);}
  try{
   await client.query("BEGIN");
   const q=await client.query("SELECT id,status,version FROM industry_review_requests WHERE id=$1 FOR UPDATE",[req.params.id]);
   if(!q.rowCount||q.rows[0].status!=="pending"){
    await client.query("ROLLBACK");return res.status(409).json({error:"Application not pending."});
   }
   const report=await client.query(`SELECT id FROM industry_staff_reports
    WHERE id=$1 AND request_id=$2 AND request_version=$3`,
    [values.reportId,req.params.id,q.rows[0].version]);
   if(!report.rowCount){await client.query("ROLLBACK");return res.status(409).json({error:"A current staff report is required."});}
   const decisionId=crypto.randomUUID();
   await client.query(`INSERT INTO industry_human_decisions
    (id,request_id,report_id,reviewer_id,decision,rationale) VALUES($1,$2,$3,$4,$5,$6)`,
    [decisionId,req.params.id,values.reportId,req.staff.id,values.decision,values.rationale]);
   await client.query("UPDATE industry_review_requests SET status=$2,updated_at=now() WHERE id=$1",
     [req.params.id,values.decision]);
   await client.query(`INSERT INTO industry_staff_audit
    (id,actor_id,action,request_id,data) VALUES($1,$2,'review.decided',$3,$4)`,
    [crypto.randomUUID(),req.staff.id,req.params.id,JSON.stringify({decisionId,decision:values.decision,reportId:values.reportId})]);
   await client.query("COMMIT");
   res.json({ok:true,decision:values.decision,reviewer:req.staff.email});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});failure(res,e);}finally{client.release();}
 });
 return r;
}
module.exports={router,isOn};
