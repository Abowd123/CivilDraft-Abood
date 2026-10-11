/* ═══ استوديو الدروس ═══
   يشغّل دروسَ السلسلة (tutor/lessons.js) داخل البرنامج نفسِه: الأداةُ
   الحقيقية تُفعَّل، ومؤشّرٌ ظاهرٌ يتحرّك إلى موضع النقرة، والكتابةُ تظهر
   في سطر الأوامر، ونصُّ الخطوة الجارية على الشاشة وفي اللوح. وزرُّ
   «سجّل» يلتقط تبويبَ البرنامج نفسَه (getDisplayMedia) فيخرج فيديو WebM
   مع ملفّ ترجمة SRT بتوقيت كلِّ خطوة، ونصُّ الخطوات Markdown.
   المحرّكُ خالصٌ ومختبَر (lessons.test.js) — هنا الحركةُ والعرضُ فقط. */
import {SERIES,NEXT,lessonById} from "../tutor/lessons.js";
import {runLesson,runStep,lessonMarkdown,srt,seriesMarkdown,lessonWipes,lessonMovesUI} from "../tutor/engine.js";
import {S} from "../core/state.js";
import {snapTake,snapRestore} from "../io/snaps.js";
import {UIS} from "./store.js";
import {cv,W2S,fitBox,setSel,draw} from "./canvas.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ease=t=>1-Math.pow(1-t,4);
let P=null, CUR=null, CAP=null, L=SERIES[0], I=-1, RUN=0, STOP=0, SPEED=1;
let REC=null, T0=0, MARKS=[];
/* مشروعُ المستخدم قبل الدرس: الدرسُ يبدأ بمشروعٍ فارغ أو قالب فيمسح ما
   على اللوحة، فتُؤخذ لقطةٌ أولاً ويظهر زرُّ «أرجع مشروعي». وسطحُ العمل
   الجاري يُعاد بعد درسٍ يبدّله. */
let SAVED=null, WS0=null;
async function guard(){
 if(!lessonWipes(L)||!(S.walls.length||S.areas.length))return true;
 if(SAVED)return true;                 /* لقطةُ ما قبل أوّل درس تكفي: ما بعدها دروس */
 const r=await snapTake(`قبل الدرس ${L.n}`);
 if(r&&r.ok){SAVED={id:r.id,n:L.n}; HOOK.report("ok","حُفظت لقطةٌ من مشروعك، وتعود إليه بزرّ «أرجع مشروعي»"); return true}
 return confirm("تعذّر حفظ لقطةٍ من مشروعك، والدرس سيبدأ بمشروعٍ جديد فيضيع ما لم تحفظه.\n\nتتابع؟");
}
async function restoreWs(){
 if(WS0==null)return;
 const w=WS0; WS0=null;
 if(!w)return;
 try{const D=await import("./dock.js"); D.wsApply(w,1)}catch(e){}
}
async function backHome(){
 if(!SAVED||RUN)return;
 const r=await snapRestore(SAVED.id);
 if(r.ok){HOOK.report("ok","رجع مشروعك كما كان قبل الدرس"); SAVED=null; draw()}
 else HOOK.report("er","تعذّرت الاستعادة: "+r.err+". تجد اللقطة في «اللقطات» من لوحة الأوامر");
 render();
}

function build(){
 if(P)return;
 P=document.createElement("aside"); P.id="studio"; P.hidden=true;
 P.setAttribute("aria-label","استوديو الدروس");
 document.body.appendChild(P);
 CUR=document.createElement("div"); CUR.id="studioCur"; CUR.hidden=true; CUR.setAttribute("aria-hidden","true");
 document.body.appendChild(CUR);
 CAP=document.createElement("div"); CAP.id="studioCap"; CAP.hidden=true; CAP.setAttribute("aria-live","polite");
 document.body.appendChild(CAP);
 P.addEventListener("click",onClick);
 P.addEventListener("change",e=>{
  if(e.target.id==="stLesson"){L=lessonById(e.target.value)||SERIES[0]; I=-1; render()}
  if(e.target.id==="stSpeed"){SPEED=+e.target.value||1}
 });
}
function render(){
 const opts=SERIES.map(x=>`<option value="${esc(x.id)}"${x===L?" selected":""}>${x.n}. ${esc(x.title)}</option>`).join("");
 P.innerHTML=`<div class="sh"><b>استوديو الدروس</b><button data-s="close" class="gh" aria-label="إغلاق">✕</button></div>
 <div class="sb">
  <label class="sl">الدرس <select id="stLesson">${opts}</select></label>
  <p class="sg">${esc(L.goal)} <small>(${esc(L.level)} · ${L.min} د)</small></p>
  <ol class="ss">${L.steps.map((s,i)=>`<li class="${i===I?"on":(i<I?"done":"")}" data-i="${i}">${esc(s.t)}</li>`).join("")}</ol>
 </div>
 <div class="sf">
  <button data-s="play" ${RUN?"disabled":""}>▶ شغّل الدرس</button>
  <button data-s="rec" class="rec" ${RUN?"disabled":""}>● شغّل وسجّل فيديو</button>
  <button data-s="step" class="gh" ${RUN?"disabled":""}>خطوة واحدة</button>
  <button data-s="stop" class="gh" ${RUN?"":"disabled"}>■ إيقاف</button>
  ${SAVED?`<button data-s="back" class="gh" ${RUN?"disabled":""}>↺ أرجع مشروعي</button>`:""}
  <label class="sl sp">السرعة <select id="stSpeed"><option value="0.75"${SPEED===0.75?" selected":""}>بطيء</option><option value="1"${SPEED===1?" selected":""}>عادي</option><option value="1.5"${SPEED===1.5?" selected":""}>سريع</option></select></label>
  <span class="sx">
   <button data-s="md" class="gh">⤓ نص الخطوات</button>
   <button data-s="all" class="gh">⤓ نص السلسلة</button>
  </span>
 </div>`;
}
const say=(i,t)=>{
 I=i; render();
 CAP.innerHTML=`<span class="cn">${L.n}.${i+1}</span>${esc(t)}`; CAP.hidden=false;
 if(REC)MARKS.push({i,at:performance.now()-T0});
};
function curAt(p){
 const r=cv.getBoundingClientRect(), s=W2S(p[0],p[1]);
 return [r.left+s[0], r.top+s[1]];
}
/* المؤشّرُ مثبَّتٌ بـinset-inline-start (حارسُ الاتجاه)، وهو في RTL الحافّةُ
   اليمنى — فتُزاح الإحداثيّةُ الأفقية بعرض الصفحة لتبقى من اليسار */
const rtl=()=>getComputedStyle(document.documentElement).direction==="rtl";
const putCur=(x,y)=>{const ox=rtl()?document.documentElement.clientWidth:0; CUR.style.transform=`translate(${x-ox}px,${y}px)`};
let curPos=null;
async function glide(to){
 CUR.hidden=false;
 const from=curPos||[to[0]+120,to[1]+90], n=Math.max(8,Math.round(18/SPEED));
 for(let k=1;k<=n;k++){
  if(STOP)return;
  const t=ease(k/n), x=from[0]+(to[0]-from[0])*t, y=from[1]+(to[1]-from[1])*t;
  putCur(x,y); await sleep(16);
 }
 curPos=to;
}
async function pulse(){CUR.classList.remove("hit"); void CUR.offsetWidth; CUR.classList.add("hit"); await sleep(260/SPEED)}
/* ═══ عناصرُ الواجهة ═══ «act:X» زرُّ الفعل X (الشريط أو شريط الحالة)،
   «sec:X» عنوانُ اللوحة X، وما عداهما محدِّدُ CSS. يُفضَّل الظاهرُ منها:
   الفعلُ الواحد قد يسكن الشريطَ وقائمةً مطويّةً معاً. */
const selOf=t=>t.startsWith("act:")?`[data-act="${t.slice(4)}"]`
 :t.startsWith("sec:")?`details.sec[data-sec="${t.slice(4)}"]>summary`:t;
const shown=el=>{const r=el.getBoundingClientRect(); return r.width>0&&r.height>0&&!el.closest("[hidden]")};
function find(t){
 let L=[]; try{L=[...document.querySelectorAll(selOf(t))]}catch(e){return null}
 L=L.filter(el=>!P.contains(el));
 return L.find(shown)||null;
}
async function toEl(el){
 try{el.scrollIntoView({block:"nearest",inline:"nearest"})}catch(e){}
 const r=el.getBoundingClientRect();
 await glide([r.left+r.width/2,r.top+r.height/2]);
}
function mark(el){el.classList.remove("studioHi"); void el.offsetWidth; el.classList.add("studioHi");
 setTimeout(()=>el.classList.remove("studioHi"),2400)}
/* تبويبُ الشريط الذي يسكنه الفعل يُفتح أوّلاً ليرى المتعلّم موضعَ الزرّ */
async function homeTab(id){
 try{
  const [Sc,Rn]=await Promise.all([import("./ribbon/schema.js"),import("./ribbon/render.js")]);
  const h=Sc.homeOf(id);
  if(h&&Sc.tabIds().includes(h.tab)&&Rn.curTab()!==h.tab)Rn.setTab(h.tab,1);
 }catch(e){}
}
const hooks={
 async move(p){await glide(curAt(p))},
 click:pulse,
 /* الفعلُ يمرّ بـrunSpec نفسِه الذي يمرّ به زرُّ الشريط: لا طريقَ ثانٍ */
 async ui(id){
  if(!id.startsWith("dlg:"))await homeTab(id);
  const el=find("act:"+id);
  if(el){await toEl(el); if(STOP)return; await pulse()}
  const W=await import("./ribbon/wire.js");
  W.runSpec({act:id}); draw();
  await sleep(450/SPEED);
 },
 async point(t){
  const el=find(t); if(!el)return;
  await toEl(el); mark(el); await sleep(500/SPEED);
 },
 async press(t){
  const el=find(t); if(!el)return;
  await toEl(el); await pulse(); el.click(); await sleep(300/SPEED);
 },
 /* أعلى نافذةٍ مفتوحة: زرُّ إغلاقها الظاهر، وإلّا Escape كما تفعل يدُك */
 async close(){
  const el=find('.rpt [data-rpt="close"]')||find('[data-v3="close"]');
  if(el){await toEl(el); await pulse(); el.click()}
  else document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  await sleep(300/SPEED);
 },
 async typing(s){
  const c=$("#clIn"); if(!c){await sleep(300);return}
  c.value=""; for(const ch of s){c.value+=ch; await sleep(140/SPEED)} await sleep(200/SPEED); c.value="";
  if(typeof CustomEvent==="function")document.dispatchEvent(new CustomEvent("cd:cmd",{detail:{s}}));
 },
 async wait(ms){await sleep(ms/SPEED)},
 pick(l){setSel(l)},
 view(B){fitBox(B,0.06); curPos=null},
 after(){HOOK.prompt(); draw()},
 stopped:()=>!!STOP,
 say
};
async function play(rec){
 if(RUN)return;
 if(!(await guard()))return;
 if(lessonMovesUI(L))WS0=UIS.wsCur||"";
 if(rec&&!(await recStart()))return;
 RUN=1; STOP=0; I=-1; render(); curPos=null;
 try{ await sleep(500); await runLesson(L,hooks); await sleep(1200/SPEED) }
 catch(e){HOOK.report("er","الدرس توقّف: "+e.message)}
 RUN=0; CUR.hidden=true; CAP.hidden=true;
 if(REC)recStop();
 await restoreWs();
 render();
 if(!STOP)HOOK.report("ok",`انتهى الدرس ${L.n}: ${L.title}`);
}
async function stepOnce(){
 if(RUN)return;
 const i=I+1; if(i>=L.steps.length){I=-1; render(); return}
 if(i===0&&!(await guard()))return;
 RUN=1; STOP=0; say(i,L.steps[i].t);
 try{await runStep(L.steps[i],hooks)}catch(e){HOOK.report("er",e.message)}
 RUN=0; CUR.hidden=true; render();
}
/* ═══ التسجيل ═══ تبويبُ البرنامج نفسُه — بلا امتدادٍ ولا برنامجٍ خارجيّ */
async function recStart(){
 const md=navigator.mediaDevices;
 if(!md||!md.getDisplayMedia||typeof MediaRecorder==="undefined"){
  HOOK.report("wr","التسجيل يحتاج متصفّحاً يدعم التقاط الشاشة (Chrome أو Edge أو Firefox على الحاسوب)"); return false}
 let stream;
 try{stream=await md.getDisplayMedia({video:{frameRate:30,displaySurface:"browser"},audio:false,preferCurrentTab:true,selfBrowserSurface:"include"})}
 catch(e){HOOK.report("wr","أُلغي التسجيل — اختر هذا التبويب في نافذة المشاركة"); return false}
 const type=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(t=>MediaRecorder.isTypeSupported(t))||"";
 const chunks=[];
 REC=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:4e6}:undefined);
 REC.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
 REC.onstop=()=>{
  stream.getTracks().forEach(t=>t.stop());
  const end=performance.now()-T0, base=`CivilDraft-الدرس-${L.n}`;
  save(new Blob(chunks,{type:"video/webm"}),base+".webm");
  save(new Blob([srt(L,MARKS,end)],{type:"text/plain;charset=utf-8"}),base+".srt");
  REC=null; HOOK.report("ok",`حُفظ الفيديو وملفُّ الترجمة: ${base}`);
 };
 stream.getVideoTracks()[0].addEventListener("ended",()=>{STOP=1});
 MARKS=[]; T0=performance.now(); REC.start(500);
 /* التسجيلُ بوضع العرض: ما يكتبه الدرس يظهر فقاعةً كما في حلقات السلسلة */
 try{const M=await import("./presenter.js"); PR0=M.presenterOn(); M.setPresenter(1)}catch(e){}
 await sleep(400);
 return true;
}
let PR0=null;
function recStop(){
 try{if(REC&&REC.state!=="inactive")REC.stop()}catch(e){}
 if(PR0!==null){const w=PR0; PR0=null; import("./presenter.js").then(M=>M.setPresenter(w)).catch(()=>{})}
}
function save(blob,name){
 const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name;
 document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
function onClick(e){
 const b=e.target.closest("[data-s]"); if(!b)return;
 const k=b.dataset.s;
 if(k==="close")closeStudio();
 else if(k==="play")play(false);
 else if(k==="rec")play(true);
 else if(k==="step")stepOnce();
 else if(k==="stop"){STOP=1; recStop()}
 else if(k==="back")backHome();
 else if(k==="md")save(new Blob([lessonMarkdown(L)],{type:"text/markdown;charset=utf-8"}),`الدرس-${L.n}-الخطوات.md`);
 else if(k==="all")save(new Blob([seriesMarkdown(SERIES,NEXT)],{type:"text/markdown;charset=utf-8"}),"سلسلة-دروس-CivilDraft.md");
}
export function openStudio(id){build(); if(id)L=lessonById(id)||L; render(); P.hidden=false}
export function closeStudio(){if(!P)return; STOP=1; recStop(); P.hidden=true; CUR.hidden=true; CAP.hidden=true}
export const toggleStudio=()=>{if(P&&!P.hidden)closeStudio(); else openStudio()};
export const studioOpen=()=>!!(P&&!P.hidden);
