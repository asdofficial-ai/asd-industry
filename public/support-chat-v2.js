"use strict";
/* ASD Industry support conversation V2: intentionally OFFLINE and IN-MEMORY only.
 * Simulates a customer starting with AI, an eligible same-thread human handoff,
 * and a separate agent/manager case desk. No backend, model, WebSocket or storage.
 * In production, views are separate authenticated apps and the server must
 * verify AI outcome, customer identity, staff role, case ownership and grant.
 */
(()=>{
 const $=id=>document.getElementById(id);
 const node=(tag,value,cls)=>{const element=document.createElement(tag);if(value!==undefined)element.textContent=String(value);if(cls)element.className=cls;return element;};
 const secret=/(?:password|passcode|secret|recovery code|seed phrase|private key|one.time.code)\s*[:=]|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d .()-]{7,}\d)|\b\d{7,}\b|\b(?:NIN|BVN)\s*[:=]?\s*\d+/i;
 const safe=value=>typeof value==="string"&&value.trim().length>=5&&value.trim().length<=500&&!secret.test(value);
 const at=()=>new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
 const createCases=()=>[
  {id:"project",ticket:"DEMO-101",title:"Example project guidance",customer:"SampleBuilder",category:"Project help",priority:"Normal",
   status:"ai_triage",stage:"ai",assigned:null,offer:false,reason:"",draft:"",events:[{text:"Fictional customer opened AI Support",time:at()}],
   messages:[{kind:"ai",text:"Hello! I'm ASD Industry's sample AI Support Assistant. Ask about a fictional project. If I cannot help or lack permission, I'll offer Contact Human Support.",time:at()}]},
  {id:"security",ticket:"DEMO-102",title:"Safe account access",customer:"DemoCreator",category:"Account help",priority:"High",
   status:"open",stage:"queued",assigned:null,offer:false,reason:"AI cannot verify ownership",draft:"",
   events:[{text:"AI escalated fictional account issue",time:at()}],
   messages:[{kind:"customer",text:"I cannot access my sample account. Can you check who owns it?",time:at()},
    {kind:"ai",text:"I cannot verify account ownership or reset a password. A human review is necessary.",time:at()},
    {kind:"system",text:"AI handoff accepted. Waiting for an assigned human agent (simulation).",time:at()}]},
  {id:"technical",ticket:"DEMO-103",title:"Sample upload problem",customer:"ExampleMaker",category:"Technical",priority:"Normal",
   status:"in_progress",stage:"human",assigned:"Example Agent",offer:false,reason:"File upload needs staff investigation",draft:"",
   events:[{text:"Example Agent claimed case",time:at()}],
   messages:[{kind:"customer",text:"The example project upload is not completing in my training dashboard.",time:at()},
    {kind:"ai",text:"I cannot inspect the simulated account. A fictional human handoff was offered.",time:at()},
    {kind:"system",text:"The sample human agent accepted the AI handoff.",time:at()},
    {kind:"human",text:"Hello! I'll help you troubleshoot the fictional upload.",time:at()}]}
 ];
 let cases=createCases(),view="customer",role="agent",availability="available",selectedCase="project",composerType="reply",dialogAction=null;
 const customerCase=()=>cases[0],activeCase=()=>cases.find(c=>c.id===selectedCase)||cases[0];
 function say(message){$("alert").textContent=message;}
 function add(caseObj,kind,text){caseObj.messages.push({kind,text,time:at()});if(caseObj.messages.length>100)caseObj.messages.splice(0,caseObj.messages.length-100);}
 function audit(caseObj,text){caseObj.events.unshift({text,time:at()});if(caseObj.events.length>40)caseObj.events.length=40;}
 function statusName(status){return ({
  ai_triage:"AI triage",open:"Waiting for agent",in_progress:"In progress",waiting:"Waiting on customer",
  escalated:"Escalated to manager",resolved:"Resolved",closed:"Closed"
 })[status]||status;}
 function displayMessage(message,from){
  if(message.kind==="note"&&from!=="agent")return null;
  const mine=from==="customer"?message.kind==="customer":message.kind==="human"||message.kind==="note";
  const card=node("article",undefined,"msg "+(mine?"mine ":"")+
   (message.kind==="ai"?"ai":message.kind==="note"?"note":message.kind==="system"?"system":""));
  const author={customer:"CUSTOMER · FICTIONAL",ai:"AI SUPPORT · SCRIPTED",human:"HUMAN AGENT · SIMULATED",
   note:"PRIVATE AGENT NOTE · NOT CUSTOMER-VISIBLE",system:"CASE SYSTEM · SIMULATION"}[message.kind]||"DEMO";
  card.append(node("b",author),node("p",message.text),node("small",message.time+" · NOT DELIVERED"));
  return card;
 }
 function history(container,messages,who){
  container.replaceChildren();
  for(const message of messages){const item=displayMessage(message,who);if(item)container.append(item);}
  container.scrollTop=container.scrollHeight;
 }
 function decide(question){
  const q=question.toLowerCase();
  if(/\b(human|live agent|real agent|person|someone|representative)\b/.test(q))
   return {reason:"You asked for a human. This request needs a human-only support conversation."};
  if(/\b(account|login|sign in|access|reset|recover|locked)\b/.test(q)&&/\b(password|verify|recover|login|account|identity|reset|access)\b/.test(q))
   return {reason:"The AI cannot check account ownership, unlock an account or reset passwords."};
  if(/\b(approve|override|refund|transfer|payment|withdraw|change.*role|staff|decision)\b/.test(q))
   return {reason:"AI Support has no permission to approve decisions, change roles or take financial/account actions."};
  if(/\b(how|start|create|plan|planning|project)\b/.test(q)&&/\b(project|start|plan)\b/.test(q))
   return {answer:"For a sample ASD Industry project, define your idea, list the essential features, choose a first milestone, and review your draft before submitting. No real account or project was checked."};
  if(/\b(help|guide|tutorial)\b/.test(q))
   return {answer:"I can give general fictional guidance about ASD Industry projects, but I cannot inspect your account. Ask a more specific example question."};
  return {reason:"The scripted AI cannot reliably answer this question. It should escalate instead of guessing."};
 }
 function askAI(question){
  const c=customerCase();
  add(c,"customer",question);
  const reply=decide(question);
  if(reply.answer){
   add(c,"ai",reply.answer);c.offer=false;c.reason="";
   audit(c,"AI answered a fictional project question");
   say("The fictional AI answered. Human contact remains locked unless an AI limitation is detected.");
  }else{
   add(c,"ai","I can't complete that: "+reply.reason+" If you'd like, tap Contact Human Support below.");
   c.offer=true;c.reason=reply.reason;
   audit(c,"AI offered a human handoff · "+reply.reason);
   say("The fictional AI cannot help or lacks authority. Contact Human Support is now available.");
  }
  render();
 }
 function handoff(){
  const c=customerCase();
  if(c.stage!=="ai"||!c.offer)return;
  c.stage="queued";c.status="open";c.offer=false;
  add(c,"system","HANDOFF ACCEPTED · Your previous AI conversation was added to the fictional human agent inbox. Stay in this same chat.");
  audit(c,"Customer accepted AI-to-human handoff");
  selectedCase=c.id;
  say("The customer remains in the same chat; the fictional support agent can now claim the new case.");
  render();
 }
 function customerSubmit(value){
  const c=customerCase();
  if(c.stage==="ai"){askAI(value);return;}
  if(c.status==="resolved"||c.status==="closed"){
   say("This fictional case has been resolved. An agent can reopen it in the employee preview.");return;
  }
  if(c.status==="escalated"){
   say("This case is awaiting fictional manager review. No live agent is connected.");return;
  }
  add(c,"customer",value);audit(c,"Customer added a fictional follow-up");
  say(c.stage==="queued"?"Fictional follow-up added. Waiting for an agent to claim the case.":"Message added to the same fictional conversation; no real delivery.");
  render();
 }
 function agentCanWork(c){return c.assigned==="Example Agent"&&(role==="manager"||role==="agent");}
 function agentCanReply(c){return agentCanWork(c)&&["in_progress","waiting"].includes(c.status);}
 function chooseCase(id){if(!cases.some(c=>c.id===id))return;selectedCase=id;composerType="reply";render();}
 function setView(next){
  if(!["customer","agent"].includes(next))return;
  view=next;
  $("customerScreen").hidden=next!=="customer";$("agentScreen").hidden=next!=="agent";
  for(const [id,active] of [["viewCustomer",next==="customer"],["viewAgent",next==="agent"]]){
   $(id).classList.toggle("active",active);$(id).setAttribute("aria-pressed",String(active));
  }
  if(next==="agent")selectedCase=customerCase().stage!=="ai"?"project":"technical";
  render();
  say(next==="customer"?"Customer chat: same history when AI hands off; all staff controls are hidden.":
   "Agent workspace: manage a fictional inbox. Real employees require separate verified authentication.");
 }
 function renderCustomer(){
  const c=customerCase(),inAI=c.stage==="ai",waiting=c.stage==="queued";
  const connected=c.stage==="human";
  $("customerHeading").textContent=inAI?"ASD AI Support Assistant":"ASD Human Support · Demo";
  $("customerStage").textContent=inAI?"STAGE 01 · AI SUPPORT":waiting?"STAGE 02 · HUMAN HANDOFF QUEUED":"STAGE 03 · HUMAN SUPPORT";
  $("customerStatus").textContent=inAI?"AI FIRST":waiting?"IN QUEUE":statusName(c.status).toUpperCase();
  $("customerSubtitle").textContent=inAI?"Ask AI first. Human contact is locked until it cannot help.":
   waiting?"Still the same conversation. Waiting for a fictional human to claim it.":
   "The same AI conversation continues with a fictional human agent.";
  $("customerAvatar").textContent=inAI?"✦":"◎";
  $("humanOffer").hidden=!(inAI&&c.offer);
  $("handoffExplanation").textContent=c.reason||"AI cannot help.";
  $("contactHuman").disabled=!(inAI&&c.offer);
  $("waitingBox").hidden=!(waiting||c.status==="escalated");
  $("waitingTitle").textContent=c.status==="escalated"?"Awaiting manager review":
   waiting?"Waiting for a human agent":"";
  $("waitingCopy").textContent=c.status==="escalated"?
   "A fictional agent escalated the case. Your existing history is unchanged.":
   "Human Support can see the fictional AI history when the agent claims the case.";
  history($("customerMessages"),c.messages,"customer");
  $("customerSend").textContent=inAI?"Ask AI ↗":"Add demo message ↗";
  $("customerInput").placeholder=inAI?"Ask AI a fictional question…":
   waiting?"Add a fictional follow-up while waiting…":"Message the fictional human agent…";
  $("customerSend").disabled=["resolved","closed","escalated"].includes(c.status);
  $("customerQuick").hidden=!inAI;
  $("humanQuick").hidden=inAI;
 }
 function metrics(){
  const container=$("agentMetrics");container.replaceChildren();
  const items=[["All cases",cases.length],["Awaiting claim",cases.filter(c=>c.status==="open").length],
   ["My active cases",cases.filter(c=>c.assigned==="Example Agent"&&["in_progress","waiting"].includes(c.status)).length],
   ["Escalated",cases.filter(c=>c.status==="escalated").length]];
  for(const [title,value] of items){const item=node("article",undefined,"metric");item.append(node("small",title),node("strong",value));container.append(item);}
 }
 function renderInbox(){
  const inbox=$("agentInbox");inbox.replaceChildren();
  const query=$("caseSearch").value.trim().toLowerCase(),filter=$("caseFilter").value;
  const shown=cases.filter(c=>{
   if(c.stage==="ai")return false;
   if(query&&!(c.title+" "+c.customer+" "+c.ticket).toLowerCase().includes(query))return false;
   if(filter==="unassigned"&&c.assigned)return false;
   if(filter==="mine"&&c.assigned!=="Example Agent")return false;
   if(filter==="escalated"&&c.status!=="escalated")return false;
   if(filter==="resolved"&&!["resolved","closed"].includes(c.status))return false;
   return true;
  }).sort((a,b)=>(a.id==="project"?-1:b.id==="project"?1:0));
  $("inboxCount").textContent=shown.length+" cases";
  if(!shown.length){inbox.append(node("p","No matching fictional cases. Try another filter.","footnote"));return;}
  for(const c of shown){
   const b=node("button",undefined,"ticket"+(selectedCase===c.id?" selected":""));b.type="button";
   b.append(node("span",c.title,"ticket-title"),node("span",c.ticket+" · "+c.customer,"ticket-summary"));
   const badge=node("span",undefined,"ticket-badges");
   badge.append(node("span",statusName(c.status)),node("span",c.priority,c.priority==="High"?"urgent":""));
   if(!c.assigned)badge.append(node("span","UNCLAIMED"));
   b.append(badge);b.addEventListener("click",()=>chooseCase(c.id));inbox.append(b);
  }
 }
 function updateControls(c){
  const show=c.stage!=="ai",owner=agentCanWork(c),active=agentCanReply(c);
  $("caseControls").hidden=!show;
  $("claimCase").hidden=!(show&&!c.assigned&&c.status==="open");
  $("claimCase").textContent=role==="manager"?"Assign to Example Agent":"Claim case";
  $("claimCase").disabled=role==="agent"&&availability==="away";
  $("waitingCase").hidden=!(owner&&["in_progress","waiting"].includes(c.status));
  $("waitingCase").textContent=c.status==="waiting"?"Resume case":"Mark waiting";
  $("resolveCase").hidden=!(owner&&["in_progress","waiting","resolved"].includes(c.status));
  $("resolveCase").textContent=c.status==="resolved"?"Close (Manager only)":"Resolve case";
  $("resolveCase").disabled=c.status==="resolved"&&role!=="manager";
  $("escalateCase").hidden=!(owner&&["in_progress","waiting"].includes(c.status));
  $("reopenCase").hidden=!(owner&&c.status==="resolved");
  $("reviewCase").hidden=!(role==="manager"&&c.status==="escalated");
  $("agentActionsArea").hidden=!active;
  $("agentSend").textContent=composerType==="reply"?"Add demo reply ↗":"Add private note";
  $("saveDraft").hidden=composerType!=="reply";
  $("agentInput").placeholder=composerType==="reply"?"Write a fictional human reply…":"Write a private note (not visible to customers)…";
  $("publicReplyTab").classList.toggle("active",composerType==="reply");
  $("privateNoteTab").classList.toggle("active",composerType==="note");
  $("publicReplyTab").setAttribute("aria-pressed",String(composerType==="reply"));
  $("privateNoteTab").setAttribute("aria-pressed",String(composerType==="note"));
  if(!active)$("agentInput").value="";
 }
 function renderAgent(){
  metrics();renderInbox();
  const c=activeCase();
  $("caseTitle").textContent=c.title;
  $("caseEyebrow").textContent=c.ticket+" · "+c.customer+" · HUMAN SUPPORT TRAINING";
  $("caseSub").textContent=c.stage==="ai"?"This customer is still speaking with AI. No human case exists yet.":
   c.assigned?"Owner: "+c.assigned+" · "+c.category:"New AI handoff · unclaimed human-support case";
  $("caseStatusPill").textContent=statusName(c.status).toUpperCase();
  $("sidebarTitle").textContent=c.title;
  for(const [id,value] of [["metaTicket",c.ticket],["metaCustomer",c.customer],["metaDepartment",c.category],
    ["metaPriority",c.priority],["metaAgent",c.assigned||"Unclaimed"],["metaStatus",statusName(c.status)]])$(id).textContent=value;
  history($("agentMessages"),c.messages,"agent");
  const log=$("agentAudit");log.replaceChildren();
  for(const action of c.events){const line=node("p",undefined,"audit-event");line.append(node("b",action.time+" · "),node("span",action.text));log.append(line);}
  updateControls(c);
  $("draftStatus").textContent=c.draft?"A private, unsent draft is saved in this browser tab.":"Draft is private to this fictional agent and never delivered.";
 }
 function render(){renderCustomer();if(view==="agent")renderAgent();}
 function claim(){
  const c=activeCase();
  if(c.stage==="ai"||c.assigned||c.status!=="open"){say("Only unclaimed human-support cases can be claimed.");return;}
  if(availability==="away"&&role==="agent"){say("Change availability to Available or Busy before claiming a case.");return;}
  c.assigned="Example Agent";c.status="in_progress";c.stage="human";
  add(c,"system","Example Agent accepted this fictional AI handoff. The same chat history remains available.");
  audit(c,(role==="manager"?"Manager assigned":"Example Agent claimed")+" the fictional case");
  say("Case claimed. The customer now sees the human-support header in the same chat.");
  render();
 }
 function statusAction(action){
  const c=activeCase();
  if(!agentCanWork(c)){say("Claim this case before taking agent actions.");return;}
  if(action==="waiting"){
   if(!["in_progress","waiting"].includes(c.status))return;
   c.status=c.status==="waiting"?"in_progress":"waiting";
   audit(c,"Example Agent changed status to "+statusName(c.status));
   say("Case moved to "+statusName(c.status)+". No external notifications were sent.");
  }
  if(action==="resolve"){
   if(c.status==="resolved"){
    if(role!=="manager"){say("Only Managers close resolved cases.");return;}
    c.status="closed";audit(c,"Manager closed the fictional resolved case");
   }else if(["in_progress","waiting"].includes(c.status)){
    c.status="resolved";audit(c,"Example Agent marked the fictional case resolved");
    add(c,"system","This fictional case was marked resolved by a human agent.");
   }
   say("Case status changed to "+statusName(c.status)+".");
  }
  if(action==="reopen"&&c.status==="resolved"){
   c.status="in_progress";audit(c,"Example Agent reopened the fictional case");
   say("Case reopened for more human-support work.");
  }
  render();
 }
 function askDialog(action){
  const c=activeCase();
  if(action==="escalate"&&(!agentCanWork(c)||!["in_progress","waiting"].includes(c.status)))return;
  if(action==="review"&&(role!=="manager"||c.status!=="escalated"))return;
  dialogAction={action,caseId:c.id};
  $("dialogTitle").textContent=action==="escalate"?"Escalate to Manager (demo)":"Independent Manager Review (demo)";
  $("dialogText").textContent=action==="escalate"?
   "Give a fictional reason. The assigned agent can no longer change this case until Manager review.":
   "Confirm a manager review note to return this case to the agent. This does not trigger real customer actions.";
  $("dialogInput").value="";$("dialogBackdrop").hidden=false;$("dialogInput").focus();
 }
 function confirmDialog(){
  if(!dialogAction)return;
  const reason=$("dialogInput").value.trim(),c=cases.find(item=>item.id===dialogAction.caseId);
  if(reason.length<12||reason.length>350||secret.test(reason)){say("Provide a 12–350 character fictional reason without personal data.");return;}
  if(dialogAction.action==="escalate"&&agentCanWork(c)&&["in_progress","waiting"].includes(c.status)){
   c.status="escalated";audit(c,"Agent escalated: "+reason);
   add(c,"system","This fictional case needs an independent Manager review. Original messages are preserved.");
   say("Case escalated. A Manager must review before the agent can resume.");
  }else if(dialogAction.action==="review"&&role==="manager"&&c.status==="escalated"){
   c.status="in_progress";audit(c,"Separate Manager review completed: "+reason);
   add(c,"system","Fictional Manager reviewed the escalation and returned this case to the assigned agent.");
   say("Manager review complete. This fictional case can now proceed.");
  }
  $("dialogBackdrop").hidden=true;dialogAction=null;render();
 }
 function submitAgent(text){
  const c=activeCase();
  if(!agentCanReply(c)){say("Agent actions require an assigned, active case.");return;}
  if(composerType==="reply"){
   add(c,"human",text);audit(c,"Fictional human agent added a customer-visible demo reply");
   say("Human agent's demo reply added. Switch to Customer view to see it in the SAME chat.");
  }else{
   add(c,"note",text);audit(c,"Agent saved an internal note (hidden from customer)");
   say("Private internal note saved in the fictional staff view, not shown to the customer.");
  }
  $("agentInput").value="";render();
 }
 function saveDraft(){
  const c=activeCase(),value=$("agentInput").value.trim();
  if(composerType!=="reply"||!agentCanReply(c))return;
  if(!safe(value)){say("Draft must contain 5–500 characters without sensitive details.");return;}
  c.draft=value;audit(c,"Human agent saved an unsent private draft");
  say("Unsent reply draft saved in this browser tab only. It was NOT sent.");
  render();
 }
 function reset(){
  cases=createCases();view="customer";role="agent";availability="available";selectedCase="project";composerType="reply";
  $("caseSearch").value="";$("caseFilter").value="all";$("agentAvailability").value="available";$("agentRole").value="agent";
  $("customerInput").value="";$("agentInput").value="";$("dialogBackdrop").hidden=true;dialogAction=null;
  $("customerScreen").hidden=false;$("agentScreen").hidden=true;
  $("viewCustomer").classList.add("active");$("viewAgent").classList.remove("active");
  $("viewCustomer").setAttribute("aria-pressed","true");$("viewAgent").setAttribute("aria-pressed","false");
  render();say("Reset complete. Customer begins with AI; staff controls are available only in the separate agent preview.");
 }
 $("viewCustomer").addEventListener("click",()=>setView("customer"));
 $("viewAgent").addEventListener("click",()=>setView("agent"));
 $("customerForm").addEventListener("submit",event=>{
  event.preventDefault();const value=$("customerInput").value.trim();
  if(!safe(value)){say("Enter 5–500 fictional characters without passwords, contact details or identifiers.");return;}
  $("customerInput").value="";customerSubmit(value);
 });
 document.querySelectorAll("[data-quick-customer]").forEach(button=>button.addEventListener("click",()=>{
  const value=button.dataset.quickCustomer;
  if(!safe(value))return;customerSubmit(value);
 }));
 document.querySelectorAll("[data-quick-human]").forEach(button=>button.addEventListener("click",()=>{
  const c=customerCase();
  if(c.stage==="ai")return;
  const value=button.dataset.quickHuman;if(!safe(value))return;
  customerSubmit(value);
  if(value.toLowerCase().includes("escalate"))say("Escalation was requested in the fictional thread. An assigned human agent must decide whether to escalate the case.");
 }));
 $("contactHuman").addEventListener("click",handoff);
 $("caseSearch").addEventListener("input",renderInbox);
 $("caseFilter").addEventListener("change",renderInbox);
 $("agentRole").addEventListener("change",()=>{
  role=$("agentRole").value==="manager"?"manager":"agent";
  say(role==="manager"?"Manager-only training actions are visible. This role switch does not grant real permissions.":"Human Agent training actions are visible. Manager approval controls are hidden.");
  render();
 });
 $("agentAvailability").addEventListener("change",()=>{
  availability=$("agentAvailability").value;say("Fictional agent availability: "+availability);
  render();
 });
 $("claimCase").addEventListener("click",claim);
 $("waitingCase").addEventListener("click",()=>statusAction("waiting"));
 $("resolveCase").addEventListener("click",()=>statusAction("resolve"));
 $("reopenCase").addEventListener("click",()=>statusAction("reopen"));
 $("escalateCase").addEventListener("click",()=>askDialog("escalate"));
 $("reviewCase").addEventListener("click",()=>askDialog("review"));
 $("publicReplyTab").addEventListener("click",()=>{composerType="reply";const c=activeCase();$("agentInput").value=c.draft;renderAgent();});
 $("privateNoteTab").addEventListener("click",()=>{composerType="note";$("agentInput").value="";renderAgent();});
 $("agentForm").addEventListener("submit",event=>{
  event.preventDefault();const value=$("agentInput").value.trim();
  if(!safe(value)){say("Write a 5–500 character fictional message without private information.");return;}
  submitAgent(value);
 });
 $("saveDraft").addEventListener("click",saveDraft);
 $("dialogCancel").addEventListener("click",()=>{$("dialogBackdrop").hidden=true;dialogAction=null;say("Fictional action cancelled.");});
 $("dialogConfirm").addEventListener("click",confirmDialog);
 $("resetPreview").addEventListener("click",reset);
 $("customerReset").addEventListener("click",reset);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("dialogBackdrop").hidden){$("dialogBackdrop").hidden=true;dialogAction=null;}});
 reset();
})();