"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const KB=require("../public/support-knowledge");
const source=fs.readFileSync(path.join(__dirname,"../public/support-knowledge.js"),"utf8");
const lab=fs.readFileSync(path.join(__dirname,"../public/ai-first-support-lab.js"),"utf8");
const labPage=fs.readFileSync(path.join(__dirname,"../public/ai-first-support-lab.html"),"utf8");
test("AI support knows reviewed customer-facing topics and availability; no secrets",()=>{
 assert.ok(KB.validate()>=30,"Broad customer FAQ catalog is required.");
 assert.match(KB.version,/^2026\.10\.11/);
 for(const id of ["about","get-started","project-submit","matching","workspace","team-chat",
  "feed","privacy","login","recovery","payments","equity","age","reports","security",
  "case-status","founder","human-availability","ai-v-human","real-ai","support-link"]){
  assert.ok(KB.topics.some(t=>t.id===id),"Missing "+id);
 }
 for(const entry of KB.topics){
  assert.ok(["demo","planned","disabled"].includes(entry.status));
  assert.ok(entry.answer.length<650);
  assert.match(entry.source,/^(docs\/|public\/|README\.md)/);
  assert.doesNotMatch(entry.answer,/\b[a-z0-9._-]+@(?:gmail|outlook|yahoo)\.com|BEGIN PRIVATE KEY|api[_-]?key=/i);
  assert.ok(Array.isArray(entry.tags)&&entry.tags.length>=2);
 }
 assert.doesNotMatch(source,/shamadasd897@gmail\.com|alihaidardanbawa@gmail\.com/);
});
test("answers current demos, refuses unsupported questions, and does not invent working services",()=>{
 const about=KB.respond("What is ASD Industry?");
 assert.equal(about.status,"answered");
 assert.match(about.text,/demonstration/);
 const team=KB.respond("How do I find teammates?");
 assert.equal(team.status,"answered");
 assert.match(team.text,/fictional/);
 const payments=KB.respond("Can you withdraw my money?");
 assert.equal(payments.status,"needs_human");
 assert.match(payments.text,/no active live payments/);
 const reset=KB.respond("Please reset my password");
 assert.equal(reset.status,"needs_human");
 assert.match(reset.text,/not activated/);
 const unknown=KB.respond("Can you explain quantum banana orbit astronomy?");
 assert.equal(unknown.status,"needs_human");
 assert.equal(unknown.reason,"cannot_answer");
 assert.equal(KB.lookup("".padEnd(701,"x")),null);
});
test("mobile AI support screen uses shared knowledge, preserves AI-first locked human flow",()=>{
 assert.match(labPage,/src="\/support-knowledge\.js"/);
 assert.ok(labPage.indexOf("/support-knowledge.js")<labPage.indexOf("/ai-first-support-lab.js"));
 assert.match(lab,/window\.ASDSupportKnowledge/);
 assert.match(lab,/knowledge\.respond\(prompt\)/);
 assert.match(lab,/if\(!authorized\|\|mode!=="ai"\)return/);
 for(const rule of [/fetch\s*\(/i,/XMLHttpRequest/i,/WebSocket/i,/localStorage/i,/sessionStorage/i,/indexedDB/i,/innerHTML\s*=/i]){
  assert.doesNotMatch(lab,rule);
 }
});
