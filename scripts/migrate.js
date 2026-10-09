"use strict";
// Run manually after configuring a dedicated ASD Industry database. No automatic DDL on service startup.
const fs=require("node:fs");
const path=require("node:path");
const {Client}=require("pg");
async function main(){
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required (dedicated ASD Industry DB only).");
  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  try{
    for(const filename of ["001_account_foundation.sql","002_email_verification.sql"]){
      const sql=fs.readFileSync(path.join(__dirname,"..","db","migrations",filename),"utf8");
      await client.query(sql);
      console.log("Applied "+filename);
    }
    console.log("ASD Industry v0.4 account schema migration completed.");
  }finally{await client.end();}
}
main().catch(error=>{console.error("Database migration failed:",error.message);process.exitCode=1;});
