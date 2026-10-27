"use strict";
/* Synthetic training only. No network calls, storage, real AI or support delivery. */
(()=>{
 const el=id=>document.getElementById(id);
 const messages=el("chatMessages");
 const forbidden=/password\s*[:=]|passcode\s*[:=]|(?:\+?\d[\d().\s-]{7,}\d)|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:NIN|BVN|OTP)\b|private key|seed phrase|recovery code|secret\s*[:=]/i;
 let allowed=false,reason="",summary="",handoffCreated=false;
 const say=(speaker,message)=>{
  const line=document.createElement("div");
  line.className="chat-line"+(speaker==="customer"?" sent":"");
  const bubble=document.createElement("div");
  bubble.className="bubble";bubble.textContent=message;
  line.append(bubble);messages.append(line);messages.scrollTop=messages.scrollHeight;
 };
 const classify=question=>{
  const q=question.toLowerCase();
  if(/human|person|real agent|representative|staff|someone/i.test(q))
   return {escalate:true,why:"You requested a person."};
  if(/password|login|account|billing|payment|refund|security|identity|verification|delete|private|locked|access/i.test(q))
   return {escalate:true,why:"This request requires verified authority or account-specific handling."};
  if(/sample project|example project|demo project|where.*project/i.test(q))
   return {escalate:false,answer:"In this fictional preview, open Projects to explore sample project cards. No real project or account data is accessed."};
  return {escalate:true,why:"The reviewed sample knowledge does not cover that question."};
 };
 function resetHandoff(){
  allowed=false;reason="";summary="";handoffCreated=false;
  el("handoffPanel").hidden=true;el("consentPanel").hidden=true;
  el("handoffConsent").checked=false;
 }
 el("aiSupportForm").addEventListener("submit",event=>{
  event.preventDefault();
  const input=el("aiQuestion"),question=input.value.trim();
  if(!input.reportValidity()||question.length<3)return;
  resetHandoff();input.value="";
  if(forbidden.test(question)){
   say("ai","Please do not enter credentials, contact details or private identifiers into this training preview.");
   el("chatHint").textContent="Input rejected locally. Nothing was sent or stored.";
   return;
  }
  say("customer",question);
  const result=classify(question);
  if(result.escalate){
   allowed=true;reason=result.why;
   summary=result.why+" (fictional question; original text is not shared)";
   say("ai",reason+" You may preview the Contact Human Support handoff. No actual employee will be contacted.");
   el("handoffReason").textContent=reason;el("handoffPanel").hidden=false;
  }else{
   say("ai",result.answer);el("chatHint").textContent="Answered by local rules, not a live AI model.";
  }
 });
 el("contactHuman").addEventListener("click",()=>{
  if(!allowed||handoffCreated)return;
  el("handoffSummary").textContent=summary;el("consentPanel").hidden=false;
 });
 el("confirmHandoff").addEventListener("click",()=>{
  if(!allowed||handoffCreated)return;
  if(!el("handoffConsent").checked){
   el("chatHint").textContent="Explicit consent is required to preview handoff.";return;
  }
  handoffCreated=true;allowed=false;
  el("handoffPanel").hidden=true;el("consentPanel").hidden=true;
  say("ai","Fictional handoff created in this browser view only. No ticket saved, no agent assigned, and no message delivered.");
  el("chatHint").textContent="Preview complete. Real customer and employee systems remain disconnected.";
 });
})();