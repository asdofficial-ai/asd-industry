"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const panels=["signupPanel","verifyPanel","loginPanel","successPanel"];
 let enabled=false,email="",invite="";
 function view(target){for(const id of panels)$(id).classList.toggle("hidden",id!==target);}
 function status(element,message){$(element).textContent=message;}
 function busy(button,flag){$(button).disabled=flag;}
 async function request(path,data){
  const response=await fetch("/api/beta"+path,{
   method:"POST",credentials:"same-origin",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify(data)
  });
  let payload={};
  try{payload=await response.json();}catch(_){}
  if(!response.ok)throw Error(payload.error||"This action is unavailable. Try again later.");
  return payload;
 }
 async function startup(){
  try{
    const res=await fetch("/api/beta/status",{cache:"no-store"});
    const data=await res.json();
    enabled=Boolean(data.enabled)&&Boolean(data.emailSenderConfigured);
    $("locked").textContent=enabled
      ?"Email-verified registration is available only to invited adult testers."
      :"Preview only: real email verification has not been enabled yet. No email will be sent.";
    $("locked").classList.toggle("available",enabled);
  }catch(_){
    $("locked").textContent="Email registration is unavailable right now. No email will be sent.";
  }
  busy("signupBtn",!enabled);
  busy("loginBtn",!enabled);
 }
 const passwordStrength=()=>{
  const password=$("betaPassword").value;
  const feedback=$("passwordStrength");
  const uniqueGroups=[/[a-z]/,/[A-Z]/,/[0-9]/,/[^a-zA-Z0-9\s]/].filter(re=>re.test(password)).length;
  const obviouslyWeak=/password|qwerty|letmein|admin123|welcome123|12345678/i.test(password);
  const score=password.length<12||obviouslyWeak?0:password.length>=20?3:password.length>=16&&uniqueGroups>=3?3:password.length>=12&&uniqueGroups>=2?2:1;
  feedback.textContent="Password strength: "+(["Needs improvement","Fair — consider a longer passphrase","Good","Strong"][score])+". Use a unique password.";
 };
 $("betaPassword").addEventListener("input",passwordStrength);
 $("forgotPassword").addEventListener("click",()=>{
   $("recoveryNotice").textContent="Human-assisted recovery is planned but is not active yet. Support will verify account ownership, then authorize a new password—never reveal an old password. Do not send documents, passwords, identity numbers, or recovery codes in chat.";
 });
 $("accountForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!enabled){status("signupFeedback","Real email verification is not yet available.");return;}
  if(!$("accountForm").reportValidity())return;
  if($("betaPassword").value!==$("betaConfirmPassword").value){
   status("signupFeedback","The two passwords do not match.");return;
  }
  busy("signupBtn",true);status("signupFeedback","Sending verification email…");
  email=$("betaEmail").value.trim().toLowerCase();
  invite=$("betaInvite").value;
  try{
   await request("/signup",{
     handle:$("betaHandle").value.trim(),email,password:$("betaPassword").value,
     ageGroup:$("betaAge").value,inviteCode:invite
   });
   $("betaPassword").value="";$("betaConfirmPassword").value="";
   $("verifyAddress").textContent=email;
   status("signupFeedback","");view("verifyPanel");
  }catch(e){status("signupFeedback",e.message);}
  finally{busy("signupBtn",!enabled);}
 });
 $("verifyForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!$("verifyForm").reportValidity())return;
  busy("verifyBtn",true);status("verifyFeedback","Checking your code…");
  try{
   await request("/verify-email",{email,code:$("betaCode").value.trim()});
   $("betaCode").value="";$("betaInvite").value="";
   status("verifyFeedback","");$("successMessage").textContent="Your email is verified and your adult beta account is now active. The public project builder remains a separate demonstration for now.";
   view("successPanel");
  }catch(e){status("verifyFeedback",e.message);}
  finally{busy("verifyBtn",false);}
 });
 $("resendBtn").addEventListener("click",async()=>{
  busy("resendBtn",true);status("verifyFeedback","Requesting a new code…");
  try{
   const r=await request("/resend-verification",{email,inviteCode:invite});
   status("verifyFeedback",r.message);
  }catch(e){status("verifyFeedback",e.message);}
  finally{busy("resendBtn",false);}
 });
 $("showLogin").addEventListener("click",()=>view("loginPanel"));
 $("backToSignup").addEventListener("click",()=>view("signupPanel"));
 $("backSignup").addEventListener("click",()=>view("signupPanel"));
 $("loginForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!$("loginForm").reportValidity())return;
  busy("loginBtn",true);status("loginFeedback","Signing in…");
  try{
   await request("/login",{email:$("loginEmail").value.trim().toLowerCase(),password:$("loginPassword").value});
   $("loginPassword").value="";status("loginFeedback","");
   $("successMessage").textContent="You're signed in to the private adult beta. The public project-builder demo is separate until the real account interface is released.";
   view("successPanel");
  }catch(e){status("loginFeedback",e.message);}
  finally{busy("loginBtn",!enabled);}
 });
 startup();
})();
