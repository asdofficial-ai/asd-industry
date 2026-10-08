"use strict";
const { scrypt: scryptCallback, randomBytes, createHash, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(scryptCallback);
const INTERESTS = Object.freeze(["AI","Websites","Apps","Business","Marketing","Design","Finance","Education","Gaming","Content","Agriculture","Other"]);
const ROLES = Object.freeze(["Project leader","Developer","Designer","Marketing","Research","Content","Sales","Business strategy","I want to learn"]);
const AVAILABILITY = Object.freeze(["weekends","evenings","flexible"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE = /^[A-Za-z][A-Za-z0-9_]{2,23}$/;
function text(value) { return typeof value === "string" ? value.trim() : ""; }
function normalizeAccount(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid account details.");
  const handle = text(body.handle);
  const email = text(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const ageGroup = text(body.ageGroup);
  if (!HANDLE.test(handle)) throw new Error("Choose a handle of 3–24 letters, digits or underscores, starting with a letter.");
  if (email.length > 254 || !EMAIL.test(email)) throw new Error("Enter a valid email address.");
  if (password.length < 12 || Buffer.byteLength(password,"utf8") > 256) throw new Error("Choose a password of 12–256 bytes.");
  // A self-selected age band is not age verification. Beta access is adult-only and invite-only.
  if (ageGroup !== "18+") throw new Error("This limited account beta is for adult testers only. Youth accounts are not active.");
  return { handle, email, password, ageGroup };
}
function normalizeProfile(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid profile data.");
  const role = text(body.role);
  const availability = text(body.availability);
  const interests = Array.isArray(body.interests) ? [...new Set(body.interests)] : [];
  if (!ROLES.includes(role) || !AVAILABILITY.includes(availability))
    throw new Error("Choose a valid role and availability.");
  if (interests.length < 1 || interests.length > 8 || !interests.every(i => INTERESTS.includes(i)))
    throw new Error("Choose 1–8 valid interests.");
  return { role, availability, interests };
}
async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const result = await scrypt(password, Buffer.from(salt,"hex"), 64, {N:32768,r:8,p:1,maxmem:64*1024*1024});
  return "scrypt-v1$"+salt+"$"+result.toString("hex");
}
async function verifyPassword(password, saved) {
  if (typeof saved !== "string") return false;
  const parts = saved.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt-v1" || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const proposed = await hashPassword(password,parts[1]);
  return timingSafeEqual(Buffer.from(proposed),Buffer.from(saved));
}
function hashSession(raw) { return createHash("sha256").update(raw).digest("hex"); }
function safeCodeEqual(expected, received) {
  if (typeof expected !== "string" || typeof received !== "string" || !expected || !received) return false;
  const a=createHash("sha256").update(expected).digest();
  const b=createHash("sha256").update(received).digest();
  return timingSafeEqual(a,b);
}
function publicAccount(row) {
  return {id:row.id,handle:row.handle,ageGroup:row.age_group,createdAt:row.created_at,role:row.role,availability:row.availability,interests:row.interests || []};
}
module.exports = {INTERESTS,ROLES,AVAILABILITY,normalizeAccount,normalizeProfile,hashPassword,verifyPassword,hashSession,safeCodeEqual,publicAccount};
