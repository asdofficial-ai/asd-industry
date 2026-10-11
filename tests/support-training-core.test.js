"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const T=require("../lib/support-training-core");
const requestId="11111111-1111-4111-8111-111111111111";
test("synthetic messages accept only approved fields and clearly test-only content",()=>{
 assert.deepEqual(T.validate({message:"This fictional agent reply is suitable for testing.",requestId,syntheticAdultTest:true}),
  {message:"This fictional agent reply is suitable for testing.",requestId});
 assert.throws(()=>T.validate({message:"This fictional agent reply is suitable for testing.",requestId}),/Synthetic/);
 assert.throws(()=>T.validate({message:"This fictional agent reply is suitable for testing.",requestId,syntheticAdultTest:true,senderKind:"customer_simulator"}),/fields/);
 assert.throws(()=>T.validate({message:"This fictional agent reply is suitable for testing.",requestId:"bad",syntheticAdultTest:true}),/request ID/);
 assert.throws(()=>T.validate({message:"Too short.",requestId,syntheticAdultTest:true}),/12 characters/);
 assert.throws(()=>T.validate({message:"My password is a real secret phrase.",requestId,syntheticAdultTest:true}),/Sensitive/);
 assert.throws(()=>T.validate({message:"Call me at 08012345678 for a project.",requestId,syntheticAdultTest:true}),/Sensitive/);
});
test("manager sees authorized threads; support must be assigned and cannot reply to closed or escalated tickets",()=>{
 const owner="22222222-2222-4222-8222-222222222222",other="33333333-3333-4333-8333-333333333333";
 const row={status:"in_progress",assigned_staff_id:owner};
 assert.equal(T.canRead(row,{id:owner,role:"support"}),true);
 assert.equal(T.canRead(row,{id:other,role:"support"}),false);
 assert.equal(T.canRead(row,{id:other,role:"manager"}),true);
 assert.equal(T.canWrite(row,{id:owner,role:"support"}),true);
 assert.equal(T.canWrite({...row,status:"resolved"},{id:owner,role:"support"}),false);
 assert.equal(T.canWrite({...row,status:"closed"},{id:other,role:"manager"}),false);
 assert.equal(T.canWrite({...row,status:"escalated"},{id:other,role:"manager"}),false);
 assert.equal(T.canWrite({...row,assigned_staff_id:null},{id:owner,role:"support"}),false);
});
