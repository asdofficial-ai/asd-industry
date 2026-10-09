"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const mode=document.body.dataset.console;
 const endpoint=mode==="founder"?"/founder/overview":mode==="manager"?"/manager/overview":"/support/overview";
 const notify=(message)=>{$("serviceStatus").textContent=message;};
 const make=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=String(text);if(cls)el.className=cls;return el;};
 async function request(path,options={}){
  const r=await fetch("/api/staff"+path,{credentials:"same-origin",cache:"no-store",...options,
   headers:{...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||"Staff service is unavailable.");
  return data;
 }
 function addFact(label,value){
  const box=make("section","", "card");
  box.append(make("p",label,"muted"),make("b",value));
  $("privateStats").append(box);
 }
 async function loadPrivate(){
  const me=await request("/me");
  if(mode==="founder"&&me.staff.role!=="founder")throw Error("Only the verified Founder can open this console.");
  if(mode==="manager"&&!["founder","manager"].includes(me.staff.role))throw Error("Manager access is required.");
  if(mode==="support"&&!["founder","manager","support"].includes(me.staff.role))
   throw Error("Only human support or authorized managers can open this desk.");
  const data=await request(endpoint);
  $("loginBox").hidden=true;$("privateArea").hidden=false;
  const label=me.staff.badge?.verified?me.staff.badge.label+" · Verified human employee":
   "Private human staff login · Public badge not verified/opted in";
  $("staffBadge").textContent=label;
  $("privateStats").replaceChildren();
  $("policyText").replaceChildren();
  if(mode==="founder"){
   for(const [name,value] of [["Active human staff",data.counts.active_staff],["Pending review decisions",data.counts.pending_reviews],
     ["Staff audit events",data.counts.audit_events],["Account recovery","Not activated"]])addFact(name,value);
   $("policyText").append(make("p","Emergency contacts, alternate recovery methods, security alerts, backups, escalation steps and succession procedures will be stored privately only after founder MFA and encrypted-profile access are implemented."));
   $("policyText").append(make("p","We do not request emergency documents, account passwords, NIN/BVN, recovery codes or payment information in this demo."));
  }else if(mode==="manager"){
   addFact("Requests awaiting human review",data.counts.awaiting_human_review);
   addFact("Prepared advisory reports",data.counts.prepared_advisory_reports);
   $("policyText").append(make("p","Managers can coordinate queue reviews but cannot approve or decline a project, assign Founder identity, access private emergency records or reveal passwords."));
   $("policyText").append(make("p","AI agents and Support accounts remain separate. Staff permissions are checked by the server, not by this page."));
  }else{
   addFact("Human recovery review","Not activated");addFact("Password lookup","Impossible by design");
   $("policyText").append(make("p","When enabled, human agents will use independently verified ownership evidence and two-person approval where appropriate to authorize a one-time password reset. Agents cannot see, recover or disclose the original password."));
   $("policyText").append(make("p","Do not request passwords, sensitive documents or security codes in chat. The official recovery/evidence portal is not configured."));
  }
  notify("Authenticated restricted console. Real account recovery and emergency-profile uploads are still disabled.");
 }
 async function startup(){
  try{
   const status=await request("/status");
   if(!status.enabled){notify("Staff service is closed. This is a design-stage console; no real staff logins or customer recovery are active.");return;}
   $("loginBox").hidden=false;
   notify("Private adult staff testing only. Do not submit passwords unless this is your trusted, configured HTTPS staff domain.");
   try{await loadPrivate();}catch(_){}
  }catch(e){notify("Staff service unavailable. No data was submitted.");}
 }
 $("loginForm").addEventListener("submit",async event=>{
  event.preventDefault();$("loginBtn").disabled=true;$("loginFeedback").textContent="";
  const email=$("email").value,password=$("password").value;
  try{
   await request("/login",{method:"POST",body:JSON.stringify({email,password})});
   $("password").value="";await loadPrivate();
  }catch(e){$("loginFeedback").textContent=e.message;$("password").value="";}
  finally{$("loginBtn").disabled=false;}
 });
 $("logoutBtn").addEventListener("click",async()=>{
  try{await request("/logout",{method:"POST",body:JSON.stringify({})});}catch(_){}
  $("privateArea").hidden=true;$("loginBox").hidden=false;notify("Signed out.");
 });
 startup();
})();
