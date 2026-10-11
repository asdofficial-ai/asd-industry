"use strict";
/* ASD Industry customer↔human-agent design lab — immutable fictional seeds, no network or storage. */
(()=>{
 const $=id=>document.getElementById(id);
 const seed=()=>[
  {kind:"customer_simulator",message:"Hello, I am a fictional adult using an example project account. How can I upload a sample file?",time:"09:41"},
  {kind:"human_agent",message:"Welcome to the ASD Industry support demonstration! Open the example project, choose Files and select a practice file.",time:"09:42"},
  {kind:"customer_simulator",message:"That helps. Does the fictional dashboard also let me preview the project before sharing it?",time:"09:43"}
 ];
 const messages=seed();let perspective="customer";
 const unsafe=/password|passcode|secret|seed phrase|private key|\b(?:NIN|BVN)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d ()-]{7,}\d)/i;
 const maker=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
 function repaint(){
  const customer=perspective==="customer";
  $("customerView").classList.toggle("selected",customer);
  $("agentView").classList.toggle("selected",!customer);
  $("customerView").setAttribute("aria-pressed",String(customer));
  $("agentView").setAttribute("aria-pressed",String(!customer));
  $("conv-contact").textContent=customer?"ASD Industry Human Support (fictional)":"DemoBuilder · fictional adult customer";
  $("conv-subtitle").textContent=customer?"Human Support perspective · design only":"Staff agent workspace perspective · simulation only";
  $("conv-label").textContent=customer?"Type a fictional customer message":"Type a fictional human-agent reply";
  $("conv-input").placeholder=customer?"Practice asking a made-up question":"Practice a helpful reply without real user data";
  const thread=$("conv-thread");thread.replaceChildren();
  for(const m of messages){
   const mine=(customer&&m.kind==="customer_simulator")||(!customer&&m.kind==="human_agent");
   const bubble=maker("article",undefined,"conv-msg "+(mine?"mine":"theirs"));
   bubble.append(maker("span",m.kind==="customer_simulator"?"CUSTOMER SIMULATOR":"HUMAN AGENT · SAMPLE","conv-author"),
    maker("p",m.message),maker("time",m.time+" · FICTIONAL · NOT DELIVERED"));
   thread.append(bubble);
  }
  thread.scrollTop=thread.scrollHeight;
 }
 function addMessage(value){
  const message=value.trim();
  const feedback=$("conv-feedback");
  if(message.length<12||message.length>500){feedback.textContent="Use 12–500 characters for a fictional training message.";return;}
  if(unsafe.test(message)){feedback.textContent="Do not enter real contacts, passwords, codes or identity information.";return;}
  messages.push({kind:perspective==="customer"?"customer_simulator":"human_agent",
   message,time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});
  if(messages.length>60)messages.splice(0,messages.length-60);
  feedback.textContent="Added locally. No customer or employee was contacted.";
  $("conv-input").value="";repaint();
 }
 $("customerView").addEventListener("click",()=>{perspective="customer";repaint();});
 $("agentView").addEventListener("click",()=>{perspective="agent";repaint();});
 $("conv-form").addEventListener("submit",event=>{event.preventDefault();if($("conv-form").reportValidity())addMessage($("conv-input").value);});
 document.querySelectorAll("[data-conv-quick]").forEach(button=>{
  button.addEventListener("click",()=>{const text=button.dataset.convQuick;addMessage(text);});
 });
 repaint();
})();
