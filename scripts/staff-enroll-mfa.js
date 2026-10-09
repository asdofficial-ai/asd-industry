"use strict";
/* Private operator command. Generates new Founder TOTP seed only in trusted terminal.
 * The provisioning URI is a SECRET. Never run this in CI or paste its output in chat.
 */
const {Client}=require("pg");
const {emailAddress}=require("../lib/staff-auth-core");
const MFA=require("../lib/staff-mfa");
async function run(){
 const admin=process.env.STAFF_ADMIN_DB_URL;
 if(!admin||admin===process.env.STAFF_DB_URL||admin===process.env.DATABASE_URL)
  throw Error("STAFF_ADMIN_DB_URL must be a separate privileged ASD Industry connection.");
 const key=process.env.STAFF_MFA_KEY;MFA.keyFromEnv(key);
 const email=emailAddress(process.env.NEW_STAFF_EMAIL);
 if(process.env.CONFIRM_FOUNDER_MFA_SETUP!=="I_AM_ON_A_PRIVATE_TERMINAL")
  throw Error("Explicit trusted-terminal confirmation required.");
 const client=new Client({connectionString:admin});await client.connect();
 try{
  await client.query("BEGIN");
  const person=await client.query("SELECT id,role FROM industry_staff_accounts WHERE lower(email)=$1 FOR UPDATE",[email]);
  if(!person.rowCount||person.rows[0].role!=="founder")throw Error("Only a pre-provisioned Founder may enroll.");
  const row=await client.query("SELECT staff_id FROM industry_staff_mfa WHERE staff_id=$1",[person.rows[0].id]);
  if(row.rowCount&&process.env.CONFIRM_MFA_RESET!=="I_AUTHORIZE_RESET")
   throw Error("Existing Founder authenticator may only be reset with explicit confirmation.");
  const seed=MFA.randomSecret();
  const encrypted=MFA.seal(seed,person.rows[0].id,key);
  await client.query(`INSERT INTO industry_staff_mfa(staff_id,secret_ciphertext,last_accepted_counter)
    VALUES($1,$2,-1) ON CONFLICT(staff_id) DO UPDATE SET secret_ciphertext=$2,
    last_accepted_counter=-1,created_at=now()`,[person.rows[0].id,encrypted]);
  await client.query("DELETE FROM industry_staff_sessions WHERE staff_id=$1",[person.rows[0].id]);
  await client.query("COMMIT");
  // This URI contains the TOTP secret and must ONLY appear in the trusted operator console.
  process.stdout.write("\nPRIVATE FOUNDER TOTP SETUP — DO NOT COPY TO CHAT OR TICKETS\n");
  process.stdout.write("Add this account to an authenticator app via its setup URI in your private terminal:\n");
  process.stdout.write(MFA.provisioningUri(seed,email)+"\n");
  process.stdout.write("Store recovery instructions offline. Setup codes must never appear in web logs.\n");
 }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e;}
 finally{await client.end();}
}
run().catch(e=>{console.error("Private TOTP provisioning failed:",e.message);process.exitCode=1;});
