"use strict";
// Browser-based layout smoke test for the existing ASD Industry static demo.
// Run: npm install --no-save playwright && npx playwright install chromium && node tests/mobile-layout.e2e.cjs
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const {setTimeout: sleep}=require("node:timers/promises");
const PORT=3889;
const origin="http://127.0.0.1:"+PORT;
const server=spawn(process.execPath,["server.js"],{
  env:{...process.env,PORT:String(PORT)},
  stdio:["ignore","pipe","pipe"]
});
const messages=[];
server.stdout.on("data",chunk=>messages.push(chunk.toString()));
server.stderr.on("data",chunk=>messages.push(chunk.toString()));
async function waitForServer(){
  for(let i=0;i<70;i++){
    if(server.exitCode!==null) throw Error("server exited early "+messages.join(""));
    try{const res=await fetch(origin+"/health");if(res.ok)return;}catch(_){}
    await sleep(200);
  }
  throw Error("server failed to start "+messages.join(""));
}
async function main(){
  await waitForServer();
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{
    for(const width of [320,360,390,430,600,660,768,1280]){
      const isPhone=width<=660;
      const page=await browser.newPage({viewport:{width,height:800},deviceScaleFactor:1});
      const errors=[];
      page.on("pageerror",e=>errors.push(e.message));
      await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
      await page.evaluate(()=>{
        sessionStorage.setItem("asd-industry-v03-demo-session",JSON.stringify({
          entryCompleted:true,profile:{
            id:"ASD-DEMO-0001",nickname:"SampleBuilder",ageGroup:"18+",email:"test@example.com",
            country:"Nigeria",role:"",availability:"",interests:[]
          },idea:null,project:null
        }));
      });
      await page.reload({waitUntil:"domcontentloaded"});
      const result=await page.evaluate(()=>{
        const rect=selector=>{
          const el=document.querySelector(selector);
          if(!el) throw Error("missing "+selector);
          const r=el.getBoundingClientRect();
          return {x:r.x,y:r.y,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
        };
        const visible=selector=>{
          const el=document.querySelector(selector);
          return el && getComputedStyle(el).display!=="none";
        };
        return {
          viewport:window.innerWidth,
          scrollWidth:document.documentElement.scrollWidth,
          hero:rect("#view-home .hero"),
          copy:rect("#view-home .hero-copy"),
          art:rect("#view-home .hero-art"),
          actions:rect("#view-home .hero-actions"),
          caption:rect("#view-home .hero-caption"),
          process:rect("#view-home .how-section"),
          steps:[...document.querySelectorAll("#view-home .step-card")].map(e=>e.getBoundingClientRect().height),
          toolkit:[...document.querySelectorAll("#view-home .feature-card")].map(e=>e.getBoundingClientRect().height),
          footer:rect(".footer"),
          floatsVisible:visible("#view-home .hero-floats")
        };
      });
      assert.equal(errors.length,0,width+"px JS errors: "+errors.join(", "));
      assert.ok(result.scrollWidth<=width+2,width+"px horizontal scroll "+JSON.stringify(result));
      if(isPhone){
        assert.equal(result.floatsVisible,false,width+"px overlay floats must be hidden");
        assert.ok(result.actions.bottom<=result.caption.top+2,width+"px actions/caption overlap");
        assert.ok(result.copy.bottom<=result.art.top+2,width+"px copy/image overlap");
        assert.ok(result.art.bottom<=result.hero.bottom+2,width+"px art outside hero");
        assert.ok(result.hero.height<850,width+"px hero too tall: "+result.hero.height);
        assert.ok(Math.max(...result.steps)<240,width+"px process cards too tall");
        assert.ok(Math.max(...result.toolkit)<160,width+"px toolkit cards too tall");
      }
      console.log("PASS "+width+"px "+JSON.stringify({
        overflow:result.scrollWidth-width,
        heroHeight:Math.round(result.hero.height),
        stepMax:Math.round(Math.max(...result.steps)),
        toolkitMax:Math.round(Math.max(...result.toolkit))
      }));
      await page.close();
    }
  }finally{await browser.close();}
}
main().then(()=>{server.kill("SIGTERM");process.exit(0);}).catch(e=>{
  console.error(e.stack || e);server.kill("SIGTERM");process.exit(1);
});
