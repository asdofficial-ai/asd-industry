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
 const protectedAction=/(?:\b(?:retrieve|reveal|show|tell|send|recover|reset|change|unlock|disable|bypass|remove|view|access)\b.{0,75}\b(?:password|passcode|security code|recovery code|2fa|two.factor|authenticator|otp|account)\b|\bforgot\s+(?:my\s+|the\s+)?password\b|\blocked\s+out\b|\blost\s+access\b)/i;
 let mode="ai",canHandoff=false,items=[],modelAvailable=false,session=0,pending=false;
 const el=(tag,text,cls)=>{
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(cls)node.className=cls;
  return node;
 };
 function say(who,body){
  const row=el("article",undefined,"bubble"+(who==="customer"?" mine":""));
  const label=who==="customer"?"YOU · DEMO":who==="human"?"HUMAN HELP · SIMULATOR":"ASD AI SUPPORT · DEMO";
  const textNode=el("p",body);
  row.append(el("span",label,"who"),textNode,el("small","DEMO · NOT SENT"));
  const box=$("messages");box.append(row);
  while(box.children.length>42)box.removeChild(box.firstElementChild);
  box.scrollTop=box.scrollHeight;
  items.push({who,body});
  if(items.length>42)items.shift();
  return textNode;
 }
 function paint(){
  const human=mode==="human_demo";
  $("handoff").hidden=human||!canHandoff;
  $("humanButton").disabled=human||!canHandoff;
  $("serviceName").textContent=human?"Human Support · Simulation":"ASD AI Support";
  $("serviceDetail").textContent=human?"No real staff connected · messages not delivered":
   modelAvailable?"Reviewed facts + server-side AI responses":"Instant reviewed help · AI model not connected";
  $("serviceStatus").textContent=human?"HUMAN DEMO":modelAvailable?"AI CONNECTED":"AI FIRST";
  $("question").placeholder=human?"Write a fictional follow-up (not delivered)…":"Ask me anything about ASD Industry…";
  $("send").textContent=pending?"Thinking…":human?"Add demo message ➤":"Send ➤";
  $("send").disabled=pending;
  $("quickQuestions").hidden=human;
 }
 async function detectModel(){
  if(typeof fetch!=="function"||typeof AbortController==="undefined")return;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),3500);
  try{
   const response=await fetch("/api/support-ai/status",{cache:"no-store",signal:controller.signal});
   if(!response.ok)return;
   const info=await response.json();
   modelAvailable=info.liveModelAvailable===true;
   if(modelAvailable&&$("supportNotice")){
    $("supportNotice").textContent="Development AI preview: general questions may be sent to the server-side AI provider. No human is connected. Don't submit personal details, passwords or codes. Real customer accounts and messaging are disabled.";
   }
   paint();
  }catch(_){/* Static design preview: instant help library stays available. */}
  finally{clearTimeout(timer);}
 }
 async function askModel(q,messageNode,started){
  let controller,timer;
  try{
   controller=new AbortController();
   timer=setTimeout(()=>controller.abort(),10500);
   const response=await fetch("/api/support-ai/ask",{method:"POST",credentials:"omit",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q}),signal:controller.signal});
   const result=await response.json().catch(()=>null);
   if(started!==session||mode!=="ai")return;
   if(!response.ok||!result||!["answered","needs_human"].includes(result.status)||
     typeof result.reply!=="string"||result.reply.length>700)throw Error("AI response unavailable");
   messageNode.textContent=result.reply;
   if(result.status==="answered"){
    canHandoff=false;
    $("feedback").textContent="Server AI replied. Response time depends on the connection and model.";
   }else{
    canHandoff=true;
    $("handoffText").textContent="This action or question needs human review. The displayed handoff is still fictional.";
    $("feedback").textContent="The AI cannot finish this request. Human Support preview is available.";
   }
  }catch(_){
   if(started!==session||mode!=="ai")return;
   messageNode.textContent="I couldn't reach the AI model right now. The reviewed help guide is still available, or you can view the fictional human handoff.";
   canHandoff=true;
   $("handoffText").textContent="AI connection unavailable. No real employee is connected.";
   $("feedback").textContent="AI connection timed out or is unavailable. Please try again.";
  }finally{
   if(timer)clearTimeout(timer);
   if(started===session){pending=false;paint();}
  }
 }
 function humanDemo(){
  if(mode!=="ai"||!canHandoff)return;
  canHandoff=false;mode="human_demo";session++;pending=false;
  say("human","Human support simulation opened. A real agent has NOT been contacted. When launched, verified customers will be routed into a private support case after an authorized handoff.");
  $("feedback").textContent="Fictional handoff opened on this same page. Nothing is connected or delivered.";
  paint();
 }
 function ask(q){
  const question=q.trim();
  if(question.length<2||question.length>500){$("feedback").textContent="Enter a question between 2 and 500 characters.";return;}
  if(secure.test(question)){$("feedback").textContent="Do not enter passwords, contact details, personal identifiers, or security codes.";return;}
  if(pending){$("feedback").textContent="Please wait for the current AI response.";return;}
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
  if(protectedAction.test(question)){
   canHandoff=true;
   say("ai","I cannot retrieve or disclose a password, disable 2FA, or perform an account security change. Those actions require an authorized recovery process. Real human recovery is not enabled in this demo.");
   $("handoffText").textContent="A protected account action needs verified human review; real recovery remains unavailable.";
   $("feedback").textContent="Restricted request: a fictional Human Support handoff is available.";
   paint();
   return;
  }
  try{
   const kb=window.ASDSupportKnowledge;
   if(!kb||!kb.validate||kb.validate()<1)throw Error("missing reviewed FAQ");
   const response=kb.respond(question);
   if(response.reason==="cannot_answer"&&modelAvailable&&typeof fetch==="function"&&typeof AbortController!=="undefined"){
    canHandoff=false;pending=true;
    const placeholder=say("ai","I'm checking that question…");
    $("feedback").textContent="Thinking… usually a few seconds, depending on the model.";
    const started=session;
    paint();
    void askModel(question,placeholder,started);
    return;
   }
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
  session++;mode="ai";canHandoff=false;items=[];pending=false;
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
 // Phone keyboards and desktop Enter should submit immediately; Shift+Enter adds a newline.
 $("question").addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){
   event.preventDefault();
   if(!pending&&$("question").value.trim())$("chatForm").requestSubmit();
  }
 });
  $("humanButton").addEventListener("click",humanDemo);
 $("startOver").addEventListener("click",reset);
 reset();
 void detectModel();
})();