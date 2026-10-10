/* ASD Industry v0.3 reconstructed browser-local demo.
   NO real registration, live matchmaking, server-side storage, AI, messaging or money movement. */
"use strict";
(() => {
  const STORE_KEY = "asd-industry-v03-demo-session";
  // These sample projects are fictional; no actual people or school listings are implied.
  const openProjectExamples = [
    {id:"study-guide",title:"StudyCircle",category:"school",label:"School project",
      summary:"A simple revision hub where classmates can share practice questions and study plans.",
      roles:["Developer","Content writer"],topic:"Education",time:"Weekends",stage:"Idea stage",icon:"SC"},
    {id:"science-fair",title:"Science Fair Planner",category:"school",label:"School project",
      summary:"Help students organize science exhibitions, experiments and project milestones.",
      roles:["Designer","Researcher"],topic:"Education",time:"Flexible",stage:"Planning",icon:"SF"},
    {id:"agrolink",title:"FarmLink",category:"technology",label:"Technology",
      summary:"A prototype that helps local growers share available produce and find nearby buyers.",
      roles:["Developer","Marketing"],topic:"Agriculture",time:"Evenings",stage:"Prototype",icon:"FL"},
    {id:"cleanup",title:"Clean Streets Club",category:"community",label:"Community",
      summary:"An idea for planning neighborhood cleanups and sharing useful recycling tips.",
      roles:["Project planner","Designer"],topic:"Community",time:"Weekends",stage:"Idea stage",icon:"CS"},
    {id:"creator-lab",title:"CreatorLab",category:"creative",label:"Creative",
      summary:"A collaborative collection of short educational videos made with simple editing tools.",
      roles:["Video editor","Content writer"],topic:"Content",time:"Flexible",stage:"Planning",icon:"CL"},
    {id:"coding-buddy",title:"CodeBuddy",category:"technology",label:"Technology",
      summary:"A beginner-friendly space for practicing coding exercises and tracking progress.",
      roles:["Developer","UI/UX designer"],topic:"Apps",time:"Flexible",stage:"Prototype",icon:"CB"},
    {id:"community-map",title:"Local Events Map",category:"community",label:"Community",
      summary:"A community project concept for discovering public workshops, games and events.",
      roles:["Researcher","Developer"],topic:"Websites",time:"Evenings",stage:"Idea stage",icon:"LM"}
  ];
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
  const views = ["home", "profile", "profile-edit", "ideas", "workspace", "chat", "review"];
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
    return {entryCompleted:false,profile:null,idea:null,project:null,sampleProjectInterests:[]};
  }
  let state = loadState();
  const save = () => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (_) { /* do not transmit browser data anywhere */ }
  };
  const gate = byId("accessGate");
  const siteShell = byId("siteShell");
  function setAccessMode(mode) {
    const login=mode==="login";
    byId("signupPanel").hidden=login;
    byId("loginPanel").hidden=!login;
    byId("signupTab").setAttribute("aria-selected",String(!login));
    byId("loginTab").setAttribute("aria-selected",String(login));
    byId("signupTab").classList.toggle("is-active",!login);
    byId("loginTab").classList.toggle("is-active",login);
    document.title=(login ? "Log in · Coming Soon" : "Join ASD Industry") + " · Builder Demo";
    if (location.hash !== (login?"#login":"#signup")) history.replaceState(null, "", login?"#login":"#signup");
  }
  function showGate(mode) {
    gate.hidden = false;
    siteShell.hidden = true;
    setAccessMode(mode==="login" || (!mode && location.hash==="#login")?"login":"signup");
    window.scrollTo({top:0,behavior:"auto"});
  }
  byId("signupTab").addEventListener("click",()=>setAccessMode("signup"));
  byId("loginTab").addEventListener("click",()=>setAccessMode("login"));
  byId("loginToSignup").addEventListener("click",()=>setAccessMode("signup"));
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
    if (to==="ideas") { renderMatches(); renderOpenProjects(); }
    if (to==="profile") renderBuilderProfile();
    if (to==="profile-edit") syncProfileEditor();
  }
  document.querySelectorAll("[data-nav]").forEach(button =>
    button.addEventListener("click", event => {
      event.preventDefault();
      go(button.dataset.nav);
    })
  );
  window.addEventListener("hashchange", () => {
    if (!state.entryCompleted && ["login","signup"].includes(location.hash.slice(1))) showGate(location.hash.slice(1));
    else go(location.hash.slice(1));
  });
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
  let pendingAvatarImage=""; // Editor changes are committed only by Save changes.
  // Uploaded image or a neutral initial-only fallback; no preset color selection.
  const skillCheckboxes = [...document.querySelectorAll('input[name="skills"]')];
  const maxSkills = 8;
  const deriveHandle = nickname => {
    const handle = String(nickname || "").normalize("NFKD").toLowerCase()
      .replace(/[^a-z0-9._]+/g,".").replace(/^[._]+|[._]+$/g,"").slice(0,22);
    return handle.length >= 3 ? handle : "builder.demo";
  };
  function normalizeProfileExtras() {
    const p = state.profile;
    if (!p) return;
    if (typeof p.handle !== "string" || !/^[a-z0-9._]{3,22}$/.test(p.handle)) p.handle=deriveHandle(p.nickname);
    if (typeof p.bio !== "string") p.bio="";
    if (!Array.isArray(p.skills)) p.skills=[];
    if (!Array.isArray(p.completedProjects)) p.completedProjects=[];
    p.avatarStyle="neutral"; // Legacy demo preset colors are retired.
    if (typeof p.avatarImage !== "string" || !p.avatarImage.startsWith("data:image/")) p.avatarImage="";
    if (!Number.isFinite(p.ideasExplored)) p.ideasExplored=state.idea?1:0;
  }
  function renderBuilderProfile() {
    normalizeProfileExtras();
    const p = state.profile || {};
    const name = p.nickname || "Builder";
    byId("profileDisplayName").textContent=name;
    byId("profileDisplayHandle").textContent="@"+(p.handle || "builder");
    byId("profileDisplayCountry").textContent=p.country || "Country not selected";
    byId("profileDisplayAge").textContent=p.ageGroup ? p.ageGroup+" years" : "Age group pending";
    byId("profileDisplayBio").textContent=p.bio || "Your story starts here. Add a short introduction about what you'd like to build.";
    const avatar = byId("profilePreviewAvatar");
    avatar.dataset.avatarStyle="neutral";
    byId("profileAvatarInitial").textContent=name.charAt(0).toUpperCase();
    const img=byId("profilePreviewImage");
    const hasImage=Boolean(p.avatarImage);
    img.hidden=!hasImage;
    if (hasImage) img.src=p.avatarImage;
    else img.removeAttribute("src");
    byId("profileAvatarInitial").hidden=hasImage;
    // The edit screen has its own staged picture preview.

    const completed=Array.isArray(p.completedProjects)?p.completedProjects:[];
    const skills=Array.isArray(p.skills)?p.skills:[];
    byId("profileStatsIdeas").textContent=String(Math.max(Number(p.ideasExplored)||0,state.idea?1:0));
    byId("profileStatsCompleted").textContent=String(completed.length);
    byId("profileStatsSkills").textContent=String(skills.length);
    byId("profileStatsVerification").textContent="Pending";
    function chips(targetId, values, fallback) {
      const target=byId(targetId);
      target.replaceChildren();
      if (!values.length) { target.append(node("span","profile-empty-inline",fallback));return; }
      values.forEach(value=>target.append(node("span","profile-skill-chip",value)));
    }
    chips("profilePreviewSkills",skills,"No skills listed yet.");
    chips("profilePreviewInterests",Array.isArray(p.interests)?p.interests:[],"Choose interests when you start a project.");
    const history=byId("profileProjectHistory");
    history.replaceChildren();
    if (!completed.length) {
      history.append(node("p","profile-history-empty","No completed demo projects yet. Build a project and mark it complete in your workspace to see it here."));
    } else {
      completed.forEach((item,index) => {
        const row=node("div","profile-project-entry");
        row.append(node("span","profile-project-icon","✓"));
        const details=node("div","profile-project-details");
        details.append(node("strong","",item.title || "Untitled project"));
        const date=item.completedAt && !Number.isNaN(Date.parse(item.completedAt))
          ? new Date(item.completedAt).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})
          : "In this demo";
        details.append(node("small","",date+" · Self-marked complete · Local only"));
        row.append(details);history.append(row);
      });
    }
  }
  function updateSkillStatus() {
    const count=skillCheckboxes.filter(cb=>cb.checked).length;
    byId("skillsStatus").textContent=count ? count+" of "+maxSkills+" skills selected" : "No skills selected yet.";
  }
  function renderEditAvatar() {
    const hasImage=Boolean(pendingAvatarImage);
    byId("editAvatarInitial").textContent=(byId("nickname").value||state.profile?.nickname||"B").charAt(0).toUpperCase();
    byId("editAvatarInitial").hidden=hasImage;
    const image=byId("editAvatarImage");
    image.hidden=!hasImage;
    if (hasImage) image.src=pendingAvatarImage;
    else image.removeAttribute("src");
  }
  function syncProfileEditor() {
    normalizeProfileExtras();
    const p=state.profile || {};
    pendingAvatarImage=p.avatarImage || "";
    byId("nickname").value=p.nickname || "";
    byId("age").value=p.ageGroup || "";
    byId("email").value=p.email || "";
    byId("country").value=p.country || "";
    byId("handle").value=p.handle || deriveHandle(p.nickname);
    byId("profileBioInput").value=p.bio || "";
    byId("profileBioCount").textContent=byId("profileBioInput").value.length+" / 180";
    byId("role").value=p.role || "";
    byId("availability").value=p.availability || "";
    document.querySelectorAll('input[name="interests"]').forEach(input => {
      input.checked=Array.isArray(p.interests) && p.interests.includes(input.value);
    });
    skillCheckboxes.forEach(input=>{input.checked=Array.isArray(p.skills) && p.skills.includes(input.value);});
    updateSkillStatus();renderBuilderProfile();renderEditAvatar();
  }
  byId("editProfileJump").addEventListener("click",()=>go("profile-edit"));
  byId("backToProfile").addEventListener("click",()=>go("profile"));
  byId("cancelProfileEdit").addEventListener("click",()=>go("profile"));
  byId("profileBioInput").addEventListener("input",()=>{
    byId("profileBioCount").textContent=byId("profileBioInput").value.length+" / 180";
  });
  skillCheckboxes.forEach(input=>input.addEventListener("change",()=>{
    const count=skillCheckboxes.filter(cb=>cb.checked).length;
    if(count>maxSkills) {
      input.checked=false;
      byId("skillsStatus").textContent="Maximum of "+maxSkills+" skills. Deselect one to add another.";
      return;
    }
    updateSkillStatus();
  }));
  byId("avatarRemove").addEventListener("click",()=>{
    if (!state.profile) return;
    pendingAvatarImage="";
    byId("avatarUpload").value="";
    byId("avatarStatus").textContent="Picture removal ready · Save changes to confirm.";
    renderEditAvatar();
  });
  byId("avatarChooseButton").addEventListener("click",()=>byId("avatarUpload").click());
  byId("handle").addEventListener("blur",()=>{
    byId("handle").value=byId("handle").value.trim().replace(/^@/,"").toLowerCase();
  });
  byId("avatarUpload").addEventListener("change",event=>{
    const file=event.target.files && event.target.files[0];
    event.target.value="";
    if(!state.profile || !file) return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>3*1024*1024) {
      byId("avatarStatus").textContent="Use a PNG, JPG or WebP image smaller than 3 MB.";
      return;
    }
    const owner=state.profile;
    // Convert the selected file locally to a data URL permitted by our strict image CSP.
    const reader=new FileReader();
    const image=new Image();
    image.onload=()=>{
      if (state.profile !== owner) return; // Prevent photo leaks across a reset or new demo session.
      try {
        const canvas=document.createElement("canvas");
        canvas.width=160;canvas.height=160;
        const ctx=canvas.getContext("2d");
        if(!ctx) throw Error("Canvas unavailable");
        const side=Math.min(image.naturalWidth,image.naturalHeight);
        if(!side) throw Error("Image has no dimensions");
        const sx=(image.naturalWidth-side)/2,sy=(image.naturalHeight-side)/2;
        ctx.drawImage(image,sx,sy,side,side,0,0,160,160);
        const url=canvas.toDataURL("image/webp",0.72);
        if(!url.startsWith("data:image/") || url.length>200000) throw Error("Preview too large");
        pendingAvatarImage=url;
        renderEditAvatar();
        byId("avatarStatus").textContent="Picture ready · compressed to 160px. Save changes to keep it in this tab.";
      } catch (_) {byId("avatarStatus").textContent="This picture could not be processed. Try another PNG or JPG."; }
    };
    image.onerror=()=>{
      byId("avatarStatus").textContent="Could not read that picture. Please try a valid PNG or JPG.";
    };
    reader.onload=()=>{
      if (state.profile !== owner) return;
      image.src=String(reader.result || "");
    };
    reader.onerror=()=>{
      byId("avatarStatus").textContent="Could not read that file. Please try a different picture.";
    };
    reader.readAsDataURL(file);
  });

  // No verification email is sent; the UI always reflects the actual unverified demo state.
  function renderEmailVerification() {
    const hasEmail = Boolean(state.profile && state.profile.email);
    byId("emailVerificationBadge").textContent = "UNVERIFIED";
    byId("emailVerificationMessage").textContent = hasEmail
      ? "Not verified yet. Email verification will be available later; no email has been sent."
      : "Add an email address to your profile. Verification will be available later.";
  }
  function readContactDetails(emailId, countryId) {
    const email = byId(emailId).value.trim().toLowerCase();
    const countryInput = byId(countryId);
    const country = window.ASDCountryPicker?.canonicalize(countryInput.value) || "";
    countryInput.setCustomValidity(country ? "" : "Choose a country from the A–Z list or type its full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !country) {
      if (!country) countryInput.reportValidity();
      return null;
    }
    countryInput.value = country;
    return {email, country};
  }

  // Demo-only access gate. This is not identity verification or real registration.
  const signupForm = byId("signupForm");
  signupForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!signupForm.reportValidity()) return;
    const nick = byId("signupNickname").value.trim();
    const age = byId("signupAge").value;
    const contact = readContactDetails("signupEmail", "signupCountry");
    if (nick.length < 2 || nick.length > 24 || !["12-14","15-17","18+"].includes(age) || !contact) {
      byId("signupStatus").textContent = "Enter a nickname, age group, valid email and country to enter.";
      return;
    }
    if (!byId("signupAcknowledge").checked) {
      byId("signupStatus").textContent = "Please acknowledge that this is a browser-only demo.";
      return;
    }
    state = {
      entryCompleted:true,
      profile:{id:"ASD-DEMO-0001",nickname:nick,ageGroup:age,email:contact.email,country:contact.country,
        handle:deriveHandle(nick),bio:"",avatarStyle:"neutral",avatarImage:"",skills:[],completedProjects:[],ideasExplored:0,
        role:"",availability:"",interests:[]},
      idea:null,
      project:null,
      sampleProjectInterests:[]
    };
    save();
    // Populate the new builder editor with the demo's local identity.
    profileForm.reset();
    syncProfileEditor();
    renderEmailVerification();
    ideaForm.reset();
    byId("ideaStatus").textContent="";
    byId("profileStatus").textContent="Basic demo profile saved. Add interests when you're ready to build a project.";
    byId("signupStatus").textContent="";
    renderMatches();
    renderRisks();
    go("home");
  });
  function leaveDemo() {
    state={entryCompleted:false,profile:null,idea:null,project:null,sampleProjectInterests:[]};
    try { sessionStorage.removeItem(STORE_KEY); } catch (_) {}
    signupForm.reset();profileForm.reset();ideaForm.reset();
    byId("avatarUpload").value="";
    byId("avatarStatus").textContent="Upload a picture from your device or keep the initials icon. Avoid identifiable photos of minors.";
    syncProfileEditor();
    renderEmailVerification();
    byId("chatForm").reset();
    byId("profileStatus").textContent="";
    byId("ideaStatus").textContent="";
    byId("signupStatus").textContent="";
    byId("ideaBuilderStatus").textContent="";
    renderMatches();renderRisks();
    showGate();
  }
  const logOutDemo = () => {
    if (confirm("Log out and clear this tab's demo profile, projects and messages? This preview cannot log you back in yet.")) {
      leaveDemo();
      setAccessMode("login");
    }
  };
  byId("signOut").addEventListener("click", logOutDemo);
  byId("profileLogout").addEventListener("click", logOutDemo);

  profileForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!profileForm.reportValidity()) return;
    const nickname=byId("nickname").value.trim();
    const handle=byId("handle").value.trim().toLowerCase();
    const bio=byId("profileBioInput").value.trim();
    const skills=skillCheckboxes.filter(input=>input.checked).map(input=>input.value);
    const interests=selectedInterests();
    const contact=readContactDetails("email","country");
    if (!state.profile || nickname.length<2 || nickname.length>24 ||
        !/^[a-z0-9._]{3,22}$/.test(handle) || bio.length>180 ||
        !["12-14","15-17","18+"].includes(byId("age").value) || !contact) {
      byId("profileStatus").textContent="Please check your nickname, username, email and country.";
      return;
    }
    if (skills.length>maxSkills) {
      byId("profileStatus").textContent="Choose no more than "+maxSkills+" skills.";
      return;
    }
    state.profile={
      ...state.profile,
      nickname,
      handle,
      bio,
      ageGroup:byId("age").value,
      email:contact.email,
      country:contact.country,
      avatarImage:pendingAvatarImage,
      skills,
      interests,
      role:byId("role").value,
      availability:byId("availability").value
    };
    // Editing the profile must not erase locally completed projects or avatar data.
    if (state.project && Array.isArray(state.project.members)) {
      const me=state.project.members.find(member=>!member.demo);
      if (me) {me.nick=nickname+" (you)";me.role=state.profile.role || "Project builder";}
    }
    syncIdeaBuilderFromProfile();
    save();
    renderEmailVerification();
    renderBuilderProfile();
    byId("profileStatus").textContent="Changes saved in this browser tab. Email remains unverified.";
    byId("profileNotice").textContent="✓ Your profile changes are saved in this browser tab.";
    go("profile");
  });
  syncProfileEditor();
  renderEmailVerification();

  // Browse fictional opportunities to collaborate. Bookmarking does not contact anyone.
  function savedProjectInterests() {
    if (!Array.isArray(state.sampleProjectInterests)) state.sampleProjectInterests=[];
    state.sampleProjectInterests=state.sampleProjectInterests.filter(id=>openProjectExamples.some(item=>item.id===id));
    return state.sampleProjectInterests;
  }
  const browseProjectsList=byId("openProjectsList");
  const browseSearch=byId("projectBrowseSearch");
  const browseCategory=byId("projectBrowseCategory");
  function renderOpenProjects() {
    const term=browseSearch.value.trim().toLowerCase();
    const category=browseCategory.value;
    const items=openProjectExamples.filter(project=>{
      if(category!=="all" && project.category!==category) return false;
      const keywords=[project.title,project.label,project.summary,project.topic,...project.roles].join(" ").toLowerCase();
      return keywords.includes(term);
    });
    browseProjectsList.replaceChildren();
    byId("openProjectsCount").textContent=items.length+" example project"+(items.length===1?"":"s");
    const interested=savedProjectInterests();
    if (!items.length) {
      const empty=node("div","open-projects-empty");
      empty.append(node("b","","No projects match that search."));
      empty.append(node("p","","Try another keyword or choose All projects."));
      browseProjectsList.append(empty);
      return;
    }
    // Your own idea remains visible only in your local browser, never published to others.
    if (state.idea && (category==="all" || category==="technology" || category==="school" || category==="community" || category==="creative")) {
      const ownTitle=String(state.idea.title || "Your idea");
      const ownDescription=String(state.idea.description || "");
      if(category==="all" && (!term || (ownTitle+" "+ownDescription).toLowerCase().includes(term))) {
        const ownCard=node("article","open-project-card own-project-card");
        const ownHead=node("div","open-project-card-top");
        ownHead.append(node("span","open-project-tag local","YOUR PRIVATE DRAFT"));
        ownHead.append(node("span","open-project-stage","ONLY YOU SEE THIS"));
        ownCard.append(ownHead,node("h3","open-project-title",ownTitle));
        ownCard.append(node("p","open-project-description",ownDescription));
        ownCard.append(node("p","open-project-needs","Looking for: "+(state.idea.neededRole || "teammates")));
        const review=node("button","btn btn-accent open-project-interest","Preview sample matches →");
        review.type="button";
        review.addEventListener("click",()=>byId("matchingPanel").scrollIntoView({behavior:"smooth",block:"center"}));
        ownCard.append(node("p","open-project-card-note","Not a public listing. Others cannot discover this draft."),review);
        browseProjectsList.append(ownCard);
      }
    }
    items.forEach(project=>{
      const card=node("article","open-project-card");
      card.dataset.projectId=project.id;
      const header=node("div","open-project-card-top");
      header.append(node("span","open-project-tag",project.label));
      header.append(node("span","open-project-stage",project.stage));
      card.append(header);
      const titleRow=node("div","open-project-title-row");
      titleRow.append(node("span","open-project-monogram",project.icon),node("h3","open-project-title",project.title));
      card.append(titleRow,node("p","open-project-description",project.summary));
      card.append(node("p","open-project-needs-label","HELP WANTED · EXAMPLE"));
      const roles=node("div","open-project-role-tags");
      project.roles.forEach(role=>roles.append(node("span","open-project-role",role)));
      card.append(roles);
      const footer=node("div","open-project-info");
      footer.append(node("span","",project.topic),node("span","","·"),node("span","",project.time));
      card.append(footer);
      const selected=interested.includes(project.id);
      const button=node("button","open-project-interest"+(selected?" interested":""),selected?"✓ Interest saved":"I'm interested →");
      button.type="button";
      button.setAttribute("aria-pressed",String(selected));
      button.setAttribute("aria-label",(selected?"Remove interest in ":"Save interest in ")+project.title+" example project");
      button.addEventListener("click",()=>{
        const current=savedProjectInterests();
        if (current.includes(project.id)) {
          state.sampleProjectInterests=current.filter(id=>id!==project.id);
          byId("openProjectsStatus").textContent="Removed "+project.title+" from your private example interests. No one was contacted.";
        } else {
          state.sampleProjectInterests=[...current,project.id];
          byId("openProjectsStatus").textContent="Interest saved in "+project.title+" · demo only. This is NOT a real join request.";
        }
        save();
        renderOpenProjects();
      });
      card.append(button,node("p","open-project-card-note","Fictional sample · No real join requests"));
      browseProjectsList.append(card);
    });
  }
  browseSearch.addEventListener("input",()=>{
    byId("openProjectsStatus").textContent="";
    renderOpenProjects();
    browseProjectsList.scrollLeft=0;
  });
  browseCategory.addEventListener("change",()=>{
    byId("openProjectsStatus").textContent="";
    renderOpenProjects();
    browseProjectsList.scrollLeft=0;
  });
  byId("postProjectJump").addEventListener("click",()=>{
    byId("ideaForm").scrollIntoView({behavior:"smooth",block:"start"});
  });
  byId("projectsScrollBack").addEventListener("click",()=>{
    browseProjectsList.scrollBy({left:-Math.max(240,browseProjectsList.clientWidth*.82),behavior:"smooth"});
  });
  byId("projectsScrollForward").addEventListener("click",()=>{
    browseProjectsList.scrollBy({left:Math.max(240,browseProjectsList.clientWidth*.82),behavior:"smooth"});
  });
  renderOpenProjects();

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
    if (!state.idea || state.idea.title!==title || state.idea.description!==description ||
        state.idea.topic!==byId("ideaTopic").value) {
      state.profile.ideasExplored=(Number(state.profile.ideasExplored)||0)+1;
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
    renderOpenProjects();
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
          topic:state.idea.topic,
          completed:false,
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
    byId("workspaceProjectBadge").textContent=project.completed ? "✓ COMPLETED · DEMO" : "● IN PROGRESS";
    byId("workspaceProjectBadge").dataset.completed=String(Boolean(project.completed));
    byId("completeDemoProject").textContent=project.completed ? "✓ Completed (demo)" : "✓ Mark project complete";
    byId("completeDemoProject").disabled=Boolean(project.completed);
    const members = byId("workspaceMembers");
    members.replaceChildren();
    (project.members || []).forEach(member => {
      const line = node("div","member");
      const avatar=node("div","avatar",(member.nick || "?").charAt(0).toUpperCase());
      if (!member.demo && state.profile) {
        avatar.dataset.avatarStyle="neutral";
        if (state.profile.avatarImage) {
          const photo=node("img","member-avatar-image");
          photo.src=state.profile.avatarImage;
          photo.alt="";
          avatar.replaceChildren(photo);
        }
      }
      line.append(avatar);
      const info = node("div");
      info.append(node("b","",member.nick));
      info.append(node("small","",member.role+(member.demo?" · fictional example":" · local profile")));
      line.append(info);
      members.append(line);
    });
    renderTasks();
    renderNotes();
  }
  byId("completeDemoProject").addEventListener("click",()=>{
    if (!state.project || state.project.completed || !state.profile) return;
    if (!confirm("Mark this demo project as completed? It will appear in your private profile history as self-marked, not verified.")) return;
    normalizeProfileExtras();
    const date=new Date().toISOString();
    state.project.completed=true;
    state.project.completedAt=date;
    state.profile.completedProjects.unshift({
      title:state.project.title,
      topic:state.project.topic || "Project",
      completedAt:date
    });
    state.profile.completedProjects=state.profile.completedProjects.slice(0,20);
    save();
    renderWorkspace();
    renderBuilderProfile();
  });
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
