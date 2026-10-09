/* Staff cockpit: browser-local demo. Access here proves nothing about a user's role. */
"use strict";
(()=>{
 const Staff=window.ASDStaffCore;
 function init({Core,state,save,element,append,btn,empty}){
  const $=id=>document.getElementById(id);
  const target=$("reviewApplications");
  const stats=$("staffStats");
  const detail=$("staffDetail");
  const feedback=$("staffFeedback");
  const message=value=>{feedback.textContent=value;};
  function stat(label,value){
   const card=element("div","staff-stat");
   append(card,element("strong","",value),element("span","",label));
   return card;
  }
  function displayStats(){
   stats.replaceChildren();
   [
    ["Pending",state.projects.filter(p=>p.stage==="pending").length],
    ["Packets prepared",state.projects.filter(p=>p.stage==="pending"&&p.staffReport?.engine==="deterministic-demo").length],
    ["Approved (demo)",state.projects.filter(p=>["approved","recruiting","active"].includes(p.stage)).length],
    ["Revisions needed",state.projects.filter(p=>p.stage==="changes-requested").length]
   ].forEach(([label,value])=>stats.append(stat(label,value)));
  }
  function reviewPacket(project){
   detail.replaceChildren();
   const head=element("div","panel-top");
   append(head,element("h2","",project.title),element("span","tag",Core.statusLabel(project.stage)));detail.append(head);
   detail.append(element("p","muted",project.description));
   const report=project.staffReport;
   if(!report){
    detail.append(element("div","soft-note","A staff report is required before human review. Run the five-role evaluation first."));
    detail.append(btn("Prepare 5 staff reports",()=>{
     try{Staff.runStaffPreview(project);save();message("Five rule-based demo reports prepared. A human reviewer must decide.");draw(project.id);}
     catch(e){message(e.message);}
    },"primary"));
    return;
   }
   const title=element("div","panel-top");
   append(title,element("h2","","Staff assessment packet"),element("span","tag","RULE-BASED DEMO · NOT LIVE AI"));
   detail.append(title);
   detail.append(element("p","muted","Five independent specialist reviews. These are deterministic assessments, not model-generated conclusions. They have no authority to accept, reject or unlock a project."));
   const rows=element("div","agent-report-list");
   report.sections.forEach((s,index)=>{
    const agent=Staff.AGENTS[index];
    const row=element("article","staff-report-card");
    const header=element("div","agent-report-header");
    append(header,element("span","agent-symbol",agent.icon),element("div","agent-headline"));
    append(header.lastChild,element("strong","",s.name),element("small","",s.label));
    append(row,header,element("p","",s.summary));
    if(s.flags.length){
     const flags=element("ul","agent-flags");
     s.flags.forEach(flag=>flags.append(element("li","",flag)));
     row.append(flags);
    }
    row.append(element("p","agent-action","HANDOFF  ·  "+s.action));
    rows.append(row);
   });
   detail.append(rows);
   const handoff=element("div","staff-handoff");
   append(handoff,element("p","micro-heading","HUMAN DECISION GATE"),element("h3","","Forward to a human reviewer"));
   handoff.append(element("p","muted","Only a human staff member may accept or request changes. This form is a simulation with no real staff identity verification."));
   const form=element("form","stack-form");
   const reviewer=element("input");reviewer.type="text";reviewer.maxLength=60;reviewer.minLength=2;reviewer.required=true;reviewer.placeholder="e.g. Human reviewer / staff name";reviewer.autocomplete="off";
   const reason=element("textarea");reason.required=true;reason.maxLength=250;reason.minLength=10;reason.rows=3;
   reason.placeholder="Document the decision and why it was made (10+ characters)";
   const reviewerLabel=element("label","", "Human reviewer name");reviewerLabel.append(reviewer);
   const reasonLabel=element("label","", "Human review notes");reasonLabel.append(reason);
   const buttons=element("div","review-actions");
   const accept=element("button","action primary","Approve in simulation");
   accept.type="submit";accept.value="approved";
   const changes=element("button","action warn","Request changes");
   changes.type="button";
   const execute=decision=>{
    if(!form.reportValidity())return;
    if(!window.confirm("Confirm "+(decision==="approved"?"SIMULATED approval":"SIMULATED changes request")+"? No real project access or AI staff authority is created."))return;
    try{
     Staff.humanDecision({decide:Core.decide,state},project,decision,reviewer.value,reason.value);
     save();message("Human action recorded in local audit history. AI staff did not decide the outcome.");
     draw();
    }catch(e){message(e.message);}
   };
   form.addEventListener("submit",e=>{e.preventDefault();execute("approved");});
   changes.addEventListener("click",()=>execute("changes-requested"));
   append(buttons,accept,changes);append(form,reviewerLabel,reasonLabel,buttons);handoff.append(form);detail.append(handoff);
  }
  function draw(selected){
   target.replaceChildren();displayStats();
   const pending=state.projects.filter(p=>p.stage==="pending");
   if(!pending.length){
    empty(target,"Nothing awaiting review","Submit a project application to see the five staff roles prepare a review packet.","Submit a project →","/projects.html");
    detail.replaceChildren();
    append(detail,element("h2","","Human-led decisions"),element("p","muted","The AI staff can prepare recommendations; a human reviewer makes the final decision. No project has pending review."));
    return;
   }
   for(const project of pending){
    const row=element("article","staff-queue-item"+(selected===project.id?" is-selected":""));
    const head=element("div","staff-queue-head");
    append(head,element("strong","",project.title),element("span","tag",project.staffReport?"Packet ready":"Awaiting report"));
    append(row,head,element("p","muted",project.category+" · "+project.seats+" teammates · "+project.founder));
    row.append(btn("Open review →",()=>{reviewPacket(project);drawSidebar(project.id);},"secondary"));
    target.append(row);
   }
   const chosen=pending.find(p=>p.id===selected)||pending[0];
   reviewPacket(chosen);drawSidebar(chosen.id);
  }
  function drawSidebar(selected){
   target.querySelectorAll(".staff-queue-item").forEach((e,i)=>{
    const p=state.projects.filter(p=>p.stage==="pending")[i];
    e.classList.toggle("is-selected",p?.id===selected);
   });
  }
  const personnel=$("agentPersonnel");
  if(personnel){
   Staff.AGENTS.forEach((agent,index)=>{
    const block=element("div","staff-person-card");
    append(block,element("span","agent-symbol",agent.icon),element("strong","",agent.name),element("p","muted",agent.mission),element("span","tag","ROLE "+String(index+1).padStart(2,"0")));
    personnel.append(block);
   });
  }
  draw();
 }
 window.ASDStaffDashboard={init};
})();