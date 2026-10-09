"use strict";
(async()=>{
 const status=document.getElementById("directoryStatus"),area=document.getElementById("directory");
 try{
  const r=await fetch("/api/staff/directory",{credentials:"omit",cache:"no-store"});
  if(!r.ok){status.textContent="Verified employee directory is not available yet.";return;}
  const body=await r.json();
  const people=(body.data||[]).filter(x=>x.badge?.verified===true&&x.badge.type==="verified_human_staff");
  status.textContent=people.length?"Only administrator-verified, opted-in human employees are shown:":"No employees have opted into the verified directory yet.";
  for(const p of people){
   const card=document.createElement("article");card.className="person";
   const name=document.createElement("strong");name.textContent=p.displayName;
   const badge=document.createElement("div");badge.className="tag";badge.textContent=p.badge.label+" · Verified human employee";
   card.append(name,badge);area.append(card);
  }
 }catch(_){status.textContent="Verified employee directory is not available yet.";}
})();