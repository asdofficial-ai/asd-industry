"use strict";
const Core=require("./support-case-core");
const PRESETS=["orbit","shield","spark","compass"];
const AVAILABILITY=["available","busy","away","offline"];
const DEPARTMENTS=["general","technical","projects","trust_safety"];
function ownObject(input,keys){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid profile input.");
 if(Object.keys(input).some(k=>!keys.includes(k)))throw Error("Restricted employee profile field.");
}
function validateAgentProfile(body){
 ownObject(body,["displayName","avatarPreset","availability"]);
 if(typeof body.displayName!=="string"||body.displayName.trim().length<2||body.displayName.trim().length>60)
  throw Error("Display name must contain 2–60 characters.");
 const name=body.displayName.trim();
 if(!/^[\p{L}\p{N} .'-]{2,60}$/u.test(name))throw Error("Use a simple, non-identifying display name.");
 // Discourage employee-identity spoofing in self-managed profile fields.
 if(/founder|administrator|verified|official|manager|support lead/i.test(name))
  throw Error("Job titles and verification status are assigned by administrators.");
 if(!PRESETS.includes(body.avatarPreset)||!AVAILABILITY.includes(body.availability))
  throw Error("Choose an approved avatar and availability.");
 return {displayName:name,avatarPreset:body.avatarPreset,availability:body.availability};
}
function validateDepartment(body){
 ownObject(body,["department"]);
 if(!DEPARTMENTS.includes(body.department))throw Error("Choose an approved support department.");
 return body.department;
}
function validateEscalation(body){
 ownObject(body,["category","reason"]);
 const categories=["technical","policy","safety","account_access","other"];
 if(!categories.includes(body.category))throw Error("Choose an escalation category.");
 const reason=Core.validateNote({internalOnly:true,note:body.reason});
 if(reason.length<12||reason.length>500)throw Error("Escalation reason must contain 12–500 characters.");
 return {category:body.category,reason};
}
function validateEscalationReview(body){
 ownObject(body,["decision","note"]);
 if(!["resume","resolve"].includes(body.decision))throw Error("Choose a valid escalation decision.");
 const note=Core.validateNote({internalOnly:true,note:body.note});
 if(note.length<12||note.length>500)throw Error("Review note must contain 12–500 characters.");
 return {decision:body.decision,note};
}
module.exports={PRESETS,AVAILABILITY,DEPARTMENTS,validateAgentProfile,validateDepartment,validateEscalation,validateEscalationReview};