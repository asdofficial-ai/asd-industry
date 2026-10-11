"use strict";
/* Training conversations are not an external messenger.
 * There are no customer accounts, webhook integrations, sends or production message queues.
 */
const Core=require("./support-case-core");
const SPEAKERS=Object.freeze(["customer_simulated","agent_simulated"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validateTrainingMessage(payload,role){
 if(!Core.isSupportRole(role))throw Error("Human Support or Manager permissions required.");
 if(!payload||typeof payload!=="object"||Array.isArray(payload))
  throw Error("Invalid simulated training message.");
 if(Object.keys(payload).some(x=>!["speaker","body","requestId","syntheticAdultTest"].includes(x)))
  throw Error("Unknown delivery or identity field was rejected.");
 if(payload.syntheticAdultTest!==true)throw Error("Confirm synthetic adult-only training data.");
 if(!SPEAKERS.includes(payload.speaker))throw Error("Only simulated conversation speakers are supported.");
 if(payload.speaker==="customer_simulated"&&role!=="manager")
  throw Error("Only managers may compose fictional customer messages.");
 if(typeof payload.requestId!=="string"||!uuid.test(payload.requestId))
  throw Error("A unique idempotency request ID is required.");
 const body=Core.validateNote({internalOnly:true,note:payload.body});
 if(body.length<12)throw Error("Write at least 12 characters for a simulated message.");
 return {speaker:payload.speaker,body,requestId:payload.requestId};
}
module.exports={SPEAKERS,validateTrainingMessage};
