"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {prepareKnowledgePacket}=require("../lib/support-ai-context");
test("server-side AI retrieval rejects client claims, minors and nonconsented records",()=>{
 for(const ctx of [
  null,{authenticatedServerSession:true},{authenticatedServerSession:true,verifiedAdult:true,safetyReviewApproved:true,isMinorRelated:true,userDataProcessingApproved:true},
  {authenticatedServerSession:true,verifiedAdult:true,safetyReviewApproved:false,isMinorRelated:false,userDataProcessingApproved:true}
 ])assert.throws(()=>prepareKnowledgePacket("What is ASD Industry?",ctx),/disabled/);
});
test("future knowledge packet includes reviewed version, source and never private account details",()=>{
 const context={authenticatedServerSession:true,verifiedAdult:true,safetyReviewApproved:true,isMinorRelated:false,userDataProcessingApproved:true};
 const item=prepareKnowledgePacket("What is ASD Industry?",context);
 assert.equal(item.requiresHumanHandoff,false);
 assert.equal(item.modelConnected,false);
 assert.equal(item.customerDataIncluded,false);
 assert.equal(item.toolsEnabled,false);
 assert.match(item.source,/README\.md/);
 const risky=prepareKnowledgePacket("Please reset my password",context);
 assert.equal(risky.requiresHumanHandoff,true);
 assert.equal(risky.handoffReason,"permission_denied");
 assert.throws(()=>prepareKnowledgePacket("too",context),/short/);
});
