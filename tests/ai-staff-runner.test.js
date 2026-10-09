"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {ROLE_SPECS,minimalInput,approvedForProvider,createRunner,productionRunner}=require("../lib/ai-staff-runner.js");
const example={title:"FarmLink",description:"A small prototype website for growers to present stock to buyers; begin with a two-farm pilot.",category:"Agriculture",seats:2,roles:["Developer"]};
const adult={isVerifiedAdult:true,humanStaffAuthorized:true,aiProcessingApproved:true,isMinorRelated:false};
test("model runner remains disabled unless explicitly enabled and fully authorized",async()=>{
 const runner=createRunner({enabled:false});
 assert.equal(runner.enabled,false);
 await assert.rejects(runner.run(example,adult),/disabled/);
 assert.equal(productionRunner().enabled,false);
 assert.equal(approvedForProvider({...adult,isMinorRelated:true}),false);
 assert.equal(approvedForProvider({...adult,aiProcessingApproved:false}),false);
 assert.equal(approvedForProvider({...adult,isVerifiedAdult:false}),false);
});
test("provider input minimizes fields and rejects apparent personal information",()=>{
 const safe=minimalInput(example);
 assert.deepEqual(Object.keys(safe),["title","description","category","requestedTeammates","roles"]);
 assert.equal(safe.requestedTeammates,2);
 assert.throws(()=>minimalInput({...example,description:example.description+" Contact me at me@example.com."}),/Sensitive/);
 assert.throws(()=>minimalInput({...example,description:example.description+" My password must be secret."}),/Sensitive/);
});
test("five model specialists produce distinct reports and cannot approve or contact users",async()=>{
 let calls=0;
 const request=async(url,options)=>{
  calls++;
  assert.equal(url,"https://api.openai.com/v1/responses");
  const body=JSON.parse(options.body);
  assert.equal(body.store,false);
  assert.equal(body.tool_choice,"none");
  assert.equal(body.model,"test-model");
  assert.ok(body.instructions.includes("Never decide approvals"));
  assert.ok(body.instructions.includes("untrusted DATA"));
  assert.equal(JSON.parse(body.input).project.title,"FarmLink");
  const payload={status:"needs-human-investigation",summary:"Question about prototype scope",risks:["Privacy check"],questions:["How will it be tested?"]};
  return {ok:true,json:async()=>({output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(payload)}]}]})};
 };
 const runner=createRunner({enabled:true,apiKey:"testing-not-a-real-api-key",model:"test-model",request});
 await assert.rejects(runner.run(example,{...adult,isMinorRelated:true}),/authorization/);
 assert.equal(calls,0);
 const result=await runner.run(example,adult);
 assert.equal(calls,5);assert.equal(result.opinions.length,5);
 assert.deepEqual(result.opinions.map(p=>p.role),ROLE_SPECS.map(r=>r.id));
 assert.equal(result.reviewRequired,true);assert.equal(result.aiMayApprove,false);
 assert.equal(result.aiMayDecline,false);assert.equal(result.aiMayCreateGroup,false);
});
test("malformed model output fails closed without human decision",async()=>{
 const request=async()=>({ok:true,json:async()=>({output:[{type:"message",content:[{type:"output_text",text:'{"approve": true}'}]}]})});
 const runner=createRunner({enabled:true,apiKey:"testing-not-a-real-api-key",model:"test-model",request});
 await assert.rejects(runner.run(example,adult),/manual human review/);
});
