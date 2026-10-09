"use strict";
const crypto=require("node:crypto");
const {promisify}=require("node:util");
const scrypt=promisify(crypto.scrypt);
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES=["founder","reviewer","safety"];
const DECISIONS=["approved","changes_requested","declined"];
const CATEGORIES=["AI","Apps","Websites","Agriculture","Gaming","Business","Design","Education","Finance","Content","Other"];
function clean(value,max){return typeof value==="string"?value.trim().slice(0,max):"";}
function emailAddress(value){
 const normalized=clean(value,254).toLowerCase();
 if(!EMAIL.test(normalized))throw Error("Invalid staff email address.");
 return normalized;
}
async function hashPassword(password,salt=crypto.randomBytes(16).toString("hex")){
 if(typeof password!=="string"||password.length<16||Buffer.byteLength(password)>256)
  throw Error("Staff passwords must be 16–256 bytes.");
 const hash=await scrypt(password,Buffer.from(salt,"hex"),64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 return "scrypt-v1$"+salt+"$"+hash.toString("hex");
}
async function verifyPassword(password,stored){
 if(typeof stored!=="string"||typeof password!=="string"||Buffer.byteLength(password)>256)return false;
 const match=/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(stored);
 if(!match)return false;
 const expected=Buffer.from(match[2],"hex");
 const proposed=await scrypt(password,Buffer.from(match[1],"hex"),64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 return crypto.timingSafeEqual(expected,proposed);
}
function hashToken(raw){return crypto.createHash("sha256").update(raw).digest("hex");}
function validateIntake(body){
 if(!body||typeof body!=="object"||Array.isArray(body))throw Error("Invalid review intake.");
 const creator=clean(body.creatorLabel,24),title=clean(body.title,70),description=clean(body.description,900);
 const category=clean(body.category,24),seats=Number(body.seats);
 const roles=Array.isArray(body.roles)?[...new Set(body.roles.map(r=>clean(r,30)))].filter(Boolean).slice(0,8):[];
 if(creator.length<2||title.length<3||description.length<35||!CATEGORIES.includes(category)||
   !Number.isInteger(seats)||seats<1||seats>12)throw Error("Incomplete adult-test intake details.");
 if(body.isAdultTestData!==true)throw Error("Only approved adult-test data may be imported.");
 // Block direct contact details and common secrets, not a substitute for legal privacy review.
 const blocked=/[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d .()-]{7,}\d)|password|private key|wallet seed|home address|my school/ig;
 if(blocked.test(title+" "+description+" "+creator))throw Error("Sensitive details must be removed from intake.");
 return {creator,title,description,category,seats,roles};
}
function validateDecision(body){
 const decision=clean(body?.decision,24),rationale=clean(body?.rationale,500);
 const reportId=clean(body?.reportId,40);
 if(!DECISIONS.includes(decision))throw Error("Choose a human review decision.");
 if(rationale.length<12)throw Error("Human reviewer must provide at least 12 characters of reasoning.");
 if(!/^[0-9a-f-]{36}$/i.test(reportId))throw Error("Select a valid staff report.");
 return {decision,rationale,reportId};
}
function canReview(role){return role==="founder"||role==="reviewer";}
function canPrepare(role){return ROLES.includes(role);}
function authorizeHumanDecision({role,requestStatus,reportVersion,requestVersion}){
 if(!canReview(role))throw Error("Only authorized human reviewers may decide.");
 if(requestStatus!=="pending")throw Error("Only pending requests can receive a decision.");
 if(!Number.isInteger(reportVersion)||reportVersion!==requestVersion)
  throw Error("A current review packet is required before a decision.");
 return true;
}
function configured(env=process.env){
 try{
  if(env.STAFF_BACKEND_ENABLED!=="true"||env.NODE_ENV!=="production"||
     typeof env.STAFF_DB_URL!=="string"||!env.STAFF_DB_URL.trim()||
     typeof env.STAFF_ORIGIN!=="string"||!env.STAFF_ORIGIN||
     typeof env.STAFF_SESSION_PEPPER!=="string"||env.STAFF_SESSION_PEPPER.length<32||
     typeof env.STAFF_MFA_KEY!=="string"||!/^[0-9a-f]{64}$/i.test(env.STAFF_MFA_KEY))return false;
  const url=new URL(env.STAFF_ORIGIN);
  return url.protocol==="https:"&&url.pathname==="/"&&!url.username&&!url.password&&!url.search&&!url.hash;
 }catch{return false;}
}
module.exports={emailAddress,hashPassword,verifyPassword,hashToken,validateIntake,validateDecision,
 canReview,canPrepare,configured,authorizeHumanDecision,CATEGORIES,ROLES,DECISIONS};
