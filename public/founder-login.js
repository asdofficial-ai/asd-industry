"use strict";
(()=>{
 const status=document.getElementById("founderLoginStatus");
 const form=document.getElementById("founderLoginForm");
 const error=document.getElementById("founderLoginError");
 const submit=document.getElementById("founderLoginSubmit");
 async function api(path,opts={}){
  const r=await fetch("/api/staff"+path,{credentials:"same-origin",cache:"no-store",...opts});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(result.error||"Service unavailable");
  return result;
 }
 async function start(){
  try{
   const current=await api("/status");
   if(!current.enabled){
    status.textContent="Founder account activation is not available yet. The secure backend is disabled; explore the seven-theme preview below.";
    return;
   }
   try{
    const who=await api("/me");
    if(who?.staff?.role==="founder"){
     status.textContent="Verified Founder session. Opening your command center…";
     location.replace("/founder.html");return;
    }
   }catch{}
   status.textContent="Private Founder sign-in is available for provisioned accounts only.";
   form.hidden=false;
  }catch{
   status.textContent="Private staff authentication is not available right now. No live account sign-in is possible.";
  }
 }
 form.addEventListener("submit",async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  submit.disabled=true;error.textContent="";
  try{
   const outcome=await api("/login",{method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({email:document.getElementById("founderLoginEmail").value,password:document.getElementById("founderLoginPassword").value,totp:document.getElementById("founderLoginTotp").value.trim()})});
   document.getElementById("founderLoginPassword").value="";
   document.getElementById("founderLoginTotp").value="";
   if(outcome?.staff?.role!=="founder"){
    await api("/logout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}).catch(()=>{});
    throw Error("This account does not have Founder authorization.");
   }
   location.assign("/founder.html");
  }catch(e){error.textContent=e.message;submit.disabled=false;}
 });
 start();
})();
