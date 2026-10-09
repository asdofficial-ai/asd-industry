"use strict";
/* Server-owned staff API. NEVER mounted for real minors or production decisions
 * without age/privacy legal review, staff MFA, audited procedures and external assessment. */
const express=require("express");
const crypto=require("node:crypto");
const {Pool}=require("pg");
const StaffPreview=require("../public/staff-core");
const Auth=require("./staff-auth-core");
const MFA=require("./staff-mfa");
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
   `SELECT a.id,a.email,a.role FROM industry_staff_sessions s
    JOIN industry_staff_accounts a ON a.id=s.staff_id
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
    aiMayApprove:false,realMinorAccounts:false,realTeamMessaging:false}));
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
   if(record.rows[0].role==="founder"){
    // Password alone can never unlock Founder permissions.
    const mfa=await poolForStaff().query(
     "SELECT secret_ciphertext,last_accepted_counter FROM industry_staff_mfa WHERE staff_id=$1",
     [record.rows[0].id]);
    if(!mfa.rowCount)return res.status(401).json({error:"Founder authenticator setup required."});
    const otp=typeof req.body?.totp==="string"?req.body.totp:"";
    let counter=null;
    try{
     const seed=MFA.unseal(mfa.rows[0].secret_ciphertext,record.rows[0].id,process.env.STAFF_MFA_KEY);
     counter=MFA.validCounter(seed,otp,Date.now(),Number(mfa.rows[0].last_accepted_counter));
    }catch{return res.status(401).json({error:"Invalid staff credentials or authenticator code."});}
    if(counter===null)return res.status(401).json({error:"Invalid staff credentials or authenticator code."});
    // Atomic replay protection across concurrent sessions.
    const consumed=await poolForStaff().query(
     "UPDATE industry_staff_mfa SET last_accepted_counter=$2 WHERE staff_id=$1 AND last_accepted_counter<$2",
     [record.rows[0].id,counter]);
    if(!consumed.rowCount)return res.status(401).json({error:"Authenticator code already used."});
   }
   const token=crypto.randomBytes(32).toString("base64url");
   await poolForStaff().query("INSERT INTO industry_staff_sessions(id,staff_id,token_hash,expires_at) VALUES($1,$2,$3,$4)",
     [crypto.randomUUID(),record.rows[0].id,tokenDigest(token),new Date(Date.now()+SESSION_MS)]);
   setCookie(res,token);res.json({staff:{email:record.rows[0].email,role:record.rows[0].role}});
  }catch(e){failure(res,e);}
 });
 r.use(currentStaff);
 r.get("/me",(req,res)=>res.json({staff:{email:req.staff.email,role:req.staff.role}}));
 r.get("/founder/overview",async(req,res)=>{
  // Owner-only read model: never authorize with a client-side flag or theme setting.
  if(req.staff.role!=="founder")return res.status(403).json({error:"Founder authorization required."});
  try{
   const conn=poolForStaff();
   const [counts,staffDirectory,latestRequests,audit,agents,preferences]=await Promise.all([
    conn.query(`SELECT
      (SELECT count(*)::integer FROM industry_review_requests) AS projects,
      (SELECT count(*)::integer FROM industry_review_requests WHERE status='pending') AS pending,
      (SELECT count(*)::integer FROM industry_review_requests WHERE status='approved') AS approved,
      (SELECT count(*)::integer FROM industry_review_requests WHERE status='changes_requested') AS "changesRequested",
      (SELECT count(*)::integer FROM industry_staff_accounts WHERE enabled=true) AS staff`),
    conn.query(`SELECT id,email,role,enabled FROM industry_staff_accounts
      ORDER BY CASE role WHEN 'founder' THEN 0 WHEN 'reviewer' THEN 1 ELSE 2 END,email LIMIT 100`),
    conn.query(`SELECT id,creator_label,title,category,requested_seats,status,created_at
      FROM industry_review_requests ORDER BY created_at DESC LIMIT 25`),
    conn.query(`SELECT a.action,a.created_at,s.role AS actor_role
      FROM industry_staff_audit a LEFT JOIN industry_staff_accounts s ON s.id=a.actor_id
      ORDER BY a.created_at DESC LIMIT 25`),
    conn.query(`SELECT agent_id,review_enabled,updated_at FROM industry_ai_agent_controls ORDER BY agent_id`),
    conn.query(`SELECT theme FROM industry_founder_preferences WHERE staff_id=$1`,[req.staff.id])
   ]);
   res.json({mode:"founder-authenticated",
    metrics:counts.rows[0],staffDirectory:staffDirectory.rows,
    latestRequests:latestRequests.rows,recentAudit:audit.rows,
    aiRoles:agents.rows,founderTheme:preferences.rows[0]?.theme||null,
    aiCanApprove:false,realYouthAccountsEnabled:false});
  }catch(e){failure(res,e);}
 });
 r.get("/founder/preferences",async(req,res)=>{
  if(req.staff.role!=="founder")return res.status(403).json({error:"Founder authorization required."});
  try{
   const q=await poolForStaff().query("SELECT theme FROM industry_founder_preferences WHERE staff_id=$1",[req.staff.id]);
   res.json({theme:q.rows[0]?.theme||"global-blue"});
  }catch(e){failure(res,e);}
 });
 r.put("/founder/preferences",requireOrigin,async(req,res)=>{
  if(req.staff.role!=="founder")return res.status(403).json({error:"Founder authorization required."});
  const theme=req.body?.theme;
  const themes=["command-red","luxury-gold","global-blue","visionary-green",
    "command-purple","industrial-orange","executive-white"];
  if(!themes.includes(theme))return res.status(400).json({error:"Choose a supported founder theme."});
  let client;try{client=await poolForStaff().connect();}catch(e){return failure(res,e);}
  try{
   await client.query("BEGIN");
   await client.query(`INSERT INTO industry_founder_preferences(staff_id,theme)
    VALUES($1,$2) ON CONFLICT(staff_id) DO UPDATE SET theme=$2,updated_at=now()`,[req.staff.id,theme]);
   await client.query(`INSERT INTO industry_staff_audit(id,actor_id,action,data)
     VALUES($1,$2,'founder.theme.changed',$3)`,
     [crypto.randomUUID(),req.staff.id,JSON.stringify({theme})]);
   await client.query("COMMIT");res.json({theme});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});failure(res,e);}finally{client.release();}
 });
 r.patch("/founder/agents/:id",requireOrigin,async(req,res)=>{
  if(req.staff.role!=="founder")return res.status(403).json({error:"Founder authorization required."});
  const id=req.params.id;
  if(!["intake","safety","feasibility","matching","operations"].includes(id)||
    typeof req.body?.reviewEnabled!=="boolean")
   return res.status(400).json({error:"Choose a valid staff role and boolean enabled value."});
  let client;try{client=await poolForStaff().connect();}catch(e){return failure(res,e);}
  try{
   await client.query("BEGIN");
   const updated=await client.query(`UPDATE industry_ai_agent_controls
     SET review_enabled=$2,updated_by=$3,updated_at=now() WHERE agent_id=$1
     RETURNING agent_id,review_enabled`,[id,req.body.reviewEnabled,req.staff.id]);
   if(!updated.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Staff role not found."});}
   await client.query(`INSERT INTO industry_staff_audit(id,actor_id,action,data)
    VALUES($1,$2,'founder.agent.policy',$3)`,
    [crypto.randomUUID(),req.staff.id,JSON.stringify({agentId:id,reviewEnabled:req.body.reviewEnabled})]);
   await client.query("COMMIT");
   res.json({agent:updated.rows[0],note:"Applies to deterministic report preparation only; real model execution remains disabled."});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});failure(res,e);}finally{client.release();}
 });
 r.patch("/founder/staff/:id",requireOrigin,async(req,res)=>{
  if(req.staff.role!=="founder")return res.status(403).json({error:"Founder authorization required."});
  if(!uuid(req.params.id)||typeof req.body?.enabled!=="boolean")
   return res.status(400).json({error:"Valid staff account and enabled setting required."});
  if(req.params.id===req.staff.id)return res.status(409).json({error:"You cannot deactivate your own Founder account."});
  let client;try{client=await poolForStaff().connect();}catch(e){return failure(res,e);}
  try{
   await client.query("BEGIN");
   const found=await client.query("SELECT id,role,enabled FROM industry_staff_accounts WHERE id=$1 FOR UPDATE",[req.params.id]);
   if(!found.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Staff account not found."});}
   if(found.rows[0].role==="founder"){await client.query("ROLLBACK");return res.status(403).json({error:"Other founder accounts cannot be managed here."});}
   const changed=found.rows[0].enabled!==req.body.enabled;
   if(changed){
    await client.query("UPDATE industry_staff_accounts SET enabled=$2 WHERE id=$1",[req.params.id,req.body.enabled]);
    if(!req.body.enabled)await client.query("DELETE FROM industry_staff_sessions WHERE staff_id=$1",[req.params.id]);
    await client.query(`INSERT INTO industry_staff_audit(id,actor_id,action,data)
     VALUES($1,$2,'founder.staff.access',$3)`,
     [crypto.randomUUID(),req.staff.id,JSON.stringify({staffId:req.params.id,enabled:req.body.enabled})]);
   }
   await client.query("COMMIT");res.json({ok:true,enabled:req.body.enabled,changed});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});failure(res,e);}finally{client.release();}
 });
 r.post("/logout",requireOrigin,async(req,res)=>{
  try{
   const token=getToken(req);
   if(token)await poolForStaff().query("DELETE FROM industry_staff_sessions WHERE token_hash=$1",[tokenDigest(token)]);
   setCookie(res,"",0);res.json({ok:true});
  }catch(e){failure(res,e);}
 });
 r.get("/queue",async(req,res)=>{
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
   const controls=await client.query("SELECT agent_id,review_enabled FROM industry_ai_agent_controls");
   const disabled=new Set(controls.rows.filter(a=>!a.review_enabled).map(a=>a.agent_id));
   packet.sections=packet.sections.filter(section=>!disabled.has(section.id));
   packet.disabledAgentIds=[...disabled];
   packet.cautionCount=packet.sections.reduce((count,section)=>count+section.flags.length,0);
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
