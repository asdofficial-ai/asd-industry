/* ASD Industry creator dashboard — fictional, browser-local only. No real recruitment. */
"use strict";
(() => {
  const get=id=>document.getElementById(id);
  const el=(tag,css,text)=>{
    const item=document.createElement(tag);
    if(css)item.className=css;
    if(text!==undefined)item.textContent=String(text);
    return item;
  };
  const permittedStatus=new Set(["pending","approved","rejected"]);
  function create(matches,neededRole) {
    const positions=[];
    const add=value=>{if(value && positions.length<3 && !positions.includes(value))positions.push(value);};
    add(neededRole);
    (matches||[]).forEach(candidate=>add(candidate.role));
    ["Designer","Research","Marketing","Developer","Content","Business strategy"].forEach(add);
    return {
      positions,
      applications:(matches||[]).map(candidate=>({
        id:candidate.id,nick:candidate.nick,desiredRole:candidate.role,
        interests:(candidate.interests||[]).slice(0,3),
        availability:candidate.availability||"flexible",status:"pending"
      })),
      activity:[],startedAt:null
    };
  }
  function normalize(project,save) {
    if(!Array.isArray(project.members))project.members=[];
    if(!project.manager || !Array.isArray(project.manager.positions) ||
       !Array.isArray(project.manager.applications)) {
      // Upgrade existing browser-only workspaces without deleting their sample teammates.
      const legacy=project.members.filter(m=>m.demo);
      const positions=[];
      const add=x=>{if(x && positions.length<Math.max(3,legacy.length) && !positions.includes(x))positions.push(x);};
      legacy.forEach(m=>add(m.role));
      [project.topic==="Education"?"Research":null,"Developer","Designer","Research","Marketing"].forEach(add);
      project.manager={
        positions,
        applications:legacy.map((member,index)=>({
          id:member.id||"OLD-"+index,nick:member.nick,desiredRole:member.role,
          interests:[],availability:"flexible",status:"approved",assignedRole:member.role
        })),
        activity:[],startedAt:null
      };
      save();
    }
    const data=project.manager;
    if(!Array.isArray(data.activity))data.activity=[];
    data.applications.forEach(app=>{
      if(!permittedStatus.has(app.status))app.status="pending";
    });
    return data;
  }
  function slots(project,manager) {
    return manager.positions.map(role=>({
      role,filled:project.members.some(member=>member.demo && member.role===role)
    }));
  }
  function activity(manager,text){
    manager.activity.unshift({text,date:new Date().toLocaleString()});
    manager.activity=manager.activity.slice(0,15);
  }
  function stage(project,manager) {
    const full=slots(project,manager).every(s=>s.filled);
    if(full && !manager.startedAt) {
      manager.startedAt=new Date().toISOString();
      activity(manager,"Squad filled · project marked started (demo)");
    } else if(!full && manager.startedAt) {
      manager.startedAt=null;
      activity(manager,"Sample position reopened · recruiting resumed");
    }
  }
  function render(state,save,renderWorkspace){
    const project=state.project;
    get("managerEmpty").classList.toggle("hidden",Boolean(project));
    get("managerContent").classList.toggle("hidden",!project);
    if(!project)return;
    const manager=normalize(project,save);
    stage(project,manager);
    const positions=slots(project,manager);
    const pending=manager.applications.filter(app=>app.status==="pending");
    const members=project.members.filter(m=>m.demo);
    const free=positions.filter(slot=>!slot.filled);
    get("managerProjectName").textContent=project.title||"Untitled project";
    get("managerProjectSummary").textContent=project.description||"Private example project.";
    const projectStage=get("managerProjectStage");
    projectStage.textContent=manager.startedAt?"✓ TEAM FULL · STARTED (DEMO)":"● RECRUITING · DEMO";
    projectStage.classList.toggle("started",Boolean(manager.startedAt));
    get("managerCountPending").textContent=String(pending.length);
    get("managerCountMembers").textContent=(1+members.length)+" / "+(1+positions.length);
    get("managerCountOpen").textContent=String(free.length);
    get("managerStartSummary").textContent=manager.startedAt?"Started · demo":"After squad fills";
    const positionsList=get("managerAvailableRoles");
    positionsList.replaceChildren();
    positions.forEach(slot=>{
      const row=el("div","manager-position"+(slot.filled?" filled":""));
      row.append(el("span","",slot.role),el("strong","",slot.filled?"● Filled":"○ Available"));
      positionsList.append(row);
    });
    const inbox=get("managerApplications");
    inbox.replaceChildren();
    if(!manager.applications.length){
      inbox.append(el("p","manager-empty-text","No sample applications for this project."));
    }
    manager.applications.forEach(app=>{
      const card=el("article","manager-applicant");
      card.dataset.applicationId=app.id;
      const head=el("div","manager-applicant-head");
      const about=el("div","manager-applicant-about");
      about.append(el("strong","",app.nick+" · fictional"));
      about.append(el("small","",app.desiredRole+" · "+app.availability));
      head.append(el("span","manager-applicant-avatar",app.nick.charAt(0).toUpperCase()),about,
        el("span","manager-application-badge "+app.status,app.status.toUpperCase()));
      card.append(head,el("p","manager-applicant-skills",
        app.interests.length?"Interests: "+app.interests.join(" · "):"Original sample team member"));
      if(app.status==="pending"){
        const controls=el("div","manager-applicant-controls");
        const label=el("label","manager-role-label");
        label.append(el("span","","Assign a position"));
        const select=el("select","manager-role-select");
        select.setAttribute("aria-label","Assign position to "+app.nick);
        const prompt=el("option","","Choose an open position");prompt.value="";select.append(prompt);
        positions.forEach(slot=>{
          const option=el("option","",slot.role);
          option.value=slot.role;option.disabled=slot.filled;select.append(option);
        });
        const preferred=positions.find(slot=>!slot.filled && slot.role===app.desiredRole);
        if(preferred)select.value=preferred.role;
        label.append(select);
        const accept=el("button","btn btn-accent btn-small manager-approve","✓ Approve");
        accept.type="button";accept.disabled=!free.length;
        accept.setAttribute("aria-label","Approve "+app.nick+" for a sample project");
        accept.addEventListener("click",()=>{
          const role=select.value;
          if(app.status!=="pending" || !role ||
             !slots(project,manager).some(slot=>slot.role===role && !slot.filled)){
            get("managerStatus").textContent="Choose a currently available position first.";
            return;
          }
          app.status="approved";app.assignedRole=role;
          project.members.push({id:app.id,nick:app.nick,role,demo:true});
          activity(manager,"Approved "+app.nick+" as "+role+" (fictional)");
          stage(project,manager);
          save();render(state,save,renderWorkspace);renderWorkspace();
          get("managerStatus").textContent=app.nick+" approved for "+role+" · demo only.";
        });
        const decline=el("button","btn btn-ghost btn-small manager-reject","Reject");
        decline.type="button";
        decline.setAttribute("aria-label","Reject "+app.nick+"'s sample application");
        decline.addEventListener("click",()=>{
          if(app.status!=="pending")return;
          app.status="rejected";
          activity(manager,"Declined "+app.nick+"'s fictional application");
          save();render(state,save,renderWorkspace);
          get("managerStatus").textContent="Sample application declined. No person was notified.";
        });
        controls.append(label,accept,decline);card.append(controls);
      } else {
        card.append(el("p","manager-applicant-outcome",app.status==="approved"
          ?"Accepted · "+(app.assignedRole||app.desiredRole):"Declined · no message sent"));
        if(app.status==="rejected"){
          const restore=el("button","btn btn-ghost btn-small manager-restore","Restore example application");
          restore.type="button";
          restore.addEventListener("click",()=>{
            app.status="pending";
            activity(manager,"Restored "+app.nick+"'s fictional application");
            save();render(state,save,renderWorkspace);
          });
          card.append(restore);
        }
      }
      inbox.append(card);
    });
    const roster=get("managerRoster");roster.replaceChildren();
    const owner=project.members.find(member=>!member.demo);
    if(owner){
      const row=el("div","manager-member manager-owner");
      const info=el("div","manager-member-info");
      info.append(el("strong","",owner.nick),el("small","",(owner.role||"Project creator")+" · Creator · cannot be removed"));
      row.append(el("span","manager-member-avatar","★"),info,el("span","manager-owner-tag","OWNER"));
      roster.append(row);
    }
    members.forEach(member=>{
      const row=el("div","manager-member");
      row.dataset.memberId=member.id||member.nick;
      const info=el("div","manager-member-info");
      info.append(el("strong","",member.nick+" · sample"),el("small","","Assigned: "+member.role));
      const controls=el("div","manager-member-actions");
      const selector=el("select","manager-member-role");
      selector.setAttribute("aria-label","Change role for "+member.nick);
      positions.forEach(slot=>{
        const option=el("option","",slot.role);
        option.value=slot.role;
        option.disabled=slot.filled && slot.role!==member.role;
        selector.append(option);
      });
      selector.value=member.role;
      selector.addEventListener("change",()=>{
        const chosen=selector.value;
        if(!manager.positions.includes(chosen) ||
           slots(project,manager).some(slot=>slot.role===chosen && slot.filled && chosen!==member.role)){
          selector.value=member.role;return;
        }
        const previous=member.role;
        member.role=chosen;
        const application=manager.applications.find(app=>app.id===member.id ||
          (app.status==="approved" && app.nick===member.nick));
        if(application)application.assignedRole=chosen;
        activity(manager,"Reassigned "+member.nick+" from "+previous+" to "+chosen);
        stage(project,manager);save();render(state,save,renderWorkspace);renderWorkspace();
        get("managerStatus").textContent="Sample member assigned to "+chosen+".";
      });
      const remove=el("button","btn btn-ghost btn-small manager-remove","Remove");
      remove.type="button";
      remove.setAttribute("aria-label","Remove "+member.nick+" from demo squad");
      remove.addEventListener("click",()=>{
        if(!confirm("Remove this fictional teammate? Their team position will reopen."))return;
        project.members=project.members.filter(m=>m!==member);
        const app=manager.applications.find(item=>item.id===member.id ||
          (item.status==="approved" && item.nick===member.nick));
        if(app){app.status="pending";delete app.assignedRole;}
        activity(manager,"Removed "+member.nick+" and reopened "+member.role);
        stage(project,manager);save();render(state,save,renderWorkspace);renderWorkspace();
        get("managerStatus").textContent="Sample member removed. "+member.role+" is open again.";
      });
      controls.append(selector,remove);
      row.append(el("span","manager-member-avatar",member.nick.charAt(0)),info,controls);
      roster.append(row);
    });
    const history=get("managerHistory");
    history.replaceChildren();
    if(!manager.activity.length)history.append(el("p","manager-empty-text","No decisions yet. Approve or reject an example applicant to begin."));
    manager.activity.forEach(item=>{
      const row=el("div","manager-activity-row");
      row.append(el("strong","",item.text),el("small","",item.date));
      history.append(row);
    });
    save(); // Persist legacy migrations and inferred team-start status.
  }
  window.ASDManagerDashboard={create,render};
})();
