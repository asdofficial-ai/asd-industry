"use strict";
/* Email verification delivery for the private 18+ tester beta only. */
const EMAIL_ADDRESS=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
function senderAddress(raw){
 if(typeof raw!=="string"||raw.length>254||/[\r\n]/.test(raw))return "";
 const input=raw.trim();
 const match=input.match(/^(?:[^<>]{1,80}\s+<)?([^<>\s]+@[^<>\s]+\.[^<>\s]+)>?$/);
 if(!match||!EMAIL_ADDRESS.test(match[1]))return "";
 if((input.includes("<")&&!input.endsWith(">"))||(!input.includes("<")&&input.endsWith(">")))return "";
 return input;
}
function publicOrigin(){
 try{
  const u=new URL(process.env.PUBLIC_ORIGIN||"");
  if(u.username||u.password||u.search||u.hash||u.pathname!=="/"||!["http:","https:"].includes(u.protocol))return null;
  if(process.env.NODE_ENV==="production"&&u.protocol!=="https:")return null;
  return u.origin;
 }catch{return null;}
}
function emailConfigured(){
 const key=process.env.RESEND_API_KEY;
 return typeof key==="string"&&key.trim().length>0&&
  Boolean(senderAddress(process.env.VERIFICATION_EMAIL_FROM))&&Boolean(publicOrigin());
}
function verificationEmail({to,code}){
 if(typeof to!=="string"||to.length>254||!EMAIL_ADDRESS.test(to))throw new Error("Email recipient is invalid.");
 if(typeof code!=="string"||!/^[0-9]{6}$/.test(code))throw new Error("Verification code is invalid.");
 return {
  from:senderAddress(process.env.VERIFICATION_EMAIL_FROM),to:[to],
  subject:"Verify your ASD Industry email",
  text:["Your ASD Industry verification code is: "+code,
    "It expires in 10 minutes.","If you did not request this, ignore this email.",
    "Never share your code with anyone.","This invitation is intended for adult beta testers only."].join("\n\n")
 };
}
async function sendVerification({to,code}){
 if(!emailConfigured())throw new Error("Email sender not configured.");
 let response;
 try{
  response=await fetch("https://api.resend.com/emails",{
   method:"POST",
   headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify(verificationEmail({to,code})),signal:AbortSignal.timeout(12000)
  });
 }catch{
  throw new Error("Verification message could not be delivered.");
 }
 if(!response.ok)throw new Error("Verification message could not be delivered.");
 return true;
}
module.exports={emailConfigured,sendVerification,verificationEmail,publicOrigin,senderAddress};
