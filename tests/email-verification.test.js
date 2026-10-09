"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {
  makeCode,digestCode,checkCode,expired,canResend,CODE_EXPIRY_MS,RESEND_WAIT_MS,MAX_CODE_ATTEMPTS
}=require("../lib/email-verification");
const pepper="VeryLongTestPepperWithMoreThanThirtyTwoCharacters!";
test("verification codes are always six digits and are random",()=>{
  const samples=Array.from({length:40},()=>makeCode());
  assert.ok(samples.every(x=>/^[0-9]{6}$/.test(x)));
  assert.ok(new Set(samples).size>1);
});
test("verification codes are HMAC-hashed and account scoped",()=>{
  const h=digestCode("account-a","001234",pepper);
  assert.match(h,/^[0-9a-f]{64}$/);
  assert.equal(h.includes("001234"),false);
  assert.equal(checkCode("account-a","001234",pepper,h),true);
  assert.equal(checkCode("account-b","001234",pepper,h),false);
  assert.equal(checkCode("account-a","001235",pepper,h),false);
  assert.equal(checkCode("account-a","abc",pepper,h),false);
  assert.equal(checkCode("account-a","001234",pepper,"malformed"),false);
  assert.notEqual(digestCode("account-a","001234",pepper),digestCode("account-a","001234",pepper+"other"));
  assert.throws(()=>digestCode("account-a","001234","short"),/pepper/);
});
test("codes expire after ten minutes and resend has a one minute wait",()=>{
 const t=Date.UTC(2026,9,8,12,0,0);
 assert.equal(CODE_EXPIRY_MS,600000);
 assert.equal(RESEND_WAIT_MS,60000);
 assert.equal(MAX_CODE_ATTEMPTS,5);
 assert.equal(expired(new Date(t+CODE_EXPIRY_MS),t+CODE_EXPIRY_MS-1),false);
 assert.equal(expired(new Date(t+CODE_EXPIRY_MS),t+CODE_EXPIRY_MS),true);
 assert.equal(expired("bad date"),true);
 assert.equal(canResend(new Date(t),t+RESEND_WAIT_MS-1),false);
 assert.equal(canResend(new Date(t),t+RESEND_WAIT_MS),true);
});
test("provider remains disabled until server credentials are configured",()=>{
 const {emailConfigured}=require("../lib/email-service");
 // GitHub CI does not configure transactional email credentials.
 assert.equal(emailConfigured(),false);
});
test("verification interface is distinct from the public signup demo",()=>{
 const fs=require("node:fs");
 const path=require("node:path");
 const html=fs.readFileSync(path.join(__dirname,"..","public","beta-signup.html"),"utf8");
 assert.match(html,/type="email" id="betaEmail"/);
 assert.match(html,/id="betaCode"/);
 assert.match(html,/id="verifyForm"/);
 assert.match(html,/id="resendBtn"/);
 assert.doesNotMatch(html,/id="signupInterests"/);
 assert.doesNotMatch(html,/id="signupRole"/);
});
