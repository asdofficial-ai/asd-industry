"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{once}=require("node:events");
const crypto=require("node:crypto"),{Pool}=require("pg");
const Auth=require("../lib/staff-auth-core");
if(!process.env.STAFF_TEST_DATABASE_URL) {
 test("employee identity integration requires disposable database",{skip:true},()=>{});
} else {
 const url=process.env.STAFF_TEST_DATABASE_URL;
 if(!url.includes("/asd_industry_staff"))throw Error("Use the disposable staff-only test database.");
 process.env.STAFF_DB_URL=url;
 process.env.STAFF_ORIGIN="https://staff-ci.example";
 process.env.STAFF_SESSION_PEPPER="ci-only-temporary-employees-2026-not-live-secret";
 process.env.STAFF_BACKEND_ENABLED="true";
 process.env.STAFF_PUBLIC_DIRECTORY_ENABLED="true";
 process.env.NODE_ENV="production";
 const app=require("../server");
 const loginPass="CI-only-staff-password-strong-2026";
 test("isolated employee identities, verified public badge, Founder and support",async()=>{
  const pool=new Pool({connectionString:url});
  let server;
  try{
   const hash=await Auth.hashPassword(loginPass);
   const founder=crypto.randomUUID(),support=crypto.randomUUID(),manager=crypto.randomUUID();
   await pool.query("INSERT INTO industry_staff_accounts(id,email,password_hash,role) VALUES($1,$2,$3,'founder'),($4,$5,$6,'support'),($7,$8,$9,'manager')",
    [founder,"founder-test@ci.invalid",hash,support,"help-test@ci.invalid",hash,manager,"manager-test@ci.invalid",hash]);
   await pool.query("INSERT INTO industry_staff_public_profiles(staff_id,display_name,badge_verified_at,directory_opt_in) VALUES($1,$2,NOW(),true),($3,$4,NOW(),false)",
    [founder,"Test Founder",support,"Test Support Agent"]);
   const repeat=await pool.query("SELECT COUNT(*)::int AS n FROM industry_staff_accounts WHERE role='founder' AND enabled=true");
   assert.equal(repeat.rows[0].n,1);
   await assert.rejects(pool.query("INSERT INTO industry_staff_accounts(id,email,password_hash,role) VALUES ($1,$2,$3,'founder')",
    [crypto.randomUUID(),"other-founder@ci.invalid",hash]),e=>e.code==="23505");
   server=app.listen(0,"127.0.0.1");
   await once(server,"listening");
   const base="http://127.0.0.1:"+server.address().port;
   const get=(path,cookie)=>fetch(base+"/api/staff"+path,{headers:cookie?{Cookie:cookie}:{}});
   async function signIn(email){
    const r=await fetch(base+"/api/staff/login",{method:"POST",
      headers:{"Content-Type":"application/json","Origin":"https://staff-ci.example"},
      body:JSON.stringify({email,password:loginPass})});
    assert.equal(r.status,200);
    const cookie=r.headers.get("set-cookie");
    assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
    return cookie.split(";")[0];
   }
   let directory=await get("/directory");
   assert.equal(directory.status,200);
   const list=await directory.json();
   assert.equal(list.data.length,1);
   assert.equal(list.data[0].displayName,"Test Founder");
   assert.equal(list.data[0].badge.type,"verified_human_staff");
   assert.equal(JSON.stringify(list).includes("@ci.invalid"),false);
   const f=await signIn("founder-test@ci.invalid");
   const s=await signIn("help-test@ci.invalid");
   const m=await signIn("manager-test@ci.invalid");
   let r=await get("/me",f);assert.equal(r.status,200);
   const ident=await r.json();
   assert.equal(ident.staff.role,"founder");
   assert.equal(ident.staff.badge.verified,true);
   r=await get("/me",s);assert.equal(r.status,200);
   assert.equal((await r.json()).staff.badge,null);
   assert.equal((await get("/founder/overview",s)).status,403);
   assert.equal((await get("/founder/overview",m)).status,403);
   r=await get("/founder/overview",f);assert.equal(r.status,200);
   assert.equal((await r.json()).security.passwordsReadable,false);
   assert.equal((await get("/support/overview",f)).status,200);
   r=await get("/support/overview",s);assert.equal(r.status,200);
   assert.equal((await r.json()).allowPasswordLookup,false);
   assert.equal((await get("/queue",s)).status,403);
   assert.equal((await get("/queue",m)).status,200);
   assert.equal((await get("/requests/"+crypto.randomUUID(),s)).status,403);
   process.env.STAFF_PUBLIC_DIRECTORY_ENABLED="false";
   assert.equal((await get("/directory")).status,503);
  }finally{
   if(server?.listening)await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
   await pool.end();
  }
 });
}
