"use strict";
/* Runs only against ephemeral, disposable Postgres in GitHub Actions.
 * Never point STAFF_DB_URL at a personal or production database for this test. */
const test=require("node:test");
const assert=require("node:assert/strict");
const {once}=require("node:events");
const crypto=require("node:crypto");
const {Pool}=require("pg");
const Auth=require("../lib/staff-auth-core");
if(!process.env.STAFF_TEST_DATABASE_URL) {
 test("database integration requires a disposable STAFF_TEST_DATABASE_URL", {skip:true},()=>{});
} else {
 const URL=process.env.STAFF_TEST_DATABASE_URL;
 if(!URL.includes("/asd_industry_staff"))throw Error("Refusing an unexpected integration test database.");
 const origin="https://staff-ci.example";
 process.env.STAFF_DB_URL=URL;
 process.env.STAFF_ORIGIN=origin;
 process.env.STAFF_SESSION_PEPPER="ci-only-ephemeral-not-a-production-session-secret-2026";
 process.env.STAFF_BACKEND_ENABLED="true";
 process.env.NODE_ENV="production";
 const app=require("../server");
 let pool, server,base,ownerId,safetyId;
 const pass="CI-only-fake-staff-password-2026!";
 const json=(data)=>({method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify(data)});
 const request=(path,options)=>fetch(base+"/api/staff"+path,options);
 function cookie(response){
  const value=response.headers.get("set-cookie");
  assert.match(value,/HttpOnly/);assert.match(value,/Secure/);assert.match(value,/SameSite=Strict/);
  return value.split(";")[0];
 }
 const withCookie=(token,data)=>({...json(data),headers:{...json(data).headers,cookie:token}});
 test.before(async()=>{
  pool=new Pool({connectionString:URL});
  const t=await pool.query("SELECT current_database() AS database");
  assert.equal(t.rows[0].database,"asd_industry_staff");
  ownerId=crypto.randomUUID();safetyId=crypto.randomUUID();
  const h=await Auth.hashPassword(pass);
  await pool.query("INSERT INTO industry_staff_accounts(id,email,password_hash,role) VALUES($1,$2,$3,'reviewer'),($4,$5,$6,'safety')",
   [ownerId,"adult-reviewer@ci.invalid",h,safetyId,"safety-reviewer@ci.invalid",h]);
  server=app.listen(0,"127.0.0.1");await once(server,"listening");
  base="http://127.0.0.1:"+server.address().port;
 });
 test.after(async()=>{
  if(server?.listening)await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await pool?.end();
 });
 test("real database: authentication, human-only decisions, and review audit work together",async()=>{
  let r=await request("/status");assert.equal(r.status,200);assert.equal((await r.json()).enabled,true);
  r=await request("/queue");assert.equal(r.status,401);
  r=await request("/login",{...json({email:"adult-reviewer@ci.invalid",password:pass}),headers:{"content-type":"application/json",origin:"https://untrusted.example"}});
  assert.equal(r.status,403);
  r=await request("/login",json({email:"adult-reviewer@ci.invalid",password:"wrong"}));assert.equal(r.status,401);
  r=await request("/login",json({email:"adult-reviewer@ci.invalid",password:pass}));
  assert.equal(r.status,200);const reviewerCookie=cookie(r);
  assert.equal((await r.json()).staff.role,"reviewer");
  r=await request("/me",{headers:{cookie:reviewerCookie}});assert.equal(r.status,200);
  r=await request("/login",json({email:"safety-reviewer@ci.invalid",password:pass}));
  assert.equal(r.status,200);const safetyCookie=cookie(r);
  assert.equal((await r.json()).staff.role,"safety");
  const idea={creatorLabel:"AdultDemo",title:"Harvest Planner",
   description:"Synthetic project for testing a local farm inventory and planning prototype with fictional participants.",
   category:"Agriculture",seats:2,roles:["Developer"],isAdultTestData:true};
  r=await request("/intake",withCookie(safetyCookie,idea));assert.equal(r.status,403);
  r=await request("/intake",withCookie(reviewerCookie,idea));assert.equal(r.status,201);
  const projectId=(await r.json()).id;assert.match(projectId,/^[a-f0-9-]{36}$/);
  r=await request("/requests/"+projectId,{headers:{cookie:reviewerCookie}});
  assert.equal(r.status,200);
  assert.equal((await r.json()).request.status,"pending");
  r=await request("/requests/"+projectId+"/decision",withCookie(reviewerCookie,{
    reportId:crypto.randomUUID(),decision:"approved",rationale:"Human reviewer checked all evidence."
  }));
  assert.equal(r.status,409);
  r=await request("/requests/"+projectId+"/prepare",withCookie(safetyCookie,{}));
  assert.equal(r.status,200);const report=(await r.json()).report;
  assert.equal(report.engine,"deterministic-demo");
  assert.equal(report.packet.sections.length,5);
  assert.equal(report.packet.permissions.aiMayApprove,false);
  r=await request("/requests/"+projectId+"/decision",withCookie(safetyCookie,{
    reportId:report.id,decision:"approved",rationale:"A complete human rationale for approval."
  }));
  assert.equal(r.status,403);
  r=await request("/requests/"+projectId+"/decision",{
   ...withCookie(reviewerCookie,{reportId:report.id,decision:"approved",rationale:"A complete human rationale for approval."}),
   headers:{"content-type":"application/json",origin:"https://attacker.invalid",cookie:reviewerCookie}
  });
  assert.equal(r.status,403);
  r=await request("/requests/"+projectId+"/decision",withCookie(reviewerCookie,{
    reportId:report.id,decision:"approved",rationale:"Reviewer checked scope, safeguards and team needs."
  }));
  assert.equal(r.status,200);
  assert.equal((await r.json()).decision,"approved");
  r=await request("/requests/"+projectId+"/decision",withCookie(reviewerCookie,{
    reportId:report.id,decision:"declined",rationale:"Attempt to override completed human review."
  }));
  assert.equal(r.status,409);
  r=await request("/requests/"+projectId+"/prepare",withCookie(safetyCookie,{}));
  assert.equal(r.status,409);
  const counts=await pool.query(`SELECT
    (SELECT count(*)::integer FROM industry_human_decisions WHERE request_id=$1) AS decisions,
    (SELECT count(*)::integer FROM industry_staff_reports WHERE request_id=$1) AS reports,
    (SELECT count(*)::integer FROM industry_staff_audit WHERE request_id=$1) AS events,
    (SELECT status FROM industry_review_requests WHERE id=$1) AS status`,[projectId]);
  assert.deepEqual(counts.rows[0],{decisions:1,reports:1,events:3,status:"approved"});
  r=await request("/logout",withCookie(reviewerCookie,{}));assert.equal(r.status,200);
  r=await request("/me",{headers:{cookie:reviewerCookie}});assert.equal(r.status,401);
 });
}
