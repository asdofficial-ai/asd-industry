"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const Google=require("../lib/founder-google-identity");
const clientId="123456789012-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.apps.googleusercontent.com";
const email="alihaidardanbawa@gmail.com";
const valid={iss:"https://accounts.google.com",aud:clientId,email,email_verified:true,sub:"109876543210987654321"};
const config={NODE_ENV:"production",FOUNDER_GOOGLE_VERIFICATION_ENABLED:"true",
 GOOGLE_CLIENT_ID:clientId,FOUNDER_PENDING_EMAIL:email,
 STAFF_DB_URL:"postgresql://localhost/asd_industry_staff",
 STAFF_ORIGIN:"https://asd-industry-staff-v07-preview.onrender.com"};
test("No free Gmail owner verification without explicit server configuration",()=>{
 assert.equal(Google.configured({}),false);
 assert.equal(Google.configured(config),true);
 assert.equal(Google.configured({...config,GOOGLE_CLIENT_ID:""}),false);
 assert.equal(Google.configured({...config,FOUNDER_PENDING_EMAIL:""}),false);
 assert.equal(Google.configured({...config,FOUNDER_GOOGLE_VERIFICATION_ENABLED:"false"}),false);
 assert.equal(Google.configured({...config,STAFF_ORIGIN:"http://attacker.example"}),false);
 assert.equal(Google.configured({...config,STAFF_DB_URL:""}),false);
});
test("Only Google's verified, matching owner identity qualifies for email proof",()=>{
 assert.deepEqual(Google.verifyClaims(valid,clientId,email),{email,subject:valid.sub});
 assert.throws(()=>Google.verifyClaims({...valid,email_verified:false},clientId,email));
 assert.throws(()=>Google.verifyClaims({...valid,email:"attacker@gmail.com"},clientId,email));
 assert.throws(()=>Google.verifyClaims({...valid,sub:""},clientId,email));
 assert.throws(()=>Google.verifyClaims({...valid,iss:"https://evil.example"},clientId,email));
 assert.throws(()=>Google.verifyClaims({...valid,aud:"other-client"},clientId,email));
 assert.throws(()=>Google.verifyClaims(valid,"other-client",email));
});
test("Google server verification does not accept malformed tokens or a disabled service",async()=>{
 await assert.rejects(Google.verifyCredential("not-a-jwt",config),/Invalid Google ID token/);
 await assert.rejects(Google.verifyCredential("not-a-jwt",{}),/not configured/);
});
test("Google verification does not confer Founder permissions or sessions",()=>{
 const api=fs.readFileSync(path.join(__dirname,"../lib/human-staff-api.js"),"utf8");
 assert.match(api,/r\.post\("\/google-verify",rateLimit,requireOrigin/);
 assert.match(api,/founderAccountActivated:false/);
 assert.match(api,/industry_founder_google_claims/);
 assert.match(api,/google_subject=\$2/);
 assert.match(api,/r\.post\("\/google-login",rateLimit,requireOrigin/);
 assert.match(api,/a\.role='founder' AND a\.enabled=true/);
 assert.match(api,/industry_staff_mfa/);
 assert.match(api,/last_accepted_counter<\$2/);
 const html=fs.readFileSync(path.join(__dirname,"../public/founder-login.html"),"utf8");
 const js=fs.readFileSync(path.join(__dirname,"../public/founder-login.js"),"utf8");
 assert.match(html,/id="founderGoogleButton"/);
 assert.match(html,/id="founderGoogleTotp"/);
 assert.match(js,/accounts\.id\.renderButton/);
 assert.match(js,/google-verify/);
 assert.match(js,/google-login/);
 assert.doesNotMatch(js,/localStorage/);
});
