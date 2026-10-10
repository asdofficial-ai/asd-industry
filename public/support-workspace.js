"use strict";
/* Human staff workspace, private API only. Never stores passwords, customer data or tokens.
   No customer-visible messages are sent. All case actions remain server authorized. */
(()=>{
 const $=id=>document.getElementById(id);
 const e=(tag,text,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};
 let role=null,cases=[],agents=[],currentId="",enabled=false;
 const tell=(id,value)=>{$(id).textContent=value;};
 function button(title,onClick,kind="secondary"){const b=e("button",title,kind);b.type="button";b.addEventListener("click",onClick);return b;}
 async function api(path,options={}){
  const response=await fetch("/api/staff"+path,{credentials:"same-origin",cache:"no-store",...options,
   headers:{...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})}});
  const json=await response.json().catch(()=>({}));
  if(response.status===401){lock("Staff session expired. Sign in again.");throw Error("Staff session expired.");}
  if(!response.ok)throw Error(json.error||"Staff service unavailable.");
  return json;
 }
 const post=(path,data)=>api(path,{method:"POST",body:JSON.stringify(data)});
 function lock(message){
  role=null;currentId="";cases=[];agents=[];
  $("supportWorkspace").hidden=true;$("supportLogin").hidden=!enabled;
  $("agentPassword").value="";
  if(message)tell("serviceStatus",message);
 }
 function showError(message){$("workspaceError").hidden=false;tell("workspaceError",message);}
 function clearError(){$("workspaceError").hidden=true;tell("workspaceError","");}
 function showTab(page){
  if(!["dashboard","cases","create","guidelines","profile","team"].includes(page)||$("supportWorkspace").hidden)return;
  if(page==="team"&&role!=="manager")return;
  for(const section of document.querySelectorAll(".workspace-page"))section.hidden=section.id!=="page-"+page;
  for(const b of document.querySelectorAll("[data-page]")){
   const selected=b.dataset.page===page;
   if(b.closest(".support-tabs")){b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected));}
  }
  if(page==="team")loadManager().catch(err=>showError(err.message));
  if(page==="profile")loadProfile().catch(err=>showError(err.message));
 }
 function showStats(data){
  const box=$("supportStats");box.replaceChildren();
  for(const [label,value] of [["Accessible cases",data.total],["Open",data.open],["In progress",data.in_progress],["Escalated",data.escalated],["Resolved",data.resolved]]){
   const card=e("article",undefined,"stat");card.append(e("span",label),e("strong",value??0));box.append(card);
  }
 }
 async function updateOverview(){
  const data=await api("/support/dashboard");
  showStats(data.data);return data;
 }
 function renderCases(){
  const box=$("supportCases");box.replaceChildren();
  if(!cases.length){box.append(e("p","No test cases available to this staff account.","fine"));return;}
  for(const c of cases){
   const b=e("button",undefined,"case-row"+(c.id===currentId?" active":""));b.type="button";
   b.append(e("strong",c.subject),e("small",c.requester_alias+" · "+new Date(c.updated_at).toLocaleDateString()));
   const meta=e("div",undefined,"case-meta");
   meta.append(e("span",c.status.replaceAll("_"," "),"chip"),e("span",c.priority,"chip "+(c.priority==="high"?"high":"")));
   if(!c.assigned_staff_id)meta.append(e("span","Unclaimed","chip"));
   b.append(meta);
   b.addEventListener("click",()=>openCase(c.id));
   box.append(b);
  }
 }
 async function refresh(){
  clearError();
  try{
   const [counts,list]=await Promise.all([updateOverview(),api("/support/cases")]);
   role=counts.agentRole;cases=list.data||[];
   renderCases();
   if(currentId&&cases.some(c=>c.id===currentId&& (role==="manager"||c.assigned_staff_id))){
    await openCase(currentId);
   }else{currentId="";$("caseDetail").replaceChildren(e("h3","Select a case"),e("p","Choose a fictional case; claim an unassigned case before seeing its private notes.","fine"));}
  }catch(err){showError(err.message);}
 }
 function selectStatus(form,allowed){
  const label=e("label","Update case status");
  const sel=e("select");sel.setAttribute("aria-label","Change support case status");
  for(const status of allowed){const opt=e("option",status.replaceAll("_"," "));opt.value=status;sel.append(opt);}
  label.append(sel);
  form.append(label);
  return sel;
 }
 const nextStatuses={
  open:["in_progress","escalated"],in_progress:["waiting_on_customer","escalated","resolved"],
  waiting_on_customer:["in_progress","escalated","resolved"],
  escalated:[],resolved:["in_progress","closed"],closed:[]
 };
 async function action(fn){
  clearError();
  try{await fn();await refresh();}catch(err){showError(err.message);}
 }
 async function openCase(id){
  currentId=id;
  const c=cases.find(x=>x.id===id);
  if(!c)return;
  renderCases();
  const panel=$("caseDetail");panel.replaceChildren();
  if(role!=="manager"&&!c.assigned_staff_id){
   panel.append(e("span","AVAILABLE / UNCLAIMED","eyebrow"),e("h3",c.subject),
    e("p","Claim this case to view its description, internal notes and next actions.","fine"),
    button("Claim test case →",()=>action(()=>post("/support/cases/"+id+"/claim",{})),"primary"));
   return;
  }
  try{
   const data=await api("/support/cases/"+id);
   const item=data.data;
   panel.append(e("span",item.priority.toUpperCase()+" / "+item.status.replaceAll("_"," "),"eyebrow"),
    e("h3",item.subject),
    e("p","Fictional requester: "+item.requester_alias+" · "+item.category,"fine"),
    e("p",item.description));
   if(item.status!=="closed"){
    const controls=e("div",undefined,"case-actions");
    const allowed=(nextStatuses[item.status]||[]).filter(x=>role==="manager"||x!=="closed");
    if(allowed.length){
     const form=e("form",undefined,"internal-form");
     const select=selectStatus(form,allowed);
     const categoryLabel=e("label","Escalation category (required when escalating)");
     const category=e("select");category.setAttribute("aria-label","Escalation category");
     for(const value of ["technical","policy","safety","account_access","other"]){const opt=e("option",value.replaceAll("_"," "));opt.value=value;category.append(opt);}
     categoryLabel.append(category);
     const reasonLabel=e("label","Why does this need a manager?");
     const reason=e("textarea");reason.rows=2;reason.minLength=12;reason.maxLength=500;reason.placeholder="Explain the fictional support issue needing independent review";
     reasonLabel.append(reason);
     const fields=e("div");fields.append(categoryLabel,reasonLabel);
     fields.hidden=select.value!=="escalated";
     select.addEventListener("change",()=>{fields.hidden=select.value!=="escalated";});
     const save=button("Update status",()=>action(()=>{
      if(select.value==="escalated"){
       if(reason.value.trim().length<12){showError("Give a fictional escalation reason of at least 12 characters.");return Promise.resolve();}
       return post("/support/cases/"+id+"/status",{status:"escalated",category:category.value,reason:reason.value});
      }
      return post("/support/cases/"+id+"/status",{status:select.value});
     }));
     form.append(fields,save);controls.append(form);
    }
    if(role==="manager"){
     if(!agents.length){const response=await api("/support/agents");agents=response.data||[];}
     if(agents.length){
      const form=e("div",undefined,"internal-form"),label=e("label","Assign to available team member");
      const select=e("select");select.setAttribute("aria-label","Choose verified support agent");
      for(const a of agents){const opt=e("option",a.display_name+" · "+a.department+" · "+a.availability);opt.value=a.id;select.append(opt);}
      label.append(select);form.append(label,
       button("Assign agent",()=>action(()=>post("/support/cases/"+id+"/assign",{agentId:select.value}))));
      controls.append(form);
     }
    }
    panel.append(controls);
    const noteForm=e("form",undefined,"internal-form");
    const label=e("label","Internal note (not sent to any customer)");
    const textarea=e("textarea");textarea.rows=3;textarea.maxLength=900;textarea.minLength=5;textarea.required=true;
    textarea.placeholder="Synthetic progress note — no personal or identity details";
    label.append(textarea);
    noteForm.append(label,button("Save internal note",async()=>{
     if(!textarea.reportValidity())return;
     await action(()=>post("/support/cases/"+id+"/note",{note:textarea.value,internalOnly:true}));
    }));
    panel.append(noteForm);
   }
   const events=e("div",undefined,"case-events");events.append(e("h3","Audit trail"));
   for(const v of data.events||[]){
    const line=e("div",undefined,"case-event");
    line.append(e("b",v.event_type.replaceAll("_"," ")),e("span"," · "+new Date(v.created_at).toLocaleString()));
    if(v.body)line.append(e("p",v.body));
    if(v.new_status)line.append(e("span"," → "+v.new_status));
    events.append(line);
   }
   panel.append(events);
  }catch(err){showError(err.message);}
 }

 async function loadProfile(){
  const response=await api("/support/profile"),p=response.data;
  $("profileDisplayName").value=p.display_name;
  $("profileAvatar").value=p.avatar_preset;
  $("profileAvailability").value=p.availability;
  tell("profileDepartment","Department: "+p.department.replaceAll("_"," ")+" (only Managers assign departments)");
  tell("profileBadgeStatus",response.verifiedPublicBadge?"Administrator-verified employee badge":"Private staff account · badge verification pending");
 }
 async function loadManager(){
  if(role!=="manager")return;
  const [people,escalations]=await Promise.all([api("/support/team"),api("/support/escalations")]);
  const team=$("managerTeam");team.replaceChildren();
  if(!people.data.length)team.append(e("p","No human support agent accounts have been provisioned yet.","fine"));
  for(const person of people.data){
   const card=e("article",undefined,"team-card");
   const heading=e("div",undefined,"team-header");
   const avatar=e("span",person.avatar_preset==="compass"?"✥":person.avatar_preset==="shield"?"◇":person.avatar_preset==="spark"?"✦":"◎","team-avatar");
   const copy=e("div");copy.append(e("strong",person.display_name),e("p",person.department.replaceAll("_"," ")+" · "+person.availability+" · "+person.active_cases+" active cases","fine"));
   heading.append(avatar,copy);card.append(heading);
   const row=e("div",undefined,"manager-row"),select=e("select");
   select.setAttribute("aria-label","Change department for "+person.display_name);
   for(const item of ["general","technical","projects","trust_safety"]){
    const opt=e("option",item.replaceAll("_"," "));opt.value=item;if(item===person.department)opt.selected=true;select.append(opt);
   }
   row.append(select,button("Assign department",()=>action(async()=>{
    await api("/support/team/"+person.staff_id+"/department",{method:"PATCH",body:JSON.stringify({department:select.value})});
    await loadManager();
   })));
   card.append(row);team.append(card);
  }
  const box=$("managerEscalations");box.replaceChildren();
  if(!escalations.data.length)box.append(e("p","No pending internal escalations.","fine"));
  for(const item of escalations.data){
   const card=e("article",undefined,"team-card");
   card.append(e("strong",item.subject),e("p",item.category+" · "+item.priority+" priority","fine"),e("p",item.reason));
   const form=e("form",undefined,"internal-form");
   const label=e("label","Independent manager review note");
   const input=e("textarea");input.rows=2;input.minLength=12;input.maxLength=500;input.required=true;input.placeholder="Give a clear fictional reason for your review";
   label.append(input);form.append(label);
   const actions=e("div",undefined,"case-actions");
   for(const [caption,decision] of [["Return to progress","resume"],["Resolve case","resolve"]]){
    actions.append(button(caption,()=>action(async()=>{
     if(!input.reportValidity())return;
     await post("/support/cases/"+item.case_id+"/escalation-review",{decision,note:input.value});
     await loadManager();
    })));
   }
   form.append(actions);card.append(form);box.append(card);
  }
 }
 async function start(){
  try{
   const status=await api("/status");enabled=!!status.enabled;
   if(!enabled){lock("The human staff service is deliberately locked. This is a design preview; no live staff login or customer information is available.");return;}
   tell("serviceStatus","Private adult-test support service only. Use a trusted, configured staff domain, never the public static preview.");
   try{
    const me=await api("/me");
    if(!["support","manager"].includes(me.staff.role)){lock("This account does not have human Support permissions.");return;}
    await unlock(me.staff);
   }catch(_){$("supportLogin").hidden=false;}
  }catch(_){lock("Support API unavailable. Login and real customer cases are disabled.");}
 }
 async function unlock(person){
  if(!["support","manager"].includes(person.role))throw Error("Human support staff permissions required.");
  $("supportLogin").hidden=true;$("supportWorkspace").hidden=false;role=person.role;
  tell("agentIdentity",person.role==="manager"?"Manager · Human staff":person.badge?.verified?"Verified Human Support Agent":"Support Agent · Private account");
  tell("serviceStatus","Private human support session active. Synthetic adult-only cases; public messaging and recovery disabled.");
  $("managerTab").hidden=role!=="manager";
  await loadProfile();await refresh();showTab("dashboard");
 }
 $("supportLoginForm").addEventListener("submit",async event=>{
  event.preventDefault();$("agentLoginBtn").disabled=true;tell("loginFeedback","");
  try{
   await post("/login",{email:$("agentEmail").value,password:$("agentPassword").value});
   $("agentPassword").value="";
   const me=await api("/me");
   if(!["support","manager"].includes(me.staff.role))throw Error("Your role does not include human support access.");
   await unlock(me.staff);
  }catch(err){tell("loginFeedback",err.message);$("agentPassword").value="";}
  finally{$("agentLoginBtn").disabled=false;}
 });
 $("agentLogout").addEventListener("click",async()=>{
  try{await post("/logout",{});}catch(_){}
  lock("Signed out of the private support session.");
 });
 document.addEventListener("click",event=>{
  const nav=event.target.closest("[data-page]");
  if(nav&& !$("supportWorkspace").hidden)showTab(nav.dataset.page);
 });
 $("refreshCases").addEventListener("click",refresh);
 $("agentProfileForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!$("agentProfileForm").reportValidity())return;
  $("saveProfile").disabled=true;tell("profileFeedback","");
  try{
   const values={displayName:$("profileDisplayName").value,avatarPreset:$("profileAvatar").value,
    availability:$("profileAvailability").value};
   const result=await api("/support/profile",{method:"PATCH",body:JSON.stringify(values)});
   tell("profileFeedback","Private staff profile updated; role and verification remain unchanged.");
   tell("agentIdentity",result.data.display_name+" · "+role);
   agents=[];await loadProfile();await refresh();
  }catch(err){tell("profileFeedback",err.message);}
  finally{$("saveProfile").disabled=false;}
 });
 $("supportCaseForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!$("supportCaseForm").reportValidity())return;
  $("createCaseBtn").disabled=true;tell("caseFormFeedback","");
  try{
   await post("/support/cases",{subject:$("caseSubject").value,requesterAlias:$("caseAlias").value,
    category:$("caseCategory").value,priority:$("casePriority").value,
    description:$("caseDescription").value,syntheticAdultTest:$("caseSynthetic").checked});
   $("supportCaseForm").reset();
   tell("caseFormFeedback","Synthetic training case created internally. No customer was contacted.");
   await refresh();showTab("cases");
  }catch(err){tell("caseFormFeedback",err.message);}
  finally{$("createCaseBtn").disabled=false;}
 });
 start();
})();