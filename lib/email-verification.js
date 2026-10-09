"use strict";
const {randomInt,createHmac,timingSafeEqual}=require("node:crypto");
const CODE_EXPIRY_MS=10*60*1000;
const RESEND_WAIT_MS=60*1000;
const MAX_CODE_ATTEMPTS=5;
function makeCode(){
  return String(randomInt(0,1000000)).padStart(6,"0");
}
function digestCode(accountId,code,pepper){
  if(typeof pepper!=="string"||pepper.length<32) throw new Error("Email verification pepper is not configured securely.");
  if(typeof code!=="string"||!/^[0-9]{6}$/.test(code)) return null;
  return createHmac("sha256",pepper).update(accountId+":"+code).digest("hex");
}
function checkCode(accountId,code,pepper,stored){
  const test=digestCode(accountId,code,pepper);
  if(!test||typeof stored!=="string"||!/^[a-f0-9]{64}$/.test(stored))return false;
  return timingSafeEqual(Buffer.from(test,"hex"),Buffer.from(stored,"hex"));
}
function expired(expiresAt,now=Date.now()){
  return !Number.isFinite(new Date(expiresAt).getTime())||new Date(expiresAt).getTime()<=now;
}
function canResend(sentAt,now=Date.now()){
  return !sentAt || now-new Date(sentAt).getTime()>=RESEND_WAIT_MS;
}
module.exports={makeCode,digestCode,checkCode,expired,canResend,CODE_EXPIRY_MS,RESEND_WAIT_MS,MAX_CODE_ATTEMPTS};
