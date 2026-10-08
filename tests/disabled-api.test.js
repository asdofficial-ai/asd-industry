"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
process.env.ACCOUNTS_BETA_ENABLED="false";
const app=require("../server");
test("disabled signup API cannot create accounts",async()=>{
  const server=app.listen(0,"127.0.0.1");
  try{
    const base="http://127.0.0.1:"+server.address().port;
    let r=await fetch(base+"/api/beta/status");
    assert.equal(r.status,200);
    let j=await r.json();
    assert.equal(j.enabled,false);
    assert.equal(j.youthAccountsEnabled,false);
    r=await fetch(base+"/api/beta/signup",{
      method:"POST",headers:{"content-type":"application/json","origin":base},
      body:JSON.stringify({handle:"FutureBuilder",ageGroup:"18+",password:"long test password123"})
    });
    assert.equal(r.status,503);
    const response=await r.json();
    assert.match(response.error,/not available/);
  } finally {await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
test("main landing page retains gated demo",async()=>{
  const server=app.listen(0,"127.0.0.1");
  try{
    const base="http://127.0.0.1:"+server.address().port;
    const html=await(await fetch(base+"/")).text();
    assert.match(html,/id="accessGate"/);
    assert.match(html,/id="signupForm"/);
    assert.match(html,/id="siteShell" class="site-shell" hidden/);
    assert.match(html,/id="view-chat"/);
    const r=await fetch(base+"/health");
    assert.equal(r.status,200);
    assert.equal((await r.json()).mode,"demo");
  }finally {await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
