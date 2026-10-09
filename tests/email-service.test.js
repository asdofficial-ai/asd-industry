"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {emailConfigured,sendVerification,verificationEmail,publicOrigin,senderAddress}=require("../lib/email-service");
const ENV=["NODE_ENV","PUBLIC_ORIGIN","RESEND_API_KEY","VERIFICATION_EMAIL_FROM"];
const saved=Object.fromEntries(ENV.map(x=>[x,process.env[x]]));
function env(overrides={}){
 for(const k of ENV)delete process.env[k];
 Object.assign(process.env,{
  NODE_ENV:"production",
  PUBLIC_ORIGIN:"https://beta.asd-industry.example",
  RESEND_API_KEY:"test_only_fake_resend_api_key",
  VERIFICATION_EMAIL_FROM:"ASD Industry <verify@asd-industry.example>"
 },overrides);
}
function restore(){
 for(const k of ENV){
  if(saved[k]===undefined)delete process.env[k]; else process.env[k]=saved[k];
 }
}
test.after(restore);
test("email configuration remains closed without HTTPS or valid sender",()=>{
 env();assert.equal(emailConfigured(),true);assert.equal(publicOrigin(),"https://beta.asd-industry.example");
 process.env.PUBLIC_ORIGIN="http://beta.asd-industry.example";
 assert.equal(emailConfigured(),false);
 env({VERIFICATION_EMAIL_FROM:"sender\r\nBcc: victim@example.com"});
 assert.equal(emailConfigured(),false);
 env({PUBLIC_ORIGIN:"https://beta.asd-industry.example/something"});
 assert.equal(emailConfigured(),false);
 env({RESEND_API_KEY:""});
 assert.equal(emailConfigured(),false);
});
test("email payload contains correct instructions but not other personal data",()=>{
 env();
 const value=verificationEmail({to:"adult@example.com",code:"002345"});
 assert.deepEqual(value.to,["adult@example.com"]);
 assert.match(value.text,/002345/);
 assert.match(value.text,/10 minutes/);
 assert.match(value.text,/adult beta/);
 assert.equal(value.html,undefined);
 assert.equal(senderAddress("Broken Address"),"");
 assert.throws(()=>verificationEmail({to:"bad\r\naddress@example.com",code:"002345"}),/recipient/);
 assert.throws(()=>verificationEmail({to:"adult@example.com",code:"ABCDEF"}),/code/);
});
test("mocked provider receives one server-only verification email",async()=>{
 env();
 const old=global.fetch;
 let calls=0;
 global.fetch=async(url,opts)=>{
  calls++;
  assert.equal(url,"https://api.resend.com/emails");
  assert.equal(opts.method,"POST");
  assert.match(opts.headers.Authorization,/^Bearer test_only/);
  assert.equal(JSON.parse(opts.body).to[0],"adult@example.com");
  assert.match(JSON.parse(opts.body).text,/001567/);
  return {ok:true,status:200};
 };
 try{
  assert.equal(await sendVerification({to:"adult@example.com",code:"001567"}),true);
  assert.equal(calls,1);
 }finally{global.fetch=old;}
});
test("mocked provider errors fail closed without leaking email contents",async()=>{
 env();
 const old=global.fetch;
 global.fetch=async()=>({ok:false,status:403});
 try{await assert.rejects(sendVerification({to:"adult@example.com",code:"123456"}),/^Error: Verification message could not be delivered\.$/);}
 finally{global.fetch=old;}
});
