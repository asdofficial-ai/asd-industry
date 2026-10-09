"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {normalizeAccount,normalizeProfile,hashPassword,verifyPassword,hashSession,safeCodeEqual,publicAccount}=require("../lib/account-core");
const valid={handle:"FutureBuilder",email:"TESTER@EXAMPLE.COM",password:"long demo password! 123",ageGroup:"18+"};
test("beta signup accepts an adult tester and normalizes email",()=>{
  const r=normalizeAccount(valid);assert.equal(r.email,"tester@example.com");assert.equal(r.handle,"FutureBuilder");
});
test("under-18 account creation is rejected server side",()=>{
  for(const ageGroup of ["12-14","15-17","",null]) assert.throws(()=>normalizeAccount({...valid,ageGroup}),/adult testers only/);
});
test("bad account fields are rejected",()=>{
 assert.throws(()=>normalizeAccount({...valid,handle:"-bad"}));
 assert.throws(()=>normalizeAccount({...valid,email:"not an email"}));
 assert.throws(()=>normalizeAccount({...valid,password:"short"}));
});
test("profiles only permit approved roles, times and tags",()=>{
 const p=normalizeProfile({role:"Developer",availability:"weekends",interests:["Apps","AI","AI"]});
 assert.deepEqual(p.interests,["Apps","AI"]);
 assert.throws(()=>normalizeProfile({role:"Director",availability:"weekends",interests:["AI"]}));
 assert.throws(()=>normalizeProfile({role:"Developer",availability:"weekends",interests:["Secrets"]}));
});
test("password scrypt hash verifies, salts, and does not accept incorrect passwords",async()=>{
 const h=await hashPassword(valid.password);
 assert.equal(await verifyPassword(valid.password,h),true);
 assert.equal(await verifyPassword("not the password",h),false);
 assert.notEqual(h,await hashPassword(valid.password));
 assert.equal(await verifyPassword(valid.password,"malformed"),false);
});
test("constant-time invite comparison and session tokens",()=>{
 assert.equal(safeCodeEqual("my-secret-code","my-secret-code"),true);
 assert.equal(safeCodeEqual("my-secret-code","different"),false);
 assert.equal(hashSession("token").length,64);
});
test("private email and password hash are excluded from user API output",()=>{
 const account=publicAccount({id:"ID",handle:"Sample",age_group:"18+",email:"hidden@example.com",password_hash:"secret",role:"Developer",availability:"weekends",interests:["Apps"]});
 assert.equal(account.email,undefined);assert.equal(account.password_hash,undefined);
});
