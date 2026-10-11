"use strict";
/* Server-side adapter for FUTURE AI Support. No model call, no account lookups,
 * no external network or write tools. Outputs an approved public knowledge packet.
 */
const KB=require("../public/support-knowledge");
function prepareKnowledgePacket(question,context){
 if(typeof question!=="string"||question.trim().length<5||question.length>700)
  throw Error("A short customer question is required.");
 if(!context||context.authenticatedServerSession!==true||
    context.verifiedAdult!==true||context.safetyReviewApproved!==true||
    context.isMinorRelated!==false||context.userDataProcessingApproved!==true)
  throw Error("AI support retrieval is disabled until authenticated adult safety checks are approved.");
 // The public catalog does not contain customer data, employee notes or secrets.
 const result=KB.respond(question);
 const match=KB.lookup(question);
 return Object.freeze({
  knowledgeVersion:KB.version,reviewedAt:KB.reviewedAt,
  source:match?.source||null,topicId:result.topicId||null,
  availability:match?.status||"unknown",
  publicResponse:result.text,
  requiresHumanHandoff:result.status==="needs_human",
  handoffReason:result.status==="needs_human"?result.reason:null,
  modelConnected:false,customerDataIncluded:false,toolsEnabled:false
 });
}
module.exports={prepareKnowledgePacket};
