"use strict";
/* Transactional email provider: Resend. Requires a verified sending domain.
   Secrets are read only on the server. Never log verification codes or API keys. */
const {URL}=require("node:url");
function emailConfigured(){
 return Boolean(process.env.RESEND_API_KEY&&process.env.VERIFICATION_EMAIL_FROM&&process.env.PUBLIC_ORIGIN);
}
async function sendVerification({to,code}){
 if(!emailConfigured())throw new Error("Email sender not configured.");
 const origin=new URL(process.env.PUBLIC_ORIGIN);
 if(origin.protocol!=="https:"&&process.env.NODE_ENV==="production")
   throw new Error("Verification requires HTTPS.");
 const request=await fetch("https://api.resend.com/emails",{
  method:"POST",
  headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({
    from:process.env.VERIFICATION_EMAIL_FROM,
    to:[to],
    subject:"Verify your ASD Industry email",
    text:"Your ASD Industry verification code is "+code+". It expires in 10 minutes. If you didn't request this, ignore the message. ASD Industry will never ask you to share the code. This invitation is for adult beta testers only."
  }),
  signal:AbortSignal.timeout(12000)
 });
 if(!request.ok){
   // Do not log external response bodies; they might contain sensitive data.
   throw new Error("Verification message could not be delivered.");
 }
 return true;
}
module.exports={emailConfigured,sendVerification};
