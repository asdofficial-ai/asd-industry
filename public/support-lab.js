"use strict";
/* ASD Industry sample-only human support design. No network, storage, employee or customer accounts. */
(()=>{
 const $=id=>document.getElementById(id);
 const elt=(name,text,cls)=>{const item=document.createElement(name);if(text!==undefined)item.textContent=String(text);if(cls)item.className=cls;return item;};
 const seed=()=>[
 {id:"demo-1",subject:"Example onboarding question",description:"A fictional adult visitor wants guidance using a sample project tool.",alias:"DemoBuilder",status:"open",priority:"normal",assigned:false,notes:[]},
 {id:"demo-2",subject:"Sample project upload issue",description:"In this imaginary request, a tutorial file cannot be added to a test project.",alias:"TestMaker",status:"in_progress",priority:"high",assigned:true,notes:["Example agent confirmed the issue is reproducible."]},
 {id:"demo-3",subject:"Help with fake team invite",description:"A fictional person needs help understanding a sample project invitation.",alias:"SampleCreator",status:"escalated",priority:"high",assigned:true,notes:[]},
 {id:"demo-4",subject:"Example settings guidance",description:"A made-up visitor asks where to find privacy settings in a fictional account.",alias:"PreviewGuest",status:"resolved",priority:"low",assigned:true,notes:[]}
 ];
 let cases=seed(),selected="";
 function page(p){
  if(!["overview","cases","training","policy"].includes(p))return;
  for(const view of document.querySelectorAll(".lab-page"))view.hidden=view.id!=="lab-"+p;
  for(const b of document.querySelectorAll("[data-lab-page]")){
   const on=b.dataset.labPage===p;
   if(b.closest(".support-tabs")){b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on));}
  }
 }
 function button(text,fn,style="secondary"){const b=elt("button",text,style);b.type="button";b.addEventListener("click",fn);return b;}
 function render(){
  const stats=$("lab-stats");stats.replaceChildren();
  for(const [name,n] of [["Example cases",cases.length],["Open",cases.filter(x=>x.status==="open").length],
   ["In progress",cases.filter(x=>x.status==="in_progress").length],["Escalated",cases.filter(x=>x.status==="escalated").length],
   ["Resolved",cases.filter(x=>x.status==="resolved").length]]){
   const item=elt("article",undefined,"stat");item.append(elt("span",name),elt("strong",n));stats.append(item);
  }
  const list=$("lab-case-list");list.replaceChildren();
  for(const c of cases){
   const item=button("",()=>{selected=c.id;render();page("cases");},"case-row"+(selected===c.id?" active":""));
   item.append(elt("strong",c.subject),elt("small",c.alias+" · fictional"));
   const badges=elt("div",undefined,"case-meta");
   badges.append(elt("span",c.status.replaceAll("_"," "),"chip"),elt("span",c.priority,"chip "+(c.priority==="high"?"high":"")));
   if(!c.assigned)badges.append(elt("span","Unclaimed","chip"));
   item.append(badges);list.append(item);
  }
  const detail=$("lab-case-detail");detail.replaceChildren();
  const c=cases.find(x=>x.id===selected);
  if(!c){detail.append(elt("h3","Select a case"),elt("p","Every case here is fictional.","fine"));return;}
  detail.append(elt("span","DEMO / "+c.priority.toUpperCase(),"eyebrow"),elt("h3",c.subject),
   elt("p","Fictional alias: "+c.alias+" · "+c.status.replaceAll("_"," "),"fine"),
   elt("p",c.description));
  if(!c.assigned){
   detail.append(button("Claim fictional case",()=>{c.assigned=true;c.status="in_progress";render();},"primary"));
   return;
  }
  const controls=elt("div",undefined,"case-actions");
  if(c.status==="in_progress")controls.append(button("Escalate example",()=>{c.status="escalated";render();}));
  if(["in_progress","escalated"].includes(c.status))controls.append(button("Mark resolved",()=>{c.status="resolved";render();}));
  if(c.status==="escalated")controls.append(button("Return to progress",()=>{c.status="in_progress";render();}));
  detail.append(controls);
  const form=elt("form",undefined,"internal-form"),label=elt("label","Internal-only demo note");
  const note=elt("textarea");note.required=true;note.minLength=5;note.maxLength=200;note.placeholder="Fictional comment, no private information";note.rows=2;
  label.append(note);
  const submit=elt("button","Save fictional note","soft-button");submit.type="submit";
  form.append(label,submit);
  form.addEventListener("submit",event=>{event.preventDefault();if(!note.reportValidity())return;
    if(/password|private|secret|@|\d{7,}/i.test(note.value)){note.value="";return;}
    c.notes.push(note.value.slice(0,200));render();
  });
  detail.append(form);
  const events=elt("div",undefined,"case-events");events.append(elt("h3","Example internal notes"));
  if(!c.notes.length)events.append(elt("p","No fictional notes yet.","fine"));
  for(const line of c.notes){events.append(elt("p",line,"case-event"));}
  detail.append(events);
 }
 document.addEventListener("click",event=>{const b=event.target.closest("[data-lab-page]");if(b)page(b.dataset.labPage);});
 $("lab-reset").addEventListener("click",()=>{cases=seed();selected="";render();});
 $("lab-create").addEventListener("submit",event=>{
  event.preventDefault();if(!$("lab-create").reportValidity())return;
  const subject=$("lab-subject").value.trim(),description=$("lab-description").value.trim();
  if(/password|secret|@|\d{7,}/i.test(subject+" "+description)){
   $("lab-message").textContent="Do not use contact details, passwords or identifiers in this design demonstration.";return;
  }
  cases.unshift({id:"demo-"+(cases.length+1)+"x",subject,description,alias:"ExampleGuest",status:"open",priority:"normal",assigned:false,notes:[]});
  $("lab-create").reset();$("lab-message").textContent="Fictional case added in memory only.";render();page("cases");
 });
 render();page("overview");
})();