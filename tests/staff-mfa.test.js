"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const MFA=require("../lib/staff-mfa");
const key="7".repeat(64),id="11111111-1111-4111-8111-111111111111";
test("TOTP matches RFC6238 SHA-1 vector using six digits",()=>{
 const secret=MFA.base32Encode(Buffer.from("12345678901234567890"));
 assert.equal(MFA.codeAt(secret,1),"287082");
 assert.equal(MFA.validCounter(secret,"287082",59_000,-1),1);
 assert.equal(MFA.validCounter(secret,"287082",59_000,1),null);
});
test("Founder authenticator seeds are encrypted, authenticated, and account-bound",()=>{
 const secret=MFA.randomSecret();
 assert.ok(/^[A-Z2-7]{32}$/.test(secret));
 const encrypted=MFA.seal(secret,id,key);
 assert.equal(MFA.unseal(encrypted,id,key),secret);
 assert.ok(!encrypted.includes(secret));
 assert.throws(()=>MFA.unseal(encrypted,"22222222-2222-4222-8222-222222222222",key));
 assert.throws(()=>MFA.unseal(encrypted.slice(0,-2)+"aa",id,key));
 assert.throws(()=>MFA.seal(secret,id,"weak"),/STAFF_MFA_KEY/);
});
test("MFA accepts six digits only and rejects replayed or expired counters",()=>{
 const secret=MFA.randomSecret(),now=Date.now(),ctr=Math.floor(now/30000);
 const correct=MFA.codeAt(secret,ctr);
 assert.equal(MFA.validCounter(secret,correct,now,-1),ctr);
 assert.equal(MFA.validCounter(secret,correct,now,ctr),null);
 assert.equal(MFA.validCounter(secret,"password",now,-1),null);
 assert.equal(MFA.validCounter(secret,"12345",now,-1),null);
 assert.equal(MFA.validCounter(secret,MFA.codeAt(secret,ctr-4),now,-1),null);
});
test("Authenticators use an issuer-scoped private enrollment URI",()=>{
 const secret=MFA.randomSecret(),uri=MFA.provisioningUri(secret,"founder@ci.invalid");
 assert.match(uri,/^otpauth:\/\/totp\/ASD%20Industry:/);
 assert.ok(uri.includes("secret="+secret));
 assert.match(uri,/digits=6/);
});
