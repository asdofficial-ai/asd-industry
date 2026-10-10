"use strict";
/* Founder-only UI behaviors. NEVER reads/stores credentials, messages or founder data.
   identity-console.js performs separate server-authorized Founder session checks. */
(()=>{
 const allowedThemes=new Set(["obsidian","crimson","titanium","solar","monarch","spectre","ivory"]);
 const allowedTabs=new Set(["overview","management","security","alternate"]);
 const root=document.body;
 const byId=id=>document.getElementById(id);
 function chooseTheme(theme){
  if(!allowedThemes.has(theme))return;
  root.dataset.theme=theme;
  document.querySelectorAll("[data-private-theme]").forEach(button=>{
   const active=button.dataset.privateTheme===theme;
   button.classList.toggle("chosen",active);
   button.setAttribute("aria-pressed",String(active));
  });
 }
 function chooseTab(tab){
  if(!allowedTabs.has(tab))return;
  // Privileged tabs are not displayed without the Founder-only server session.
  if(byId("privateArea").hidden)return;
  document.querySelectorAll(".private-view").forEach(view=>{
   view.hidden=view.id!=="private-"+tab;
  });
  document.querySelectorAll("#privateNav [data-private-target]").forEach(button=>{
   const active=button.dataset.privateTarget===tab;
   button.classList.toggle("selected",active);
   button.setAttribute("aria-pressed",String(active));
  });
 }
 function addChatLine(author,message,isUser){
  const thread=byId("privateAltThread");
  const line=document.createElement("p");
  if(isUser)line.classList.add("demo-user");
  const title=document.createElement("b");
  title.textContent=author+" — ";
  line.append(title,document.createTextNode(message));
  thread.append(line);
  while(thread.children.length>8)thread.removeChild(thread.firstElementChild);
  thread.scrollTop=thread.scrollHeight;
 }
 function answer(question){
  const text=question.toLowerCase();
  if(/manager|said|team|staff|employee|message|report/.test(text))
   return "I cannot read managers' messages or reports. No authenticated source has been connected for that. In a future authorized version, I would show the original sender, time and source before summarizing.";
  if(/urgent|important|priority|attention|happening|news|progress/.test(text))
   return "I have no live activity feed. When trusted data sources are connected, I could summarize verified priorities and unresolved decisions, with timestamps and links.";
  if(/password|security|safe|mfa|login|recovery|emergency/.test(text))
   return "Founder access is server-role checked in development. MFA, live human-assisted recovery and emergency contact uploads are not enabled. Never share passwords or recovery codes.";
  if(/project|build|idea|squad/.test(text))
   return "I can describe a future project briefing, but I don't have access to actual project records. The separate public Design Lab shows fictional examples only.";
  return "This is an offline ALTernate demonstration, not a connected AI. I cannot inspect real messages, staff activity or projects. Try a demo prompt about managers, priorities or security.";
 }
 const sensitive=/\b(?:password|passcode|private key|seed phrase|secret|otp|pin code|bvn|nin)\s*[:=]|\b\d{6,}\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/i;
 function ask(question){
  const prompt=question.trim();
  if(!prompt)return;
  if(sensitive.test(prompt)){
   addChatLine("ALTernate · local preview","Please don't enter credentials, identity numbers, codes, or private information here. This is a UI demonstration, not a secure support channel.",false);
   return;
  }
  addChatLine("Founder · demo only",prompt,true);
  addChatLine("ALTernate · scripted preview",answer(prompt),false);
 }
 document.addEventListener("click",event=>{
  const theme=event.target.closest("button[data-private-theme]");
  if(theme){chooseTheme(theme.dataset.privateTheme);return;}
  const tab=event.target.closest("button[data-private-target]");
  if(tab){chooseTab(tab.dataset.privateTarget);return;}
  const question=event.target.closest("button[data-private-ask]");
  if(question&& !byId("privateArea").hidden)ask(question.dataset.privateAsk);
 });
 const chat=byId("privateAltForm");
 if(chat)chat.addEventListener("submit",event=>{
  event.preventDefault();
  const input=byId("privateAltInput");
  const text=input.value;
  input.value="";
  if(!byId("privateArea").hidden)ask(text);
 });
 chooseTheme("obsidian");
})();
