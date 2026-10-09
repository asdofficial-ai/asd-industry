"use strict";
/* ASD Industry: Google ID token is an identity proof only, NEVER Founder permission.
 * verifyIdToken checks Google signature, issuer, audience and expiry using Google's official library.
 */
const CLIENT_ID_RE=/^[0-9]{8,32}-[a-z0-9_-]{20,90}\.apps\.googleusercontent\.com$/i;
const SUBJECT_RE=/^[A-Za-z0-9_-]{6,128}$/;
function configured(env=process.env){
 try{
  if(env.FOUNDER_GOOGLE_VERIFICATION_ENABLED!=="true"||
    !CLIENT_ID_RE.test(env.GOOGLE_CLIENT_ID||"")||
    typeof env.FOUNDER_PENDING_EMAIL!=="string"||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.FOUNDER_PENDING_EMAIL)||
    typeof env.STAFF_DB_URL!=="string"||!env.STAFF_DB_URL.trim())return false;
  const origin=new URL(env.STAFF_ORIGIN);
  return origin.protocol==="https:"&&origin.pathname==="/"&&!origin.username&&
    !origin.password&&!origin.search&&!origin.hash;
 }catch{return false;}
}
function verifyClaims(payload,clientId,expectedEmail){
 if(!payload||typeof payload!=="object")throw Error("Google identity not verified.");
 if(!CLIENT_ID_RE.test(clientId||"")||payload.aud!==clientId||
    !["accounts.google.com","https://accounts.google.com"].includes(payload.iss)||
    payload.email_verified!==true||!SUBJECT_RE.test(payload.sub||"")||
    typeof payload.email!=="string"||
    payload.email.trim().toLowerCase()!==String(expectedEmail).trim().toLowerCase())
  throw Error("This Google Account is not authorized for Founder email verification.");
 return {email:payload.email.trim().toLowerCase(),subject:payload.sub};
}
async function verifyCredential(credential,env=process.env){
 if(!configured(env))throw Error("Google Founder verification is not configured.");
 if(typeof credential!=="string"||credential.length<80||credential.length>12000||
    credential.split(".").length!==3)
  throw Error("Invalid Google ID token.");
 const {OAuth2Client}=require("google-auth-library");
 const verifier=new OAuth2Client();
 // Google library validates JWT signature, expiry, issuer and intended audience.
 const ticket=await verifier.verifyIdToken({idToken:credential,audience:env.GOOGLE_CLIENT_ID});
 return verifyClaims(ticket.getPayload(),env.GOOGLE_CLIENT_ID,env.FOUNDER_PENDING_EMAIL);
}
module.exports={configured,verifyClaims,verifyCredential};
