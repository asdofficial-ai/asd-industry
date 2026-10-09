"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const make=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
 const put=(parent,...children)=>{children.forEach(x=>parent.append(x));return parent};
 let staff=null,items=[],selected=null,backendEnabled=false;
 function status(text){$("staffAvailability").textContent=text}
 function feedback(text){const el=$("loginFeedback");el.textContent=text}
 function showLogin(){staff=null;$("staffIdentity").textContent="Not signed in";$("logoutBtn").hidden=true;
  $("staffConsole").hidden=true;$("loginView").hidden=!backendEnabled;}
 function showStaff(user){staff=user;$("loginView").hidden=true;$("staffConsole").hidden=false;$("logoutBtn").hidden=false;
  $("staffIdentity").textContent=user.email+" · "+user.role;
  $("staffTestIntake").hidden=!["founder","reviewer"].includes(user.role);}
 async function api(path,options={}){
  const r=await fetch("/api/staff"+path,{credentials:"same-origin",cache:"no-store",...options,
    headers:{...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})}});
  let data={};try{data=await r.json();}catch{}
  if(!r.ok)throw Error(data.error||"Service unavailable");
  return data;
 }
 async function post(path,data){return api(path,{method:"POST",body:JSON.stringify(data)});}
 function errorText(message){const el=$("realReviewDetail");el.replaceChildren(make("p","form-feedback",message));}
 async function refresh(){
  try{
   const response=await api("/queue");items=response.requests||[];
   const stats=$("consoleStats");stats.replaceChildren();
   for(const [label,num] of [["Applications",items.length],["Pending review",items.filter(x=>x.status==="pending").length],
     ["Approved",items.filter(x=>x.status==="approved").length],["Revisions",items.filter(x=>x.status==="changes_requested").length]]){
    const block=make("div","staff-stat");put(block,make("strong","",num),make("span","",label));stats.append(block);
   }
   const list=$("realReviewQueue");list.replaceChildren();
   if(!items.length)list.append(make("p","muted","No adult-test review requests. Use the synthetic intake form if your role permits."));
   for(const row of items){
    const card=make("div","staff-queue-item"+(row.id===selected?" is-selected":""));
    put(card,make("b","",row.title),make("span","tag",row.status.replace(/_/g," ")),
      make("p","muted",row.creator_label+" · "+row.category+" · "+row.requested_seats+" teammates"));
    const b=make("button","action secondary compact","Inspect review →");
    b.type="button";b.addEventListener("click",()=>openRequest(row.id));
    card.append(b);list.append(card);
   }
  }catch(e){errorText(e.message)}
 }
 async function openRequest(id){
  selected=id;
  let payload;try{payload=await api("/requests/"+encodeURIComponent(id));}catch(e){errorText(e.message);return;}
  const x=payload.request,report=payload.report;
  const detail=$("realReviewDetail");detail.replaceChildren();
  put(detail,make("p","staff-label","REVIEW REQUEST · "+x.status.toUpperCase()),make("h2","",x.title),
    make("p","muted",x.description),make("p","muted","Fictional creator: "+x.creator_label+" · category "+x.category+" · requested "+x.requested_seats+" additional teammates"));
  if(x.status!=="pending"){
   detail.append(make("div","soft-note","This application already has a recorded decision. It cannot be approved or declined twice."));
   await refresh();return;
  }
  if(!report||report.request_version!==x.version){
   detail.append(make("p","muted","Human decisions are locked until a current specialist report has been prepared."));
   const b=make("button","action primary","Prepare 5 rule-based staff assessments ↗");
   b.type="button";b.addEventListener("click",async()=>{
    b.disabled=true;
    try{await post("/requests/"+id+"/prepare",{});await openRequest(id);}catch(e){errorText(e.message);}
    finally{b.disabled=false;}
   });
   detail.append(b);await refresh();return;
  }
  const packet=report.packet||{};
  detail.append(make("p","staff-label","REPORT PACKET · "+String(report.engine).toUpperCase()));
  detail.append(make("p","muted","All staff assessments are advisory. This version uses deterministic keyword rules, NOT a live AI model."));
  for(const item of packet.sections||[]){
   const row=make("article","staff-review-card");
   put(row,make("h3","",item.name+" — "+item.label),make("p","staff-report-summary",item.summary));
   if(item.flags?.length){
    const ul=make("ul","staff-report-flags");
    item.flags.forEach(flag=>ul.append(make("li","",flag)));row.append(ul);
   }
   row.append(make("p","staff-label","HANDOFF: "+item.action));detail.append(row);
  }
  if(!["founder","reviewer"].includes(staff.role)){
   detail.append(make("p","soft-note","Your safety staff role can prepare assessments, but only founder and reviewer roles can approve or decline."));
   await refresh();return;
  }
  const area=make("div","staff-human-form");
  put(area,make("p","staff-label","HUMAN REVIEW REQUIRED"),make("h3","","Record your decision"));
  const form=make("form","stack-form"),label=make("label","", "Human review rationale (minimum 12 characters)");
  const notes=make("textarea","staff-rationale");notes.minLength=12;notes.maxLength=500;notes.required=true;notes.placeholder="Explain the evidence, safeguards and reason for this decision.";label.append(notes);
  const selectLabel=make("label","","Decision"),select=make("select");
  for(const [v,t] of [["approved","Approve for recruitment"],["changes_requested","Request changes"],["declined","Decline application"]]){
   const opt=make("option","",t);opt.value=v;select.append(opt);
  }
  selectLabel.append(select);
  const save=make("button","action primary","Confirm human decision");
  save.type="submit";
  const out=make("p","form-feedback");
  form.addEventListener("submit",async e=>{
   e.preventDefault();if(!form.reportValidity())return;
   if(!confirm("Confirm this HUMAN "+select.value+" action? No AI agent makes this decision."))return;
   save.disabled=true;
   try{
    await post("/requests/"+id+"/decision",{reportId:report.id,decision:select.value,rationale:notes.value});
    await refresh();await openRequest(id);
   }catch(err){out.textContent=err.message;}finally{save.disabled=false;}
  });
  put(form,selectLabel,label,save,out);area.append(form);detail.append(area);
  await refresh();
 }
 async function startup(){
  $("staffConsole").hidden=true;$("loginView").hidden=true;$("logoutBtn").hidden=true;
  try{
   const data=await api("/status");
   backendEnabled=!!data.enabled;
   status(backendEnabled?"Private adult-test staff service is available. Verified human staff credentials are required.":
     "Backend disabled: no real staff account, approval or database activity is available. The staff role demo lives in the separate preview.");
   if(!backendEnabled)return;
   try{const session=await api("/me");showStaff(session.staff);await refresh();}
   catch{showLogin();}
  }catch(e){backendEnabled=false;status("Private staff API is unavailable. No real decisions can be made.");}
 }
 $("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();$("loginBtn").disabled=true;feedback("Authenticating your staff credentials…");
  try{
   const r=await post("/login",{email:$("staffEmail").value,password:$("staffPassword").value});
   $("staffPassword").value="";feedback("");showStaff(r.staff);await refresh();
  }catch(err){feedback(err.message);}finally{$("loginBtn").disabled=false;}
 });
 $("logoutBtn").addEventListener("click",async()=>{
  try{await post("/logout",{});}catch{}
  showLogin();selected=null;
 });
 $("refreshQueue").addEventListener("click",refresh);
 $("testIntakeForm").addEventListener("submit",async e=>{
  e.preventDefault();$("intakeFeedback").textContent="";
  try{
   await post("/intake",{
    creatorLabel:$("intakeCreator").value,title:$("intakeTitle").value,
    description:$("intakeDescription").value,category:$("intakeCategory").value,
    seats:Number($("intakeSeats").value),roles:[],isAdultTestData:$("adultTestData").checked
   });
   $("testIntakeForm").reset();$("intakeFeedback").textContent="Synthetic review added. No public project was approved.";
   await refresh();
  }catch(err){$("intakeFeedback").textContent=err.message;}
 });
 startup();
})();