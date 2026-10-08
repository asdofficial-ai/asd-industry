"use strict";
/*
 * ASD Industry v0.4 account beta foundation.
 * DISABLED BY DEFAULT. Only private, invite-only ADULT testers when explicitly enabled.
 * Not for production signup of minors; no guardian verification, moderation or live chat.
 */
const express=require("express");
const crypto=require("node:crypto");
const {Pool}=require("pg");
const {
  normalizeAccount,normalizeProfile,hashPassword,verifyPassword,hashSession,safeCodeEqual,publicAccount
}=require("./account-core");

const COOKIE_NAME="asd_beta_session";
const ONE_DAY=24*60*60*1000;
const MAX_ATTEMPTS=12,WINDOW_MS=15*60*1000;
const attempts=new Map();
const isOn=()=>process.env.ACCOUNTS_BETA_ENABLED==="true"
  && Boolean(process.env.DATABASE_URL)
  && Boolean(process.env.BETA_INVITE_CODE)
  && Boolean(process.env.PUBLIC_ORIGIN);

let pool;
function getPool(){
  if(!pool) pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:5000});
  return pool;
}
function writeCookie(res,token){
  const secure=process.env.NODE_ENV==="production" ? "; Secure" : "";
  res.setHeader("Set-Cookie",COOKIE_NAME+"="+token+"; Path=/api/beta; HttpOnly; SameSite=Strict"+secure+"; Max-Age="+(ONE_DAY/1000));
}
function clearCookie(res){
  const secure=process.env.NODE_ENV==="production" ? "; Secure" : "";
  res.setHeader("Set-Cookie",COOKIE_NAME+"=; Path=/api/beta; HttpOnly; SameSite=Strict"+secure+"; Max-Age=0");
}
function cookie(req){
  const header=req.headers.cookie||"";
  if(header.length>4096) return "";
  const part=header.split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE_NAME+"="));
  const raw=part?part.slice(COOKIE_NAME.length+1):"";
  return /^[A-Za-z0-9_-]{40,60}$/.test(raw)?raw:"";
}
function errorMessage(error,res){
  if(error.code==="23505") return res.status(409).json({error:"Email or handle is already in use."});
  if(error instanceof SyntaxError) return res.status(400).json({error:"Invalid JSON body."});
  if(error.message && (/^Choose |^Enter |^Invalid |^This limited |^The invite/i).test(error.message))
    return res.status(400).json({error:error.message});
  console.error("Account beta request failed:",error.code||error.name||"error");
  return res.status(503).json({error:"Account beta is temporarily unavailable."});
}
function rateLimit(req,res,next){
  // Single instance defense only; production requires shared-store rate limiting.
  const key=(req.ip||"unknown")+":"+req.path;
  const now=Date.now();
  if(attempts.size>5000){
    for(const [id,value] of attempts) if(now-value.start>=WINDOW_MS) attempts.delete(id);
    if(attempts.size>5000) attempts.clear();
  }
  const item=attempts.get(key);
  if(!item||now-item.start>=WINDOW_MS){attempts.set(key,{start:now,count:1});return next();}
  item.count++;
  if(item.count>MAX_ATTEMPTS){
    res.setHeader("Retry-After",String(Math.ceil((WINDOW_MS-(now-item.start))/1000)));
    return res.status(429).json({error:"Too many attempts. Please try again later."});
  }
  next();
}
function requireJsonAndOrigin(req,res,next){
  if(req.get("content-type")?.split(";")[0].trim()!=="application/json")
    return res.status(415).json({error:"JSON content-type required."});
  const origin=req.get("origin");
  if(!origin||origin!==process.env.PUBLIC_ORIGIN)
    return res.status(403).json({error:"Request origin is not allowed."});
  next();
}
async function currentAccount(req){
  const token=cookie(req);
  if(!token) return null;
  const q=await getPool().query(`
    SELECT a.id,a.handle,a.age_group,a.created_at,p.role,p.availability,p.interests
    FROM beta_sessions s
    INNER JOIN accounts a ON a.id=s.account_id
    INNER JOIN account_profiles p ON p.account_id=a.id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND a.status='tester'
  `,[hashSession(token)]);
  return q.rows[0]||null;
}
async function createSession(accountId,res){
  const token=crypto.randomBytes(32).toString("base64url");
  await getPool().query("INSERT INTO beta_sessions(id,account_id,token_hash,expires_at) VALUES ($1,$2,$3,$4)",
    [crypto.randomUUID(),accountId,hashSession(token),new Date(Date.now()+ONE_DAY)]);
  writeCookie(res,token);
}
function accountRouter(){
  const r=express.Router();
  r.use((_req,res,next)=>{
    res.setHeader("Cache-Control","no-store");
    next();
  });
  r.get("/status",(req,res)=>res.json({
    enabled:isOn(),
    mode:isOn()?"private-adult-invite-beta":"disabled",
    youthAccountsEnabled:false,
    messagingEnabled:false,
    paymentEnabled:false
  }));
  r.use((req,res,next)=>{
    if(!isOn()) return res.status(503).json({error:"Real account registration is not available. Use the browser-local demo."});
    next();
  });
  r.use(express.json({limit:"12kb",type:"application/json"}));
  r.post("/signup",rateLimit,requireJsonAndOrigin,async(req,res)=>{
    try{
      const account=normalizeAccount(req.body);
      const profile=normalizeProfile(req.body);
      if(!safeCodeEqual(process.env.BETA_INVITE_CODE,req.body?.inviteCode))
        return res.status(403).json({error:"The invite code is not valid."});
      const passwordHash=await hashPassword(account.password);
      const client=await getPool().connect();
      const id=crypto.randomUUID();
      try{
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO accounts(id,handle,email,password_hash,age_group) VALUES($1,$2,$3,$4,$5)",
          [id,account.handle,account.email,passwordHash,account.ageGroup]
        );
        await client.query(
          "INSERT INTO account_profiles(account_id,role,availability,interests) VALUES($1,$2,$3,$4)",
          [id,profile.role,profile.availability,profile.interests]
        );
        await client.query("COMMIT");
      } catch(error){
        await client.query("ROLLBACK");throw error;
      }finally{client.release();}
      await createSession(id,res);
      res.status(201).json({ok:true,account:{id,handle:account.handle,ageGroup:"18+",...profile}});
    }catch(error){errorMessage(error,res);}
  });
  r.post("/login",rateLimit,requireJsonAndOrigin,async(req,res)=>{
    try{
      const email=typeof req.body?.email==="string"?req.body.email.toLowerCase().trim():"";
      const password=typeof req.body?.password==="string"?req.body.password:"";
      if(email.length>254||password.length>256||!email||!password) return res.status(401).json({error:"Invalid login details."});
      const q=await getPool().query(
        "SELECT id,password_hash FROM accounts WHERE email=$1 AND status='tester'",
        [email]
      );
      // Avoid a fast nonexistent-email path that enables account enumeration.
      const valid=q.rowCount>0
        ? await verifyPassword(password,q.rows[0].password_hash)
        : (await hashPassword(password),false);
      if(!valid) return res.status(401).json({error:"Invalid login details."});
      // Rotate sessions on login; password never returned.
      await getPool().query("DELETE FROM beta_sessions WHERE account_id=$1",[q.rows[0].id]);
      await createSession(q.rows[0].id,res);
      res.json({ok:true});
    }catch(error){errorMessage(error,res);}
  });
  r.get("/me",async(req,res)=>{
    try{
      const account=await currentAccount(req);
      if(!account) return res.status(401).json({error:"Sign in to access your account."});
      res.json({account:publicAccount(account)});
    }catch(error){errorMessage(error,res);}
  });
  r.patch("/profile",rateLimit,requireJsonAndOrigin,async(req,res)=>{
    try{
      const account=await currentAccount(req);
      if(!account) return res.status(401).json({error:"Sign in to access your account."});
      const profile=normalizeProfile(req.body);
      await getPool().query(
        "UPDATE account_profiles SET role=$1,availability=$2,interests=$3,updated_at=now() WHERE account_id=$4",
        [profile.role,profile.availability,profile.interests,account.id]
      );
      res.json({ok:true,profile});
    }catch(error){errorMessage(error,res);}
  });
  r.post("/logout",requireJsonAndOrigin,async(req,res)=>{
    try{
      const token=cookie(req);
      if(token) await getPool().query("DELETE FROM beta_sessions WHERE token_hash=$1",[hashSession(token)]);
      clearCookie(res);
      res.json({ok:true});
    }catch(error){errorMessage(error,res);}
  });
  r.use((_req,res)=>res.status(404).json({error:"Endpoint not found."}));
  return r;
}
module.exports={accountRouter,isOn};
