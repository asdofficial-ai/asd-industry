"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const Portal=require("../public/portal-core.js");
const Staff=require("../public/staff-core.js");
const work={title:"FarmLink",description:"Build a marketplace that helps local growers connect with shops through a simple website prototype.",category:"Agriculture",seats:2,roles:["Developer","Designer"]};
function fixture(){const state=Portal.newState("BuilderDemo","18+");return {state,project:Portal.submitProject(state,work)};}
test("five staff specialists exist, and assessments never grant any permissions",()=>{
 const {project}=fixture(),report=Staff.createPreviewReport(project);
 assert.equal(Staff.AGENTS.length,5);
 assert.deepEqual(report.sections.map(x=>x.id),["intake","safety","feasibility","matching","operations"]);
 assert.equal(report.engine,"deterministic-demo");
 assert.equal(report.permissions.aiMayApprove,false);
 assert.equal(report.permissions.aiMayDecline,false);
 assert.equal(report.permissions.aiMayCreateGroup,false);
 assert.equal(report.permissions.aiMayMessageUsers,false);
 assert.equal(project.stage,"pending");
});
test("staff packet cannot issue a project approval",()=>{
 const {state,project}=fixture();
 Staff.runStaffPreview(project);
 assert.equal(project.stage,"pending");
 assert.equal(Portal.canAccess(project,"BuilderDemo","chat"),false);
 assert.equal(state.notifications.some(n=>/approved/i.test(n.title)),false);
});
test("human decision requires fresh report, human name, and documented reason",()=>{
 const {state,project}=fixture();
 assert.throws(()=>Staff.humanDecision({decide:Portal.decide,state},project,"approved","Human","Strong evidence provided"),/Generate/);
 Staff.runStaffPreview(project);
 assert.throws(()=>Staff.humanDecision({decide:Portal.decide,state},project,"approved","AI","Strong evidence provided"),/human reviewer/);
 assert.throws(()=>Staff.humanDecision({decide:Portal.decide,state},project,"approved","Human","yes"),/at least 10/);
 assert.throws(()=>Staff.humanDecision({decide:Portal.decide,state},project,"accepted","Human","Strong evidence provided"),/Invalid/);
 assert.equal(project.stage,"pending");
 const decision=Staff.humanDecision({decide:Portal.decide,state},project,"approved","Human Reviewer","Scope and team roles reviewed");
 assert.equal(decision.simulated,true);
 assert.equal(decision.reviewer,"Human Reviewer");
 assert.equal(project.stage,"approved");
 assert.equal(project.groupCreated,false);
});
test("changed project cannot be approved using an old AI review packet",()=>{
 const {state,project}=fixture();Staff.runStaffPreview(project);
 project.description+=" Additional details changed after review.";
 assert.throws(()=>Staff.humanDecision({decide:Portal.decide,state},project,"approved","Human","Good project approach"),/current staff report/);
 assert.equal(project.stage,"pending");
});
test("resubmitting after revision discards former staff packet",()=>{
 const {state,project}=fixture();Staff.runStaffPreview(project);
 Staff.humanDecision({decide:Portal.decide,state},project,"changes-requested","Human Reviewer","Please add a more specific pilot experiment.");
 Portal.resubmit(state,project);
 assert.equal(project.stage,"pending");assert.equal(project.staffReport,null);assert.equal(project.humanReview,null);
});
test("obvious safety flags are escalated, not automatically rejected",()=>{
 const {project}=fixture();
 project.description+=" Contact me at founder@example.com for guaranteed profit.";
 const report=Staff.createPreviewReport(project);
 const section=report.sections.find(x=>x.id==="safety");
 assert.ok(section.flags.length>=2);
 assert.equal(project.stage,"pending");
});
test("five-person staff dashboard uses separate scripts and human handoff fields",()=>{
 const html=fs.readFileSync(path.join(__dirname,"..","public","review.html"),"utf8");
 const script=fs.readFileSync(path.join(__dirname,"..","public","staff-dashboard.js"),"utf8");
 assert.match(html,/src="\/staff-core.js"/);
 assert.match(html,/src="\/staff-dashboard.js"/);
 assert.match(html,/id="reviewApplications"/);
 assert.match(html,/id="staffStats"/);
 assert.match(html,/id="staffDetail"/);
 assert.match(script,/Staff\.humanDecision/);
 assert.match(script,/HUMAN DECISION GATE/);
});
