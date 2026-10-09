"use strict";
/* Founder Google verification never confers owner privileges on its own.
 * Google JWT is held in this page's memory only, never localStorage or logs. */
(()=>{
 const status=document.getElementById("founderLoginStatus");
 const form=document.getElementById("founderLoginForm");
 const passwordOption=document.getElementById("founderPasswordOption");
 const error=document.getElementById("founderLoginError");
 const submit=document.getElementById("founderLoginSubmit");
 const googleCard=document.getElementById("founderGoogleCard");
 const googleButton=document.getElementById("founderGoogleButton");
 const googleFeedback=document.getElementById("founderGoogleFeedback");
 const googleMfa=document.getElementById("founderGoogleMfaForm");
 const googleMessage=document.getElementById("founderGoogleSetupMessage");
 const googleSubmit=document.getElementById("founderGoogleComplete");
 let googleToken=null,privateStaffEnabled=false;
 async function api(path,opts={}){
  const r=await fetch("/api/staff"+path,{credentials:"same-origin",cache:"no-store",...opts});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(result.error||"Service unavailable");
  return result;
 }
 const post=(path,data)=>api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
 async function handleGoogle(response){
  if(typeof response?.credential!=="string")return;
  googleToken=response.credential;
  googleFeedback.textContent="Checking your Google account securely…";
  googleMfa.hidden=true;
  try{
   const proof=await post("/google-verify",{credential:googleToken});
   if(proof.verified!==true)throw Error("Google ownership verification did not complete.");
   googleFeedback.textContent="✓ "+proof.email+" is verified by Google. "+(privateStaffEnabled?
      "Enter your authenticator code to unlock your existing Founder account.":
      "Founder permissions remain locked until the private account and authenticator are activated.");
   if(privateStaffEnabled)googleMfa.hidden=false;
   else googleToken=null;
  }catch(err){
   googleToken=null;googleFeedback.textContent=err.message;
  }
 }
 function loadGoogle(clientId){
  const script=document.createElement("script");
  script.src="https://accounts.google.com/gsi/client";
  script.async=true;
  script.onload=()=>{
   if(!window.google?.accounts?.id){
    googleFeedback.textContent="Could not initialize Google Sign-In on this browser.";return;
   }
   window.google.accounts.id.initialize({client_id:clientId,callback:handleGoogle,auto_select:false});
   window.google.accounts.id.renderButton(googleButton,{
    type:"standard",theme:"outline",size:"large",text:"continue_with",
    shape:"pill",logo_alignment:"left",width:280
   });
   googleFeedback.textContent="Select the approved Google Account to verify your email.";
  };
  script.onerror=()=>{googleFeedback.textContent="Unable to load Google Sign-In. Check your browser or network.";};
  document.head.append(script);
 }
 async function start(){
  let config;
  try{config=await api("/google-config");}
  catch{config={enabled:false};}
  try{
   const staffStatus=await api("/status");
   privateStaffEnabled=staffStatus.enabled===true;
   if(privateStaffEnabled){
    try{
     const who=await api("/me");
     if(who?.staff?.role==="founder"){
      status.textContent="Verified Founder session. Opening your command center…";
      location.replace("/founder.html");return;
     }
    }catch{}
    passwordOption.hidden=false;
    form.hidden=false;
    status.textContent="A verified Founder identity and authenticator are required.";
   }else{
    status.textContent="Founder administration is currently locked. Google can verify the approved email separately when configured.";
   }
  }catch{
   status.textContent="The protected Founder service is temporarily unavailable.";
  }
  if(config.enabled&&typeof config.clientId==="string"){
   googleCard.hidden=false;
   googleMessage.hidden=true;
   loadGoogle(config.clientId);
  }else{
   googleMessage.textContent="Google Sign-In is being connected. An official Google OAuth web client ID must be configured before this button becomes active. No paid business email is required.";
  }
 }
 googleMfa.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!googleToken||!googleMfa.reportValidity())return;
  googleSubmit.disabled=true;googleFeedback.textContent="Checking Google identity and second-factor code…";
  try{
   const totp=document.getElementById("founderGoogleTotp").value.trim();
   const outcome=await post("/google-login",{credential:googleToken,totp});
   if(outcome?.staff?.role!=="founder")throw Error("Your account does not have Founder authorization.");
   googleToken=null;document.getElementById("founderGoogleTotp").value="";
   location.assign("/founder.html");
  }catch(err){googleFeedback.textContent=err.message;googleSubmit.disabled=false;}
 });
 form.addEventListener("submit",async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  submit.disabled=true;error.textContent="";
  try{
   const outcome=await post("/login",{
    email:document.getElementById("founderLoginEmail").value,
    password:document.getElementById("founderLoginPassword").value,
    totp:document.getElementById("founderLoginTotp").value.trim()
   });
   document.getElementById("founderLoginPassword").value="";
   document.getElementById("founderLoginTotp").value="";
   if(outcome?.staff?.role!=="founder"){
    await post("/logout",{}).catch(()=>{});
    throw Error("This account does not have Founder authorization.");
   }
   location.assign("/founder.html");
  }catch(err){error.textContent=err.message;submit.disabled=false;}
 });
 start();
})();
