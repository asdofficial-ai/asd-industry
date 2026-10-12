"use strict";
/**
 * ASD Industry customer ↔ human staff design lab — offline, fictional, in-memory.
 * This is NOT a customer authentication or staff service, and doesn't call APIs.
 * A customer continues in the same conversation after an AI handoff; agent-only
 * case actions, internal notes and inbox are never rendered in customer mode.
 * Production requires server-side verified AI decisions and staff/customer sessions.
 */
(()=>{
 const $=id=>document.getElementById(id);
 const mk=(tag,value,className)=>{
  const node=document.createElement(tag);
  if(value!==undefined)node.textContent=String(value);
  if(className)node.className=className;
  return node;
 };
 const unsafe=/(?:password|passcode|secret|otp|recovery code|seed phrase|private key|verification code)\s*(?:is|=|:)\s*\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d .()-]{7,}\d)|\b(?:NIN|BVN)\b\s*[:=]?\s*\d+|\b\d{7,}\b/i;
 const time=()=>new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
 const message=(who,text)=>({who,text,time:time()});
 const seed=()=>({
  project:{
   code:"DEMO-101",title:"Example project guidance",alias:"SampleBuilder",
   category:"Project help",priority:"Normal",status:"in_progress",assigned:true,
   phase:"human",eligible:false,why:"",notes:[],
   messages:[
    message("customer","Could you override the decision on my fictional project application?"),
    message("ai","I cannot override human project reviews. This action needs an authorized human workflow."),
    message("system","FICTIONAL AI HANDOFF ACCEPTED · A separate agent is now shown in this SAME conversation."),
    message("agent","Hello! I'm a sample human support agent. I can explain the review process, though I can't promise to change a decision.")
   ]
  },
  security:{
   code:"DEMO-102",title:"Safe account access",alias:"DemoCreator",
   category:"Account access",priority:"High",status:"awaiting_ai",assigned:false,
   phase:"ai",eligible:false,why:"",notes:[],
   messages:[message("ai","Welcome to fictional AI support. Ask about your sample account. I cannot access or reset real accounts.")]
  },
  technical:{
   code:"DEMO-103",title:"Sample upload problem",alias:"ExampleMaker",
   category:"Technical",priority:"High",status:"open",assigned:false,
   phase:"human",eligible:false,why:"",notes:[],
   messages:[
    message("customer","The fictional upload feature is not responding. What should I try?"),
    message("ai","I cannot diagnose that imaginary account state. I'll offer a human-support example."),
    message("system","TRAINING AI HANDOFF ACCEPTED · Awaiting an agent to claim."),
   ]
  }
 });
 let cases=seed(),selected="project",perspective="customer";
 const current=()=>cases[selected];
 const cleanStatus=s=>s==="awaiting_ai"?"AI first":s.replaceAll("_"," ");
 function add(who,text){
  current().messages.push(message(who,text));
  if(current().messages.length>45)current().messages.shift();
 }
 function advice(text){
  const q=text.toLowerCase();
  if(/\b(account|password|recovery|reset|locked|login|identity|verify)\b/.test(q))
   return {eligible:true,why:"Account ownership and security changes require a verified human process, not AI."};
  if(/\b(human|agent|person|escalate|representative|talk to|speak to)\b/.test(q))
   return {eligible:true,why:"You requested a human. Only authorized employees can review private or restricted actions."};
  if(/\b(approve|override|refund|payment|permission|manager|decision|upload problem|not working)\b/.test(q))
   return {eligible:true,why:"AI has no authority for that request or cannot verify this fictional account issue."};
  if(/\b(project|team|steps|guide)\b/.test(q))
   return {eligible:false,answer:"For a fictional project, choose a clear goal, list the steps, and test one feature at a time. This is a general example, not account-specific advice."};
  return {eligible:true,why:"The fictional AI cannot answer that reliably, so a human handoff should be offered."};
 }
 function humanHandoff(){
  const c=current();
  if(perspective!=="customer"||c.phase!=="ai"||!c.eligible)return;
  c.phase="human";c.eligible=false;c.status="open";c.assigned=false;
  add("system","FICTIONAL AI HANDOFF ACCEPTED. This chat stays here. An eligible human agent would be assigned after secure verification in the live product.");
  add("agent","Hello! This is a sample Human Support Agent. Please tell me what you need help with in this fictional training chat.");
  c.assigned=true;c.status="in_progress"; // explicitly illustrative assigned demo agent; never a real assignment
  repaint();
 }
 function send(text){
  const c=current(),feedback=$("chatHint"),value=text.trim();
  if(value.length<12||value.length>400){feedback.textContent="Please write 12–400 characters for this fictional example.";return;}
  if(unsafe.test(value)){feedback.textContent="Do not enter actual credentials, identity numbers, contact details or recovery codes.";return;}
  if(perspective==="agent"){
   if(c.phase!=="human"||!c.assigned||["resolved","escalated"].includes(c.status)){
    feedback.textContent="This sample case cannot receive an agent reply until claimed, active and reviewed.";return;
   }
   add("agent",value);
  }else{
   add("customer",value);
   if(c.phase==="ai"){
    const result=advice(value);
    if(result.eligible){
     c.eligible=true;c.why=result.why;c.status="ai_needs_human";
     add("ai","I can't handle that safely: "+result.why+" You can now choose Contact Human Support below.");
    }else{c.eligible=false;c.status="awaiting_ai";add("ai",result.answer);}
   }else if(c.status==="resolved"){
    add("system","This fictional case is resolved. A new authenticated case would be needed for live follow-up.");
   }
  }
  $("chatInput").value="";
  feedback.textContent="Updated both fictional perspectives in this tab. No message was delivered.";
  repaint();
 }
 function chooseCase(id){
  if(perspective!=="agent"||!Object.prototype.hasOwnProperty.call(cases,id))return;
  if(cases[id].phase!=="human")return; // AI-only inquiries are not sent to the staff inbox
  selected=id;repaint();
 }
 function choosePerspective(view){
  if(!["customer","agent"].includes(view))return;
  perspective=view;
  if(view==="agent"&&current().phase!=="human")selected="project";
  repaint();
 }
 function setStatus(status){
  if(perspective!=="agent"||current().phase!=="human")return;
  const c=current();
  if(status==="claim"&&c.status==="open"&&!c.assigned){
   c.assigned=true;c.status="in_progress";add("system","Agent claimed the fictional support case.");
  }else if(status==="in_progress"&&["resolved","waiting_on_customer"].includes(c.status)&&c.assigned){
   c.status="in_progress";c.assigned=true;add("system","Fictional case reopened for staff work.");
  }else if(status==="escalated"&&c.status==="in_progress"&&c.assigned){
   c.status="escalated";add("system","Fictional case escalated to a Manager. Agent replies are paused until reviewed.");
  }else if(status==="resolved"&&c.status==="in_progress"&&c.assigned){
   c.status="resolved";add("system","Fictional case marked resolved by the sample agent.");
  }else{ $("chatHint").textContent="This action is unavailable for the selected case status."; }
  repaint();
 }
 function internalNote(){
  if(perspective!=="agent"||current().phase!=="human")return;
  const value=$("agentNote").value.trim();
  if(value.length<8||value.length>250){$("chatHint").textContent="An internal example note requires 8–250 characters.";return;}
  if(unsafe.test(value)){$("chatHint").textContent="Please don't include personal details or secrets in notes.";return;}
  current().notes.push({value,time:time()});
  $("agentNote").value="";repaint();
 }
 function repaint(){
  const c=current(),isAgent=perspective==="agent",customer=!isAgent;
  $("chatLayout").classList.toggle("customer-layout",customer);
  $("chatLayout").classList.toggle("agent-layout",isAgent);
  $("agentInbox").hidden=customer;
  $("customerDemoChoices").hidden=isAgent;
  $("agentContext").hidden=customer;
  $("agentCaseActions").hidden=customer;
  $("customerQuickReplies").hidden=isAgent;
  $("agentQuickReplies").hidden=customer;
  $("personaTabs").querySelectorAll("[data-perspective]").forEach(b=>{
   const on=b.dataset.perspective===perspective;
   b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on));
  });
  $("chatPerspectiveLabel").textContent=customer?"CUSTOMER · SAME CONVERSATION":"HUMAN AGENT · STAFF WORKSPACE DEMO";
  $("threadTitle").textContent=customer?(c.phase==="ai"?"ASD AI Support":"ASD Human Support · Demo"):c.title;
  $("threadSubtitle").textContent=customer?(c.phase==="ai"?"AI is the first contact · scripted example":"Transferred from AI · shared fictional thread"):"Customer: "+c.alias+" · "+c.code+" · "+cleanStatus(c.status);
  $("chatSafety").textContent=customer?
    (c.phase==="ai"?"Ask AI first. Human contact becomes available only if AI cannot answer or has no permission. This is a simulation.":"The same chat now shows a fictional human agent. No employee is really connected.") :
    "Staff-only design controls: case ownership, status, internal notes and replies. Nothing reaches an actual customer.";
  $("chatInput").placeholder=isAgent?"Write a fictional reply to this case…":c.phase==="ai"?"Ask the sample AI for help…":"Reply in the same sample chat…";
  $("chatSend").textContent=isAgent?"Reply as agent (demo) ↗":c.phase==="ai"?"Ask AI (demo) ↗":"Send sample message ↗";
  const canAgentSend=isAgent&&c.phase==="human"&&c.assigned&&!["resolved","escalated"].includes(c.status);
  $("chatInput").disabled=isAgent&&!canAgentSend;
  $("chatSend").disabled=isAgent&&!canAgentSend;
  $("handoffPrompt").hidden=isAgent||c.phase!=="ai"||!c.eligible;
  $("handoffAction").disabled=isAgent||c.phase!=="ai"||!c.eligible;
  $("handoffWhy").textContent=c.why||"The AI could not help. A human is needed.";
  const thread=$("chatMessages");thread.replaceChildren();
  for(const m of c.messages){
   const mine=(customer&&m.who==="customer")||(isAgent&&m.who==="agent");
   const line=mk("article",undefined,"chat-line"+(mine?" sent":""));
   const bubble=mk("div",m.text,"bubble");
   const sender=mk("div",undefined,"sender");
   const names={customer:"CUSTOMER · FICTIONAL",ai:"AI SUPPORT · DEMO",agent:"HUMAN AGENT · DEMO",system:"SYSTEM · SIMULATED"};
   sender.append(mk("strong",names[m.who]||"SIMULATION"),mk("time",m.time+" · NOT SENT"));
   line.append(bubble,sender);thread.append(line);
  }
  thread.scrollTop=thread.scrollHeight;
  for(const button of document.querySelectorAll("[data-case]")){
   const id=button.dataset.case,entry=cases[id];
   if(!entry)continue;
   // An AI-only case is absent from the human inbox until the simulated handoff is accepted.
   button.hidden=entry.phase!=="human";
   button.classList.toggle("selected",isAgent&&id===selected);
   button.setAttribute("aria-pressed",String(id===selected));
   const subtitle=button.querySelector("small");
   if(subtitle)subtitle.textContent=entry.alias+" · "+cleanStatus(entry.status);
  }
  $("contextTitle").textContent=c.title;
  $("contextCode").textContent=c.code;
  $("contextCategory").textContent=c.category;
  $("contextPriority").textContent=c.priority;
  $("contextOwner").textContent=c.assigned?"Sample Human Agent":"Unassigned · waiting";
  $("contextStatus").textContent=cleanStatus(c.status);
  $("claimCase").disabled=!isAgent||c.phase!=="human"||c.assigned||c.status!=="open";
  $("markInProgress").disabled=!isAgent||c.phase!=="human"||!c.assigned||!["resolved","waiting_on_customer"].includes(c.status);
  $("markResolved").disabled=!isAgent||c.phase!=="human"||!c.assigned||c.status!=="in_progress";
  $("escalateCase").disabled=!isAgent||c.phase!=="human"||!c.assigned||c.status!=="in_progress";
  $("addInternalNote").disabled=!isAgent||c.phase!=="human";
  const list=$("internalNotes");list.replaceChildren();
  if(!c.notes.length)list.append(mk("p","No internal staff notes for this fictional case.","fine"));
  for(const n of c.notes)list.append(mk("p",n.time+" · "+n.value,"case-internal-note"));
 }
 function reset(){
  cases=seed();selected="project";perspective="customer";
  $("chatInput").value="";$("agentNote").value="";
  $("chatHint").textContent="Reset to fictional AI→human test data. No persistent records or delivered messages.";
  repaint();
 }
 document.getElementById("personaTabs").addEventListener("click",event=>{
  const b=event.target.closest("[data-perspective]");
  if(b)choosePerspective(b.dataset.perspective);
 });
 document.querySelectorAll("[data-case]").forEach(b=>b.addEventListener("click",()=>chooseCase(b.dataset.case)));
 document.querySelectorAll("[data-customer-case]").forEach(b=>b.addEventListener("click",()=>{
  if(perspective!=="customer"||!Object.prototype.hasOwnProperty.call(cases,b.dataset.customerCase))return;
  selected=b.dataset.customerCase;$("chatHint").textContent="This is a separate fictional customer example, not a live account.";repaint();
 }));
 document.querySelectorAll("[data-quick]").forEach(b=>b.addEventListener("click",()=>send(b.dataset.quick)));
 document.querySelectorAll("[data-agent-quick]").forEach(b=>b.addEventListener("click",()=>send(b.dataset.agentQuick)));
 $("chatForm").addEventListener("submit",event=>{
  event.preventDefault();if(!$("chatForm").reportValidity())return;send($("chatInput").value);
 });
 $("chatInput").addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){
   event.preventDefault();
   if(!$("chatInput").disabled&&$("chatInput").value.trim())$("chatForm").requestSubmit();
  }
 });
 $("handoffAction").addEventListener("click",humanHandoff);
 $("claimCase").addEventListener("click",()=>setStatus("claim"));
 $("markInProgress").addEventListener("click",()=>setStatus("in_progress"));
 $("escalateCase").addEventListener("click",()=>setStatus("escalated"));
 $("markResolved").addEventListener("click",()=>setStatus("resolved"));
 $("addInternalNote").addEventListener("click",internalNote);
 $("resetChat").addEventListener("click",reset);
 reset();
})();