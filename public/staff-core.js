/* ASD Industry v0.6 — independent AI-staff workflow simulation.
 * This is a deterministic PREVIEW, not a model-powered staff member or an admin permission system.
 * Real provider integration is separately disabled; humans must take every decision.
 */
(function(root,factory){
 const exported=factory();
 if(typeof module==="object"&&module.exports)module.exports=exported;
 else root.ASDStaffCore=exported;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const AGENTS=[
  {id:"intake",name:"Intake Coordinator",icon:"▣",mission:"Check submissions for completeness and organize the review packet."},
  {id:"safety",name:"Safety & Trust Officer",icon:"◇",mission:"Flag possible privacy, age-related and community-safety concerns."},
  {id:"feasibility",name:"Feasibility Analyst",icon:"⌘",mission:"Recommend a realistic small first milestone and highlight missing planning detail."},
  {id:"matching",name:"Talent & Matching Lead",icon:"◈",mission:"Recommend which skills and number of collaborators could help this project."},
  {id:"operations",name:"Operations Coordinator",icon:"☷",mission:"Prepare the handoff checklist for a human staff reviewer."}
 ];
 function cleaned(value,max=180){return typeof value==="string"?value.trim().slice(0,max):"";}
 function fingerprint(project){return JSON.stringify([
  cleaned(project.title,70),cleaned(project.description,900),
  cleaned(project.category,30),Number(project.seats),
  Array.isArray(project.roles)?[...project.roles].sort():[]
 ]);}
 function item(id,label,summary,flags,action){
  return {id,name:AGENTS.find(a=>a.id===id).name,label,summary,flags,action};
 }
 function createPreviewReport(project){
  if(!project||project.stage!=="pending")throw Error("Only pending applications can receive a staff report.");
  const title=cleaned(project.title,70),description=cleaned(project.description,900),category=cleaned(project.category,24);
  const seats=Number(project.seats),roles=Array.isArray(project.roles)?project.roles.slice(0,8):[];
  if(title.length<3||description.length<35||!Number.isInteger(seats)||seats<1||seats>12)
    throw Error("This application needs valid project details before review.");
  const safetyFlags=[];
  if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(description)||/(?:\+?\d[\d .()-]{7,}\d)/.test(description))
   safetyFlags.push("Contact information appears in the application; redact before wider sharing.");
  if(/(?:guarantee(?:d)? profit|double your money|get rich quick|risk-free returns|investment guarantee)/i.test(description))
   safetyFlags.push("Financial promises may be misleading; request an evidence-based rewrite.");
  if(/(?:password|login credential|secret key|private key|wallet seed)/i.test(description))
   safetyFlags.push("Potential confidential credentials or secrets mentioned.");
  if(/(?:meeting in private|secret meetup|send your address|direct message minors|adult-only chat)/i.test(description))
   safetyFlags.push("Potentially unsafe contact or minor-safeguarding implications.");
  const opsFlags=["Human staff must assess privacy, age safeguards and appropriate guardian procedures before live youth participation."];
  if(category==="Finance")opsFlags.push("Any money-handling or investment proposals require enhanced legal/compliance review.");
  if(category==="AI")opsFlags.push("Verify model behavior, source provenance and abuse prevention before an AI feature is released.");
  const intakeFlags=[];
  if(description.length<100)intakeFlags.push("Application is brief; ask for evidence of user need and a concrete deliverable.");
  if(!roles.length)intakeFlags.push("No desired teammate skills selected yet.");
  const feasibilityFlags=[];
  if(/worldwide|everything|everyone|all industries|entire world/i.test(description))
   feasibilityFlags.push("Wide scope detected; narrow the first version to one audience and one use case.");
  if(seats>6)feasibilityFlags.push("Team size is large for an early prototype; clarify responsibilities.");
  const sections=[
   item("intake",intakeFlags.length?"Needs clarification":"Information present",
    "Project title, category, problem statement and requested team size organized for review.",
    intakeFlags,"Ask the founder for missing details before final approval if necessary."),
   item("safety",safetyFlags.length?"Escalate safeguards":"No obvious keyword flags",
    "Lightweight keyword screening only. This cannot establish that an application is safe.",
    safetyFlags,"Human safeguarding staff must check context, age-sensitive content and privacy."),
   item("feasibility",feasibilityFlags.length?"Scope review":"Prototype planning",
    "Recommend a small prototype with a testable success criterion and a clear initial milestone.",
    feasibilityFlags,"Ask for a one-week or two-week milestone and measurable outcome."),
   item("matching","Candidate role map",
    "Founder requested "+seats+" additional teammate"+(seats===1?"":"s")+". Skills: "+(roles.length?roles.join(", "):"not specified")+".",
    [],"Suggest suitable skills only after human approval; founder chooses recruits."),
   item("operations","Human handoff",
    "Application prepared for human staff; never activate recruiting or team-chat permissions automatically.",
    opsFlags,"Human reviewer checks the evidence, documents the decision and authorizes a later workflow.")
  ];
  return {
   reportId:"STAFF-"+Math.random().toString(36).slice(2,10).toUpperCase(),
   projectId:project.id,
   engine:"deterministic-demo",createdAt:new Date().toISOString(),
   fingerprint:fingerprint(project),sections,
   overall:"Human decision required",
   cautionCount:sections.reduce((sum,s)=>sum+s.flags.length,0),
   proposedDecision:"none",
   permissions:{aiMayApprove:false,aiMayDecline:false,aiMayCreateGroup:false,aiMayMessageUsers:false}
  };
 }
 function runStaffPreview(project){
  const report=createPreviewReport(project);
  project.staffReport=report;
  project.history=Array.isArray(project.history)?project.history:[];
  project.history.push({title:"Five staff-preview reports prepared for human review",at:new Date().toISOString()});
  return report;
 }
 function humanDecision(portal,project,decision,reviewer,note){
  const report=project&&project.staffReport;
  if(!portal||!project||project.stage!=="pending"||!report||report.fingerprint!==fingerprint(project))
   throw Error("Generate a current staff report before a human review decision.");
  const reviewerLabel=cleaned(reviewer,60);
  if(reviewerLabel.length<2||reviewerLabel.toLowerCase()==="ai"||reviewerLabel.toLowerCase()==="bot")
   throw Error("Enter a human reviewer name for the simulation.");
  if(!["approved","changes-requested"].includes(decision))throw Error("Invalid human decision.");
  const rationale=cleaned(note,250);
  if(rationale.length<10)throw Error("Document a reason of at least 10 characters.");
  portal.decide(portal.state,project,decision,"demo-staff-preview",rationale);
  project.humanReview={
   decision,reviewer:reviewerLabel,note:rationale,
   reportId:report.reportId,at:new Date().toISOString(),simulated:true
  };
  project.history.push({title:"Human "+(decision==="approved"?"approval":"changes request")+" simulated by "+reviewerLabel,at:new Date().toISOString()});
  return project.humanReview;
 }
 return {AGENTS,fingerprint,createPreviewReport,runStaffPreview,humanDecision};
});