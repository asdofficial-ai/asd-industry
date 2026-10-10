"use strict";
/* UI-only Founder concept. Never fetches accounts, managers or privileged APIs. */
(()=>{
 const themes=Object.freeze({
  obsidian:"Obsidian Gold — executive black, champagne gold and sculpted metallic highlights.",
  crimson:"Royal Crimson — commanding red, shadowed burgundy and sharp regal detailing.",
  titanium:"Titanium — polished industrial graphite, steel and engineered geometry.",
  solar:"Solar Forge — luminous amber, warm firelight and dramatic contrast.",
  monarch:"Monarch — bespoke dark luxury with muted rosewood and soft gold.",
  spectre:"Spectre — precision sci-fi interfaces, graphite and icy turquoise glow.",
  ivory:"Ivory Noir — architectural off-white accents on mineral dark surfaces."
 });
 const views=Object.freeze({
  overview:["OVERVIEW","Your vision.<br><em>Your command.</em>","One place to see the direction of ASD Industry—teams, products and the decisions that matter. A founder experience unlike the public builder dashboard."],
  teams:["PEOPLE & TEAMS","Lead the people.<br><em>Shape the future.</em>","A dedicated management overview concept. Every displayed staff update on this page is fictional."],
  projects:["PROJECTS","From ideas<br><em>to impact.</em>","A visionary project pipeline. Percentages and project names are fictional interface samples."],
  security:["SECURITY","Ownership.<br><em>Protected.</em>","Your real Founder account must require server-verified permissions, MFA and auditable emergency access."],
  alternate:["ALTERNATE","Ask smarter.<br><em>Lead faster.</em>","A dedicated executive assistant could summarize authorized manager updates and platform activity once real access controls and data integrations are reviewed."]
 });
 const $=id=>document.getElementById(id);
 function chooseTheme(theme){
  if(!Object.prototype.hasOwnProperty.call(themes,theme))return;
  document.body.dataset.theme=theme;
  for(const el of document.querySelectorAll("[data-theme-choice]")){
   const selected=el.dataset.themeChoice===theme;
   el.classList.toggle("selected",selected);
   el.setAttribute("aria-pressed",String(selected));
  }
  $("themeDescription").textContent=themes[theme];
 }
 function chooseView(name){
  if(!Object.prototype.hasOwnProperty.call(views,name))return;
  document.body.dataset.view=name;
  for(const el of document.querySelectorAll(".dashboard-view")){
   el.classList.toggle("active",el.dataset.view===name);
  }
  for(const button of document.querySelectorAll("[data-view-target]")){
   const current=button.dataset.viewTarget===name;
   button.classList.toggle("active",current);
   if(button.classList.contains("nav-item")){
    if(current)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
   }
  }
  $("currentView").textContent=views[name][0];
  $("pageHeadline").innerHTML=views[name][1]; // all values are constant literals, never user-supplied
  $("pageSubline").textContent=views[name][2];
  if(matchMedia("(max-width:960px)").matches){
   window.scrollTo({top:0,behavior:"smooth"});
  } else {
   document.querySelector(".view-stage").scrollIntoView({block:"nearest",behavior:"smooth"});
  }
 }
 function appendMessage(author,content,isUser){
  const container=$("alternateThread"),bubble=document.createElement("div");
  bubble.className="message "+(isUser?"user-message":"assistant-message");
  const title=document.createElement("span");title.className="message-author";title.textContent=author;
  const text=document.createElement("p");text.textContent=content;
  bubble.append(title,text);container.append(bubble);
  while(container.children.length>9)container.removeChild(container.firstElementChild);
  container.scrollTop=container.scrollHeight;
 }
 function answer(question){
  const value=question.trim().toLowerCase();
  if(/manager|said|staff report|updates?/.test(value)){
   return "I am a scripted demo, not connected to manager messages. In the real Founder account, I would only show manager updates from authorized, timestamped sources—never invent what someone said.";
  }
  if(/attention|happen|urgent|priority|overview|news/.test(value)){
   return "No live alerts or reports are connected. A future executive brief would separate verified priorities, awaiting approvals and security alerts with sources and dates.";
  }
  if(/safe|secur|password|login|protect|emergency/.test(value)){
   return "Current status: Founder role checks are implemented in the private API, but Founder MFA, real recovery and emergency-profile access are not active. Never send me passwords, codes or identity documents.";
  }
  if(/who|work|team|project|building/.test(value)){
   return "The project and team numbers in this preview are fictional. Real project assignments must come from authorized system records with proper privacy controls.";
  }
  return "This is an offline concept, not a connected AI assistant. I cannot access staff messages or live projects. Try a suggested demo question; future real requests will need Founder authorization and traceable data.";
 }
 function ask(question){
  const q=question.trim();
  if(!q)return;
  appendMessage("FOUNDER · design preview",q,true);
  appendMessage("ALTernate · scripted preview",answer(q),false);
 }
 document.addEventListener("click",event=>{
  const theme=event.target.closest("button[data-theme-choice]");
  if(theme){chooseTheme(theme.dataset.themeChoice);return;}
  const navigation=event.target.closest("button[data-view-target]");
  if(navigation){chooseView(navigation.dataset.viewTarget);return;}
 });
 const form=$("alternateForm");
 form.addEventListener("submit",event=>{
  event.preventDefault();const input=$("alternateInput");
  const value=input.value;input.value="";ask(value);
 });
 for(const button of document.querySelectorAll("button[data-ask]")){
  button.addEventListener("click",()=>ask(button.dataset.ask));
 }
 $("brandButton").addEventListener("click",event=>{event.preventDefault();chooseView("overview");});
 chooseTheme("obsidian");
})();
