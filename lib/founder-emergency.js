"use strict";
const crypto=require("node:crypto");
/**
 * Founder-only emergency contact payload. Only safe contact/routing metadata;
 * NEVER secrets, passwords, ID scans, NIN/BVN, private keys or recovery codes.
 * No endpoint is enabled until MFA, approval, consent and least privilege are ready.
 */
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED=["preferredName","backupEmail","emergencyPhone","contactName","contactMethod","countryCode","timeZone","escalationInstructions"];
function validate(payload){
 if(!payload||typeof payload!=="object"||Array.isArray(payload)||
    Object.keys(payload).some(k=>!ALLOWED.includes(k)))throw Error("Only approved emergency contact fields are accepted.");
 const result={};
 for(const key of ALLOWED){
  const value=payload[key];
  if(value==null||value==="")continue;
  if(typeof value!=="string"||value.trim().length>240)throw Error("Invalid emergency contact field.");
  const clean=value.trim();
  if(/password|secret key|seed phrase|private key|recovery code|bank account|\bNIN\b|\bBVN\b/i.test(clean))
   throw Error("Do not store passwords or sensitive identity details in emergency profile.");
  result[key]=clean;
 }
 if(result.backupEmail&&!EMAIL.test(result.backupEmail))throw Error("Enter a valid backup email address.");
 if(result.emergencyPhone&&!/^\+?[0-9 ()-]{7,28}$/.test(result.emergencyPhone))throw Error("Enter a valid emergency contact phone number.");
 if(!result.preferredName&&!result.backupEmail&&!result.emergencyPhone)throw Error("Provide only the minimum essential contact data.");
 return result;
}
function keyFromHex(hex){
 if(typeof hex!=="string"||!/^[a-f\d]{64}$/i.test(hex))throw Error("A separate 32-byte encrypted founder profile key is required.");
 return Buffer.from(hex,"hex");
}
function encrypt(founderId,profile,hexKey){
 if(typeof founderId!=="string"||!/^[0-9a-f-]{36}$/i.test(founderId))throw Error("Invalid founder identity.");
 const key=keyFromHex(hexKey),validated=validate(profile);
 const nonce=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key,nonce);
 cipher.setAAD(Buffer.from("asd-industry-founder-v1:"+founderId));
 const ciphertext=Buffer.concat([cipher.update(JSON.stringify(validated),"utf8"),cipher.final()]);
 return "v1."+nonce.toString("base64url")+"."+cipher.getAuthTag().toString("base64url")+"."+ciphertext.toString("base64url");
}
function decrypt(founderId,blob,hexKey){
 const key=keyFromHex(hexKey);
 if(typeof blob!=="string"||!/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/.test(blob))throw Error("Invalid encrypted founder profile.");
 const [,nonce,tag,data]=blob.split(".");
 const cipher=crypto.createDecipheriv("aes-256-gcm",key,Buffer.from(nonce,"base64url"));
 cipher.setAAD(Buffer.from("asd-industry-founder-v1:"+founderId));
 cipher.setAuthTag(Buffer.from(tag,"base64url"));
 return validate(JSON.parse(Buffer.concat([cipher.update(Buffer.from(data,"base64url")),cipher.final()]).toString("utf8")));
}
module.exports={validate,encrypt,decrypt,ALLOWED};
