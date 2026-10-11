"use strict";
/* ASD Industry AI-first support: wholly offline UX preview.
   The "AI" is a deterministic demo script, not a live model or authorization provider.
   The human view is a fictional simulator. Production MUST enforce real trusted AI assessment,
   customer session checks and single-use server-side handoff grants. */
(()=>{
 const $=id=>document.getElementById(id);
 const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 const confidential=/(?:password|passcode|secret|recovery code|seed phrase|private key|one.time.code)\s*[:=]|(?:[\w.+-]+@[\w.-]+\.[a-z]{2,})|(?:\+?\d[\d ().-]{7,}\d)|\b(?:NIN|BVN)\s*[:=]?\s*\d+\b|\b\d{7,}\b/i;
 let mode="ai",perspective="customer",authorized=false,seq=0;
 const history=[];
 function add(sender,text){
  history.push({sender,text,seq:++seq});
  if(history.length>44)history.splice(0,history.length-44);
  const thread=$("supportThread");thread.replaceChildren();
  for(const line of history){
   const mine=line.sender==="customer"||(line.sender==="human_agent"&&mode==="human"&&perspective==="agent");
   const article=make("article",undefined,"bubble "+(mine?"customer":"")+(line.sender==="human_agent"?" agent":""));
   const name=line.sender==="scripted_ai"?"AI SUPPORT · SCRIPTED DEMO":line.sender==="human_agent"?"HUMAN AGENT · FICTIONAL":line.sender==="system"?"DEMO SYSTEM":"CUSTOMER · FICTIONAL";
   article.append(make("strong",name),make("p",line.text),make("small","SIMULATION ONLY · NOT DELIVERED"));
   thread.append(article);
  }
  thread.scrollTop=thread.scrollHeight;
 }
 function stage(){
  $("stepAI").classList.toggle("active",mode==="ai");
  $("stepEscalate").classList.toggle("active",authorized&&mode==="ai");
  $("stepHuman").classList.toggle("active",mode==="human");
  $("handoffOffer").hidden=!authorized||mode!=="ai";
  $("humanPerspective").hidden=mode!=="human";
  $("contactHuman").disabled=!authorized||mode!=="ai";
  $("chatTitle").textContent=mode==="human"?(perspective==="agent"?"Fictional Customer Case":"ASD Human Support · Fictional"):"ASD AI Support Assistant";
  $("chatSubtitle").textContent=mode==="ai"?"Scripted help · no real AI model · no messages sent":"Illustrated human conversation · no real staff";
  $("chatAvatar").textContent=mode==="ai"?"✦":"◎";
  $("sendSupport").textContent=mode==="ai"?"Ask AI ↗":"Add fictional message ↗";
  $("supportInput").placeholder=mode==="ai"?"Ask a fictional question…":perspective==="agent"?"Write a fictional agent reply…":"Write a fictional customer follow-up…";
  $("routingLabel").textContent=mode==="ai"?"● AI SUPPORT FIRST":"● HUMAN AGENT SIMULATION";
  $("sideTitle").textContent=mode==="ai"?"Quick support. Safe escalation.":"A human takes over.";
  $("sideDescription").textContent=mode==="ai"?
   "Ask the AI first. If it can't answer or lacks permission, a Contact Human Support button appears.":
   "This is a demonstration of what a human-support chat could look like after an approved AI handoff.";
  $("examples").hidden=mode!=="ai";
  $("customerSide").classList.toggle("selected",perspective==="customer");
  $("agentSide").classList.toggle("selected",perspective==="agent");
  $("customerSide").setAttribute("aria-pressed",String(perspective==="customer"));
  $("agentSide").setAttribute("aria-pressed",String(perspective==="agent"));
 }
 function decide(prompt){
  const q=prompt.toLowerCase();
  if(/\b(human|person|live agent|real agent|speak to|someone)\b/.test(q))
   return {status:"needs_human",reason:"You've requested a human. AI support cannot take over human-only decisions or identity checks."};
  if(/\b(reset|recover|lost access|sign in|login|locked out|account access|verify identity)\b/.test(q))
   return {status:"needs_human",reason:"Account access and ownership checks require a verified human workflow. No resets are active in this demo."};
  if(/\b(approve|approval|override|change.*decision|change.*role|manager|payment|refund|transfer|withdraw)\b/.test(q))
   return {status:"needs_human",reason:"The AI assistant has no authority to approve, override, move money, or change employee/customer permissions."};
  if(/\b(plan|planning|idea|ideas)\b/.test(q)&&/\b(project|projects)\b/.test(q))
   return {status:"answered",text:"For a sample project, outline the idea, the audience, the main features, and a small first milestone. This is a general example, not a check of your ASD Industry account."};
  return {status:"needs_human",reason:"The AI demo can't reliably answer that question. It should explain this instead of guessing, then offer human support."};
 }
 function aiAsk(message){
  add("customer",message);
  const assessment=decide(message);
  if(assessment.status==="answered"){
   add("scripted_ai",assessment.text);
   authorized=false;
   $("routeStatus").textContent="The fictional AI answered this example. You can ask another question; no human handoff was issued.";
  }else{
   authorized=true;
   add("scripted_ai","I cannot complete this request: "+assessment.reason+" You may choose Contact Human Support below.");
   $("handoffReason").textContent=assessment.reason;
   $("routeStatus").textContent="Simulation-only AI escalation: a fictional human contact button is now available.";
  }
  stage();
 }
 function enterHuman(){
  if(!authorized||mode!=="ai")return;
  mode="human";perspective="customer";authorized=false;
  add("system","FICTIONAL HANDOFF CREATED. In production, the server must first verify your signed-in account and a single-use AI escalation grant.");
  add("human_agent","Hello! I'm a fictional ASD Industry Human Support Agent. This is a simulation. Please describe a made-up issue without personal details.");
  $("routeStatus").textContent="Human support simulation opened after AI escalation. No real employee is connected.";
  stage();
 }
 function addHuman(message){
  add(perspective==="agent"?"human_agent":"customer",message);
  $("routeStatus").textContent="Fictional "+(perspective==="agent"?"agent response":"customer message")+" added in this browser only. Nothing was delivered.";
 }
 function reset(){
  mode="ai";perspective="customer";authorized=false;seq=0;history.length=0;
  $("supportInput").value="";
  add("scripted_ai","Welcome to ASD Industry's AI Support demonstration. Ask me a sample question first. If I cannot help or don't have permission, I'll offer a human handoff.");
  $("routeStatus").textContent="AI-first routing ready. Human contact stays locked until a simulated AI escalation.";
  stage();
 }
 $("supportForm").addEventListener("submit",event=>{
  event.preventDefault();
  const input=$("supportInput"),message=input.value.trim();
  if(message.length<5||message.length>500){$("routeStatus").textContent="Please use 5–500 characters.";return;}
  if(confidential.test(message)){
   $("routeStatus").textContent="Never include actual passwords, numbers, contact details or recovery codes in this demo.";
   input.value="";return;
  }
  input.value="";
  if(mode==="ai")aiAsk(message);else addHuman(message);
 });
 document.querySelectorAll("[data-sample]").forEach(button=>button.addEventListener("click",()=>{
  if(mode!=="ai")return;
  aiAsk(button.dataset.sample);
 }));
 $("contactHuman").addEventListener("click",enterHuman);
 $("customerSide").addEventListener("click",()=>{if(mode!=="human")return;perspective="customer";stage();});
 $("agentSide").addEventListener("click",()=>{if(mode!=="human")return;perspective="agent";stage();});
 $("restart").addEventListener("click",reset);
 reset();
})();