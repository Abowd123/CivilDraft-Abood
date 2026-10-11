/* ═══ لوحة الفاحص والورقة والمرجع والتصدير ═══
   الفاحص يُنفَّذ بزرّ. كل سطر قابل للنقر يحدّد العنصر ويقفز إليه،
   ولا يعدّل شيئاً. */
import {sizeNotice,S,edit,editFailed,shapeNotes} from "../core/state.js";
import {m2,m3,clamp,dim2,scl} from "../core/units.js";
import {LIM} from "../core/limits.js";
import {inspect,SEV} from "../core/inspect.js";
import {CODE_FIELDS,CODE,codeShown,setCodeVal,setCodeOn,resetCode,
        codeChanged} from "../core/code.js";
import {openSchedule,okName} from "../core/opens.js";
import {schedule} from "../core/areas.js";
/* ═══ التصدير ═══ الفاحص لا يعرف صيغةً: المصدِّر يعرفها وحده ═══ */
import * as EX from "../io/export.js";
import {buildReport,saveReport} from "../io/report.js";
import {createZip} from "../io/zip.js";
import {sceneBBox} from "../core/render.js";
import {paperMM,SNAMES,fitsSheet,activeSheetDef,
  visibleViewportCount} from "../core/sheet.js";
import {anyHidden,pickable} from "../core/layers.js";
import {hasRef,refCount,clearRef,resetRef,srcList,srcOn,srcSet,
        srcShown,isIdent,refTr,refSnapCount,refStats,setRef,
        KIND} from "../core/ref.js";
import {parseDXF,decodeDXF,skipSummary,MAXENT,MAXPTS,
        MAXCO} from "../io/dxfin.js";
import {projectExt,bindDesktop} from "../io/platform.js";
import {toJSON,fromJSON,dl,pickFile,pickBin,
        humanSize} from "../io/project.js";
import {setSel,fitBox,draw,V} from "./canvas.js";
import {HOOK,lazy} from "./bus.js";
import {withProgress} from "./overlay.js";
import {keepFocus} from "./cmdline.js";
import {escapeHtml as esc,errMsg} from "../core/escape.js";

const $=s=>document.querySelector(s);

let LAST=null;

export function runInspect(){
 LAST=inspect(sceneBBox());
 renderFindings();
 const {er,wr}=LAST;
 HOOK.report(er?"er":(wr?"wr":"ok"),
  (er||wr||LAST.in)
   ? `الفاحص: ${er} خطأ · ${wr} تنبيه · ${LAST.in} ملاحظة`
   : "الفاحص: لا ملاحظات");
 return LAST;
}
export const clearFindings=()=>{LAST=null; renderFindings()};

function renderFindings(){
 const box=$("#insp");
 if(!box)return;
 if(!LAST){
  box.innerHTML=`<p class="hint">اضغط «افحص» — لا شيء يُفحَص `
   +`تلقائياً مع كل رسمة</p>`;
  return;
 }
 if(!LAST.list.length){
  box.innerHTML=`<p class="hint u-018d5" >`
   +`لا ملاحظات · المخطط سليم بحسب الفحوص المتاحة</p>`;
  return;
 }
 box.innerHTML=`<p class="hint">${LAST.er} خطأ · ${LAST.wr} تنبيه `
  +`· ${LAST.in} ملاحظة — انقر السطر للقفز</p>`
  +LAST.list.slice(0,120).map((f,i)=>
   `<div class="ro insrow ${esc(f.sev)}" data-ins="${i}">`
   +`${esc(SEV[f.sev])}: ${esc(f.msg)}</div>`).join("")
  +(LAST.list.length>120
   ? `<p class="hint">… و ${LAST.list.length-120} ملاحظة أخرى</p>`
   : "")
  +`<p class="hint">الفاحص لا يصلح شيئاً — يخبرك وأنت تقرّر</p>`;
}
/* ═══ الورقة ═══ */
export function syncSheet(){
 if(!$("#shOn"))return;
 $("#shOn").checked=!!+S.sheet.on;
 $("#shSize").value=S.sheet.size;
 $("#shOr").value=S.sheet.orient;
 /* المقاس المخصّص: حقلا العرض/الارتفاع يظهران له وحده */
 const cr=$("#shCustomRow");
 if(cr){
  cr.hidden=(S.sheet.size!=="custom");
  $("#shCW").value=S.sheet.customW;
  $("#shCH").value=S.sheet.customH;
 }
 $("#shMar").value=S.sheet.margin;
 $("#shTb").checked=!!+S.sheet.tb;
 const t=S.title||{};
 $("#tProj").value=t.proj||"";
 $("#tOwner").value=t.owner||"";
 $("#tLoc").value=t.loc||"";
 $("#tSheet").value=t.sheet||"";
 $("#tRev").value=t.rev||"";
 $("#tBy").value=t.by||"";
 const p=paperMM();
 const f=fitsSheet(sceneBBox());
 const el=$("#shInfo");
 if(el)el.innerHTML=`${esc(dim2(p[0],p[1],"مم"))} · ${esc(scl(S.meta.scale))} `
  +`⇒ ${esc(dim2((p[0]*S.meta.scale/1000).toFixed(1),
      (p[1]*S.meta.scale/1000).toFixed(1),"م"))} نموذجياً`
  +(+S.sheet.on
   ? (f.ok?`<br><span class="u-018d5">الرسم داخل الإطار`
     +`</span>`
     :`<br><span class="warn">يتجاوز الإطار بـ ${m2(f.over)} م`
     +`</span>`)
   : "");
}
/* ═══ المرجع ═══ */
export function renderRef(){
 const box=$("#rInfo"), lay=$("#rLays");
 if(!box)return;
 if(!hasRef()){
  box.innerHTML=`<span class="hint">لا مرجع — «استورد DXF» يضع `
   +`الملفّ خلفيةً للقياس والالتقاط</span>`;
  if(lay)lay.innerHTML="";
  return;
 }
 const r=refStats(), t=refTr();
 const by=Object.keys(r.by).map(k=>`${r.by[k]} ${KIND[k]||k}`)
  .join(" · ");
 box.innerHTML=`<b>${esc(r.name||"بلا اسم")}</b><br>`
  +`${r.n} كياناً (${by})<br>`
  +`الوحدة: ${esc(r.units)}`
  +(r.guessed?` <span class="warn">(مفترضة)</span>`:"")
  +` · الترميز ${esc(r.enc)}<br>`
  +`التحويل: ×${t.k.toFixed(5)} · ${t.rot.toFixed(2)}° · `
  +`${m2(t.dx)},${m2(t.dy)} م`
  +(isIdent()?` <span class="hint">(لم يُحاذَ بعد)</span>`:"")
  +`<br>${refSnapCount()} نقطة التقاط`
  +(r.trunc?`<br><span class="warn">استُثني ${r.trunc} كياناً `
   +`لتجاوز الحدّ</span>`:"");
 if(!lay)return;
 const L=srcList();
 lay.innerHTML=`<p class="hint">طبقات الملفّ `
  +`(${srcShown()}/${L.length}) — الإخفاء هنا داخل المرجع وحده`
  +`</p>`
  +L.slice(0,60).map(n=>{
   const on=srcOn(n);
   return `<div class="rsrc${on?"":" off"}">`
    +`<button data-rsrc="${esc(n)}">${on?"◉":"○"}</button>`
    +`<span class="rsn">${esc(n)}</span>`
    +`<span class="ro rsc">`
    +`${S.ref.src[n]}</span></div>`;
  }).join("")
  +(L.length>60?`<p class="hint">… و ${L.length-60} طبقة</p>`:"");
}
/* ═══ لوحة اشتراطات الكود ═══
   القيَم إرشاديةٌ «تُعدَّل» — وقبل هذه اللوحة كان الوعدُ بالتعديل بلا
   مدخل. الحقول من CODE_FIELDS وحدها: حقلٌ يُضاف هناك يظهر هنا بلا لمسة.
   والحفظ في setCodeVal نفسها، فلا مسارَ يعدّل ولا يحفظ.

   والنتائج القائمة قديمةٌ بعد أي تعديل: إن كان الفاحص قد شُغِّل
   يُعاد تشغيله فيرى المستخدم أثر القيمة فوراً، وإلا فلا شيءَ يُفحَص
   من تلقاء نفسه (العقد: «لا شيء يُفحَص تلقائياً مع كل رسمة»). */
export function renderCodeBox(){
 const F=$("#codeF");
 if(!F)return;
 F.innerHTML=CODE_FIELDS.map(d=>
  `<div class="row"><label for="cf_${d.k}">${esc(d.n)} `
  +`<span class="ro">(${esc(d.u)})</span></label>`
  +`<input id="cf_${d.k}" data-cf="${d.k}" type="number" `
  +`min="${d.min}" max="${d.max}" step="${d.step}" `
  +`value="${codeShown(d.k)}"></div>`).join("");
 syncCodeBox();
}
export function syncCodeBox(){
 const on=$("#codeOn");
 if(on)on.checked=!!+CODE.on;
 CODE_FIELDS.forEach(d=>{
  const el=$("#cf_"+d.k);
  if(el&&document.activeElement!==el)el.value=codeShown(d.k);
 });
 const info=$("#codeInfo");
 if(info){
  const n=codeChanged().filter(k=>k!=="on").length;
  info.textContent=(n
   ? `${n} قيمةٍ معدَّلة عن الافتراضي · `:"القيَم الافتراضية · ")
   +"إرشادية لا نصّ نظام — طابِقها مع الكود المعتمد في بلدك. "
   +"تُحفَظ في هذا المتصفّح.";
 }
}
const codeChanged_=()=>{
 syncCodeBox();
 if(LAST)runInspect();
};
export function wireCodeBox(){
 const F=$("#codeF");
 if(!F)return;
 renderCodeBox();
 F.addEventListener("change",e=>{
  const el=e.target.closest("[data-cf]");
  if(!el)return;
  const r=setCodeVal(el.dataset.cf,el.value);
  if(!r.ok){
   HOOK.report("er",r.msg);
   el.value=codeShown(el.dataset.cf);   /* يعود الحقل إلى قيمته */
   return;
  }
  codeChanged_();
 });
 const on=$("#codeOn");
 if(on)on.addEventListener("change",()=>{
  setCodeOn(on.checked);
  codeChanged_();
 });
 const rs=$("#codeRst");
 if(rs)rs.addEventListener("click",()=>{
  resetCode();
  renderCodeBox();
  if(LAST)runInspect();
  HOOK.report("ok","استُعيدت القيم الافتراضية للاشتراطات");
 });
}
/* ═══ التوصيل ═══ */
export function wireInspector(){
 wireCodeBox();
 const box=$("#insp");
 if(box)box.addEventListener("click",e=>{
  const t=e.target.closest("[data-ins]");
  if(!t||!LAST)return;
  const f=LAST.list[+t.dataset.ins];
  if(!f)return;
  /* القفز يقع دائماً — ترى موضع الملاحظة ولو كان مقفلاً.
     والتحديد يمرّ بالحرس نفسه: ما لا يُحدَّد لا يُسحَب. */
  if(f.k&&f.id){
   const s={k:f.k,id:f.id};
   if(pickable(s))setSel([s],s);
   else HOOK.report("in",`${f.id} على طبقةٍ مخفيّة أو مقفلة — `
    +`قُفِز إلى موضعه ولم يُحدَّد`);
  }
  if(f.p){
   const r=Math.max(1500,2200/Math.max(1e-6,V.k));
   fitBox({x0:f.p[0]-r,y0:f.p[1]-r,x1:f.p[0]+r,y1:f.p[1]+r},0.1);
  }
  draw();
  HOOK.status(f.msg);
 });
 $("#bInsp").onclick=()=>runInspect();

 /* ═══ CSV ═══ BOM لأجل إكسل العربي · CRLF لأجل ويندوز ═══ */
 const csv=rows=>"\uFEFF"+rows.map(r=>r.map(c=>{
  const s=String(c==null?"":c);
  return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
 }).join(",")).join("\r\n")+"\r\n";

 $("#bOsCsv").onclick=()=>{
  const d=openSchedule();
  if(!d.rows.length){HOOK.report("in","لا فتحات");return}
  const R2=[["الرمز","النوع","العرض م","الارتفاع م","الجلسة م",
   "المصاريع","عمق الكوّة م","العدد","المعرّفات"]];
  d.rows.forEach(r=>R2.push([r.mark,okName(r.kind),m2(r.w),m2(r.h),
   m2(r.sill),r.pan,r.dep?m2(r.dep):"",r.n,r.ids.join(" ")]));
  R2.push(["","المجموع","","","","","",d.total,""]);
  const n=dl(EX.safeName(S.meta.name+"-فتحات","csv"),csv(R2),
   "text/csv;charset=utf-8");
  HOOK.report("ok",`جدول الفتحات · ${d.rows.length} نوعاً · `
   +`${humanSize(n)}`);
 };
 $("#bAsCsv").onclick=()=>{
  const d=schedule();
  if(!d.rows.length){HOOK.report("in","لا مناطق");return}
  const R2=[["المنطقة","المساحة م²","المحيط م","الحالة"]];
  d.rows.forEach(r=>R2.push([r.name,(r.ar/1e6).toFixed(2),
   m3(r.pr),r.stale?"قديمة":"مطابقة"]));
  R2.push(["المجموع",(d.total/1e6).toFixed(2),"",""]);
  const n=dl(EX.safeName(S.meta.name+"-مساحات","csv"),csv(R2),
   "text/csv;charset=utf-8");
  HOOK.report("ok",`جدول المساحات · ${d.rows.length} منطقة · `
   +`${humanSize(n)}`);
 };
 /* ═══ التصدير ═══
    زرٌّ واحدٌ أربع مرّات: النطاق والتسمية والحصيلة والتحذيرات في
    io/export.js، وهنا التنزيل وحده. وكانت خمسةُ أشياءَ مكرّرةً
    أربع مرّات، فانجرفت: warnClip في الأربعة وsayNotes في اثنين،
    وزرّان غير متزامنَين واثنان متزامنان.
    والخيارات قراءةٌ واحدة: «ألوان التنبيه» مُطفأٌ افتراضاً لأن
    التسليم للعميل لا يحمل ألوان تشخيص. */
 const wantWarn=()=>!!($("#xWarn")&&$("#xWarn").checked);
 const wantDark=()=>!!($("#xDark")&&$("#xDark").checked);
 const wantStrip=()=>!!($("#xStrip")&&$("#xStrip").checked);
 const dpiOf=()=>clamp(parseInt(($("#xDpi")||{}).value,10)||300,
  72,1200);
 /* «كل الأوراق»: تُفعَّل فقط إن وُجدت ورقةٌ بمنفذٍ ظاهر (نفس شرط
    batchSheets في export.js) وإلا يبقى السلوك القديم. */
 const wantAll=()=>!!($("#xAllSheets")&&$("#xAllSheets").checked);
 const allMode=()=>(document.querySelector('input[name="allMode"]:checked')
  ||{}).value||"zip";
 const batchN=()=>(S.sheets||[]).filter(s=>visibleViewportCount(s)>0).length;
 const syncExport=()=>{
  const el=$("#xInfo");
  if(!el)return;
  if(wantAll()&&batchN()>0)
   el.textContent=`كل الأوراق: ${batchN()} ورقة · `
    +`${allMode()==="singlePdf"?"PDF مجمّع (للـPDF فقط)":"ZIP منفصل"}`;
  else el.textContent=EX.summary();
 };
 const xAll=$("#xAllSheets"), xAllOpts=$("#xAllOpts");
 if(xAll&&xAllOpts)xAll.onchange=()=>{
  xAllOpts.hidden=!xAll.checked;
  syncExport();
 };
 document.querySelectorAll('input[name="allMode"]')
  .forEach(r=>{r.onchange=syncExport});
 /* آخر تصدير ناجح — يُحفَظ تقريرُه بزرّ (لا تنزيلٌ تلقائيّ) */
 let lastRun=null;
 const repBtn=$("#xRep");
 if(repBtn)repBtn.onclick=()=>{
  if(!lastRun)return;
  /* الدفعيّ لا خطّةَ مفردة له: نبني وصفاً من نتيجته (اسم الملفّ الناتج) */
  const pl=lastRun.plan||{name:(lastRun.zip&&lastRun.zip.name)||lastRun.name
   ||EX.safeName((S.meta.name||"PLAN")+"-كل_الأوراق","json"),
   fmt:lastRun.fmt,scale:1,page:null,box:null};
  saveReport(buildReport(pl,lastRun));
 };
 const BTN={xDxf:"dxf",xSvg:"svg",xPng:"png",xPdf:"pdf"};
 const busy=v=>Object.keys(BTN).forEach(id=>{
  const b=$("#"+id);
  if(b)b.disabled=!!v;
 });
 Object.keys(BTN).forEach(id=>{
  const el=$("#"+id);
  if(!el)return;
  el.onclick=async()=>{
   const fmt=BTN[id];
   const useAll=wantAll()&&batchN()>0;
   const mode=allMode();
   /* فحصٌ مسبق: الخطأ يمنع، والتحذير يُسأل عنه قبل التنفيذ. وما قيل
      هنا لا يُعاد قوله من تقرير run (نفس النصّ). */
   const pre=useAll?EX.preflightAll(fmt):EX.preflight(fmt);
   const said=new Set();
   if(pre.length){
    pre.forEach(m=>{said.add(m.s); HOOK.report(m.lv,m.s)});
    if(pre.some(p=>p.lv==="er"))return;
    if(pre.some(p=>p.lv==="wr")
       &&!confirm("توجد تحذيرات قبل التصدير — متابعة؟"))return;
   }
   busy(1);
   HOOK.status(`يُبنى ${EX.FMT[fmt].n}…`);
   try{
    if(useAll){
     const r=await withProgress(`يُبنى ${EX.FMT[fmt].n} — كل الأوراق`,
      signal=>EX.runAll(fmt,{dark:wantDark(),showWarn:wantWarn(),
       dpi:dpiOf(),signal,allSheets:true,allMode:mode,
       stripAuthor:wantStrip()}));
     if(r.ok){
      if(r.files){
       /* runAll جهّز ZIP في وضع zip؛ وفي وضع files لا zip فنبنيه هنا.
          (singlePdf يرجع blob مفرداً لا files.) */
       const z=r.zip||{name:EX.safeName((S.meta.name||"PLAN")
         +"-كل_الأوراق","zip"),mime:"application/zip",blob:null,
        raw:createZip(r.files.map(f=>({name:f.name,raw:f.raw})))};
       dl(z.name, z.blob||z.raw, z.mime);
      }else dl(r.name, r.blob||r.raw, r.mime);
      lastRun=r;
      const rb=$("#xRep");
      if(rb)rb.disabled=false;
     }
     (r.report||[]).forEach(m=>{if(!said.has(m.s))HOOK.report(m.lv,m.s)});
    }else{
    /* شريطُ تقدّمٍ قابلٌ للإلغاء في #log: الإلغاء يُسقِط الناتج فلا
       يُنزَّل (run تفحص الإشارة بعد البناء) */
    const r=await withProgress(`يُبنى ${EX.FMT[fmt].n}`,
     signal=>EX.run(fmt,{dark:wantDark(),
      showWarn:wantWarn(), dpi:dpiOf(), signal,
      stripAuthor:wantStrip()}));
    if(r.ok){
     dl(r.name, r.blob||r.raw, r.mime);
     lastRun=r;
     const rb=$("#xRep");
     if(rb)rb.disabled=false;
    }
    r.report.forEach(m=>{if(!said.has(m.s))HOOK.report(m.lv,m.s)});
    }
   }catch(e){
    HOOK.report("er",`${EX.FMT[fmt].n}: `+errMsg(e));
   }
   busy(0);
   syncExport();
   /* الأزرار عُطِّلت أثناء العمل فضاع التركيز منها إلى body */
   keepFocus();
  };
 });
 /* السطر يُحدَّث عند فتح القسم وبعد كل تصدير وبعد تغيّر الورقة:
    مقاسُها واتجاهُها ورقمُ اللوحة كلُّها فيه. */
 const sec=document.querySelector('details[data-sec="export"]');
 if(sec)sec.addEventListener("toggle",syncExport);
 syncExport();

 $("#xSave").onclick=()=>{
  const strip=wantStrip();
  const n=dl(EX.safeName(S.meta.name,projectExt()),
   toJSON({stripAuthor:strip}),"application/json");
  if(strip)HOOK.report("in",
   "حُفظت نسخةٌ بلا بيانات المحرّر (المشروع/المالك/الموقع/الرسم) — "
   +"مشروعك المفتوح لم يتغيّر");
  HOOK.report("ok",`حُفظ المشروع · ${humanSize(n)}`);
  if(anyHidden()||hasRef())HOOK.report("in",
   "الملفّ يحمل كل شيء بما فيه المخفيّ والمرجع — الإخفاء عرضٌ "
   +"لا حذف. وهو ليس مخرَجاً: بلا هيئةٍ ولا نطاقٍ ولا مقياس.");
 };
 /* openText: زرّ «افتح» وفتحُ الملفّ بالنقر المزدوج (سطح المكتب) يمرّان
  من هنا — فحصٌ واحد وتأكيدٌ واحد وتقريرٌ واحد. */
 const openText=(txt,name)=>{
   if(txt==null){HOOK.report("wr","لم يُقرأ ملفّ");return}
   if((S.walls.length||S.cols.length)
    &&!confirm("فتح ملفّ؟ سيُفقد غير المحفوظ."))return;
   try{
    const r=fromJSON(txt);
    LAST=null;
    HOOK.refresh(1);
    /* ما طُرح/قُوِّم عند التحميل يُقال — fromJSON تستهلك shapeNotes()
       الآن وتُعيدها في r.notes، فلا نستهلكها مرّةً ثانية هنا (القراءة
       تُفرِّغ السجلّ)؛ والاحتياطُ shapeNotes() يبقى لملفّاتٍ/مساراتٍ
       لا تملأ r.notes. */
    const notes=(r.notes&&r.notes.length)?r.notes:shapeNotes();
    notes.forEach(([sev,msg])=>HOOK.report(sev,msg));
    HOOK.report("ok",`فُتح ${name} · ${r.walls} جدار · `
     +`${r.opens} فتحة · ${r.cols} عمود · ${r.areas} منطقة · `
     +`${r.dims} بُعد`+(r.ref?` · مرجع ${r.ref} كياناً`:""));
    {const z=sizeNotice(); if(z)HOOK.report(z.sev,z.msg)}   /* المرحلة ٥ */
    syncExport();
    lazy(()=>import("./canvas.js").then(C=>C.fit()),"ملاءمة العرض");
   }catch(e){HOOK.report("er",errMsg(e))}
 };
 $("#xOpen").onclick=()=>pickFile(openText);
 bindDesktop(openText);
 /* ═══ الورقة ═══ */
 $("#shOn").onchange=()=>{
  edit(()=>{S.sheet.on=$("#shOn").checked?1:0});
  HOOK.refresh(0);
  syncExport();
 };
 ["shSize","shOr","shMar","shTb","shCW","shCH"].forEach(id=>{
  const el=$("#"+id);
  if(!el)return;
  el.onchange=()=>{
   edit(()=>{
    const sv=$("#shSize").value;
    S.sheet.size=(SNAMES.includes(sv)||sv==="custom") ? sv : "A3";
    const cL=LIM.sheetCustom;
    S.sheet.customW=clamp(Math.round(parseFloat($("#shCW").value)
     ||S.sheet.customW||420),cL.min,cL.max);
    S.sheet.customH=clamp(Math.round(parseFloat($("#shCH").value)
     ||S.sheet.customH||297),cL.min,cL.max);
    S.sheet.orient=($("#shOr").value==="p")?"p":"l";
    S.sheet.margin=clamp(parseFloat($("#shMar").value)||12,0,60);
    S.sheet.tb=$("#shTb").checked?1:0;
   });
   HOOK.refresh(0);
   syncExport();
  };
 });
 $("#shCenter").onclick=()=>{
  edit(()=>{const sh=activeSheetDef();
   if(sh){sh.cx=null; sh.cy=null}
   else {S.sheet.cx=null; S.sheet.cy=null}});
  HOOK.report("in","الورقة تُتَمركَز على الرسم");
  HOOK.refresh(0);
  syncExport();
 };
 ["tProj","tOwner","tLoc","tSheet","tRev","tBy"].forEach(id=>{
  const el=$("#"+id);
  if(!el)return;
  el.onchange=()=>{
   edit(()=>{
    S.title.proj=$("#tProj").value.slice(0,60);
    S.title.owner=$("#tOwner").value.slice(0,60);
    S.title.loc=$("#tLoc").value.slice(0,60);
    S.title.sheet=$("#tSheet").value.slice(0,16);
    S.title.rev=$("#tRev").value.slice(0,8);
    S.title.by=$("#tBy").value.slice(0,30);
   });
   HOOK.refresh(0);
   syncExport();      /* رقمُ اللوحة والمراجعة في اسم الملفّ */
  };
  el.onkeydown=e=>{
   if(e.key==="Escape"){el.blur();return}
   e.stopPropagation();
  };
 });
 /* ═══ المرجع ═══ */
 $("#rImp").onclick=()=>{
  pickBin(".dxf",(buf,name)=>{
   if(!buf){HOOK.report("wr","لم يُقرأ ملفّ");return}
   try{
    const {txt,enc}=decodeDXF(buf);
    const u=$("#rUnit").value;
    const res=parseDXF(txt,{unit:u?parseFloat(u):null,
     cap:MAXENT});
    res.enc=enc;
    if(!res.ents.length)
     throw new Error("لم يُنتج الملفّ كياناً واحداً مقروءاً");
    edit(()=>setRef(res,name));
    if(res.rejected)HOOK.report("wr",`${res.rejected} كياناً رفضه المُثبِّت `
     +`(إحداثيٌّ فاسد أو خارج الحدّ) ولم يدخل المرجع`);
    HOOK.report("ok",`استُورد ${name} · ${res.ents.length} كياناً `
     +`على ${Object.keys(res.src).length} طبقة · الوحدة `
     +`${res.units.name}${res.guessed?" (مفترضة)":""} · `
     +`الترميز ${enc} · ${humanSize(buf.byteLength||0)}`);
    /* التوقّف يُعلَن أوّلاً: المرجع منقوصٌ بقدرٍ لا يُعرَف، فلا
       يُقاس عليه — وأخطر ما في القراءة أن تمضي وأنت تحسبها تمّت */
    if(res.stop)HOOK.report("er",
     res.stop==="ops"
      ? `تُوقّف التحليل عند ${res.ops.toLocaleString("en")} عملية — `
        +`الملفّ يحوي بلوكاتٍ متعشّقة عميقاً أو مصفوفاتٍ ضخمة. `
        +`المرجع منقوصٌ بقدرٍ لا يُعرَف — لا تقِس عليه.`
      : `تُوقّف التحليل بعد ${Math.round(res.ms/1000)} ثانية — `
        +`الملفّ أكبر مما يُحلَّل في المتصفّح. جرّب حفظه من `
        +`برنامجك بعد حذف ما لا تحتاجه.`);
    if(res.clipped)HOOK.report("wr",
     `${res.clipped} كياناً قُصَّت رؤوسه عند ${MAXPTS} — `
     +`مضلّعاتٌ بعشرات الآلاف من النقاط لا تُقاس عليها`);
    const sk2=res.skip["قيمة خارج المدى"];
    if(sk2)HOOK.report("wr",`${sk2} كياناً نُبِذ لقيَمٍ خارج `
     +`المدى (±${(MAXCO/1e6).toFixed(0)} كم) — وحدةٌ خاطئة أو `
     +`ملفٌّ معطوب`);
    const sk=skipSummary(res.skip,["قيمة خارج المدى"]);
    if(sk)HOOK.report("in",`تُخطّي: ${sk}`);
    if(res.trunc)HOOK.report("wr",`استُثني ${res.trunc} كياناً `
     +`لتجاوز الحدّ (${MAXENT}) — المرجع منقوص`);
    if(res.approx.spline)HOOK.report("in",
     `${res.approx.spline} منحنى SPLINE رُسم متقطّعاً — `
     +`التقطيع علامةُ التقريب`);
    if(res.guessed)HOOK.report("wr",
     "وحدة الملفّ مجهولة وفُرضت مليمتراً — عاير المرجع بمسافةٍ "
     +"تعرفها قبل أن تقيس عليه");
    HOOK.report("in","المرجع جامد: لا يُحدَّد ولا يدخل المساحات. "
     +"استعمل «محاذاة المرجع» لتضعه في موضعه.");
    HOOK.refresh(1);
    import("./canvas.js").then(C=>C.fit());
   }catch(e){HOOK.report("er","DXF: "+errMsg(e))}
  });
 };
 $("#rClr").onclick=()=>{
  if(!hasRef()){HOOK.report("in","لا مرجع");return}
  if(!confirm(`إزالة المرجع (${refCount()} كياناً)؟ `
   +`رسمك لا يتأثّر.`))return;
  const n=edit(()=>clearRef());
  if(editFailed())return;
  HOOK.report("ok",`أُزيل المرجع · ${n} كياناً · الملفّ يصغر`);
  HOOK.refresh(1);
 };
 $("#rRst").onclick=()=>{
  if(!hasRef())return;
  edit(()=>resetRef());
  HOOK.report("in","صُفّر تحويل المرجع — عاد إلى إحداثياته "
   +"المستوردة");
  HOOK.refresh(0);
 };
 const rl=$("#rLays");
 if(rl)rl.addEventListener("click",e=>{
  const n=e.target.dataset.rsrc;
  if(!n)return;
  const on=edit(()=>srcSet(n,srcOn(n)));
  if(editFailed())return;
  HOOK.report("in",`طبقة المرجع «${n}»: ${on?"ظاهرة":"مخفيّة"}`);
  HOOK.refresh(0);
 });
}
