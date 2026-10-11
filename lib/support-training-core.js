"use strict";
const Core=require("./support-case-core");
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validate(body){
 if(!body||typeof body!=="object"||Array.isArray(body)||
    Object.keys(body).some(k=>!["message","syntheticAdultTest","requestId"].includes(k)))
  throw Error("Only simulation message fields are allowed.");
 if(body.syntheticAdultTest!==true)throw Error("Synthetic adult-test confirmation is required.");
 if(typeof body.requestId!=="string"||!uuid.test(body.requestId))throw Error("Valid unique request ID is required.");
 const message=Core.validateNote({note:body.message,internalOnly:true});
 if(message.length<12)throw Error("Simulated messages require at least 12 characters.");
 return {message,requestId:body.requestId};
}
function canRead(row,staff){
 return staff.role==="manager"||row.assigned_staff_id===staff.id;
}
function canWrite(row,staff){
 return canRead(row,staff)&&!["closed","resolved","escalated"].includes(row.status);
}
module.exports={validate,canRead,canWrite};
