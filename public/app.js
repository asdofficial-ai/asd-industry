/* ASD Industry v0.3 reconstructed browser-local demo.
   NO real registration, live matchmaking, server-side storage, AI, messaging or money movement. */
"use strict";
(() => {
  const STORE_KEY = "asd-industry-v03-demo-session";
  const builders = [
    {id:"SAMPLE-01", nick:"CodeSprout", role:"Developer", interests:["Agriculture","Websites","Apps"], availability:"weekends"},
    {id:"SAMPLE-02", nick:"NovaDesign", role:"Designer", interests:["Apps","Design","Education"], availability:"evenings"},
    {id:"SAMPLE-03", nick:"MarketMind", role:"Marketing", interests:["Business","Agriculture","Marketing"], availability:"flexible"},
    {id:"SAMPLE-04", nick:"DataBloom", role:"Research", interests:["AI","Education","Agriculture"], availability:"weekends"},
    {id:"SAMPLE-05", nick:"PixelPilot", role:"Developer", interests:["AI","Gaming","Apps"], availability:"evenings"},
    {id:"SAMPLE-06", nick:"FreshFrame", role:"Content", interests:["Content","Design","Gaming"], availability:"flexible"},
    {id:"SAMPLE-07", nick:"LaunchLab", role:"Business strategy", interests:["Business","Finance","Apps"], availability:"weekends"},
    {id:"SAMPLE-08", nick:"BrightBridge", role:"Sales", interests:["Education","Marketing","Business"], availability:"evenings"}
  ];
  const views = ["home", "profile", "ideas", "workspace", "chat", "review"];
  const byId = id => document.getElementById(id);
  const node = (tag, className, text) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = String(text);
    return item;
  };
  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) {
        const result = JSON.parse(raw);
        if (result && typeof result === "object") return result;
      }
    } catch (_) { /* storage disabled: in-memory only */ }
    return {entryCompleted:false,profile:null,idea:null,project:null};
  }
  let state = loadState();
  const save = () => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (_) { /* do not transmit browser data anywhere */ }
  };
  const gate = byId("accessGate");
  const siteShell = byId("siteShell");
  function showGate() {
    gate.hidden = false;
    siteShell.hidden = true;
    document.title = "Join ASD Industry · Builder Demo";
    if (location.hash !== "#signup") history.replaceState(null, "", "#signup");
    window.scrollTo({top:0,behavior:"auto"});
  }
  function showSite() {
    gate.hidden = true;
    siteShell.hidden = false;
    document.title = "ASD Industry — Build the Future Together";
  }
  function go(to) {
    if (!state.entryCompleted || !state.profile) { showGate(); return; }
    showSite();
    if (!views.includes(to)) to = "home";
    for (const v of views) byId("view-"+v).classList.toggle("hidden", v !== to);
    for (const button of document.querySelectorAll(".nav-button")) {
      button.classList.toggle("active", button.dataset.nav === to);
    }
    if (location.hash !== "#"+to) history.replaceState(null,"","#"+to);
    window.scrollTo({top:0,behavior:"auto"});
    if (to==="workspace") renderWorkspace();
    if (to==="chat") renderChat();
    if (to==="review") renderRisks();
    if (to==="ideas") renderMatches();
  }
  document.querySelectorAll("[data-nav]").forEach(button =>
    button.addEventListener("click", event => {
      event.preventDefault();
      go(button.dataset.nav);
    })
  );
  window.addEventListener("hashchange", () => go(location.hash.slice(1)));
  // Responsive navigation: visible and operable on touch screens and keyboards.
  const header = document.querySelector(".header");
  const menuToggle = byId("mobileMenuToggle");
  const closeMenu = () => {
    header.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  };
  menuToggle.addEventListener("click", () => {
    const opening = !header.classList.contains("menu-open");
    header.classList.toggle("menu-open", opening);
    menuToggle.setAttribute("aria-expanded", String(opening));
    menuToggle.setAttribute("aria-label", opening ? "Close navigation" : "Open navigation");
  });
  document.querySelectorAll(".top-nav .nav-button").forEach(button => {
    button.addEventListener("click", closeMenu);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && header.classList.contains("menu-open")) {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener("click", event => {
    if (header.classList.contains("menu-open") && !header.contains(event.target)) closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 850) closeMenu();
  });


  function selectedInterests() {
    return [...document.querySelectorAll('input[name="interests"]:checked')].map(e => e.value);
  }
  const profileForm = byId("profileForm");

  // Demo-only access gate. This is not identity verification or real registration.
  const signupForm = byId("signupForm");
  signupForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!signupForm.reportValidity()) return;
    const nick = byId("signupNickname").value.trim();
    const age = byId("signupAge").value;
    if (nick.length < 2 || nick.length > 24 || !["12-14","15-17","18+"].includes(age)) {
      byId("signupStatus").textContent = "Choose a nickname and an age group to enter.";
      return;
    }
    if (!byId("signupAcknowledge").checked) {
      byId("signupStatus").textContent = "Please acknowledge that this is a browser-only demo.";
      return;
    }
    state = {
      entryCompleted:true,
      profile:{id:"ASD-DEMO-0001",nickname:nick,ageGroup:age,role:"",availability:"",interests:[]},
      idea:null,
      project:null
    };
    save();
    // Populate the builder profile page from the entry form.
    byId("nickname").value = nick;
    byId("age").value = age;
    byId("role").value = "";
    byId("availability").value = "";
    document.querySelectorAll('input[name="interests"]').forEach(input=>{input.checked=false;});
    ideaForm.reset();
    byId("ideaStatus").textContent="";
    byId("profileStatus").textContent="Basic demo profile saved. Add interests when you're ready to build a project.";
    byId("signupStatus").textContent="";
    renderMatches();
    renderRisks();
    go("home");
  });
  function leaveDemo() {
    state={entryCompleted:false,profile:null,idea:null,project:null};
    try { sessionStorage.removeItem(STORE_KEY); } catch (_) {}
    signupForm.reset();profileForm.reset();ideaForm.reset();
    byId("chatForm").reset();
    byId("profileStatus").textContent="";
    byId("ideaStatus").textContent="";
    byId("signupStatus").textContent="";
    byId("ideaBuilderStatus").textContent="";
    renderMatches();renderRisks();
    showGate();
  }
  byId("signOut").addEventListener("click", () => {
    if (confirm("Exit and clear all demo profile, project, chat and task data from this tab?")) leaveDemo();
  });

  profileForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!profileForm.reportValidity()) return;
    const nickname = byId("nickname").value.trim();
    const interests = selectedInterests();
    const role=byId("role").value;
    const availability=byId("availability").value;
    const hasAnyProjectPreferences = Boolean(role || availability || interests.length);
    if (nickname.length < 2 || nickname.length > 24 || !["12-14","15-17","18+"].includes(byId("age").value)) {
      byId("profileStatus").textContent = "Choose a nickname and age group.";
      return;
    }
    if (hasAnyProjectPreferences && (!role || !availability || !interests.length)) {
      byId("profileStatus").textContent = "To set your project preferences, choose a role, availability and at least one interest — or leave all three blank until later.";
      return;
    }
    state.profile = {
      id:"ASD-DEMO-0001",
      nickname:nickname,
      ageGroup:byId("age").value,
      interests,
      role,
      availability
    };
    syncIdeaBuilderFromProfile();
    // Profile changes remain local and can be used for subsequent project matches.
    save();
    byId("profileStatus").textContent = "Saved only in this browser tab — "+state.profile.id+".";
    go("ideas");
  });
  if (state.profile) {
    byId("nickname").value = state.profile.nickname || "";
    byId("age").value = state.profile.ageGroup || "";
    byId("role").value = state.profile.role || "";
    byId("availability").value = state.profile.availability || "";
    for (const checkbox of document.querySelectorAll('input[name="interests"]')) {
      checkbox.checked = (state.profile.interests || []).includes(checkbox.value);
    }
    byId("profileStatus").textContent = "Demo nickname saved · "+state.profile.id+". Builder skills are chosen when you start a project.";
  }

  const ideaForm = byId("ideaForm");
  const projectInterestInputs = [...document.querySelectorAll('input[name="ideaInterests"]')];
  function syncIdeaBuilderFromProfile() {
    const profile = state.profile || {};
    byId("ideaRole").value = profile.role || "";
    byId("ideaAvailability").value = profile.availability || "";
    projectInterestInputs.forEach(input => {
      input.checked = Array.isArray(profile.interests) && profile.interests.includes(input.value);
    });
  }
  syncIdeaBuilderFromProfile();
  ideaForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!ideaForm.reportValidity()) return;
    if (!state.profile) {
      byId("ideaStatus").textContent = "Sign up with a nickname first.";
      showGate();
      return;
    }
    const interests = projectInterestInputs.filter(input=>input.checked).map(input=>input.value);
    if(!interests.length) {
      byId("ideaBuilderStatus").textContent = "Please select at least one interest for your project match.";
      byId("ideaInterestChoices").scrollIntoView({block:"center",behavior:"smooth"});
      return;
    }
    byId("ideaBuilderStatus").textContent = "";
    const title = byId("ideaTitleInput").value.trim();
    const description = byId("ideaDescription").value.trim();
    if (title.length < 3 || description.length < 25) {
      byId("ideaStatus").textContent = "Please add a title and describe your idea in more detail.";
      return;
    }
    state.idea = {
      title, description,
      topic:byId("ideaTopic").value,
      neededRole:byId("neededRole").value
    };
    // Builder preferences are asked here, when starting a project, not at signup.
    state.profile.role=byId("ideaRole").value;
    state.profile.availability=byId("ideaAvailability").value;
    state.profile.interests=interests;
    byId("role").value=state.profile.role;
    byId("availability").value=state.profile.availability;
    document.querySelectorAll('input[name="interests"]').forEach(input=>{input.checked=interests.includes(input.value);});
    state.project = null;
    save();
    byId("ideaStatus").textContent = "Idea saved locally. Matches below are fictional examples, not real people.";
    renderMatches();
    renderRisks();
  });
  if (state.idea) {
    byId("ideaTitleInput").value = state.idea.title || "";
    byId("ideaDescription").value = state.idea.description || "";
    byId("ideaTopic").value = state.idea.topic || "";
    byId("neededRole").value = state.idea.neededRole || "";
  }
  function scoredBuilders() {
    if (!state.idea || !state.profile) return [];
    return builders.map(builder => {
      let score = 12;
      if (builder.role === state.idea.neededRole) score += 45;
      if (builder.interests.includes(state.idea.topic)) score += 28;
      const overlaps = builder.interests.filter(i => state.profile.interests.includes(i));
      score += Math.min(12, overlaps.length * 6);
      if (builder.availability === state.profile.availability) score += 7;
      else if (builder.availability === "flexible" || state.profile.availability === "flexible") score += 4;
      return {...builder, score:Math.min(98,score)};
    }).sort((a,b) => b.score-a.score);
  }
  function renderMatches() {
    const target = byId("matchResults");
    target.replaceChildren();
    if (!state.profile || !state.idea) {
      target.append(node("p","muted","Describe your project and add your role, interests and availability here to preview fictional matches."));
      return;
    }
    const matches = scoredBuilders().filter(b=>b.score>=35).slice(0,3);
    target.append(node("p","match-caption","ILLUSTRATIVE COMPATIBILITY · THESE USERS DO NOT EXIST"));
    if (!matches.length) {
      target.append(node("div","match-wait","No strong example match found. The planned 3–6 hour queue and related-team fallback are not active in this prototype."));
      return;
    }
    matches.forEach(builder => {
      const item = node("article","match-item");
      const info = node("div");
      info.append(node("b","",builder.nick+" · sample"));
      info.append(node("small","",builder.role+" · "+builder.interests.join(", ")+" · "+builder.availability));
      item.append(info,node("div","match-score",builder.score+"%"));
      target.append(item);
    });
    target.append(node("p","match-caption","Scores are simple interest/role/availability heuristics. No actual identity, age, trust or safety verification has occurred."));
    const action = node("button","btn btn-accent match-action",state.project ? "Open simulated workspace →" : "Create simulated project team →");
    action.type = "button";
    action.addEventListener("click", () => {
      if (!state.project) {
        state.project = {
          title:state.idea.title,
          description:state.idea.description,
          members:[
            {nick:state.profile.nickname+" (you)",role:state.profile.role,demo:false},
            ...matches.map(b=>({nick:b.nick,role:b.role,demo:true}))
          ],
          tasks:[
            {text:"Agree on the problem we're solving",done:false},
            {text:"Describe a small first prototype",done:false}
          ],
          notes:[],
          messages:[]
        };
        save();
      }
      go("workspace");
    });
    target.append(action);
  }

  function renderWorkspace() {
    const project = state.project;
    byId("workspaceEmpty").classList.toggle("hidden",!!project);
    byId("workspaceContent").classList.toggle("hidden",!project);
    if (!project) return;
    byId("workspaceProjectTitle").textContent = project.title;
    byId("workspaceProjectDescription").textContent = project.description;
    const members = byId("workspaceMembers");
    members.replaceChildren();
    (project.members || []).forEach(member => {
      const line = node("div","member");
      line.append(node("div","avatar",(member.nick || "?").charAt(0).toUpperCase()));
      const info = node("div");
      info.append(node("b","",member.nick));
      info.append(node("small","",member.role+(member.demo?" · fictional example":" · local profile")));
      line.append(info);
      members.append(line);
    });
    renderTasks();
    renderNotes();
  }
  function renderTasks() {
    const project = state.project;
    if (!project) return;
    const target = byId("tasksList");
    target.replaceChildren();
    byId("taskCount").textContent = project.tasks.filter(t=>t.done).length+"/"+project.tasks.length+" DONE";
    if (!project.tasks.length) target.append(node("p","muted","No tasks yet. Add the first one."));
    project.tasks.forEach((task,index) => {
      const row = node("div","task"+(task.done?" done":""));
      const label = node("label");
      const check = node("input"); check.type = "checkbox"; check.checked = !!task.done;
      check.setAttribute("aria-label","Mark task complete: "+task.text);
      check.addEventListener("change", () => {
        task.done=check.checked;save();renderTasks();
      });
      label.append(check,node("span","",task.text));
      const remove = node("button","remove","×");
      remove.type="button"; remove.setAttribute("aria-label","Remove task: "+task.text);
      remove.addEventListener("click",()=>{project.tasks.splice(index,1);save();renderTasks();});
      row.append(label,remove);
      target.append(row);
    });
  }
  byId("taskForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!state.project) return;
    const input = byId("newTask");
    const text = input.value.trim();
    if (!text) return;
    state.project.tasks.push({text,done:false});
    input.value=""; save(); renderTasks();
  });
  function renderNotes() {
    const target = byId("notesList");
    target.replaceChildren();
    if (!state.project) return;
    const notes = state.project.notes || [];
    if (!notes.length) target.append(node("p","muted","Save a decision or progress update. This is a personal demo note—not a shared chat."));
    notes.slice().reverse().forEach(note => {
      const item = node("div","note");
      item.append(node("small","",note.date),node("div","",note.text));
      target.append(item);
    });
  }
  byId("noteForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!state.project) return;
    const input=byId("newNote");
    const text=input.value.trim();
    if (!text) return;
    state.project.notes.push({text,date:new Date().toLocaleString()});
    input.value="";save();renderNotes();
  });


  function renderChat() {
    const p=state.project;
    byId("chatEmpty").classList.toggle("hidden",!!p);
    byId("chatContent").classList.toggle("hidden",!p);
    if (!p) return;
    byId("chatProjectTitle").textContent=p.title+" · Team room";
    const members=byId("chatMembers");
    members.replaceChildren();
    for (const member of (p.members || [])) {
      const line=node("div","member");
      line.append(node("div","avatar",(member.nick || "?").charAt(0).toUpperCase()));
      const info=node("div");
      info.append(node("b","",member.nick));
      info.append(node("small","",member.role+" · "+(member.demo?"fictional sample":"you")));
      line.append(info);members.append(line);
    }
    const list=byId("chatMessages");
    list.replaceChildren();
    const messages=Array.isArray(p.messages) ? p.messages : [];
    if (!messages.length) {
      const empty=node("div","chat-empty-message");
      empty.append(node("b","","Your team room is ready."));
      empty.append(node("span","","Try sending a project update or asking a question. Messages stay in your own browser tab. No one else can read or reply."));
      list.append(empty);
    }
    messages.forEach((msg,index)=>{
      const bubble=node("article","chat-bubble");
      const by=node("div","chat-bubble-by");
      by.append(node("span","",state.profile.nickname+" · you"));
      const remove=node("button","","Delete");
      remove.type="button";remove.setAttribute("aria-label","Delete message "+(index+1));
      remove.addEventListener("click",()=>{
        p.messages.splice(index,1);save();renderChat();
      });
      by.append(remove);
      bubble.append(by,node("p","",msg.text),node("small","",msg.sent));
      list.append(bubble);
    });
    list.scrollTop=list.scrollHeight;
  }
  byId("chatForm").addEventListener("submit", event=>{
    event.preventDefault();
    if (!state.project || !state.profile) { go("ideas"); return; }
    const input=byId("chatMessage");
    const text=input.value.trim();
    if (!text || text.length>500) return;
    if (!Array.isArray(state.project.messages)) state.project.messages=[];
    // Bound browser-tab data. No network request and no fictional replies.
    if (state.project.messages.length>=100) state.project.messages.shift();
    state.project.messages.push({text,sent:new Date().toLocaleString()});
    input.value="";save();renderChat();input.focus();
  });

  function riskAssessment(idea) {
    const combined=(idea.title+" "+idea.description+" "+idea.topic).toLowerCase();
    const result = [
      ["Demand & validation","What evidence shows that people want this? Interview potential users and test a small prototype."],
      ["Scope & execution","Can your team build a small, realistic first version with the time and skills available?"]
    ];
    if (/money|payment|crypto|wallet|investment|loan|bank|transfer|finance|token|forex|trading/.test(combined))
      result.push(["Financial & legal safeguards","Financial activities may be regulated. Do not hold funds or promise returns without professional legal/compliance review."]);
    if (/health|doctor|hospital|medical|diagnos|drug|medicine|patient/.test(combined))
      result.push(["Health & safety","Avoid medical claims or handling patient data without qualified clinical, regulatory and privacy review."]);
    if (/chat|dating|social|message|location|nearby|child|teen|minor|school|student/.test(combined))
      result.push(["Privacy & child safeguarding","Plan age-appropriate moderation, consent, data minimization, reporting and safe communication before involving real people."]);
    if (/ai|model|automati|bot|generat/.test(combined))
      result.push(["AI reliability","Consider inaccurate output, human oversight, content safety and data leakage."]);
    if (/marketplace|shop|sell|seller|delivery|farm|agricultur/.test(combined))
      result.push(["Operations & trust","Consider supplier checks, disputes, delivery, product quality and a manageable pilot."]);
    result.push(["Team agreements","Decide roles, responsibilities, dispute handling and how decisions are recorded. Do not assume the proposed equity split is legally active."]);
    return result;
  }
  function renderRisks() {
    byId("reviewEmpty").classList.toggle("hidden",!!state.idea);
    byId("reviewContent").classList.toggle("hidden",!state.idea);
    const target=byId("riskList");target.replaceChildren();
    if (!state.idea) return;
    riskAssessment(state.idea).forEach(([title,description]) => {
      const item=node("article","risk");
      const heading=node("div","risk-heading");
      heading.append(node("span","risk-badge","CHECK"),node("span","",title));
      item.append(heading,node("p","",description));
      target.append(item);
    });
  }
  byId("resetDemo").addEventListener("click",()=>{
    if (!confirm("Clear your demo profile, project, tasks, group chat and notes, and return to the sign-up screen?")) return;
    leaveDemo();
  });
  renderMatches();
  renderRisks();
  go(location.hash.slice(1));
})();
