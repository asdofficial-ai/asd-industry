"use strict";
/* All UI data fictional and in-memory. No fetch, websockets, storage, external messages or credentials. */
(()=>{
 const $=id=>document.getElementById(id);
 const create=(tag,value,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;};
 const seed=()=>({
  project:{subject:"Example project guidance",alias:"SampleBuilder",code:"DEMO-101",category:"Project help",priority:"Normal",status:"In progress",
   messages:[["customer","Hello, could you explain the sample project setup steps?"],["agent","Welcome to this fictional ASD Industry support demonstration. I can show the example setup process."],["customer","I created my example project. What would the next step be?"],["agent","In this training scenario, open the example project checklist and review its sample milestones."]]},
  security:{subject:"Safe account access",alias:"DemoCreator",code:"DEMO-102",category:"Account access",priority:"High",status:"Open",
   messages:[["customer","Can a support employee look up my old password in the system?"],["agent","No. Staff cannot retrieve passwords. In a real service, secure recovery would issue a new password reset after verification."]]},
  technical:{subject:"Sample upload problem",alias:"ExampleMaker",code:"DEMO-103",category:"Technical",priority:"Normal",status:"In progress",
   messages:[["customer","I cannot upload a made-up sample image to my training project."],["agent","Thanks for the fictional example. Which step of the sample workflow did not complete?"]]}
 });
 const forbidden=/password\s*[:=]|passcode\s*[:=]|(?:\+?\d[\d().\s-]{7,}\d)|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:NIN|BVN|OTP)\b|private key|seed phrase|recovery code|secret\s*[:=]/i;
 let conversations=seed(),current="project",perspective="customer";
 function formatTime(){return "just now";}
 function paint(){
  const c=conversations[current];
  $("threadTitle").textContent=c.subject;
  $("threadSubtitle").textContent=perspective==="customer"?"Sample ASD human agent · fictional":"Conversation with "+c.alias+" · fictional";
  $("chatPerspectiveLabel").textContent=perspective==="customer"?"CUSTOMER EXPERIENCE":"HUMAN AGENT WORKSPACE";
  $("contextTitle").textContent=c.subject;
  $("contextCode").textContent=c.code;
  $("contextCategory").textContent=c.category;
  $("contextPriority").textContent=c.priority;
  $("contextStatus").textContent=c.status;
  $("contextOwner").textContent="Fictional Human Agent";
  $("agentCaseActions").hidden=perspective!=="agent";
  $("chatSafety").textContent=perspective==="customer"
   ?"Fictional customer view. An actual human agent is NOT online. Every message is a local demonstration."
   :"Fictional staff view. This does NOT send replies to customers or access real employee accounts.";
  $("chatHint").textContent=perspective==="customer"
   ?"This view only shows how a future customer might contact a verified agent. No messages are delivered."
   :"This view shows future human-agent composing tools. It has no customer inbox, delivery system or external database.";
  $("chatInput").placeholder=perspective==="customer"?"Type a fictional customer question…":"Write a fictional human-agent training reply…";
  $("chatSend").textContent="Add "+(perspective==="customer"?"customer":"agent")+" demo message ↗";
  for(const b of document.querySelectorAll("[data-perspective]")){
   const active=b.dataset.perspective===perspective;b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active));
  }
  for(const b of document.querySelectorAll("[data-case]")){
   b.classList.toggle("selected",b.dataset.case===current);
  }
  const thread=$("chatMessages");thread.replaceChildren();
  for(const [speaker,message,time] of c.messages){
   const mine=(speaker===perspective);
   const line=create("div",undefined,"chat-line"+(mine?" sent":""));
   const bubble=create("div",message,"bubble");
   const info=create("div",undefined,"sender");
   info.append(create("strong",speaker==="customer"?"Sample Customer":"Sample Human Agent"),
     create("span",time||"example"));
   line.append(bubble,info);thread.append(line);
  }
  thread.scrollTop=thread.scrollHeight;
 }
 document.addEventListener("click",event=>{
  const p=event.target.closest("button[data-perspective]");
  if(p){perspective=p.dataset.perspective;paint();return;}
  const c=event.target.closest("button[data-case]");
  if(c&&conversations[c.dataset.case]){current=c.dataset.case;paint();return;}
  const q=event.target.closest("button[data-quick]");
  if(q){$("chatInput").value=q.dataset.quick;$("chatInput").focus();}
 });
 $("chatForm").addEventListener("submit",event=>{
  event.preventDefault();
  if(!$("chatInput").reportValidity())return;
  const value=$("chatInput").value.trim();
  if(forbidden.test(value)){
   $("chatHint").textContent="For safety, do not enter private identifiers, contact details or credentials. Try a fictional question instead.";
   $("chatInput").value="";return;
  }
  conversations[current].messages.push([perspective,value,formatTime()]);
  $("chatInput").value="";paint();
 });
 $("markResolved").addEventListener("click",()=>{
  if(perspective!=="agent")return;
  conversations[current].status="Resolved (demo)";
  paint();
 });
 $("resetChat").addEventListener("click",()=>{
  conversations=seed();current="project";perspective="customer";$("chatInput").value="";paint();
 });
 paint();
})();