"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Ops=require("../lib/support-operations-core");
const profile={displayName:"Support Team Member",avatarPreset:"spark",availability:"available"};
test("agent can change display name, preset and own availability only",()=>{
 assert.equal(Ops.validateAgentProfile(profile).availability,"available");
 for(const x of [{...profile,role:"founder"},{...profile,verified:true},{...profile,department:"trust_safety"},{...profile,staffId:"fake"}]){
  assert.throws(()=>Ops.validateAgentProfile(x),/Restricted/);
 }
 for(const name of ["Verified Employee","Official Support","Manager","Founder Help"]){
  assert.throws(()=>Ops.validateAgentProfile({...profile,displayName:name}),/Job titles/);
 }
 assert.throws(()=>Ops.validateAgentProfile({...profile,availability:"superadmin"}),/approved avatar/);
 assert.throws(()=>Ops.validateAgentProfile({...profile,avatarPreset:"upload-my-photo"}),/approved avatar/);
});
test("manager-only department selection and audited escalation policy",()=>{
 assert.equal(Ops.validateDepartment({department:"trust_safety"}),"trust_safety");
 assert.throws(()=>Ops.validateDepartment({department:"trust_safety",role:"manager"}),/Restricted/);
 assert.throws(()=>Ops.validateDepartment({department:"finance"}),/approved/);
 assert.equal(Ops.validateEscalation({category:"safety",reason:"A fictional high-risk sample requires another adult manager."}).category,"safety");
 assert.throws(()=>Ops.validateEscalation({category:"safety",reason:"short"}),/12/);
 assert.throws(()=>Ops.validateEscalation({category:"safety",reason:"A secret password should be reset."}),/Sensitive/);
 assert.throws(()=>Ops.validateEscalation({category:"billing",reason:"A sample needs approval by a different person."}),/category/);
 assert.equal(Ops.validateEscalationReview({decision:"resume",note:"Reopen this fictional ticket after review."}).decision,"resume");
 assert.throws(()=>Ops.validateEscalationReview({decision:"approve_password",note:"A test note with enough characters."}),/decision/);
});

test("reply drafts are synthetic only and cannot contain secrets or delivery flags",()=>{
 assert.equal(Ops.validateReplyDraft({draft:"Hello fictional visitor, try the sample instructions.",syntheticAdultTest:true}).startsWith("Hello"),true);
 assert.throws(()=>Ops.validateReplyDraft({draft:"Hello fictional visitor, try the sample instructions."}),/fictional/);
 assert.throws(()=>Ops.validateReplyDraft({draft:"Hello fictional visitor, try the sample instructions.",syntheticAdultTest:true,send:true}),/Restricted/);
 assert.throws(()=>Ops.validateReplyDraft({draft:"Please send your password in a message.",syntheticAdultTest:true}),/Sensitive/);
 assert.throws(()=>Ops.validateReplyDraft({draft:"Too short.",syntheticAdultTest:true}),/12/);
});