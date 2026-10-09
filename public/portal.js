/* ASD Industry separated-page demo controller.
 * All posts/projects/messages exist only inside this browser tab.
 * Client-side locks illustrate intended flow; they are NOT security controls. */
"use strict";
(()=>{
 const Core=window.ASDPortalCore;
 const STORE="asd-industry-v05-demo";
 const LEGACY="asd-industry-v03-demo-session";
 const page=document.body.dataset.page;
 const $=id=>document.getElementById(id);
 function element(tag,cls,content){
  const n=document.createElement(tag);if(cls)n.className=cls;
  if(content!==undefined)n.textContent=String(content);return n;
 }
 function append(parent,...children){children.forEach(x=>parent.append(x));return parent;}
 function show(node,yes){node.hidden=!yes;}
 function text(id,v){const n=$(id);if(n)n.textContent=v;}
 function save(){try{sessionStorage.setItem(STORE,JSON.stringify(state));}catch{message("Storage is unavailable; changes won't survive page navigation.");}}
 function read(key){try{const raw=sessionStorage.getItem(key);return raw?JSON.parse(raw):null;}catch{return null;}}
 let state=read(STORE);
 const legacy=read(LEGACY);
 if(!state||!state.viewer){
  if(legacy?.entryCompleted&&legacy?.profile?.nickname){
   state=Core.newState(legacy.profile.nickname,legacy.profile.ageGroup||"18+");
   if(legacy.idea?.title&&legacy.idea?.description?.length>=35){
    try{
     const old=Core.submitProject(state,{title:legacy.idea.title,description:legacy.idea.description,category:Core.CATEGORIES.includes(legacy.idea.topic)?legacy.idea.topic:"Other",seats:3,roles:[]});
     old.history.push({title:"Imported old demo idea as pending application",at:new Date().toISOString()});
    }catch{}
   }
   save();
  } else {location.replace("/#signup");return;}
 }
 function message(value){const p=document.querySelector(".form-feedback");if(p)p.textContent=value;}
 function btn(label,onClick,kind="secondary"){
  const b=element("button","action "+kind+" compact",label);b.type="button";b.addEventListener("click",onClick);return b;
 }
 function link(label,url,kind="secondary"){
  const a=element("a","action "+kind,label);a.href=url;return a;
 }
 function date(raw){try{return new Date(raw).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}catch{return "";}}
 function line(title,body,cls=""){
  const d=element("div",cls||"member-row");
  const inside=element("div");append(inside,element("b","",title),element("small","",body));
  append(d,element("span","avatar",title.charAt(0).toUpperCase()),inside);return d;
 }
 function empty(target,title,body,actionLabel,href){
  target.replaceChildren();
  const wrapper=element("div","empty-body");
  append(wrapper,element("h2","",title),element("p","muted",body));
  if(href)append(wrapper,link(actionLabel,href,"primary"));
  target.append(wrapper);
 }
 const name=state.viewer.nickname;
 text("headerNickname",name);text("headerAvatar",name[0].toUpperCase());
 document.querySelectorAll('[data-nav],[data-mobile]').forEach(a=>{
  a.classList.toggle("active",a.dataset.nav===page||a.dataset.mobile===page);
  if(a.classList.contains("active"))a.setAttribute("aria-current","page");
 });
 const menu=$("mobileMenu"),drawer=$("mobileSidebar");
 if(menu&&drawer){menu.addEventListener("click",()=>{
  const open=drawer.hidden;drawer.hidden=!open;menu.setAttribute("aria-expanded",String(open));
  });document.addEventListener("keydown",e=>{if(e.key==="Escape")drawer.hidden=true;});
 }
 function projectCard(project){
  const card=element("article","project-card");
  const top=element("div","project-title");
  append(top,element("h3","",project.title),element("span","tag",Core.statusLabel(project.stage)));
  append(card,top,element("p","muted",project.description),
   element("div","micro-heading",project.category+"  ·  "+project.members.length+"/"+project.seats+" teammate places filled"));
  if(project.reviewNote)append(card,element("div","review-note","ASD Industry review simulation: "+project.reviewNote));
  const actions=element("div","project-actions");
  if(project.stage==="pending"){
   append(actions,element("span","muted","Awaiting ASD Industry review. Recruitment and group creation remain locked."));
  }
  if(project.stage==="changes-requested"){
   append(actions,btn("Revise and resubmit",()=>{
    const revised=window.prompt("Update the project explanation before resubmitting:",project.description);
    if(revised===null)return;
    if(revised.trim().length<35){alert("Please include at least 35 characters.");return;}
    project.description=revised.trim().slice(0,900);
    Core.resubmit(state,project);save();renderProjects();
   }));
  }
  if(["approved","recruiting"].includes(project.stage)){
   append(card,element("p","muted","Approved (demo). Founder controls recruitment. Only fictional sample teammates are available."));
   const candidates=element("div","column-stack");
   const sorted=[...Core.CANDIDATES].sort((a,b)=>{
    const rank=x=>(project.roles.includes(x.role)?3:0)+(x.topics.includes(project.category)?2:0);
    return rank(b)-rank(a);
   });
   for(const candidate of sorted){
    if(project.members.some(m=>m.id===candidate.id))continue;
    if(project.members.length>=project.seats)break;
    const row=line(candidate.handle,candidate.role+" · fictional sample");
    append(row,btn("Add sample",()=>{
      try{Core.recruit(state,project,candidate.id,name);save();renderProjects();}
      catch(err){alert(err.message);}
    },"ghost"));
    candidates.append(row);
   }
   if(candidates.childElementCount)append(card,candidates);
   if(project.members.length===project.seats)append(actions,btn("Create private demo group ↗",()=>{
    try{Core.createGroup(state,project,name);save();renderProjects();}
    catch(err){alert(err.message);}
   },"primary"));
   else append(actions,element("span","muted","Recruit "+(project.seats-project.members.length)+" more to enable group creation."));
  }
  if(project.groupCreated){
   append(actions,link("Private chat →","/team.html","primary"),link("Private workspace →","/workspace.html"));
  }
  if(actions.childElementCount)card.append(actions);
  return card;
 }
 function renderProjects(){
  const target=$("myProjects");if(!target)return;
  target.replaceChildren();
  if(!state.projects.length){empty(target,"No applications yet","Start with an idea. ASD Industry must approve it before recruitment or group creation.");return;}
  state.projects.forEach(p=>target.append(projectCard(p)));
 }
 function initProjects(){
  const options=$("projectCategory");
  Core.CATEGORIES.forEach(c=>{const opt=element("option","",c);opt.value=c;options.append(opt);});
  const roles=["Developer","Designer","Marketing","Research","Content","Sales","Business strategy","Project coordinator","Maker","Video editor"];
  roles.forEach(role=>{
   const label=element("label"),input=document.createElement("input");input.type="checkbox";input.value=role;
   append(label,input,element("span","",role));$("roleChoices").append(label);
  });
  $("projectForm").addEventListener("submit",e=>{
   e.preventDefault();const target=$("projectFeedback");target.textContent="";
   try{
    const project=Core.submitProject(state,{
     title:$("projectTitle").value,
     description:$("projectDescription").value,
     category:options.value,seats:$("projectSeats").value,
     roles:[...$("roleChoices").querySelectorAll("input:checked")].map(x=>x.value)
    });
    save();$("projectForm").reset();text("projectSeats","");$("projectSeats").value="3";
    target.textContent="Project "+project.id+" submitted. You must wait for ASD Industry review.";
    renderProjects();
   }catch(err){target.textContent=err.message;}
  });
  renderProjects();
 }
 function initReview(){
  const target=$("reviewApplications");
  function draw(){
   target.replaceChildren();
   const pending=state.projects.filter(p=>p.stage==="pending");
   if(!pending.length){empty(target,"No pending applications","Submit an application from Projects to test this separate administrative workflow.", "Go to Projects","/projects.html");return;}
   pending.forEach(project=>{
    const card=element("article","project-card");
    append(card,element("h3","",project.title),
       element("p","muted",project.description),
       element("p","muted","Founder: "+project.founder+" · Requested members: "+project.seats+" · "+project.category));
    const actions=element("div","project-actions");
    append(actions,btn("Simulate ASD Industry approval",()=>{
      if(!confirm("Simulate a staff approval? No real ASD Industry decision is made."))return;
      try{Core.decide(state,project,"approved","demo-staff-preview","Approved in demonstration for recruitment testing.");save();draw();}
      catch(err){alert(err.message);}
    },"primary"));
    append(actions,btn("Request changes",()=>{
      const reason=window.prompt("What should the founder improve?","Clarify how the first prototype will be tested.");
      if(reason===null)return;
      try{Core.decide(state,project,"changes-requested","demo-staff-preview",reason);save();draw();}
      catch(err){alert(err.message);}
    },"warn"));
    card.append(actions);target.append(card);
   });
  }
  draw();
 }
 function activeGroup(area){
  return state.projects.find(p=>Core.canAccess(p,name,area));
 }
 function guarded(area){
  const active=activeGroup(area);
  const guard=$(area==="chat"?"teamGuard":"workspaceGuard");
  const content=$(area==="chat"?"teamActive":"workspaceActive");
  show(content,Boolean(active));show(guard,!active);
  if(!active){
   const pending=state.projects.find(p=>p.founder===name);
   empty(guard,
    pending?"Group not created yet":"You don't have a team group yet",
    pending?"Your project must be approved, the founder must recruit the requested number of teammates, and only then can a private group be created.":"Submit a project application and complete the approval and recruitment stages first.",
    "Go to project applications →","/projects.html");
  }
  return active;
 }
 function memberBlock(target,project){
  target.replaceChildren();
  target.append(line(project.founder, "Founder · local profile"));
  project.members.forEach(m=>target.append(line(m.handle,m.role+" · fictional")));
 }
 function initTeam(){
  let p=guarded("chat");if(!p)return;
  text("chatProject",p.title);memberBlock($("chatMembers"),p);
  const log=$("chatLog");
  function draw(){
   log.replaceChildren();
   if(!p.messages.length){
    const placeholder=element("p","muted","No messages yet. Only this browser's founder can write in this demo. Fictional members can't reply.");
    log.append(placeholder);
   }
   p.messages.forEach(m=>{
    const b=element("article","bubble");
    append(b,element("strong","",m.by),element("p","",m.text),element("small","",date(m.at)));
    log.append(b);
   });log.scrollTop=log.scrollHeight;
  }
  $("chatForm").addEventListener("submit",e=>{
   e.preventDefault();
   try{Core.addMessage(p,name,$("chatInput").value);save();$("chatInput").value="";text("chatFeedback","");draw();}
   catch(err){text("chatFeedback",err.message);}
  });
  draw();
 }
 function initWorkspace(){
  let p=guarded("workspace");if(!p)return;
  text("workspaceProject",p.title);text("workspaceSummary",p.description);
  memberBlock($("workspaceMembers"),p);
  const history=$("projectHistory");history.replaceChildren();
  p.history.slice().reverse().forEach(entry=>{
    const d=element("div","timeline-row");
    append(d,element("b","",entry.title),element("small","",date(entry.at)));
    history.append(d);
  });
  const tasks=$("taskItems");
  function draw(){
   tasks.replaceChildren();text("tasksCounter",p.tasks.filter(t=>t.done).length+"/"+p.tasks.length+" completed");
   if(!p.tasks.length)tasks.append(element("p","muted","No tasks yet. Write the first project milestone."));
   p.tasks.forEach(t=>{
    const row=element("div","task-row"+(t.done?" done":""));
    const check=document.createElement("input");check.type="checkbox";check.checked=!!t.done;
    check.setAttribute("aria-label","Complete task: "+t.text);
    check.addEventListener("change",()=>{t.done=check.checked;save();draw();});
    const del=btn("×",()=>{p.tasks=p.tasks.filter(x=>x.id!==t.id);save();draw();},"ghost");
    del.setAttribute("aria-label","Remove task "+t.text);
    append(row,check,element("span","",t.text),del);tasks.append(row);
   });
  }
  $("taskForm").addEventListener("submit",e=>{
   e.preventDefault();try{Core.addTask(p,name,$("taskText").value);$("taskText").value="";save();draw();}
   catch(err){alert(err.message);}
  });draw();
 }
 const samplePosts=[
  {author:"PixelPilot · fictional",tag:"APP PROTOTYPE",text:"Built a concept for a study-planning app. Currently working on accessible navigation and offline features.",kind:"photo",at:"DEMO POST"},
  {author:"DataBloom · fictional",tag:"PROJECT NOTES",text:"A simple farm inventory tracker can help small teams understand seasonal demand. Starting with interviews and sketches.",kind:"file",at:"DEMO POST"},
  {author:"NovaDesign · fictional",tag:"DESIGN PROGRESS",text:"Exploring a minimal interface for creators to showcase what they've built, instead of chasing followers.",kind:"video",at:"DEMO POST"}
 ];
 function renderFeed(){
  const target=$("feedItems");target.replaceChildren();
  const items=[...state.posts.map(p=>({author:p.author,tag:"YOUR LOCAL POST",text:p.text,kind:p.kind,at:date(p.at)})),...samplePosts];
  text("feedAuthor",name);text("feedAvatar",name[0].toUpperCase());
  items.forEach(p=>{
   const card=element("article","panel feed-post"),head=element("div","post-head");
   const label=element("div");
   append(label,element("b","",p.author),element("small","",p.tag+"  ·  "+p.at));
   append(head,element("span","avatar",p.author[0].toUpperCase()),label);
   const body=element("div","post-body");
   append(body,element("p","",p.text));
   const info={progress:["↗","Builder progress","Work in progress"],photo:["▧","Photo showcase","Sample image placeholder"],video:["▶","Video showcase","Sample video placeholder"],file:["▤","File showcase","Sample document placeholder"]}[p.kind]||["↗","Project update",""];
   const visual=element("div","post-visual"),heading=element("div");
   append(heading,element("b","",info[1]),element("small","",info[2]));
   append(visual,element("span","",info[0]),heading);body.append(visual);
   const footer=element("div","post-foot");
   append(footer,element("span","","PROJECT BUILDING · "+p.kind.toUpperCase()),element("span","","No public comments or uploads in demo"));
   append(card,head,body,footer);target.append(card);
  });
 }
 function initHome(){
  $("postForm").addEventListener("submit",e=>{
   e.preventDefault();
   try{Core.addPost(state,$("postText").value,$("postKind").value);save();$("postForm").reset();text("postFeedback","Saved to this tab only.");renderFeed();}
   catch(err){text("postFeedback",err.message);}
  });
  renderFeed();
 }
 function initDiscover(){
  const grid=$("candidateGrid");Core.CANDIDATES.forEach(m=>{
    const card=element("article","panel");
    append(card,element("span","topic",m.role.toUpperCase()),element("h3","",m.handle),element("p","muted",m.topics.join(" · ")),
     element("span","tag","Fictional sample — not contactable"));
    grid.append(card);
  });
 }
 function initProfile(){
  text("profileName",name);text("profileAge","Age group: "+state.viewer.ageGroup+" · Demo");
  text("profileAvatar",name[0].toUpperCase());
  $("profileBio").value=state.viewer.bio||"";
  $("profileForm").addEventListener("submit",e=>{
   e.preventDefault();state.viewer.bio=$("profileBio").value.trim().slice(0,180);save();text("profileFeedback","Bio saved in this browser tab.");
  });
  const metrics=$("profileMetrics");
  for(const [label,value] of [["Projects",state.projects.length],["Posts",state.posts.length],["Active teams",state.projects.filter(p=>p.stage==="active").length]]){
   append(metrics,append(element("div"),element("b","",value),element("span","",label)));
  }
  $("portalExit").addEventListener("click",()=>{
   if(!confirm("Clear the demo profile and every local project, post, task and message in this tab?"))return;
   try{sessionStorage.removeItem(STORE);sessionStorage.removeItem(LEGACY);}catch{}
   location.replace("/#signup");
  });
 }
 function initNotifications(){
  const target=$("notificationItems");
  if(!state.notifications.length){empty(target,"No new updates yet","Application decisions and team creation milestones will appear here.");return;}
  state.notifications.forEach(n=>{
   const d=element("div","timeline-row");
   append(d,element("b","",n.title),element("p","muted",n.description),element("small","",date(n.at)));
   target.append(d);
  });
 }
 const pages={home:initHome,discover:initDiscover,projects:initProjects,team:initTeam,workspace:initWorkspace,profile:initProfile,notifications:initNotifications,review:initReview};
 if(pages[page])pages[page]();
 $("portalApp").hidden=false;
})();