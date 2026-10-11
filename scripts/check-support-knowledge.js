"use strict";
/** Gate all public-facing AI help facts against the approved, versioned catalog.
 * PR policy also requires a knowledge change when customer functionality changes.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const cp=require("node:child_process");
const root=path.resolve(__dirname,"..");
const kb=require("../public/support-knowledge");
const quantity=kb.validate();
if(quantity<30)throw Error("Customer Support AI knowledge must cover at least 30 reviewed domains.");
for(const topic of kb.topics){
 const file=path.join(root,topic.source);
 if(!fs.existsSync(file))throw Error("Knowledge entry "+topic.id+" references missing file: "+topic.source);
 if(!fs.statSync(file).isFile())throw Error("Knowledge source must be a file.");
}
assert.match(kb.version,/^\d{4}\.\d{2}\.\d{2}\.\d+$/);
if(!/^\d{4}-\d{2}-\d{2}$/.test(kb.reviewedAt))throw Error("Expected knowledge review date.");
const entries=["public/index.html","public/home.html","public/discover.html","public/projects.html","public/profile.html","public/team.html","public/workspace.html","public/portal.js","public/portal-core.js","public/beta-signup.html","public/beta-signup.js","public/ai-first-support-lab.js","public/ai-first-support-lab.html","docs/MULTIPAGE-PLATFORM.md","README.md"];
// Pull requests targeting main must review support knowledge when a customer-facing
// feature or documented policy changes. CSS, staff-only files and mock data are excluded.
if(process.env.GITHUB_EVENT_NAME==="pull_request"){
 const base=process.env.GITHUB_BASE_REF;
 if(!base||!/^[A-Za-z0-9_./-]+$/.test(base))throw Error("Safe base branch required.");
 const changed=cp.execFileSync("git",["diff","--name-only","origin/"+base+"...HEAD"],{cwd:root,encoding:"utf8"}).trim().split("\n").filter(Boolean);
 const relevant=changed.filter(p=>entries.includes(p));
 if(relevant.length&&!changed.includes("public/support-knowledge.js"))
  throw Error("Customer-facing changes need reviewed public/support-knowledge.js updates: "+relevant.join(", "));
 if(changed.includes("public/support-knowledge.js")){
  // A knowledge edit without a version increment is easily missed by deployed clients.
  try{
   const previous=cp.execFileSync("git",["show","origin/"+base+":public/support-knowledge.js"],{cwd:root,encoding:"utf8"});
   const match=previous.match(/version="([0-9.]+)"/);
   if(match&&match[1]===kb.version)throw Error("Increment support knowledge version when updating reviewed answers.");
  }catch(e){
   if(e.message.includes("Increment support"))throw e;
   // No prior catalog on an older base: this PR introduces the feature.
  }
 }

 console.log("Support knowledge PR review: "+relevant.length+" customer-facing paths; "+(changed.includes("public/support-knowledge.js")?"catalog updated":"no catalog update necessary"));
}
console.log("ASD Industry AI Support: "+quantity+" approved-public topics, version "+kb.version+"; source paths verified.");
