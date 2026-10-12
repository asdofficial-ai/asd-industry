"use strict";
/*
 * ASD Industry's ONE-PAGE, customer-facing support experience — scripted DEMO ONLY.
 * No live AI, real human agent, authentication, messages, network or storage.
 * Future release: handoff must use a server-verified customer session, trusted AI/human
 * request, expiring one-time grant, agent availability and a secure in-app case.
 */
(()=>{
 const $=id=>document.getElementById(id);
 const secure=/(?:password|passcode|secret|pin|recovery code|otp|seed phrase|private key|verification code)\s*(?:is|=|:)\s*\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d ().-]{7,}\d)|\b(?:NIN|BVN)\s*(?:is|=|:)\s*[0-9]+|\b\d{7,}\b/i;
 const asksHuman=/\b(?:need|want|request|contact|connect(?: me)? to|speak to|talk to|chat with|get|reach)\s+(?:(?:a|an|the|real|live)\s+)?(?:human(?:\s+(?:support|agent|person|representative))?|(?:human\s+)?(?:customer\s+)?support\s+(?:agent|person|representative)|live\s+agent)\b/i;
 let mode="ai",canHandoff=false,items=[];
 const el=(tag,text,cls)=>{
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(cls)node.className=cls;
  return node;
 };
 function say(who,body){
  const row=el("article",undefined,"bubble"+(who==="customer"?" mine":""));
  const label=who==="customer"?"YOU · DEMO":who==="human"?"HUMAN HELP · SIMULATOR":"AI SUPPORT · SCRIPTED FAQ";
  row.append(el("span",label,"who"),el("p",body),el("small","FICTIONAL · NOT SENT"));
  const box=$("messages");box.append(row);
  while(box.children.length>42)box.removeChild(box.firstElementChild);
  box.scrollTop=box.scrollHeight;
  items.push({who,body});
  if(items.length>42)items.shift();
 }
 function paint(){
  const human=mode==="human_demo";
  $("handoff").hidden=human||!canHandoff;
  $("humanButton").disabled=human||!canHandoff;
  $("serviceName").textContent=human?"Human Support · Simulation":"ASD AI Support";
  $("serviceDetail").textContent=human?"No real staff connected · messages not delivered":"Reviewed FAQs · human handoff when needed";
  $("serviceStatus").textContent=human?"HUMAN DEMO":"AI FIRST";
  $("question").placeholder=human?"Write a fictional follow-up (not delivered)…":"Ask me anything about ASD Industry…";
  $("send").textContent=human?"Add demo message ➤":"Send ➤";
  $("quickQuestions").hidden=human;
 }
 function humanDemo(){
  if(mode!=="ai"||!canHandoff)return;
  canHandoff=false;mode="human_demo";
  say("human","Human support simulation opened. A real agent has NOT been contacted. When launched, verified customers will be routed into a private support case after an authorized handoff.");
  $("feedback").textContent="Fictional handoff opened on this same page. Nothing is connected or delivered.";
  paint();
 }
 function ask(q){
  const question=q.trim();
  if(question.length<2||question.length>500){$("feedback").textContent="Enter a question between 2 and 500 characters.";return;}
  if(secure.test(question)){$("feedback").textContent="Do not enter passwords, contact details, personal identifiers, or security codes.";return;}
  say("customer",question);
  if(mode==="human_demo"){
   $("feedback").textContent="This is a human-support mock conversation. Your message was not sent to anyone.";
   return;
  }
  if(asksHuman.test(question)){
   // Asking explicitly for a person is itself a valid reason to escalate; no extra click needed.
   canHandoff=true;
   say("ai","You asked for a human support agent. I'll open the human-help view now.");
   humanDemo();
   return;
  }
  try{
   const kb=window.ASDSupportKnowledge;
   if(!kb||!kb.validate||kb.validate()<1)throw Error("missing reviewed FAQ");
   const response=kb.respond(question);
   if(response.status==="answered"){
    canHandoff=false;
    say("ai",response.text);
    $("feedback").textContent="Answered using the reviewed ASD Industry help library. You can ask another question.";
   }else{
    canHandoff=true;
    say("ai",response.text+" You can contact Human Support for the next step.");
    $("handoffText").textContent=response.reason==="permission_denied"?
     "This request requires a verified human workflow. Real account actions are not available yet.":
     "I don't have a reliable answer. Ask a human when support goes live.";
    $("feedback").textContent="The AI cannot finish this request. The optional Human Support button is now visible.";
   }
  }catch(_){
   canHandoff=true;
   say("ai","I can't safely answer that right now. You can request Human Support.");
   $("handoffText").textContent="The approved support FAQ is unavailable.";
   $("feedback").textContent="AI knowledge unavailable. Human Support demonstration is offered.";
  }
  paint();
 }
 function reset(){
  mode="ai";canHandoff=false;items=[];
  $("messages").replaceChildren();$("question").value="";
  say("ai","Hi! 👋 I'm ASD Industry's AI Support demo. Ask me about projects, team matching, accounts, or safety. Say “I need human support” anytime to see the human handoff.");
  $("feedback").textContent="Ask the AI first, or request human help at any time. This is an offline demonstration.";
  paint();
 }
 $("chatForm").addEventListener("submit",event=>{
  event.preventDefault();
  if(!$("chatForm").reportValidity())return;
  const value=$("question").value;
  $("question").value="";
  ask(value);
 });
 document.querySelectorAll("[data-prompt]").forEach(button=>button.addEventListener("click",()=>{
  if(mode==="ai")ask(button.dataset.prompt);
 }));
 $("humanButton").addEventListener("click",humanDemo);
 $("startOver").addEventListener("click",reset);
 reset();
})();