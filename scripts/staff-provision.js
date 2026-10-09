"use strict";
/* Run from a private trusted terminal only. Do NOT commit passwords or API keys. */
const crypto=require("node:crypto");
const {Client}=require("pg");
const {emailAddress,hashPassword,ROLES}=require("../lib/staff-auth-core");
async function run(){
 const url=process.env.STAFF_ADMIN_DB_URL;
 if(!url)throw Error("STAFF_ADMIN_DB_URL must point to the separate ASD Industry staff administrator database connection.");
 if((process.env.DATABASE_URL&&url===process.env.DATABASE_URL)||(process.env.STAFF_DB_URL&&url===process.env.STAFF_DB_URL))throw Error("Use a separate database for staff.");
 const email=emailAddress(process.env.NEW_STAFF_EMAIL);
 const password=process.env.NEW_STAFF_PASSWORD;
 const role=process.env.NEW_STAFF_ROLE;
 if(!ROLES.includes(role))throw Error("Choose NEW_STAFF_ROLE: founder, reviewer, or safety.");
 const hash=await hashPassword(password);
 const client=new Client({connectionString:url});
 await client.connect();
 try{
  const result=await client.query(`INSERT INTO industry_staff_accounts(id,email,password_hash,role)
   VALUES($1,$2,$3,$4)
   ON CONFLICT (lower(email)) DO UPDATE SET password_hash=excluded.password_hash,
     role=excluded.role,enabled=true
   RETURNING id,role`,[crypto.randomUUID(),email,hash,role]);
  console.log("Staff identity provisioned: "+result.rows[0].role+" (email redacted)");
 }finally{await client.end();}
}
run().catch(e=>{console.error("Provisioning failed:",e.message);process.exitCode=1;});
