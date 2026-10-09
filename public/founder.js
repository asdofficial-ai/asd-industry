"use strict";
/* ASD Industry Founder Command Center v0.8.
 * Public static HTML is a visual preview. Secure records never render unless
 * /api/staff/me confirms role=founder and /api/staff/founder/overview succeeds.
 * Theme preference is visual only; localStorage is NOT an authorization system. */
(()=>{
 const THEMES=Object.freeze([
  {id:"command-red",name:"Command Red",mood:"Power · Focus · Decisive",caption:"Crimson-and-black founder command",colors:["#0b090b","#ff4e53","#421520"],art:"/founder-themes/command-red.svg"},
  {id:"luxury-gold",name:"Luxury Gold",mood:"Prestige · Vision · Legacy",caption:"Black-and-gold executive luxury",colors:["#0e0b08","#e9b95f","#493518"],art:"/founder-themes/luxury-gold.svg"},
  {id:"global-blue",name:"Global Blue",mood:"Intelligence · Technology · Scale",caption:"Electric blue global operations",colors:["#060e1c","#43a3ff","#142e50"],art:"/founder-themes/global-blue.svg"},
  {id:"visionary-green",name:"Visionary Green",mood:"Growth · Calm · Purpose",caption:"Dark-emerald future builder",colors:["#07130f","#57dba0","#16432f"],art:"/founder-themes/visionary-green.svg"},
  {id:"command-purple",name:"Command Purple",mood:"Creativity · AI · Next Era",caption:"Violet futuristic AI command",colors:["#0d091c","#b472ff","#35135f"],art:"/founder-themes/command-purple.svg"},
  {id:"industrial-orange",name:"Industrial Orange",mood:"Momentum · Builders · Ambition",caption:"Copper industrial-tech command",colors:["#0d1015","#ff9347","#5f341a"],art:"/founder-themes/industrial-orange.svg"},
  {id:"executive-white",name:"Executive White",mood:"Clarity · Confidence · Simplicity",caption:"White-and-navy executive workspace",colors:["#eff3f8","#236ce2","#183552"],art:"/founder-themes/executive-white.svg"}
 ]);
 const AGENTS=[
  {name:"Intake Coordinator",kind:"Application completeness",icon:"▣",about:"Prepares and organizes project applications for review."},
  {name:"Safety & Trust Officer",kind:"Safeguarding & privacy",icon:"⛨",about:"Flags risks and routes urgent concerns to human staff."},
  {name:"Feasibility Analyst",kind:"Planning & milestones",icon:"⌁",about:"Suggests realistic first steps and missing evidence."},
  {name:"Talent & Matching Lead",kind:"Skills & recruitment",icon:"♧",about:"Suggests useful skill types. Never invites members without approval."},
  {name:"Operations Coordinator",kind:"Staff handoff",icon:"☷",about:"Bundles reports into an auditable human-review packet."}
 ];
 const PAGES={
  overview:["THE FOUNDER'S PRIVATE WORLD","Welcome back, <em>Founder.</em>","One place for people, projects, AI staff, security and every big decision."],
  projects:["PROJECTS & FINAL DECISIONS","Your projects. <em>Your oversight.</em>","Projects are reviewed by human staff after AI-assisted recommendations."],
  ai:["THE AI WORKFORCE","AI staff. <em>Human command.</em>","Supervise five specialist roles and control what AI may recommend."],
  people:["THE HUMAN LEADERSHIP TEAM","People make <em>the decisions.</em>","Oversee your human staff and the authority they carry."],
  workspaces:["PRIVATE TEAM COLLABORATION","Private by design. <em>Built by teams.</em>","Founders create project groups after human approval and recruitment."],
  analytics:["INDUSTRY INTELLIGENCE","See clearly. <em>Build wisely.</em>","Make decisions from verified platform data, not inflated demo statistics."],
  security:["FOUNDER TRUST CENTER","Power requires <em>responsibility.</em>","Control access, inspect audit history and escalate safety concerns."],
  themes:["YOUR DESIGN, YOUR MOOD","Seven moods. <em>One founder.</em>","Swap the full visual personality of your private command center."],
  settings:["YOUR ACCOUNT, YOUR RULES","Built around <em>your vision.</em>","Manage your preferences and protected account access."]
 };
 const $=id=>document.getElementById(id);
 const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
 const add=(p,...ns)=>{ns.forEach(n=>p.append(n));return p};
 const safeText=v=>typeof v==="string"?v:"";
 let activeSection="overview",isAuthenticatedFounder=false,authDetails=null,realData=null,reviewSelection=null;
 const storageKey="asd-industry-founder-theme-v1";
 function storedTheme(){try{return localStorage.getItem(storageKey)}catch{return null}}
 function saveTheme(value){try{localStorage.setItem(storageKey,value)}catch{}}
 function themeOf(id){return THEMES.find(x=>x.id===id)||THEMES[2]}
 function setTheme(id,{skipSync=false}={}){
  const theme=themeOf(id);
  document.body.dataset.founderTheme=theme.id;
  document.querySelector('meta[name="theme-color"]').setAttribute("content",theme.colors[0]);
  $("heroThemeArt").src=theme.art;
  $("heroThemeArt").alt="Founder design concept: "+theme.name;
  $("activeThemeDescription").textContent=theme.name+" — "+theme.mood+". Applies throughout this Founder account on this device.";
  saveTheme(theme.id);
  buildThemeGallery();buildMiniThemes();
  if(isAuthenticatedFounder&&!skipSync){
   mutate("/api/staff/founder/preferences","PUT",{theme:theme.id})
    .catch(err=>showNotice("Saved on this device, but theme sync failed: "+err.message));
  }
 }
 function themeCard(theme,index){
  const article=node("article","theme-card"+(theme.id===document.body.dataset.founderTheme?" active":""));
  const image=node("div","theme-image");
  const img=node("img");img.src=theme.art;img.loading="lazy";img.alt=theme.name+" founder account design illustration";
  image.append(img);article.append(image);
  const body=node("div","theme-card-body"),info=node("div"),actions=node("div","theme-card-actions");
  add(info,node("span","theme-card-number","DESIGN "+String(index+1).padStart(2,"0")),
    node("h3","",theme.name),node("p","",theme.mood),node("p","",theme.caption));
  const swatches=node("div","theme-swatch");
  theme.colors.forEach(color=>{const square=node("span");square.style.background=color;swatches.append(square);});
  info.append(swatches);
  const selected=theme.id===document.body.dataset.founderTheme;
  const apply=node("button","cta "+(selected?"ghost":"primary"),selected?"✓ Current theme":"Apply theme");
  apply.type="button";apply.disabled=selected;
  apply.addEventListener("click",()=>{setTheme(theme.id);window.scrollTo({top:0,behavior:"smooth"});});
  actions.append(apply);add(body,info,actions);article.append(body);return article;
 }
 function buildThemeGallery(){
  const root=$("themeGallery");root.replaceChildren();
  THEMES.forEach((t,i)=>root.append(themeCard(t,i)));
 }
 function buildMiniThemes(){
  const root=$("themeMiniGrid");root.replaceChildren();
  THEMES.forEach(t=>{
   const b=node("button","theme-mini"+(t.id===document.body.dataset.founderTheme?" is-active":""));
   b.type="button";b.setAttribute("aria-label","Apply "+t.name+" founder theme");
   const img=node("img");img.src=t.art;img.loading="lazy";img.alt="";
   add(b,img,node("span","",t.name));b.addEventListener("click",()=>setTheme(t.id));root.append(b);
  });
 }
 function activateSection(key){
  if(!PAGES[key])return;
  activeSection=key;
  document.querySelectorAll(".founder-screen").forEach(el=>el.hidden=el.id!=="screen-"+key);
  document.querySelectorAll("[data-section]").forEach(b=>{
   const selected=b.dataset.section===key;b.classList.toggle("is-current",selected);
   if(selected)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
  });
  $("sectionKicker").textContent=PAGES[key][0];
  $("sectionTitle").innerHTML=PAGES[key][1]; // Static local markup, not user input.
  $("sectionSub").textContent=PAGES[key][2];
  $("sectionBreadcrumb").textContent=key.toUpperCase();
  const sidebar=$("founderSidebar");sidebar.classList.remove("is-open");
  $("menuToggle").setAttribute("aria-expanded","false");
  window.scrollTo({top:0,behavior:"smooth"});
 }
 function infoRow(icon,title,description,value){
  const row=node("div","info-row");
  const label=node("div","info-label");
  add(label,node("b","",title),node("small","",description));
  add(row,node("span","info-icon",icon),label,node("span","info-value",value));
  return row;
 }
 function metric(label,value,sub,icon){
  const card=node("div","metric-card");
  add(card,node("div","metric-icon",icon),node("small","",label),node("strong","",value),node("span","",sub));
  return card;
 }
 function loadMetrics(){
  const root=$("founderMetrics"),other=$("analyticsMetrics");root.replaceChildren();other.replaceChildren();
  const data=realData?.metrics;
  const metrics=[
   ["Project applications",data?String(data.projects):"—",data?"Database records":"Live data requires login","▣"],
   ["Awaiting review",data?String(data.pending):"—",data?"Human review queue":"Pending approval, no public access","◇"],
   ["AI staff roles","5",data?"Five specialist roles":"Five prototype roles · real AI disabled","◈"],
   ["Human staff",data?String(data.staff):"—",data?"Registered accounts":"Founder login not active in preview","♧"]
  ];
  for(const entry of metrics)root.append(metric(...entry));
  const extra=[
   ["Approved requests",data?String(data.approved):"—",data?"Verified review decisions":"Actual data unavailable","✓"],
   ["Request revisions",data?String(data.changesRequested):"—",data?"Needs human follow-up":"Actual data unavailable","⌁"],
   ["Real shared workspaces","Not active","Server-side team access not enabled","☷"],
   ["Platform revenue","Not connected","No financial system or fabricated earnings","◌"]
  ];
  for(const entry of extra)other.append(metric(...entry));
 }
 function renderAgents(){
  const grid=$("aiDirectory");grid.replaceChildren();
  const enabledById=new Map((realData?.aiRoles||[]).map(a=>[a.agent_id,a.review_enabled]));
  const agentIds=["intake","safety","feasibility","matching","operations"];
  AGENTS.forEach((a,index)=>{
   const id=agentIds[index],enabled=enabledById.get(id)!==false;
   const card=node("article","directory-card");
   add(card,node("div","directory-mark",a.icon),node("h3","",a.name),
    node("span","panel-overline",a.kind),node("p","",a.about),
    node("span","status-tag",isAuthenticatedFounder?(enabled?"ASSESSMENT ENABLED":"ASSESSMENT PAUSED"):"ADVISORY ROLE / PREVIEW"));
   if(isAuthenticatedFounder){
    const button=node("button","cta ghost founder-toggle",enabled?"Pause reports":"Enable reports");
    button.type="button";button.setAttribute("aria-label",(enabled?"Pause ":"Enable ")+a.name+" report contributions");
    button.addEventListener("click",async()=>{
     if(!confirm((enabled?"Pause":"Enable")+" "+a.name+" in future rule-based report packets? This does not activate live AI models."))return;
     button.disabled=true;
     try{
      await mutate("/api/staff/founder/agents/"+id,"PATCH",{reviewEnabled:!enabled});
      await checkSession();showNotice("Updated "+a.name+" policy. Real model execution remains disabled.");
     }catch(err){showNotice(err.message);button.disabled=false;}
    });
    card.append(button);
   }
   grid.append(card);
  });
  const prev=$("aiPreview");prev.replaceChildren();
  AGENTS.slice(0,4).forEach((a,index)=>{
   const mode=isAuthenticatedFounder?(enabledById.get(agentIds[index])===false?"Paused":"Enabled"):"Advisory";
   prev.append(infoRow(a.icon,a.name,a.kind,mode));
  });
 }
 function renderSecurity(){
  const root=$("securityPreview");root.replaceChildren();
  root.append(infoRow("⛨","Founder-only API permissions","Server checks signed-in founder role","Required"));
  root.append(infoRow("▤","Human approval trail","Review actions must be attached to real staff identities","Audit"));
  root.append(infoRow("◈","AI execution","Model actions and real youth data processing stay disabled","Off"));
  root.append(infoRow("◉","Theme Studio","Change the look without changing permissions","7 themes"));
  const audit=$("auditList");audit.replaceChildren();
  if(!isAuthenticatedFounder){
   audit.append(node("p","empty-panel","Audit records are private. Sign in with an authorized founder account when the protected staff backend is enabled."));
   $("auditMode").textContent="Protected founder data";return;
  }
  const rows=realData?.recentAudit||[];
  if(!rows.length)audit.append(node("p","empty-panel","No review audit events recorded yet."));
  rows.forEach(a=>audit.append(infoRow("▤",String(a.action||"Audit event"),new Date(a.created_at).toLocaleString(),String(a.actor_role||"System"))));
  $("auditMode").textContent="Authenticated founder";
 }
 function renderPeople(){
  const prev=$("peoplePreview");prev.replaceChildren();
  prev.append(infoRow("♛","Founder","Executive governance and direct oversight",isAuthenticatedFounder?"Verified":"Locked"));
  prev.append(infoRow("♧","Human reviewers","Only people with authorized roles can decide","Restricted"));
  prev.append(infoRow("⛨","Safety staff","Risk reviews and escalation; no approvals","Restricted"));
  const dir=$("staffDirectory");dir.replaceChildren();
  const people=realData?.staffDirectory;
  if(!people){dir.append(node("p","empty-panel","Real staff identities are hidden. Sign in with an authorized Founder account to manage your team."));return;}
  if(!people.length){dir.append(node("p","empty-panel","No human staff accounts registered."));return;}
  people.forEach(p=>{
   const row=infoRow("♧",safeText(p.email),safeText(p.role),p.enabled?"Enabled":"Suspended");
   if(p.role!=="founder"&&p.id){
    const button=node("button","cta ghost founder-toggle",p.enabled?"Suspend":"Restore");
    button.type="button";button.setAttribute("aria-label",(p.enabled?"Suspend ":"Restore ")+p.email);
    button.addEventListener("click",async()=>{
     if(!confirm((p.enabled?"Suspend":"Restore")+" staff access for "+p.email+"? Suspension revokes active sessions."))return;
     button.disabled=true;
     try{
      await mutate("/api/staff/founder/staff/"+encodeURIComponent(p.id),"PATCH",{enabled:!p.enabled});
      await checkSession();showNotice("Human staff access updated.");
     }catch(err){showNotice(err.message);button.disabled=false;}
    });
    row.append(button);
   }
   dir.append(row);
  });
 }
 function renderProjects(){
  const summary=$("approvalPreview");summary.replaceChildren();
  if(!isAuthenticatedFounder){
   summary.append(infoRow("◇","Project approvals","AI reports → human review → founder recruitment","Demo workflow"));
   summary.append(infoRow("▣","Pending applications","The real queue is not available while staff backend is disabled","Restricted"));
   summary.append(infoRow("⛨","Private groups","Created by the project founder after filling requested seats","Locked"));
  }else{
   const pending=realData?.latestRequests||[];
   if(!pending.length)summary.append(node("p","empty-panel","No applications in the review queue."));
   pending.slice(0,4).forEach(p=>summary.append(infoRow("▣",p.title,p.category+" · "+p.requested_seats+" teammates",p.status)));
  }
  const queue=$("projectQueue");queue.replaceChildren();
  if(!isAuthenticatedFounder){
   queue.append(node("p","empty-panel","Private review records require a founder session. The public project demo does not give you administrative authority."));
   return;
  }
  const requests=realData?.latestRequests||[];
  if(!requests.length){queue.append(node("p","empty-panel","No submitted review requests in the founder database."));return;}
  requests.forEach(p=>{
   const row=infoRow("▣",p.title,p.creator_label+" · "+p.category+" · "+p.requested_seats+" teammates",p.status);
   if(p.status==="pending"){
    const button=node("button","cta ghost founder-toggle","Review");
    button.type="button";button.addEventListener("click",()=>openReview(p.id));row.append(button);
   }
   queue.append(row);
  });
 }
 function showNotice(text){
  $("founderStatus").hidden=false;$("statusText").textContent=text;
 }
 async function mutate(path,method,data){
  const response=await fetch(path,{method,credentials:"same-origin",cache:"no-store",
   headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||"Operation unavailable");
  return result;
 }
 function closeReview(){
  reviewSelection=null;$("founderReviewPanel").hidden=true;
  $("founderDecisionForm").hidden=true;
  $("prepareFounderPacket").hidden=true;
 }
 async function openReview(id){
  if(!isAuthenticatedFounder)return showNotice("Founder sign-in required.");
  try{
   const result=await fetchJson("/api/staff/requests/"+encodeURIComponent(id));
   reviewSelection={id,report:result.report,version:result.request.version};
   const project=result.request;
   $("founderReviewPanel").hidden=false;
   $("reviewProjectName").textContent=project.title;
   $("reviewProjectDescription").textContent=project.description;
   $("founderDecisionFeedback").textContent="";
   $("reviewPacket").replaceChildren();
   $("prepareFounderPacket").hidden=project.status!=="pending"||Boolean(result.report);
   $("founderDecisionForm").hidden=project.status!=="pending"||!result.report;
   if(result.report){
    const sections=result.report.packet?.sections||[];
    $("reviewPacket").append(node("p","muted","Rule-based specialist assessment only. AI never authorizes projects."));
    if(!sections.length)$("reviewPacket").append(node("p","muted","All advisory roles are paused; human review still required."));
    sections.forEach(section=>{
     const box=node("div","founder-assessment");
     add(box,node("b","",section.name+" — "+section.label),node("p","muted",section.summary));
     for(const flag of section.flags||[])box.append(node("p","founder-flag","⚠ "+flag));
     $("reviewPacket").append(box);
    });
   }else $("reviewPacket").append(node("p","muted","Prepare a current specialist packet before a human decision."));
   $("founderReviewPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(err){showNotice("Review unavailable: "+err.message);}
 }
 async function prepareReview(){
  if(!reviewSelection)return;
  const button=$("prepareFounderPacket");button.disabled=true;
  try{
   await mutate("/api/staff/requests/"+encodeURIComponent(reviewSelection.id)+"/prepare","POST",{});
   await openReview(reviewSelection.id);
   showNotice("Reports prepared; human approval or decline still required.");
  }catch(err){$("founderDecisionFeedback").textContent=err.message;}
  finally{button.disabled=false;}
 }
 async function decideReview(event){
  event.preventDefault();
  if(!reviewSelection?.report)return;
  const form=$("founderDecisionForm");
  if(!form.reportValidity())return;
  const decision=$("founderDecision").value,reason=$("founderDecisionReason").value.trim();
  if(reason.length<12){$("founderDecisionFeedback").textContent="Give a meaningful reason of at least 12 characters.";return;}
  if(!confirm("Confirm your HUMAN "+decision.replace("_"," ")+" decision? This enters the protected audit trail."))return;
  const button=$("submitFounderDecision");button.disabled=true;
  try{
   await mutate("/api/staff/requests/"+encodeURIComponent(reviewSelection.id)+"/decision","POST",{
    decision,rationale:reason,reportId:reviewSelection.report.id
   });
   closeReview();$("founderDecisionReason").value="";
   await checkSession();showNotice("Your human decision was recorded.");
  }catch(err){$("founderDecisionFeedback").textContent=err.message;}
  finally{button.disabled=false;}
 }
 async function fetchJson(path){
  const response=await fetch(path,{cache:"no-store",credentials:"same-origin"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"Request unavailable");
  return data;
 }
 async function checkSession(){
  isAuthenticatedFounder=false;authDetails=null;realData=null;
  try{
   const status=await fetchJson("/api/staff/status");
   if(!status.enabled)throw Error("Founder backend is safely disabled. You're viewing the visual build preview.");
   const profile=await fetchJson("/api/staff/me");
   if(profile?.staff?.role!=="founder")throw Error("Your session does not have founder-level authorization.");
   const result=await fetchJson("/api/staff/founder/overview");
   isAuthenticatedFounder=true;authDetails=profile.staff;realData=result;
   if(result.founderTheme&&THEMES.some(t=>t.id===result.founderTheme))
    setTheme(result.founderTheme,{skipSync:true});
   $("environmentLabel").innerHTML="<i></i> FOUNDER SESSION";
   $("founderAuthStatus").textContent="Authenticated founder: "+profile.staff.email+" · Founder role verified on server.";
   $("statusText").textContent="Authenticated founder overview: data comes from the protected ASD Industry staff database.";
  }catch(err){
   $("environmentLabel").innerHTML="<i></i> PREVIEW MODE";
   $("founderAuthStatus").textContent="No active founder session. "+err.message+" Authenticate through the separate human-staff console when enabled.";
   $("statusText").textContent="Visual preview only — "+err.message+" No real administrator actions are available.";
  }
  loadMetrics();renderAgents();renderSecurity();renderPeople();renderProjects();
 }
 function init(){
  document.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>activateSection(b.dataset.jump)));
  document.querySelectorAll("[data-section]").forEach(b=>b.addEventListener("click",()=>activateSection(b.dataset.section)));
  $("quickThemeBtn").addEventListener("click",()=>activateSection("themes"));
  $("themesTop").addEventListener("click",()=>activateSection("themes"));
  $("menuToggle").addEventListener("click",()=>{
   const open=$("founderSidebar").classList.toggle("is-open");
   $("menuToggle").setAttribute("aria-expanded",String(open));
  });
  $("dismissStatus").addEventListener("click",()=>$("founderStatus").hidden=true);
  $("refreshSession").addEventListener("click",checkSession);
  $("closeFounderReview").addEventListener("click",closeReview);
  $("prepareFounderPacket").addEventListener("click",prepareReview);
  $("founderDecisionForm").addEventListener("submit",decideReview);
  renderAgents();
  setTheme(storedTheme()||"global-blue");
  activateSection("overview");
  checkSession();
 }
 init();
})();
