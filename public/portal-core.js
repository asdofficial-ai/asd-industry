/* ASD Industry local-only demonstration state machine. Pure functions for tests.
   This is NOT authentication, server authorization, real admin approval, or a private backend. */
(function(root,factory){
  const result=factory();
  if(typeof module==="object"&&module.exports)module.exports=result;
  else root.ASDPortalCore=result;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const MAX_SEATS=12;
 const CANDIDATES=[
  {id:"sample-dev",handle:"CodeSprout",role:"Developer",topics:["Apps","Agriculture","Websites"]},
  {id:"sample-design",handle:"NovaDesign",role:"Designer",topics:["Design","Apps","Education"]},
  {id:"sample-market",handle:"MarketMind",role:"Marketing",topics:["Business","Marketing","Agriculture"]},
  {id:"sample-research",handle:"DataBloom",role:"Research",topics:["AI","Education","Agriculture"]},
  {id:"sample-content",handle:"FreshFrame",role:"Content",topics:["Content","Gaming","Design"]},
  {id:"sample-strategy",handle:"LaunchLab",role:"Business strategy",topics:["Finance","Business","Apps"]},
  {id:"sample-dev2",handle:"PixelPilot",role:"Developer",topics:["AI","Gaming","Websites"]},
  {id:"sample-sales",handle:"BridgeBuilder",role:"Sales",topics:["Education","Marketing","Business"]},
  {id:"sample-maker",handle:"BuildLab",role:"Maker",topics:["Agriculture","Design","Apps"]},
  {id:"sample-pm",handle:"PlanCraft",role:"Project coordinator",topics:["AI","Business","Education"]},
  {id:"sample-media",handle:"MotionMind",role:"Video editor",topics:["Content","Gaming","Marketing"]},
  {id:"sample-ops",handle:"FieldWorks",role:"Operations",topics:["Agriculture","Business","Finance"]}
 ];
 const CATEGORIES=["AI","Apps","Websites","Agriculture","Gaming","Business","Design","Education","Finance","Content","Other"];
 const localText=(x,max)=>typeof x==="string"?x.trim().slice(0,max):"";
 const uid=()=>Math.random().toString(36).slice(2,10);
 function newState(nickname,ageGroup){
  const nick=localText(nickname,24);
  if(nick.length<2||!["12-14","15-17","18+"].includes(ageGroup))throw Error("Choose a nickname and age group first.");
  return {version:5,viewer:{nickname:nick,ageGroup,bio:""},projects:[],posts:[],notifications:[]};
 }
 function validateProject(data){
  const title=localText(data.title,70),description=localText(data.description,900),category=localText(data.category,24);
  const seats=Number(data.seats);
  const roles=Array.isArray(data.roles)?[...new Set(data.roles.map(x=>localText(x,30)).filter(Boolean))].slice(0,8):[];
  if(title.length<3||description.length<35)throw Error("Add a project title and at least 35 characters explaining your idea.");
  if(!CATEGORIES.includes(category))throw Error("Choose a project category.");
  if(!Number.isInteger(seats)||seats<1||seats>MAX_SEATS)throw Error("Choose between 1 and 12 additional teammates.");
  return {title,description,category,seats,roles};
 }
 function submitProject(state,data){
  if(!state?.viewer)throw Error("Create a demo profile before proposing a project.");
  const idea=validateProject(data);
  const project={...idea,id:"ASD-"+uid().toUpperCase(),founder:state.viewer.nickname,
   stage:"pending",groupCreated:false,members:[],tasks:[],messages:[],files:[],reviewNote:"",
   createdAt:new Date().toISOString(),history:[{title:"Submitted to ASD Industry",at:new Date().toISOString()}]};
  state.projects.unshift(project);
  notify(state,"Application submitted","Your project is waiting for ASD Industry's review simulation.");
  return project;
 }
 function notify(state,title,description){
  state.notifications.unshift({id:uid(),title,description,at:new Date().toISOString()});
  state.notifications=state.notifications.slice(0,60);
 }
 function decide(state,project,decision,actor,reason=""){
  if(actor!=="demo-staff-preview")throw Error("Only the staff review simulation may change approval status.");
  if(project.stage!=="pending")throw Error("This application has already been reviewed.");
  if(!["approved","changes-requested"].includes(decision))throw Error("Invalid review decision.");
  project.stage=decision;
  project.reviewNote=localText(reason,250);
  project.history.push({title:decision==="approved"?"Approved in staff simulation":"Revision requested",at:new Date().toISOString()});
  notify(state,decision==="approved"?"Project approved (simulation)":"Project needs changes",project.title);
 }
 function resubmit(state,project){
  if(project.stage!=="changes-requested")throw Error("Only applications needing changes can be resubmitted.");
  project.stage="pending";project.history.push({title:"Resubmitted for review",at:new Date().toISOString()});
  notify(state,"Application resubmitted",project.title);
 }
 function recruit(state,project,candidateId,viewer){
  if(project.founder!==viewer)throw Error("Only the project founder can recruit members.");
  if(!["approved","recruiting"].includes(project.stage)||project.groupCreated)
    throw Error("The project must be approved and recruiting before you can add teammates.");
  const candidate=CANDIDATES.find(c=>c.id===candidateId);
  if(!candidate)throw Error("Unknown fictional candidate.");
  if(project.members.some(m=>m.id===candidateId))throw Error("This sample builder is already recruited.");
  if(project.members.length>=project.seats)throw Error("All requested team places are filled.");
  project.members.push({...candidate,fictional:true});
  project.stage="recruiting";
  project.history.push({title:"Fictional teammate added: "+candidate.handle,at:new Date().toISOString()});
  if(project.members.length===project.seats)notify(state,"Recruitment target reached","You can now create your private demo group for "+project.title+".");
 }
 function createGroup(state,project,viewer){
  if(project.founder!==viewer)throw Error("Only the project founder can create the group.");
  if(project.groupCreated)throw Error("This group already exists.");
  if(project.stage!=="recruiting"||project.members.length!==project.seats)throw Error("Recruit the requested number of teammates first.");
  project.stage="active";project.groupCreated=true;
  project.history.push({title:"Private demo group created",at:new Date().toISOString()});
  notify(state,"Team group ready","Your project chat and workspace are now available in this browser demo.");
 }
 function canAccess(project,viewer,area){
  if(!project||!project.groupCreated||project.stage!=="active")return false;
  if(!["chat","workspace"].includes(area))return false;
  // The only real session in this demo is this browser's founder. Fictional matches have no logins.
  return viewer===project.founder;
 }
 function addMessage(project,viewer,message){
  if(!canAccess(project,viewer,"chat"))throw Error("Private group access is not available.");
  const text=localText(message,600);
  if(!text)throw Error("Write a message first.");
  project.messages.push({id:uid(),by:viewer,text,at:new Date().toISOString()});
  project.messages=project.messages.slice(-80);
 }
 function addTask(project,viewer,task){
  if(!canAccess(project,viewer,"workspace"))throw Error("Private workspace access is not available.");
  const text=localText(task,130);
  if(!text)throw Error("Add a task description.");
  project.tasks.push({id:uid(),text,done:false});
 }
 function addPost(state,body,kind){
  const text=localText(body,600);
  if(text.length<4)throw Error("Write at least four characters about what you built.");
  const allowed=["progress","photo","video","file"];
  if(!allowed.includes(kind))throw Error("Choose a post format.");
  const post={id:uid(),author:state.viewer.nickname,text,kind,at:new Date().toISOString()};
  state.posts.unshift(post);state.posts=state.posts.slice(0,30);
  return post;
 }
 function statusLabel(stage){
  return ({pending:"Pending review",approved:"Approved · recruit teammates",recruiting:"Recruiting teammates",active:"Team active", "changes-requested":"Changes requested"})[stage]||"Draft";
 }
 return {CANDIDATES,CATEGORIES,MAX_SEATS,newState,submitProject,decide,resubmit,recruit,createGroup,
 canAccess,addMessage,addTask,addPost,notify,statusLabel,validateProject};
});