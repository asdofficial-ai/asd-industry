"use strict";
/* Internal policy contract for a FUTURE authenticated AI-first customer support handoff.
 * NOT an authentication method and NOT a public endpoint. Never trust browser claims.
 * Only a trusted server service may record a verified AI result and create a one-use handoff.
 */
const REASONS=Object.freeze({
 CANNOT_ANSWER:"cannot_answer",
 INSUFFICIENT_CONFIDENCE:"insufficient_confidence",
 PERMISSION_DENIED:"permission_denied",
 ACTION_UNSUPPORTED:"action_unsupported",
 HUMAN_REQUESTED:"human_requested"
});
const ELIGIBLE=new Set(Object.values(REASONS));
function decisionFromVerifiedAI(result){
 if(!result||typeof result!=="object"||Array.isArray(result))throw Error("Trusted AI assessment required.");
 if(result.origin!=="trusted_ai_service"||result.verifiedServerSide!==true)
  throw Error("Untrusted handoff source. Client cannot assert AI limitations.");
 if(result.status==="answered"||result.status==="resolved")
  return Object.freeze({offerHuman:false,reason:null,customerLink:null});
 if(result.status!=="needs_human"||!ELIGIBLE.has(result.reason))
  throw Error("Invalid AI escalation outcome.");
 return Object.freeze({offerHuman:true,reason:result.reason,
  customerLink:null,requiresVerifiedCustomerSession:true,requiresOneUseGrant:true});
}
function validateRedemption(grant,{customerId,caseId,now=Date.now()}={}){
 if(!grant||grant.serverVerified!==true||grant.consumed===true)return false;
 if(typeof customerId!=="string"||!customerId.length||typeof caseId!=="string"||!caseId.length)return false;
 if(grant.customerId!==customerId||grant.caseId!==caseId)return false;
 if(!Number.isFinite(grant.expiresAt)||grant.expiresAt<=now)return false;
 if(!ELIGIBLE.has(grant.reason)||grant.aiAssessmentVerified!==true)return false;
 // In production this must also atomically consume the grant in the database.
 return true;
}
module.exports={REASONS,decisionFromVerifiedAI,validateRedemption};
