/* ═══ الواجهة التعليمية ═══ المرحلة ١ — js/learn/*
   المشروعُ نفسُه يصير الدرس: خريطةُ سبع محطّات، ثم مدرّبٌ صغير أسفل
   اللوحة يقول جملةً واحدة، ويُضيء الزرّ المطلوب، ويرسم «شبحاً» حيث
   تُنقر النقطة. المتعلّمُ يرسم بالأدوات الحقيقية في صندوق رمل
   (learn/sandbox.js) فلا يُمسّ مشروعُه، والتقدّمُ نجومٌ في UIS.learn.

   لا سمةَ style في القوالب (CSP): المواضعُ تُضبط من JS بعد البناء. */
import * as R from "../tools/registry.js";
import {S} from "../core/state.js";
import {cv,V,W2S,fitBox,setSel,draw} from "./canvas.js";
import {UIS,saveUI} from "./store.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";
import {LEVELS,lessonOf,levelOpen,nextLesson,levelOfLesson} from "../learn/lessons.js";
import {runAct,actPoint,setUiRunner} from "../learn/acts.js";
import {buildCards,searchAll,statsOf,isCard} from "../learn/cards.js";
import {certSVG} from "../learn/cert.js";
import {createRunner} from "../learn/runner.js";
import {enterSandbox,exitSandbox,inSandbox,setupOk,sandboxLog} from "../learn/sandbox.js";

/* ═══ المرحلة ٦: أفعالُ النوافذ ═══ «شاهدني» يفتح النافذة بالمسار نفسِه الذي
   يمرّ به زرُّ الشريط (runSpec)، وينقر زرَّها كما تنقره اليد */
let V3MOVED=false;
/* المرحلة ٧: رسائلُ الواجهة (التصدير · الفاحص) تمرّ بـHOOK.report لا بسجلّ
   الأدوات — تُلتقط أثناء الدرس وحده وتعود الدالّةُ كما كانت بعده */
let UILOG=[], REP0=null;
function hookReport(on){
 if(on&&!REP0){REP0=HOOK.report; HOOK.report=(c,m)=>{UILOG.push(String(m||"")); if(UILOG.length>40)UILOG.shift(); return REP0(c,m)}}
 else if(!on&&REP0){HOOK.report=REP0; REP0=null}
}
setUiRunner(a=>{
 if(a.act){import("./ribbon/wire.js").then(W=>W.runSpec({act:a.act})).catch(()=>{}); return true}
 if(a.click){
  const e=document.querySelector(a.click); if(!e)return false;
  try{e.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}))}catch(x){}
  e.click(); return true;
 }
 return false;
});
if(typeof document!=="undefined")document.addEventListener("pointerdown",e=>{
 if(RUN&&e.target&&e.target.closest&&e.target.closest(".v3 canvas"))V3MOVED=true;
},true);
const visible=sel=>{const e=document.querySelector(sel); if(!e)return false; const r=e.getBoundingClientRect(); return r.width>0&&r.height>0};

const NS="http://www.w3.org/2000/svg";
const AR=n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[+d]);
let MAP=null, COACH=null, SPOT=null, GHOST=null, CUR=null, WATCH=0;
let OPENLV=0;            /* المحطّةُ المفتوحةُ قائمتُها في الخريطة · 8 = البطاقات */
let CARDS=null, QUERY="", CERTURL="";
/* المرحلة ٨: البطاقاتُ تُبنى من سجلّ الأدوات عند أوّل فتحٍ للخريطة */
const cards=()=>CARDS||(CARDS=buildCards(R.toolList()));
const anyLesson=id=>lessonOf(id)||cards().find(c=>c.id===id)||null;
let RUN=null, TIMER=0, LES=null, STEPK=-1;
const now=()=>(typeof performance!=="undefined"?performance.now():Date.now());

/* ═══ البناء — مرّةً واحدة ═══ */
function el(tag,id,cls){
 const e=document.createElement(tag);
 if(id)e.id=id; if(cls)e.className=cls;
 return e;
}
function build(){
 if(MAP)return;
 MAP=el("section","learnMap"); MAP.hidden=true;
 MAP.setAttribute("role","dialog"); MAP.setAttribute("aria-modal","true");
 MAP.setAttribute("aria-label","الواجهة التعليمية");
 MAP.addEventListener("click",onMap);
 MAP.addEventListener("keydown",e=>{
  if(e.key==="Escape"){e.stopPropagation(); if(QUERY&&e.target.id==="lmQ"){QUERY=""; e.target.value=""; renderResults(); return} closeMap(); return}
  /* المرحلة ٨: الأسهمُ تتنقّل بين أزرار الخريطة — المحطّاتُ ودروسُها ونتائجُ البحث */
  if((e.key==="ArrowDown"||e.key==="ArrowUp")&&e.target.id!=="lmQ"||(e.key==="ArrowDown"&&e.target.id==="lmQ")){
   const L=[...MAP.querySelectorAll(".lmPath:not([hidden]) button:not([disabled]),.lmRes button")];
   const i=L.indexOf(document.activeElement);
   const j=e.key==="ArrowDown"?Math.min(L.length-1,i+1):Math.max(0,i-1);
   if(L[j]){e.preventDefault(); L[j].focus()}
  }
 });
 MAP.addEventListener("input",e=>{if(e.target.id==="lmQ"){QUERY=e.target.value; renderResults()}});
 COACH=el("aside","learnCoach"); COACH.hidden=true;
 COACH.setAttribute("aria-label","المدرّب"); COACH.setAttribute("role","region");
 COACH.addEventListener("click",onCoach);
 SPOT=el("div","learnSpot"); SPOT.hidden=true; SPOT.setAttribute("aria-hidden","true");
 GHOST=document.createElementNS(NS,"svg"); GHOST.id="learnGhost";
 GHOST.setAttribute("aria-hidden","true"); GHOST.setAttribute("hidden","");
 CUR=el("div","learnCur"); CUR.hidden=true; CUR.setAttribute("aria-hidden","true");
 document.body.append(MAP,COACH,SPOT,GHOST,CUR);
}

/* ═══ الخريطة ═══ */
const prog=()=>UIS.learn||(UIS.learn={});
const starsOf=id=>((prog()[id]||{}).stars|0);
const starRow=n=>`<span class="lmStars" aria-label="${AR(n)} من ٣ نجوم">`
 +[1,2,3].map(i=>`<i class="${i<=n?"on":""}"></i>`).join("")+`</span>`;
const lessonBtn=l=>`<li><button type="button" data-ls="${esc(l.id)}">
     <span><b>${esc(l.title)}${l.extra?` <em class="lmTag">إضافي</em>`:""}${l.capstone?` <em class="lmTag cap">ختامي</em>`:""}</b><small>${esc(l.goal)}${l.card?"":` · ${AR(l.min)} د`}</small></span>${l.card?(starsOf(l.id)?`<span class="lmOk" aria-label="جُرّبت">✓</span>`:""):starRow(starsOf(l.id))}</button></li>`;
function renderMap(){
 const P=prog(), C=cards(), ST=statsOf(P,null,C);
 const nodes=LEVELS.map(L=>{
  const open=levelOpen(L.n,P);
  const les=L.lessons.map(lessonOf).filter(Boolean);
  const got=les.reduce((a,l)=>a+starsOf(l.id),0);
  const all=les.length&&les.filter(l=>!l.extra).every(l=>starsOf(l.id)>0);
  const st=!open?"lock":(all?"done":"open");
  const sub=open?`${AR(les.length)} دروس · ${AR(got)} من ${AR(les.length*3)} نجوم`:"أكمل المحطّة السابقة";
  const exp=open&&OPENLV===L.n;
  const list=exp?`<ul class="lmLessons">${les.map(lessonBtn).join("")}</ul>`:"";
  return `<li class="lmNode ${st}${exp?" exp":""}">
   <button type="button" data-lv="${L.n}" ${open?"":"disabled"} aria-expanded="${exp?"true":"false"}" aria-label="المحطّة ${AR(L.n)}: ${esc(L.title)}${open?"":" (مقفلة)"}">
    <span class="lmNum">${AR(L.n)}</span>
    <span class="lmTxt"><b>${esc(L.title)}</b><small>${sub}</small></span>
    ${open?`<span class="lmChev" aria-hidden="true"></span>`:`<span class="lmLock">مقفلة</span>`}
   </button>${list}</li>`;
 }).join("");
 const cexp=OPENLV===8;
 const cardNode=`<li class="lmNode open cards${cexp?" exp":""}">
   <button type="button" data-lv="8" aria-expanded="${cexp?"true":"false"}" aria-label="بطاقات الأدوات">
    <span class="lmNum">✦</span>
    <span class="lmTxt"><b>بطاقات الأدوات</b><small>${AR(C.length)} أداة بلا درس · جرّبت ${AR(ST.cards)}</small></span>
    <span class="lmChev" aria-hidden="true"></span>
   </button>${cexp?`<ul class="lmLessons">${C.map(lessonBtn).join("")}</ul>`:""}</li>`;
 MAP.innerHTML=`<div class="lmCard">
  <header class="lmHead">
   <div><p class="lmEye">الواجهة التعليمية</p>
    <h2>من الصفر إلى الاحتراف</h2>
    <p class="lmSub">ترسم بأدوات البرنامج نفسها، ومشروعك محفوظٌ جانباً حتى تعود.</p></div>
   <button type="button" class="lmX" data-l="close" aria-label="إغلاق">✕</button>
  </header>
  <dl class="lmStats">
   <div><dt>دروس</dt><dd>${AR(ST.lessons)}<small>/${AR(ST.lessonsTotal)}</small></dd></div>
   <div><dt>نجوم</dt><dd>${AR(ST.stars)}<small>/${AR(ST.starsTotal)}</small></dd></div>
   <div><dt>بطاقات</dt><dd>${AR(ST.cards)}<small>/${AR(ST.cardsTotal)}</small></dd></div>
   <div><dt>وقت</dt><dd>${AR(ST.mins)}<small> د</small></dd></div>
  </dl>
  <label class="lmSearch"><span class="sr">ابحث في الدروس والأدوات</span>
   <input type="search" id="lmQ" placeholder="ابحث: باب، بُعد، سقف، تهشير…" value="${esc(QUERY)}" autocomplete="off"></label>
  <div id="lmRes" class="lmRes" aria-live="polite"></div>
  <ol class="lmPath" ${QUERY?"hidden":""}>${nodes}${cardNode}</ol>
  <footer class="lmFoot">
   <button type="button" class="lmCertBtn" data-l="cert" ${ST.capstone?"":"disabled"}>شهادتك</button>
   <span>${ST.capstone?"أنهيتَ المشروع الختامي — شهادتُك جاهزة":"تُفتح الشهادة بإنهاء مشروع الفيلا الختامي"}</span>
  </footer>
  <div id="lmCert" class="lmCert" hidden></div>
 </div>`;
 renderResults();
}
function renderResults(){
 const box=MAP&&MAP.querySelector("#lmRes"), path=MAP&&MAP.querySelector(".lmPath");
 if(!box)return;
 if(path)path.hidden=!!QUERY;
 if(!QUERY){box.innerHTML=""; return}
 const P=prog();
 const R0=searchAll(QUERY,null,cards()).filter(l=>l.card||levelOpen(l.level,P));
 box.innerHTML=R0.length?`<ul class="lmLessons flat">${R0.map(lessonBtn).join("")}</ul>`
  :`<p class="lmNone">لا درسَ ولا أداةَ بهذا الاسم — جرّب كلمةً أقصر</p>`;
}
/* ═══ الشهادة ═══ اسمٌ ثم SVG يُعاين ويُنزَّل
   الشعارُ يُرسم من ملفّه (نفس الأصل) على لوحةٍ ويُضمَّن PNG — بلا fetch */
function logoPng(){
 return new Promise(res=>{
  const im=new Image();
  im.onload=()=>{try{const c=document.createElement("canvas"); c.width=c.height=240;
   c.getContext("2d").drawImage(im,0,0,240,240); res(c.toDataURL("image/png"))}catch(e){res("")}};
  im.onerror=()=>res("");
  im.src="icons/college-logo.svg";
 });
}
function openCert(){
 const box=MAP.querySelector("#lmCert"); if(!box)return;
 box.hidden=false;
 box.innerHTML=`<label class="lmName">اسمك كما يُكتب على الشهادة
   <input id="lmName" maxlength="60" autocomplete="name"></label>
  <div class="lcBtns"><button type="button" class="pri" data-l="mkcert">أنشئ الشهادة</button></div>
  <div class="lmCertOut"></div>`;
 const i=box.querySelector("#lmName"); if(i)i.focus();
}
async function makeCert(){
 const box=MAP.querySelector("#lmCert"), out=box&&box.querySelector(".lmCertOut");
 const name=(box.querySelector("#lmName")||{}).value||"";
 if(!name.trim()){HOOK.report("wr","اكتب اسمك أوّلاً"); return}
 const logo=await logoPng();
 const svg=certSVG({name,stats:statsOf(prog(),null,cards()),logo});
 if(CERTURL)URL.revokeObjectURL(CERTURL);
 CERTURL=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));
 out.innerHTML=`<img alt="شهادة إنجاز باسم ${esc(name)}" src="${CERTURL}">
  <a class="lmDl" download="CivilDraft-certificate.svg" href="${CERTURL}">نزّل الشهادة (SVG للطباعة)</a>`;
}
/* أوّلُ محطّةٍ مفتوحةٍ لم تكتمل — تُفتح قائمتُها تلقائياً */
function currentLevel(){
 const P=prog();
 const L=LEVELS.find(L=>levelOpen(L.n,P)&&!L.lessons.every(id=>starsOf(id)>0));
 return L?L.n:1;
}
export function openLearn(){
 build();
 if(RUN){COACH.hidden=false; return}
 OPENLV=currentLevel();
 renderMap(); MAP.hidden=false;
 const b=MAP.querySelector(".lmLessons button")||MAP.querySelector(".lmNode.open button");
 if(b)b.focus();
}
function closeMap(){if(MAP)MAP.hidden=true}
function onMap(e){
 const b=e.target.closest("button"); if(!b)return;
 if(b.dataset.l==="close"){closeMap(); return}
 if(b.dataset.l==="cert"){openCert(); return}
 if(b.dataset.l==="mkcert"){makeCert(); return}
 if(b.dataset.lv){
  const n=+b.dataset.lv;
  OPENLV=(OPENLV===n)?0:n;
  renderMap();
  const f=MAP.querySelector(`[data-lv="${n}"]`); if(f)f.focus();
  return;
 }
 if(b.dataset.ls){
  const les=anyLesson(b.dataset.ls);
  if(les){closeMap(); start(les)}
 }
}

/* ═══ تشغيلُ الدرس ═══ */
const viewHooks={
 get:()=>({k:V.k,cx:V.cx,cy:V.cy}),
 set:v=>{V.k=v.k; V.cx=v.cx; V.cy=v.cy; draw()}
};
async function snap(why){
 const M=await import("../io/snaps.js");
 if(S.walls.length||S.areas.length)return M.snapTake(why);
 return null;
}
function start(les){
 build();
 if(!inSandbox()){
  if(!enterSandbox(les,{view:viewHooks,snap,sel:l=>setSel(l)})){
   HOOK.report("er","تعذّر بدء الدرس"); return;
  }
 }else{
  /* إعادةُ الدرس: لوحةٌ نظيفة داخل الصندوق نفسه */
  exitSandbox();
  enterSandbox(les,{view:viewHooks,snap:null,sel:l=>setSel(l)});
 }
 if(!setupOk()&&les.setup)HOOK.report("wr","تعذّر بناء رسم الدرس كاملاً — تابع أو أعد الدرس");
 LES=les; RUN=createRunner(les,now()); STEPK=-1; WATCH=0; V3MOVED=false;
 UILOG=[]; hookReport(true);
 /* بطاقةُ الترحيب تُغلق بزرّها هي (فتُسجَّل «أُغلقت») — وإلّا غطّت لوحةَ الدرس */
 const wc=document.getElementById("welcome");
 if(wc&&!wc.hidden){const x=wc.querySelector('[data-wc="close"]'); if(x)x.click(); else wc.hidden=true}
 document.body.classList.add("learning");
 COACH.hidden=false;
 renderCoach();
 try{fitBox(lift(les.frame),0.04)}catch(e){}
 draw(); HOOK.refresh(); HOOK.prompt();
 clearInterval(TIMER);
 TIMER=setInterval(poll,250);
}
/* المدرّبُ يغطّي أسفلَ اللوحة: الإطارُ يُمدّ إلى الأسفل بقدر ما يغطّيه،
   فيقع الرسمُ كلُّه فوقه ولا تختفي نقطةٌ مطلوبةٌ تحته */
function lift(F){
 const st=(document.getElementById("stage")||cv).getBoundingClientRect();
 const H=st.height||600;
 /* ما يغطّيه فعلاً: المدرّبُ من الأسفل وشريطُ الخيارات العائمُ من الأعلى */
 const cr=COACH&&!COACH.hidden&&!COACH.classList.contains("compact")?COACH.getBoundingClientRect():null;
 const ob=document.getElementById("optbar"), or=ob&&ob.offsetParent?ob.getBoundingClientRect():null;
 const bot=cr?Math.max(0,st.bottom-cr.top+12):0;
 const top=(or&&or.bottom>st.top&&or.top<st.top+H/2)?Math.max(0,or.bottom-st.top+8):0;
 const free=Math.max(H*0.35,H-bot-top);
 const h=F.y1-F.y0, k=h/free;                    /* مم لكلّ بكسل في الجزء المكشوف */
 return {x0:F.x0,x1:F.x1,y0:F.y0-bot*k,y1:F.y1+top*k};
}
const probe=()=>({S, tool:R.T.id||null,
 pts:(R.T.ctx&&Array.isArray(R.T.ctx.pts))?R.T.ctx.pts:[], active:R.active(),
 stepIdx:R.T.i|0, last:R.T.last||null, sel:(R.H.sel&&R.H.sel())||[], opt:R.OPT,
 ui:{lvlMgr:visible('[data-do="add"]'), v3d:!!document.querySelector(".v3"), v3dMoved:V3MOVED},
 log:sandboxLog().concat(UILOG)});
function poll(){
 if(!RUN||WATCH)return;
 const r=RUN.tick(probe(),now());
 if(r==="next"&&RUN.done){finish(); return}
 if(r)renderCoach();
 place();
}
export function stopLearn(){
 clearInterval(TIMER); TIMER=0;
 const was=inSandbox();
 const ok=was?exitSandbox():true;
 RUN=null; LES=null; STEPK=-1;
 hookReport(false); UILOG=[];
 document.body.classList.remove("learning");
 if(COACH)COACH.hidden=true;
 hideAids();
 if(was){
  draw(); HOOK.refresh(); HOOK.prompt();
  HOOK.report(ok?"ok":"er",ok?"رجع مشروعك كما تركته":"تعذّرت العودة: تجد مشروعك في «اللقطات»");
 }
 return ok;
}
function finish(){
 clearInterval(TIMER); TIMER=0;
 const stars=RUN.stars(), secs=RUN.secs();
 const P=prog(), old=(P[LES.id]||{}).stars|0;
 P[LES.id]={stars:Math.max(old,stars),at:Date.now(),dur:Math.max(secs,(P[LES.id]||{}).dur|0)};
 try{saveUI()}catch(e){}
 hideAids();
 const nid=LES.card?null:nextLesson(LES.id);
 const NEXT=(nid&&levelOpen(levelOfLesson(nid),P))?lessonOf(nid):null;
 COACH.classList.add("fin");
 COACH.innerHTML=`<div class="lcFin" role="status">
  ${starRow(stars)}
  <p class="lcSay">${LES.capstone?"مبروك! أنهيتَ المشروع الختامي":(LES.card?"جرّبتَ «"+esc(LES.title)+"»":"أحسنت! رسمت "+esc(LES.goal))}</p>
  ${LES.capstone?`<p class="lcHint">فيلا كاملة بكلّ مراحلها — من المحاور إلى ورقة الطباعة. شهادتُك جاهزة في الخريطة.</p>`:""}
  <p class="lcMeta">${AR(Math.max(1,Math.round(secs/60)))} د · أخطاء ${AR(RUN.mistakes)} · مساعدة ${AR(RUN.autos)}</p>
  <div class="lcBtns">
   ${NEXT?`<button type="button" data-c="next" class="pri">التالي: ${esc(NEXT.title)}</button>`:""}
   ${LES.capstone?`<button type="button" data-c="savevilla" class="pri">نزّل الفيلا ملفّاً</button>`:""}
   <button type="button" data-c="again" class="gh">أعد الدرس</button>
   <button type="button" data-c="map" class="gh">الخريطة</button>
   <button type="button" data-c="exit" class="${NEXT?"gh":"pri"}">عُد لمشروعك</button>
  </div></div>`;
 center();
 const b=COACH.querySelector(".pri"); if(b)b.focus();
}

/* ═══ المدرّب ═══ */
function renderCoach(){
 if(!RUN||RUN.done)return;
 const s=RUN.step();
 COACH.classList.remove("fin");
 COACH.dataset.level=String(RUN.level);
 const dots=LES.steps.map((_,i)=>`<i class="${i<RUN.i?"done":(i===RUN.i?"on":"")}"></i>`).join("");
 const keys=(bare()?[]:(s.keys||[])).map(k=>`<span class="lcKey"><kbd>${esc(k[0])}</kbd>${k[1]?`<small>${esc(k[1])}</small>`:""}</span>`).join("");
 const fresh=STEPK!==RUN.i; STEPK=RUN.i;
 COACH.innerHTML=`<div class="lcTop">
   <span class="lcTitle">${LES.challenge?`<em class="lcCh">تحدٍّ</em>`:""}${esc(LES.title)} <small>${AR(RUN.i+1)} / ${AR(RUN.n)}</small></span>
   <span class="lcDots" aria-hidden="true">${dots}</span>
   <button type="button" data-c="exit" class="lcX" aria-label="أنهِ الدرس وعُد لمشروعك">إنهاء</button>
  </div>
  <p class="lcSay${fresh?" in":""}" aria-live="polite">${esc(s.say)}</p>
  ${RUN.level>=1&&s.hint?`<p class="lcHint">${esc(s.hint)}</p>`:""}
  <div class="lcRow">
   <span class="lcKeys">${keys}</span>
   ${RUN.level>=2&&s.auto?`<button type="button" data-c="auto" class="gh lcAuto" ${WATCH?"disabled":""}>شاهدني</button>`:""}
  </div>`;
 aimTarget(s);
 place();
}
function onCoach(e){
 const b=e.target.closest("button"); if(!b)return;
 const c=b.dataset.c;
 if(c==="exit")stopLearn();
 else if(c==="again"&&LES)start(LES);
 else if(c==="next"&&LES){const n=lessonOf(nextLesson(LES.id)); if(n)start(n)}
 else if(c==="map"){const was=LES; stopLearn(); openLearn(); if(was&&was.card){OPENLV=8; renderMap()}}
 else if(c==="auto")doAuto();
 /* المشروعُ الختاميُّ يُنزَّل ملفّاً قبل العودة — فلا يضيع جهدُ ٤٥ دقيقة، ولا يُكتب فوق مشروع المستخدم */
 else if(c==="savevilla")import("./ribbon/wire.js").then(W=>W.runSpec({act:"xSave"})).catch(()=>HOOK.report("er","تعذّر التنزيل"));
}
/* «شاهدني»: مؤشّرٌ ينزلق إلى الزرّ أو النقطة ثم يُنفَّذ الفعلُ نفسُه عبر
   الأدوات الحقيقية — يرى المتعلّمُ أين تقع اليد قبل أن يقع الأثر */
const reduced=()=>typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function screenOf(a,s){
 const p=actPoint(a);
 if(p){const r=cv.getBoundingClientRect(), q=W2S(p[0],p[1]); return [r.left+q[0],r.top+q[1]]}
 if(a.tool||a.ui||a.click){
  const t=a.click?findTarget("sel:"+a.click):(a.ui?findTarget("act:"+a.ui):findTarget("cmd:"+a.tool))||findTarget(s.target);
  if(t){const r=t.getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]}
 }
 return null;
}
async function glide(to,dur){
 if(!to)return;
 const from=CUR.hidden?[to[0]-80,to[1]+60]:[parseFloat(CUR.style.left)||to[0],parseFloat(CUR.style.top)||to[1]];
 CUR.hidden=false;
 const D=reduced()?0:(dur==null?520:dur), t0=now();
 while(true){
  const k=D?Math.min(1,(now()-t0)/D):1, e=1-Math.pow(1-k,3);
  CUR.style.left=(from[0]+(to[0]-from[0])*e)+"px";
  CUR.style.top=(from[1]+(to[1]-from[1])*e)+"px";
  if(k>=1)break;
  await new Promise(r=>requestAnimationFrame(r));
 }
 CUR.classList.remove("tap"); void CUR.offsetWidth; CUR.classList.add("tap");
 await sleep(reduced()?0:Math.min(180,(dur==null?520:dur)/3));
}
async function doAuto(){
 if(!RUN||RUN.done||WATCH)return;
 const s=RUN.step();
 WATCH=1; renderCoach();
 try{
  /* فصلُ الفيلا عشراتُ الأفعال: المؤشّرُ يُسرع فيبقى «شاهدني» دقيقةً لا عشراً */
  const L=s.auto||[], fast=L.length>8?110:null;
  for(const a of L){
   await glide(screenOf(a,s),fast);
   runAct(a);
   draw(); HOOK.prompt();
  }
 }catch(e){HOOK.report("er","تعذّر تنفيذ الخطوة")}
 await sleep(reduced()?0:260);
 CUR.hidden=true; WATCH=0;
 RUN.autoUsed();
 poll();
 if(RUN&&!RUN.done)renderCoach();
}

/* ═══ الإضاءةُ والشبح ═══ */
const shown=e=>{const r=e.getBoundingClientRect(); return r.width>0&&r.height>0};
function findTarget(t){
 if(!t)return null;
 /* المرحلة ٣: حقلُ شريط الخيارات — الحاويةُ كلُّها (التسميةُ والحقل) */
 const o=/^opt:([\w-]+)$/.exec(t);
 if(o){
  const L=[...document.querySelectorAll(`#optbar [data-key="${o[1]}"]`)];
  return L.find(shown)||null;
 }
 /* المرحلة ٦: فعلُ الشريط (data-act) أو عنصرٌ في نافذةٍ بمحدِّده */
 if(t.startsWith("sel:")){
  let L=[]; try{L=[...document.querySelectorAll(t.slice(4))]}catch(e){}
  return L.find(shown)||null;
 }
 const m=/^(cmd|act):([\w-]+)$/.exec(t); if(!m)return null;
 const L=[...document.querySelectorAll(`[data-${m[1]}="${m[2]}"]`)];
 return L.find(shown)||null;
}
/* التحدّي: لا إضاءةَ ولا شبحَ ولا مفاتيح حتى يطلب المتعلّم (سلّم ١ فما فوق) */
const bare=()=>!!(LES&&LES.challenge&&RUN&&RUN.level<1);
async function aimTarget(s){
 if(!s.target||!/^(cmd|act):/.test(s.target)||bare())return;
 const id=s.target.slice(4);
 if(findTarget(s.target))return;
 /* الزرُّ في تبويبٍ آخر: يُفتح تبويبُه ليراه المتعلّم */
 try{
  const [Sc,Rn]=await Promise.all([import("./ribbon/schema.js"),import("./ribbon/render.js")]);
  const h=Sc.homeOf(id);
  if(h&&Sc.tabIds().includes(h.tab)&&Rn.curTab()!==h.tab)Rn.setTab(h.tab,1);
 }catch(e){}
 place();
}
function hideAids(){
 if(SPOT)SPOT.hidden=true;
 if(CUR)CUR.hidden=true;
 if(GHOST)GHOST.setAttribute("hidden","");
}
/* المدرّبُ في منتصف اللوحة لا منتصف النافذة: اللوحاتُ الجانبية تزيحه */
function center(){
 if(!COACH||COACH.hidden)return;
 /* الجوال: اللوحةُ ضيّقةٌ يملؤها شريطُ الخيارات، فالمدرّبُ شريطٌ رفيعٌ أعلى
    الشاشة فوق الترويسة — والرسمُ واللوحةُ وسطرُ الأوامر مكشوفة */
 const small=innerWidth<640;
 COACH.classList.toggle("compact",small);
 if(small){Object.assign(COACH.style,{left:"8px",right:"8px",top:"6px",bottom:"auto",marginInline:"0",width:"auto"}); return}
 COACH.style.width="";
 const st=document.getElementById("stage")||cv;
 const r=st.getBoundingClientRect(), w=COACH.offsetWidth||460;
 if(!r.width)return;
 const x=Math.max(12,Math.min(innerWidth-w-12,r.left+r.width/2-w/2));
 /* داخلَ اللوحة فوق حافّتها السفلى: سطرُ الأوامر تحتها يبقى مكشوفاً
    لأنّ نصفَ الدروس يُكتب فيه (C · w=2 · W2@1.5) */
 const h=COACH.offsetHeight||130;
 const y=Math.max(r.top+8,r.bottom-h-12);
 Object.assign(COACH.style,{left:x+"px",right:"auto",marginInline:"0",top:y+"px",bottom:"auto"});
}
function place(){
 center();
 if(!RUN||RUN.done){hideAids(); return}
 const s=RUN.step();
 const t=bare()?null:findTarget(s.target);
 if(t){
  const r=t.getBoundingClientRect(), pad=4;
  Object.assign(SPOT.style,{left:(r.left-pad)+"px",top:(r.top-pad)+"px",
   width:(r.width+pad*2)+"px",height:(r.height+pad*2)+"px"});
  SPOT.hidden=false;
 }else SPOT.hidden=true;
 drawGhost(bare()?null:s.ghost);
}
function drawGhost(g){
 if(!g){GHOST.setAttribute("hidden",""); return}
 const r=cv.getBoundingClientRect();
 Object.assign(GHOST.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"});
 GHOST.setAttribute("viewBox",`0 0 ${Math.max(1,r.width)} ${Math.max(1,r.height)}`);
 const P=p=>W2S(p[0],p[1]);
 const parts=[];
 if(g.box){
  const a=P([g.box[0],g.box[1]]), b=P([g.box[2],g.box[3]]);
  parts.push(`<rect class="gBox" x="${Math.min(a[0],b[0])}" y="${Math.min(a[1],b[1])}" width="${Math.abs(b[0]-a[0])}" height="${Math.abs(b[1]-a[1])}"/>`);
 }
 if(g.seg){
  const a=P(g.seg[0]), b=P(g.seg[1]);
  parts.push(`<line class="gSeg" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`);
 }
 (g.pts||[]).forEach(p=>{
  const q=P(p);
  parts.push(`<circle class="gRing" cx="${q[0]}" cy="${q[1]}" r="14"/><circle class="gDot" cx="${q[0]}" cy="${q[1]}" r="4"/>`);
 });
 GHOST.innerHTML=parts.join("");
 GHOST.removeAttribute("hidden");
}
/* للاختبار: ما الذي يجري الآن */
export const learnState=()=>RUN?{lesson:LES.id,i:RUN.i,level:RUN.level,done:RUN.done}:null;
