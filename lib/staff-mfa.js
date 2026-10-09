"use strict";
/* RFC 6238 six-digit TOTP, with per-account AES-256-GCM encryption.
 * The key must be stored only in private server/operator environment.
 * Never put OTP seeds, keys or otpauth URLs in GitHub, chat, logs or DB plain text.
 */
const crypto=require("node:crypto");
const ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD=30;
function base32Encode(bytes){
 let bits=0,value=0,out="";
 for(const octet of bytes){
  value=(value<<8)|octet;bits+=8;
  while(bits>=5){out+=ALPHABET[(value>>>(bits-=5))&31];}
  value&=(1<<bits)-1;
 }
 if(bits)out+=ALPHABET[(value<<(5-bits))&31];
 return out;
}
function base32Decode(secret){
 if(typeof secret!=="string"||!/^[A-Z2-7]{16,64}$/.test(secret))throw Error("Invalid authenticator seed.");
 let value=0,bits=0;const bytes=[];
 for(const letter of secret){
  value=(value<<5)|ALPHABET.indexOf(letter);bits+=5;
  if(bits>=8){bytes.push((value>>>(bits-=8))&255);value&=(1<<bits)-1;}
 }
 if(bytes.length<10||bytes.length>40)throw Error("Invalid authenticator seed length.");
 return Buffer.from(bytes);
}
function randomSecret(){return base32Encode(crypto.randomBytes(20));}
function keyFromEnv(raw){
 if(typeof raw!=="string"||!/^[0-9a-f]{64}$/i.test(raw))throw Error("STAFF_MFA_KEY must be 64 hexadecimal characters.");
 return Buffer.from(raw,"hex");
}
function seal(secret,staffId,keyHex){
 const key=keyFromEnv(keyHex);
 if(!/^[0-9a-f-]{36}$/i.test(staffId))throw Error("Invalid staff identity.");
 base32Decode(secret);
 const iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv("aes-256-gcm",key,iv);
 cipher.setAAD(Buffer.from(staffId));
 const ciphertext=Buffer.concat([cipher.update(secret,"utf8"),cipher.final()]);
 return [iv,cipher.getAuthTag(),ciphertext].map(b=>b.toString("base64url")).join(".");
}
function unseal(stored,staffId,keyHex){
 const key=keyFromEnv(keyHex);
 if(typeof stored!=="string")throw Error("Invalid encrypted authenticator.");
 const parts=stored.split(".").map(p=>Buffer.from(p,"base64url"));
 if(parts.length!==3||parts[0].length!==12||parts[1].length!==16||parts[2].length<12)throw Error("Invalid encrypted authenticator.");
 const decipher=crypto.createDecipheriv("aes-256-gcm",key,parts[0]);
 decipher.setAAD(Buffer.from(staffId));
 decipher.setAuthTag(parts[1]);
 const secret=Buffer.concat([decipher.update(parts[2]),decipher.final()]).toString("utf8");
 base32Decode(secret);
 return secret;
}
function codeAt(secret,counter){
 if(!Number.isSafeInteger(counter)||counter<0)throw Error("Invalid TOTP counter.");
 const bytes=Buffer.alloc(8);bytes.writeBigUInt64BE(BigInt(counter));
 const hash=crypto.createHmac("sha1",base32Decode(secret)).update(bytes).digest();
 const offset=hash[hash.length-1]&15;
 const n=(hash.readUInt32BE(offset)&0x7fffffff)%1e6;
 return String(n).padStart(6,"0");
}
function validCounter(secret,code,now=Date.now(),lastCounter=-1){
 if(typeof code!=="string"||!/^[0-9]{6}$/.test(code))return null;
 const ctr=Math.floor(now/1000/PERIOD);
 for(const delta of [-1,0,1]){
  const candidate=ctr+delta;
  if(candidate<=lastCounter||candidate<0)continue;
  if(crypto.timingSafeEqual(Buffer.from(code),Buffer.from(codeAt(secret,candidate))))return candidate;
 }
 return null;
}
function provisioningUri(secret,email){
 base32Decode(secret);
 if(typeof email!=="string"||email.length>254)throw Error("Invalid staff email.");
 return "otpauth://totp/"+encodeURIComponent("ASD Industry")+":"+encodeURIComponent(email)+
  "?secret="+secret+"&issuer="+encodeURIComponent("ASD Industry")+"&algorithm=SHA1&digits=6&period=30";
}
module.exports={base32Encode,base32Decode,randomSecret,keyFromEnv,seal,unseal,codeAt,validCounter,provisioningUri};
