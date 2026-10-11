/* ═══ لوحة المساعد ═══
   ثلاث حالات: خاملة · خطّةٌ منتظرةٌ للموافقة · مُنفَّذةٌ تحت
   المعاينة. لا شيء يُثبَّت بلا نقرةٍ منك. */
import {S} from "../core/state.js";
import {inspect} from "../core/inspect.js";
import {sceneBBoxAll,scene} from "../core/render.js";
import {renderCanvas} from "../io/png.js";
import {digest,digestSize,digestTruncated} from "../ai/ctx.js";
import {SYS} from "../ai/lang.js";
import {AI,loadAI,saveAI,ready,isLocal,hostOf,ask,abortAsk,PRESETS,listModels} from "../ai/net.js";
import {parsePlan,planReady,blockConflict} from "../ai/plan.js";
import {LIM} from "../core/limits.js";
import {trial,commit,rollback} from "../ai/run.js";
import {validate as validateOps} from "../ai/ops.js";
import {runOps} from "../ai/opsrun.js";
import {editFailed} from "../core/state.js";
import {mnum} from "../core/units.js";
import {HOOK} from "./bus.js";
import {generateFromText} from "../ai/generate.js";
import {buildReviewDigest,reviewProject,formatReadonly} from "../ai/review.js";
import {escapeHtml as esc,errMsg} from "../core/escape.js";

const $=s=>document.querySelector(s);

/* كتلةُ ‹ops› بديلٌ لكتلة ‹plan› — راجع ai/lang.js#SYS. تُقرأ هنا
   وحدها (لا في ai/plan.js) فلا يفترق ما يُقبَل عمّا يُعرَض. */
function extractOps(txt){
 const T=String(txt||"");
 const m=T.match(/```ops[ \t]*\r?\n([\s\S]*?)```/i);
 if(!m)return null;
 let j=null;
 try{j=JSON.parse(m[1])}catch(e){return null}
 if(!j||!Array.isArray(j.ops))return null;
 return {ops:j.ops, why:String(j.why||""),
  prose:T.slice(0,m.index).trim()||T.replace(m[0],"").trim()};
}

/* سطرٌ مختصر لعرض عمليةٍ مُصدَّقة — لا يُنفَّذ، عرضٌ فقط */
function opLine(o){
 const P=p=>`${mnum(p[0])},${mnum(p[1])}`;
 if(o.op==="wall")return `جدار ${P(o.a)}→${P(o.b)}`
  +(o.t!=null?` س${mnum(o.t)}`:"")+(o.type?` ${o.type}`:"");
 if(o.op==="open")return `فتحة ${o.kind} على ${o.wall} `
  +`عند ${mnum(o.at)} ع${mnum(o.w)}`;
 if(o.op==="area")return `منطقة عند ${P(o.at)}`
  +(o.name?` «${o.name}»`:"");
 if(o.op==="text")return `نصّ عند ${P(o.at)}: ${o.s}`;
 if(o.op==="field")return `حقل ${o.field}=${o.value} `
  +`(${o.ids.length} عنصراً)`;
 if(o.op==="note")return `ملاحظة: ${o.s}`;
 return o.op;
}
let PLAN=null, TRIAL=null, OPS=null, BUSY=0;
const wantIns=()=>($("#aiIns")?$("#aiIns").checked:!!+AI.wantIns);
const wantTtl=()=>($("#aiTtl")?$("#aiTtl").checked:!!+AI.wantTtl);
const wantDes=()=>($("#aiDes")?$("#aiDes").checked:0);

export function renderAI(){
 const b=$("#aiBox");
 if(!b)return;
 let h="";
 if(!ready())
  h+=`<p class="hint warn">المساعد غير مُهيَّأ — املأ العنوان `
   +`والموديل وشغّله.</p>`;
 else h+=`<p class="hint">${esc(AI.model)} · `
  +(isLocal()?`محلّي — لا يخرج شيء من جهازك`
   :`<span class="warn">خارجي — تُرسَل خلاصة مشروعك إلى `
    +`${esc(hostOf())}</span>`)
  +(AI.keep?"":` · المفتاح لهذه الجلسة وحدها`)+`</p>`;
 if(BUSY)h+=`<p class="hint">يُفكّر… <button id="aiStop">`
  +`ألغِ</button></p>`;
 if(PLAN&&PLAN.prose)
  h+=`<div class="ro u-46081" >`
   +`${esc(PLAN.prose)}</div>`;
 (PLAN?PLAN.notes:[]).forEach(n=>{
  h+=`<p class="hint">${esc(n)}</p>`});
 if(PLAN&&PLAN.hasPlan&&!TRIAL){
  h+=`<p class="hint">${PLAN.lines.length} سطراً`
   +(PLAN.destruct.length?` · <span class="warn">يحوي `
    +`${esc([...new Set(PLAN.destruct)].join(" · "))}</span>`:"")
   +`</p>`;
  /* المعروض هو المُنفَّذ: السطر المطبَّع لا الخام — فلا يفترق ما
     تراه عمّا يُغذّى إلى feedText */
  h+=PLAN.lines.map(L=>`<div class="ro m1${L.bad?" bad":""}"><span class="mono">`
   +`${esc(L.s)}</span> <span class="u-c1d97">`
   +`${esc(L.bad||L.note)}</span></div>`).join("");
  h+=`<div class="btnrow">`
   +`<button id="aiRun" class="pri"${planReady(PLAN)?"":" disabled"}>`
   +`نفّذ للمعاينة</button>`
   +`<button id="aiDrop">أهمِل</button></div>`;
  if(PLAN.errs.length)
   h+=`<p class="hint warn">${PLAN.errs.length} سطراً مرفوضاً — `
    +`عدّل الطلب أو صرّح بالأوامر الهادمة</p>`;
 }
 if(OPS&&OPS.prose)
  h+=`<div class="ro u-46081" >`
   +`${esc(OPS.prose)}</div>`;
 if(OPS){
  h+=`<p class="hint">${OPS.V.ok.length} عمليةً صالحة`
   +(OPS.V.bad.length?` · <span class="warn">`
    +`${OPS.V.bad.length} مرفوضة</span>`:"")+`</p>`;
  /* المعروض معاينةُ التصديق (validate) وحدها — بلا كتابة، فلا
     يُنفَّذ شيءٌ إلّا بالنقر على «نفّذ» */
  h+=OPS.V.ok.map(o=>`<div class="ro u-1ef16" >`
   +`<span class="mono">${esc(opLine(o))}</span></div>`).join("");
  h+=OPS.V.bad.map(b=>`<div class="ro u-22dea" >#${b.i}: ${esc(b.why)}</div>`).join("");
  h+=`<div class="btnrow">`
   +`<button id="aiOpsRun" class="pri"`
   +`${OPS.V.ok.length?"":" disabled"}>نفّذ</button>`
   +`<button id="aiOpsDrop">أهمِل</button></div>`
   +`<p class="hint">لا تنقل ولا تحذف — إنشاءٌ وتعديلُ حقولٍ `
   +`فقط، فتُثبَّت مباشرةً في خطوة تراجعٍ واحدة (Ctrl+Z يتراجع `
   +`عنها).</p>`;
 }
 if(TRIAL){
  h+=`<p class="hint u-54305" >مُنفَّذة تحت `
   +`المعاينة: ${TRIAL.ran} سطراً · ${TRIAL.made} كياناً جديداً`
   +(TRIAL.errs?` · ${TRIAL.errs} رفضاً`:"")+`</p>`;
  h+=TRIAL.res.filter(x=>x.err).slice(0,8).map(x=>
   `<div class="ro u-2af14" >`
   +`${esc(x.s)} — ${esc(x.err)}</div>`).join("");
  h+=`<div class="btnrow">`
   +`<button id="aiKeep2" class="pri">ثبّت</button>`
   +`<button id="aiBack" class="del">أرجِع</button></div>`
   +`<p class="hint">انظر اللوحة قبل التثبيت. الإرجاع يعيد كل `
   +`شيء إلى ما قبل الخطة.</p>`;
 }
 b.innerHTML=h;
 wireDyn();
}
function wireDyn(){
 const s=$("#aiStop"); if(s)s.onclick=()=>{abortAsk()};
 const r=$("#aiRun"); if(r)r.onclick=()=>runPlan();
 const d=$("#aiDrop");
 if(d)d.onclick=()=>{PLAN=null; renderAI()};
 const or=$("#aiOpsRun"); if(or)or.onclick=()=>runOpsPlan();
 const od=$("#aiOpsDrop");
 if(od)od.onclick=()=>{OPS=null; renderAI()};
 const k=$("#aiKeep2");
 if(k)k.onclick=()=>{
  const n=commit(TRIAL);
  HOOK.report("ok",`ثُبّتت الخطة · ${n} كياناً · Ctrl+Z يتراجع `
   +`عنها كلّها`);
  TRIAL=null; PLAN=null;
  HOOK.refresh(1); renderAI();
 };
 const b=$("#aiBack");
 if(b)b.onclick=()=>{
  rollback(TRIAL);
  HOOK.report("in","أُرجِعت الخطة — لا أثر");
  TRIAL=null;
  HOOK.refresh(1); renderAI();
 };
}
function runPlan(){
 if(!planReady(PLAN))return;
 TRIAL=trial(PLAN.lines,{stopOnError:1});
 HOOK.refresh(0);
 HOOK.report(TRIAL.errs?"wr":"ok",
  `معاينة: ${TRIAL.ran} سطراً · ${TRIAL.made} كياناً`
  +(TRIAL.errs?` · ${TRIAL.errs} رفضاً`:"")
  +" — ثبّت أو أرجِع");
 renderAI();
}
/* لا معاينةَ حيّةً هنا (راجع opsrun.js) — التنفيذ ذرّيٌّ فوراً،
   وedit() نفسه يرجع تلقائياً إن أخفق. */
function runOpsPlan(){
 if(!OPS||!OPS.V.ok.length)return;
 const r=runOps(OPS.ops);
 if(editFailed()||!r){
  HOOK.report("er","تعذّر التنفيذ"); return;
 }
 HOOK.report(r.refused.length?"wr":"ok",
  `${r.say} · Ctrl+Z يتراجع عنها`);
 OPS=null;
 HOOK.refresh(1); renderAI();
}
export async function askFromLine(q){
 if(TRIAL){HOOK.report("wr","ثبّت المعاينة أو أرجِعها أوّلاً");return}
 if(!q)return;
 /* ask() لم يعد يُلغي طلباً جارياً من تلقاء نفسه — فنقرتان متتاليتان
    على «أرسل» كانتا تُلغيان الأولى ضمناً، واليوم تُرسَلان معاً.
    الحارس هنا: طلبٌ واحدٌ في اللوحة في وقتٍ واحد. */
 if(BUSY){HOOK.report("wr","طلبٌ جارٍ — انتظره أو ألغِه");return}
 if(q.length>LIM.aiQuestion.max){
  HOOK.report("er",`السؤال ${q.length} محرفاً — الحدّ `
   +`${LIM.aiQuestion.max}`);
  return;
 }
 if(!ready()){HOOK.report("er","المساعد غير مُهيَّأ");return}
 if(!isLocal()&&!AI.__ok){
  /* الموافقة تذكر الوجهة وما يُرسَل بعدده — لا سؤالاً مبهماً.
     وهي موافقةُ جلسةٍ لا تُحفَظ على القرص. */
  const D=digest({inspect:0,title:wantTtl()?1:0});
  if(!confirm(`سيُرسَل وصفُ مشروعك إلى ${hostOf()}.\n\n`
   +`الحجم: ${digestSize(D)}`
   +(digestTruncated(D)?" — قُصّت الخلاصة للحدّ":"")+`\n`
   +`المحتوى: أبعاد الجدران والفتحات وأسماء المناطق`
   +` (ما على طبقاتٍ مخفيّة لا يُرسَل)`
   +(wantTtl()?"\nوبلوك العنوان — فيه اسم المالك والموقع":"")
   +(AI.vision&&S.walls.length?"\nوصورةُ اللوحة":"")
   +`\n\nلخصوصيةٍ كاملة استعمل Ollama محلّياً.\n`
   +`ويُسأل مرّةً واحدة في هذه الجلسة.`))return;
  AI.__ok=1;
 }
 const dst=$("#aiAsk");
 if(dst)dst.value=q;
 BUSY=1; renderAI();
 try{
  const ins=wantIns()?inspect(sceneBBoxAll()):0;
  const D=digest({inspect:ins,title:wantTtl()?1:0});
  let img=null;
  if(AI.vision&&S.walls.length){
   const r=renderCanvas(scene().P,sceneBBoxAll(),
    {dpi:96,max:1400,pad:Math.max(1,S.meta.scale)*8});
   img=r.canvas.toDataURL("image/png");
  }
  HOOK.status(`يُرسَل ${digestSize(D)}`);
  const r=await ask(SYS(),`${D}\n\n## الطلب\n${q}`,img);
  /* ‹ops› تُقرأ أوّلاً: extract() في plan.js يقع على أوّل سياجٍ
     حين لا يجد «plan» موسومةً، فكتلةُ ops وحدها كانت تُقرأ
     أسطرَ أوامرَ فتُرفَض كلّها كنصٍّ مجهول. */
  /* كتلتان أو plan مع ops: يُرفَض ويظهر سطراً مرفوضاً بسببه
     (plan.js) — لا يُختار أحدُهما خلسة */
  const eo=blockConflict(r.txt)?null:extractOps(r.txt);
  if(eo){
   PLAN=null;
   OPS={ops:eo.ops, prose:eo.prose, V:validateOps(eo.ops)};
   HOOK.report(OPS.V.bad.length?"wr":"in",
    `المساعد: ${r.ms} مس`
    +(r.usage?` · ${r.usage.total_tokens||"?"} رمزاً`:"")
    +` · ${OPS.V.ok.length} عمليةً`
    +(OPS.V.bad.length?` · ${OPS.V.bad.length} مرفوضة`:""));
  }else{
   OPS=null;
   PLAN=parsePlan(r.txt,wantDes()?1:0,AI.maxLines);
   HOOK.report(PLAN.hasPlan?"in":"ok",
    `المساعد: ${r.ms} مس`
    +(r.usage?` · ${r.usage.total_tokens||"?"} رمزاً`:"")
    +(PLAN.hasPlan?` · خطّةٌ من ${PLAN.lines.length} سطراً`
      :" · إجابة"));
   if(!PLAN.hasPlan&&PLAN.prose)HOOK.report("ok",PLAN.prose);
  }
 }catch(e){HOOK.report("er",errMsg(e))}
 BUSY=0; renderAI();
}
/* ═══ المراجعة الذكية (E) — قراءةٌ فقط ═══
   لا trial ولا commit ولا runOps ولا تاريخ: يُعرَض الردّ المُصدَّق
   ويُقرأ. الإلغاء هو abortAsk نفسه، والطلب الجاري واحدٌ (BUSY). */
let REV=null;
const SEV_ICON={err:"⛔",wrn:"⚠",inf:"ℹ",ok:"✓"};
export function renderReview(){
 const b=$("#aiRevBox");
 if(!b)return;
 if(!REV){b.innerHTML="";return}
 const rows=formatReadonly(REV.items);
 let h=`<p class="hint">مراجعةٌ للقراءة فقط — ${rows.length} بنداً`
  +(REV.unresolved?` · ${REV.unresolved} بلا كيانٍ مقابل`:"")
  +` · لا يُنفَّذ منها شيء</p>`;
 if(REV.trimmed.length)
  h+=`<p class="hint warn">قُصّت الخلاصة قبل الإرسال: `
   +`${esc(REV.trimmed.join(" · "))}</p>`;
 h+=rows.map(r=>`<div class="ro">${SEV_ICON[r.sev]||""} `
  +`<span class="mono">${esc(r.code)}</span>`
  +(r.where?` <span class="mono">${esc(r.where)}</span>`:"")
  +` — ${esc(r.msg)}`
  +(r.sug?`<div class="hint">اقتراح: ${esc(r.sug)}</div>`:"")
  +`</div>`).join("");
 h+=`<div class="btnrow"><button id="aiRevClose">أغلق</button></div>`;
 b.innerHTML=h;
 const c=$("#aiRevClose");
 if(c)c.onclick=()=>{REV=null; renderReview()};
}
export async function reviewFromLine(){
 if(BUSY){HOOK.report("wr","طلبٌ جارٍ — انتظره أو ألغِه");return}
 if(!ready()){HOOK.report("er","المساعد غير مُهيَّأ");return}
 let D;
 try{D=buildReviewDigest({inspect:1})}
 catch(e){HOOK.report("er",errMsg(e));return}
 if(!isLocal()&&!AI.__ok){
  if(!confirm(`ستُرسَل مراجعةُ مشروعك إلى ${hostOf()}.\n\n`
   +`الحجم: ${D.size} حرفاً`
   +(D.trimmed.length?`\nقُصّت الخلاصة: ${D.trimmed.join(" · ")}`:"")
   +`\nالمحتوى: أبعاد الجدران والفتحات وأسماء المناطق وملاحظات الفاحص`
   +` (ما على طبقاتٍ مخفيّة لا يُرسَل)`
   +`\nالمراجعة للقراءة فقط — لا تعدّل رسمك.`
   +`\n\nلخصوصيةٍ كاملة استعمل Ollama محلّياً.\n`
   +`ويُسأل مرّةً واحدة في هذه الجلسة.`))return;
  AI.__ok=1;
 }
 REV=null; renderReview();
 BUSY=1; renderAI();
 try{
  HOOK.status(`تُرسَل مراجعة ${D.size} حرفاً`);
  REV=await reviewProject(ask,{inspect:1});
  HOOK.report(REV.items.some(x=>x.sev==="err")?"wr":"ok",
   `المراجعة: ${REV.items.length} بنداً · ${REV.ms} مس`);
 }catch(e){HOOK.report("er",errMsg(e))}
 BUSY=0; renderAI(); renderReview();
}
export function wireAI(){
 loadAI();
 /* aiIns وaiTtl صارا محفوظَين: كانا يُقرآن من DOM ولا يُخزَّنان،
    فيعودان مُطفأَين في كل جلسة. و«اسمح بالأوامر الهادمة» يبقى
    بلا حفظٍ بقصد: تصريحٌ لا يليق به اللزوم. */
 const F=["aiUrl","aiKey","aiModel","aiPreset","aiTemp","aiVis","aiOn",
  "aiKeep","aiIns","aiTtl"];
 const put=()=>{
  const g=id=>$("#"+id);
  if(g("aiPreset"))g("aiPreset").value=AI.preset||"ollama";
  if(g("aiUrl"))g("aiUrl").value=AI.url;
  if(g("aiKey"))g("aiKey").value=AI.key?"••••••••":"";
  if(g("aiModel"))g("aiModel").value=AI.model;
  if(g("aiTemp"))g("aiTemp").value=AI.temp;
  if(g("aiVis"))g("aiVis").checked=!!+AI.vision;
  if(g("aiOn"))g("aiOn").checked=!!+AI.on;
  if(g("aiKeep"))g("aiKeep").checked=!!+AI.keep;
  if(g("aiIns"))g("aiIns").checked=!!+AI.wantIns;
  if(g("aiTtl"))g("aiTtl").checked=!!+AI.wantTtl;
 };
 put();
 F.forEach(id=>{
  const el=$("#"+id);
  if(!el)return;
  el.onchange=()=>{
   /* المزوّد الجاهز يضبط العنوان ما لم يكن «مخصّصاً» — والعنوان
      الذي كتبه المستخدم بيده أحقّ بالبقاء عند «مخصّص» */
   if(id==="aiPreset"){
    const p=$("#aiPreset").value;
    AI.preset=p;
    const def=PRESETS.find(x=>x.id===p);
    if(def&&def.url)$("#aiUrl").value=def.url;
    if(!isLocal()&&AI.key)
     HOOK.report("wr","بدّلتَ المزوّد والمفتاح القديم معه — "
      +"تأكّد أنه لهذه الوجهة");
   }
   AI.url=$("#aiUrl").value.trim();
   const k=$("#aiKey").value;
   if(k&&!/^•+$/.test(k))AI.key=k.trim();
   AI.model=$("#aiModel").value.trim();
   AI.temp=Math.max(0,Math.min(1,parseFloat($("#aiTemp").value)||0));
   AI.vision=$("#aiVis").checked?1:0;
   AI.on=$("#aiOn").checked?1:0;
   if($("#aiKeep"))AI.keep=$("#aiKeep").checked?1:0;
   if($("#aiIns"))AI.wantIns=$("#aiIns").checked?1:0;
   if($("#aiTtl"))AI.wantTtl=$("#aiTtl").checked?1:0;
   AI.__ok=0;                    /* الوجهة قد تكون تغيّرت */
   saveAI(); put(); renderAI();
   if(id==="aiKeep"&&!AI.keep)
    HOOK.report("in","المفتاح لهذه الجلسة وحدها — لن يُكتَب "
     +"على القرص");
  };
  el.onkeydown=e=>{
   if(e.key==="Escape"){el.blur();return}
   e.stopPropagation();
  };
 });
 const s=$("#aiSend");
 if(s)s.onclick=()=>askFromLine(($("#aiAsk").value||"").trim());
 const a=$("#aiAsk");
 if(a)a.onkeydown=e=>{
  if(e.key==="Escape"){a.blur();return}
  if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){
   e.preventDefault();
   askFromLine((a.value||"").trim());
   return;
  }
  e.stopPropagation();
 };
 const rv=$("#aiReview");
 if(rv)rv.onclick=()=>reviewFromLine();
 const c=$("#aiKeyClr");
 if(c)c.onclick=()=>{AI.key=""; saveAI(); put();
  HOOK.report("in","مُسح المفتاح")};
 wireLocalGen();
 const mBtn=$("#aiModels");
 if(mBtn)mBtn.onclick=async()=>{
  if(!AI.url){HOOK.report("wr","اضبط العنوان أوّلاً");return}
  mBtn.disabled=true;
  const box=$("#aiModelsBox");
  if(box)box.innerHTML=`<p class="hint">يُجلب…</p>`;
  try{
   const ids=await listModels();
   /* datalist يُغذّى كلّه — والإكمال التلقائي يظهر في حقل الموديل */
   const dl=$("#aiModelList");
   if(dl)dl.innerHTML=ids.map(x=>`<option value="${esc(x)}">`)
    .join("");
   /* وصندوقٌ قابل للنقر لمن لا يستعمل الإكمال */
   if(box){
    box.innerHTML=ids.slice(0,60).map(x=>
     `<button type="button" class="ro mono u-dd1c5"  data-m="${esc(x)}">`
      +`${esc(x)}</button>`).join("")
     +(ids.length>60?`<p class="hint">… و${ids.length-60} أخرى `
      +`— تظهر في إكمال حقل الموديل</p>`:"");
    box.querySelectorAll("[data-m]").forEach(b=>
     b.onclick=()=>{AI.model=b.dataset.m; saveAI(); put();
      HOOK.report("in",`اختير ${b.dataset.m}`)});
   }
   HOOK.report("ok",`${ids.length} نموذجاً من ${hostOf()}`);
  }catch(e){
   if(box)box.innerHTML="";
   HOOK.report("er",errMsg(e));
  }finally{mBtn.disabled=false}
 };
 renderAI();
}

/* ═══ توليد محلّي بلا اتصال ═══ ai/generate.js فقط — لا AI.on ولا
   شبكة. نفس عقد لوحة ops أعلاه: معاينةٌ (validate) بلا كتابة، ثم
   تنفيذٌ صريح بنقرة يعبر runOps فخطوة تراجعٍ واحدة. */
function renderGenReport(r,committed){
 const b=$("#genBox");
 if(!b)return;
 if(!r){b.innerHTML="";return}
 let h=`<p class="hint">${r.valid} عمليةً صالحة`
  +(r.rejected.length?` · <span class="warn">`
   +`${r.rejected.length} مرفوضة</span>`:"")
  +(r.unmatched.length?` · ${r.unmatched.length} لم يُفهَم`:"")+`</p>`;
 h+=r.rejected.map(x=>`<div class="ro u-22dea" >#${x.i}: ${esc(x.why)}</div>`).join("");
 r.unmatched.forEach(u=>{h+=`<div class="ro u-4da04" >لم يُفهَم: ${esc(u)}</div>`});
 if(committed&&r.result)
  h+=`<p class="hint u-54305" >${esc(r.result.say)} `
   +`· Ctrl+Z يتراجع عنها</p>`;
 else if(r.valid)
  h+=`<p class="hint">معاينةٌ فقط — لم يُكتَب شيء. اضغط `
   +`«توليد ونفّذ» للتثبيت.</p>`;
 b.innerHTML=h;
}
function runLocalGen(commit){
 const a=$("#genAsk");
 const text=(a?a.value:"").trim();
 if(!text){HOOK.report("wr","اكتب وصفاً أوّلاً");return}
 const r=generateFromText(text,{commit});
 renderGenReport(r,commit);
 if(commit&&r.committed){
  if(editFailed()){HOOK.report("er","تعذّر التنفيذ");return}
  HOOK.report(r.rejected.length?"wr":"ok",
   `${r.result.say} · Ctrl+Z يتراجع عنها`);
  HOOK.refresh(1);
 }else{
  HOOK.report(r.valid?"in":"wr",
   `${r.valid} من ${r.generated} عمليةً صالحة`
   +(r.unmatched.length?` · ${r.unmatched.length} لم يُفهَم`:""));
 }
}
function wireLocalGen(){
 const run=$("#genRun"); if(run)run.onclick=()=>runLocalGen(true);
 const prev=$("#genPrev"); if(prev)prev.onclick=()=>runLocalGen(false);
}
