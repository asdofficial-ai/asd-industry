"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Fee=require("../lib/registration-payment-policy");
const account={status:"pending_payment",ageAssurance:"verified_adult",bankReference:"demo-unique-ref"};
const verification={emailVerified:true,approvedTerms:true};
const settlement={origin:"trusted_bank_server",signatureVerified:true,currency:"NGN",amountKobo:200000,status:"settled",final:true,uniqueReference:"demo-unique-ref",transactionId:"test-only-settlement-123"};
test("registration amount is exactly ₦2,000, not 2000 kobo",()=>{
 assert.equal(Fee.FEE_NAIRA,2000);assert.equal(Fee.FEE_KOBO,200000);
 assert.equal(Fee.canActivateRegistration({account,settlement,verification}).activate,true);
});
test("never activate on self-reported bank transfer, screenshots, mismatch, partial or pending payment",()=>{
 for(const patch of [
  {origin:"browser"},{signatureVerified:false},{amountKobo:199999},{amountKobo:2000},
  {status:"pending"},{currency:"USD"},{uniqueReference:"wrong-ref"},
  {final:false},{transactionId:""}
 ]){
  assert.equal(Fee.canActivateRegistration({account,settlement:{...settlement,...patch},verification}).activate,false);
 }
 assert.equal(Fee.canActivateRegistration({account,settlement:undefined,verification}).activate,false);
 assert.equal(Fee.canActivateRegistration({account:{...account,status:"active"},settlement,verification}).activate,false);
 assert.equal(Fee.canActivateRegistration({account:{...account,ageAssurance:"minor_guest"},settlement,verification}).activate,false);
 assert.equal(Fee.canActivateRegistration({account,settlement,verification:{emailVerified:false,approvedTerms:true}}).activate,false);
});
