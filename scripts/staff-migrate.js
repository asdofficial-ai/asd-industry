"use strict";
/* Apply the staff schema only to a dedicated ASD Industry database.
 * This command does NOT run automatically during public startup. */
const fs=require("node:fs"),path=require("node:path");
const {Client}=require("pg");
async function run(){
 const url=process.env.STAFF_DB_URL;
 if(!url)throw Error("STAFF_DB_URL must point to an isolated ASD Industry database.");
 if(process.env.DATABASE_URL&&url===process.env.DATABASE_URL)
  throw Error("STAFF_DB_URL must not reuse the existing app database.");
 const client=new Client({connectionString:url});
 await client.connect();
 try{
  await client.query(fs.readFileSync(path.join(__dirname,"../db/migrations/001_staff_review.sql"),"utf8"));
  console.log("ASD Industry staff migration complete.");
 }finally{await client.end();}
}
run().catch(e=>{console.error("Staff migration failed:",e.message);process.exitCode=1;});
