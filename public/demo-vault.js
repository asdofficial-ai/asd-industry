"use strict";
/* ASD Industry adult-only LOCAL ENCRYPTED PRACTICE VAULT.
   Not server authentication, not a real user account and not cross-device sync.
   No plaintext passwords or workspace data are stored in localStorage. */
(()=>{
 const KEY="asd-industry-local-practice-vault-v1";
 const ITERATIONS=310000;
 let encryptionKey=null,queue=Promise.resolve(),failed=null;
 const te=new TextEncoder(),td=new TextDecoder();
 const encode=bytes=>btoa(String.fromCharCode(...bytes));
 const decode=s=>Uint8Array.from(atob(s),ch=>ch.charCodeAt(0));
 function enabled(){return Boolean(globalThis.crypto?.subtle&&globalThis.crypto?.getRandomValues&&globalThis.localStorage);}
 function strong(password,email="",nickname=""){
  if(typeof password!=="string"||password.length<12||te.encode(password).length>256)return "Choose a unique demo passphrase with at least 12 characters (maximum 256 bytes).";
  if(/password|qwerty|letmein|admin123|12345678|1234abcd|asdfgh/i.test(password)||/^(.{1,4})\1{3,}$/.test(password))return "That demo password is too predictable.";
  const low=password.toLowerCase().replace(/\s+/g,"");
  if(nickname.length>2&&low.includes(nickname.toLowerCase())||
     email.split("@")[0].length>4&&low.includes(email.split("@")[0].toLowerCase()))return "Don't include your nickname or email in a password.";
  return null;
 }
 async function fingerprint(email){
  const hash=await crypto.subtle.digest("SHA-256",te.encode(email.trim().toLowerCase()));
  return encode(new Uint8Array(hash));
 }
 async function derive(password,salt){
  const material=await crypto.subtle.importKey("raw",te.encode(password),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations:ITERATIONS},
    material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
 }
 async function seal(key,value,salt,id){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:te.encode(id)},key,te.encode(JSON.stringify(value)));
  return {version:1,id,salt:encode(salt),iv:encode(iv),payload:encode(new Uint8Array(ciphertext))};
 }
 async function open(key,record){
  const decoded=await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(record.iv),additionalData:te.encode(record.id)},key,decode(record.payload));
  const value=JSON.parse(td.decode(decoded));
  if(!value||typeof value!=="object"||!value.profile||value.profile.ageGroup!=="18+"||!value.entryCompleted)
    throw Error("This demo vault contains invalid practice data.");
  return value;
 }
 function record(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(_){return null;}}
 function exists(){return !!record();}
 function lock(){encryptionKey=null;failed=null;queue=Promise.resolve();}
 async function create({email,password,nickname,state}){
  if(!enabled())throw Error("This browser does not support encrypted demo vaults. Use an up-to-date HTTPS browser.");
  if(exists())throw Error("This browser already contains one practice account. Sign in or erase the local demo account before creating another.");
  const error=strong(password,email,nickname);if(error)throw Error(error);
  if(state?.profile?.ageGroup!=="18+")throw Error("Encrypted demo practice accounts are for adult testing only.");
  const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive(password,salt),id=await fingerprint(email);
  const item=await seal(key,state,salt,id);
  try{localStorage.setItem(KEY,JSON.stringify(item));}catch(_){throw Error("This device cannot save the encrypted demo profile.");}
  encryptionKey=key;failed=null;
 }
 async function unlock({email,password}){
  const item=record();
  if(!item||!enabled()||item.version!==1||!item.salt||!item.iv||!item.payload)
   throw Error("No saved practice account exists on this device.");
  const id=await fingerprint(email);
  if(item.id!==id)throw Error("Incorrect demo email or password.");
  let key,value;
  try{
   key=await derive(password,decode(item.salt));
   value=await open(key,item);
  }catch(_){throw Error("Incorrect demo email or password.");}
  encryptionKey=key;failed=null;return value;
 }
 function persist(state){
  if(!encryptionKey)return Promise.resolve();
  const snapshot=JSON.parse(JSON.stringify(state));
  queue=queue.catch(()=>{}).then(async()=>{
   const old=record();
   if(!old)throw Error("Encrypted practice account was removed.");
   const data=await seal(encryptionKey,snapshot,decode(old.salt),old.id);
   localStorage.setItem(KEY,JSON.stringify(data));
   failed=null;
  }).catch(error=>{failed=error;throw error;});
  return queue;
 }
 async function changePassword({currentPassword,newPassword,email,state}){
  if(!encryptionKey)throw Error("Unlock your demo practice account first.");
  const p=strong(newPassword,email,state?.profile?.nickname||"");if(p)throw Error(p);
  await queue.catch(()=>{});
  const item=record();
  if(!item||item.id!==(await fingerprint(email)))throw Error("Demo account is not available.");
  try{
   const oldKey=await derive(currentPassword,decode(item.salt));
   await open(oldKey,item);
  }catch(_){throw Error("Current demo password is incorrect.");}
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const nextKey=await derive(newPassword,salt);
  const data=await seal(nextKey,state,salt,item.id);
  try{localStorage.setItem(KEY,JSON.stringify(data));}catch(_){throw Error("Unable to save the new demo passphrase.");}
  encryptionKey=nextKey;failed=null;
 }
 function erase(){lock();try{localStorage.removeItem(KEY);}catch(_){}}
 window.ASDPracticeVault={enabled,exists,strong,create,unlock,persist,changePassword,erase,lock,isUnlocked:()=>!!encryptionKey,lastError:()=>failed?.message||""};
})();