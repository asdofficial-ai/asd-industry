"use strict";
/**
 * ASD Industry v0.8 identity taxonomy — no automatic promotion between identities.
 * A project founder is NOT the ASD Industry platform founder.
 * AI service identities NEVER receive staff sessions, human employee badges or review powers.
 */
const HUMAN_ROLES=Object.freeze(["founder","manager","reviewer","safety","support"]);
const AI_ROLES=Object.freeze(["project_assistant","support_assistant","review_assistant"]);
const ROLE_LABELS=Object.freeze({
 founder:"ASD Industry Founder",manager:"ASD Industry Manager",
 reviewer:"Human Project Reviewer",safety:"Human Safety Officer",
 support:"Human Support Agent",project_assistant:"AI Project Assistant",
 support_assistant:"AI Support Assistant",review_assistant:"AI Review Assistant",
 builder:"Community Builder"
});
function humanRole(role){return HUMAN_ROLES.includes(role);}
function aiRole(role){return AI_ROLES.includes(role);}
function canReadQueue(role){return ["founder","manager","reviewer","safety"].includes(role);}
function canMakeDecision(role){return role==="founder"||role==="reviewer";}
function canPrepareReport(role){return canReadQueue(role);}
function canHandleRecovery(role){return role==="founder"||role==="manager"||role==="support";}
function isFounder(role){return role==="founder";}
function publicBadge({role,staffActive=false,verifiedAt=null,directoryOptIn=false}={}){
 if(!humanRole(role)||!staffActive||!verifiedAt||!directoryOptIn)return null;
 return Object.freeze({label:ROLE_LABELS[role],type:"verified_human_staff",verified:true});
}
function aiBadge(role){
 return aiRole(role)?Object.freeze({label:ROLE_LABELS[role],type:"ai_assistant",verifiedHuman:false}):null;
}
module.exports={HUMAN_ROLES,AI_ROLES,ROLE_LABELS,humanRole,aiRole,canReadQueue,
 canMakeDecision,canPrepareReport,canHandleRecovery,isFounder,publicBadge,aiBadge};
