"use strict";
/* Validation shared by the staff API and disposable synthetic-data test suites.
   No real identity documents, contact information, secrets or customer messages are accepted. */
const ROLES=["support","manager"];
const CATEGORIES=["general","account_access","technical","project_help","safety_report"];
const PRIORITIES=["low","normal","high"];
const TRANSITIONS={
 open:["in_progress","escalated"],
 in_progress:["waiting_on_customer","escalated","resolved"],
 waiting_on_customer:["in_progress","escalated","resolved"],
 escalated:["in_progress","resolved"],
 resolved:["in_progress","closed"],
 closed:[]
};
const unsafe=/[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d .()-]{7,}\d)|password|passcode|secret|api key|private key|seed phrase|recovery code|one.time.code|bank account|wallet address|home address|nin|bvn/i;
function clean(value,max,min=1){
 if(typeof value!=="string"||value.trim().length<min||value.trim().length>max)throw Error("Invalid synthetic support text.");
 const text=value.trim();
 if(unsafe.test(text))throw Error("Sensitive information is not allowed in synthetic test cases.");
 return text;
}
function validateNewCase(input){
 if(!input||input.syntheticAdultTest!==true)throw Error("Only clearly labeled synthetic adult-test cases are allowed.");
 const subject=clean(input.subject,120,5),requesterAlias=clean(input.requesterAlias,40,3),description=clean(input.description,900,15);
 if(!CATEGORIES.includes(input.category)||!PRIORITIES.includes(input.priority))throw Error("Invalid support category or priority.");
 return {subject,requesterAlias,description,category:input.category,priority:input.priority};
}
function validateNote(input){
 if(!input||input.internalOnly!==true)throw Error("Support notes must be internal-only.");
 return clean(input.note,900,5);
}
function isSupportRole(role){return ROLES.includes(role);}
function canAssignSupport(role){return role==="manager";}
function authorizeTransition({role,from,to}){
 if(!isSupportRole(role)||!TRANSITIONS[from]?.includes(to))throw Error("Status transition is not permitted.");
 if(role==="support"&&to==="closed")throw Error("Only a manager can close a support case.");
 return true;
}
module.exports={ROLES,CATEGORIES,PRIORITIES,TRANSITIONS,validateNewCase,validateNote,isSupportRole,canAssignSupport,authorizeTransition};