/* ═══ اللوحة الجانبية: المشروع · الطبقات · الخصائص · الجدول ═══
   في التحديد المتعدّد: الحقل المختلف يظهر فارغاً بعلامة «متعدّد»
   ولا يُكتب من تلقائه. */
import {S,edit,editFailed,canUndo,canRedo,newState,ensureShape,setEditError} from "../core/state.js";
import {M,m2,m3,mnum,clamp,isLen,sqm,deg,rng2,dm2,dim2} from "../core/units.js";
import {wallById,wallLen,dir,looseEnds,isLow,lowH,isArc,arcParams} from "../core/walls.js";
import {openById,okName,OK,openState,allowed,saySpans,span,panOf,openSchedule} from "../core/opens.js";
import {areaById,netArea,netPerim,isStale,restamp,rebake,schedule} from "../core/areas.js";
import {roofById,roofArea,RTYPE} from "../core/roof.js";
import {dimById,chainById,annoById,dimValue,fmtLen,fmtAng,dimText,DK,AK,
        dimLoose,chainVals,chainSum,levelStr,
        isOverridden,parseVals,clearAxes} from "../core/dims.js";
import {colById,colArea,colOnWall} from "../core/cols.js";
import {fixById,fixName,fixOnWall,snapToWall} from "../core/fixt.js";
import {stById,stCheck,stGeoms} from "../core/stairs.js";
import {mkSheet,updateViewport,viewportTransform,VP_SCALES,setViewportScale} from "../core/sheet.js";
import {scene,regionLoops} from "../core/render.js";
/* من layers.js — يُضاف: layOf · hasLay · LT · LWS · plotAll
   · noPlotCount · وحالاتُ الطبقات · resetLays */
import {ltList} from "../core/ltypes.js";
import {LAYS,layOf,hasLay,LNAME,AUX,LWS,vis,locked,plots,setLay,pickable,toggleOff,toggleLock,isolate,showAll,unlockAll,plotAll,resetLays,layCounts,hiddenCount,noPlotCount,anyHidden,anyLocked,layStates,stateSave,stateApply,stateDel,layOfEnt,addLay,delLay,isCustom} from "../core/layers.js";
/* ومن batch.js — يُضاف clearAreaNames */
import {FLD,fldOf,fldName,fieldVal,groupSel,groupOrder,readField,
        applyField,applyOne,sayApply,groupForced,summary,
        renumberCols,clearDimTxt,clearAreaNames,
        nameAreasSeq} from "../core/batch.js";
import {NAME,delSay} from "../core/ents.js";
import {selList,delSel,setSel,fit,draw,pruneSel} from "./canvas.js";
import {syncSheet,renderRef} from "./inspector.js";
import {syncStatus} from "./statusbar.js";
import {syncOverlay} from "./overlay.js";
import {syncLevelBar} from "./levelbar.js";
import {lazy} from "./bus.js";
import {reg,renderPanel,renderVisible,markAllDirty,markDirty,
        wirePanels} from "./panels.js";
import {escapeHtml as esc} from "../core/escape.js";
import {clearCompareBase} from "../core/compare.js";
import {liveById} from "../core/live.js";

const $=s=>document.querySelector(s);
const H_sel=()=>selList();

/* ═══ السجل ═══ */
const LOG=$("#log");
const CLS={ok:"ok",er:"er",wr:"wr",in:"in"};
export function rep(cls,msg){
 if(!LOG)return;
 const d=document.createElement("div");
 d.className="ln "+(CLS[cls]||"in");
 d.textContent=String(msg==null?"":msg);
 LOG.appendChild(d);
 while(LOG.childElementCount>400)LOG.removeChild(LOG.firstChild);
 LOG.scrollTop=LOG.scrollHeight;
}
setEditError(m=>rep("er",m));
export const eInfo=m=>{const e=$("#stInfo"); if(e)e.textContent=m||""};
const eSel=m=>{const e=$("#stSel"); if(e)e.textContent=m||""};

const OPT=(arr,cur)=>arr.map(([v,t])=>
 `<option value="${esc(v)}"${String(v)===String(cur)?" selected":""}>`
 +`${esc(t)}</option>`).join("");

/* ═══ بناء اللوحة ═══ */
export function buildSide(){
 $("#side").innerHTML=`
<details class="sec" data-sec="proj" open><summary>المشروع</summary>
 <div class="row"><label>اسم اللوحة</label>
  <input id="mName" type="text"></div>
 <div class="row2">
  <div class="f"><label>المقياس 1:</label>
   <input id="mScale" type="number" inputmode="decimal" min="1" max="5000" step="1"></div>
  <div class="f"><label>النص مم</label>
   <input id="mTxt" type="number" inputmode="decimal" min="0.5" max="20" step="0.1"></div>
 </div>
 <div class="row2">
  <div class="f"><label>خارجي م</label><input id="mExt" type="text"></div>
  <div class="f"><label>داخلي م</label><input id="mInt" type="text"></div>
 </div>
 <div class="row2">
  <div class="f"><label>ارتفاع الدور م</label>
   <input id="mH" type="text"></div>
  <div class="f"><label>خطوة الالتقاط م</label>
   <input id="mSnap" type="text"></div>
 </div>
 <div class="row2">
  <div class="f"><label>تعبئة الجدران</label>
   <select id="mFill">${OPT([["none","بلا"],["hatch","هاشور"],
    ["solid","مصمّت"]],"none")}</select></div>
  <div class="f"><label>عشرية الأبعاد</label>
   <select id="mDec">${OPT([["0","0"],["1","1"],["2","2"],
    ["3","3"]],"2")}</select></div>
 </div>
 <div class="row"><label>علامة البُعد</label>
  <select id="mTick">${OPT([["slash","شرطة"],["arrow","سهم"]],
   "slash")}</select></div>
 <label class="chk u-13306" >
  <input type="checkbox" id="oJoins">
  دمج الأركان ووصلات T عند العرض</label>
 <label class="chk u-16066" >
  <input type="checkbox" id="oSolo">
  أظهر الأعمدة مستقلّة (بلا دمج)</label>
 <p class="hint">الدمج وطرح الفتحات عرضٌ لا تعديل: البيانات تبقى كما
  رسمتها. والحلقات تشمل الأعمدة دائماً.</p>
</details>

<details class="sec" data-sec="lays" open><summary>الطبقات</summary>
 <div id="lays"></div>
 <div class="btnrow">
  <button id="lAll">أظهر الكل</button>
  <button id="lUnlock">افتح المقفل</button>
 </div>
 <div class="btnrow">
  <button id="lPlotAll">أعِد الطبع</button>
  <button id="lReset" class="del">أعِد المصنع</button>
 </div>
 <p class="hint">المخفيّ لا يُرسَم ولا يُحدَّد ولا يُصدَّر.
  والمقفل يُرى ولا يُلمَس. الهندسة لا تُخفى: خبز المناطق يقرأ
  الجدران كلّها.</p>
</details>

<details class="sec" data-sec="props" open><summary>الخصائص</summary>
 <div id="props"><p class="hint">لا تحديد</p></div>
</details>

<details class="sec" data-sec="sched"><summary>جدول المساحات</summary>
 <div id="sched"></div>
 <div class="btnrow"><button id="bRefAll">حدّث القديمة</button>
  <button id="bAsCsv">CSV</button></div>
</details>

<details class="sec" data-sec="osched"><summary>جدول الفتحات</summary>
 <div id="osched"></div>
 <div class="btnrow"><button id="bOsCsv">CSV</button></div>
</details>

<details class="sec" data-sec="axes"><summary>المحاور</summary>
 <div id="axInfo" class="hint"></div>
 <div class="btnrow"><button id="bAxClr" class="del">
  امسح المحاور</button></div>
</details>

<details class="sec" data-sec="ref"><summary>المرجع المستورد</summary>
 <div class="btnrow">
  <button id="rImp" class="pri">استورد DXF</button>
  <button id="rClr" class="del">أزِل</button>
 </div>
 <div class="row2">
  <div class="f"><label>الوحدة عند الاستيراد</label>
   <select id="rUnit">
    <option value="">من الملفّ</option>
    <option value="1">مليمتر</option>
    <option value="10">سنتيمتر</option>
    <option value="1000">متر</option>
    <option value="25.4">بوصة</option>
    <option value="304.8">قدم</option>
   </select></div>
  <div class="f u-4dd61" >
   <button id="rRst" class="u-03732">صفّر التحويل</button></div>
 </div>
 <div class="btnrow">
  <button data-run="refalign">محاذاة</button>
  <button data-run="refcal">معايرة</button>
  <button data-run="refmove">نقل</button>
 </div>
 <div id="rInfo" class="hint"></div>
 <div id="rLays"></div>
 <p class="hint">المرجع جامد: تراه وتقيس عليه وتلتقط نقاطه، ولا
  يُحدَّد ولا يدخل الاتحاد ولا الحلقات ولا المساحات. ارسم جدرانك
  فوقه بيدك — لا يُستنتَج منه جدار.</p>
</details>

<details class="sec" data-sec="sheet"><summary>الورقة وبلوك العنوان</summary>
 <label class="chk u-13306" >
  <input type="checkbox" id="shOn"> أظهر الورقة</label>
 <div class="row2">
  <div class="f"><label>المقاس</label>
   <select id="shSize"><option>A4</option><option>A3</option>
    <option>A3+</option><option>A2</option><option>A2+</option>
    <option>A1</option><option>A0</option>
    <option value="custom">مخصص…</option>
   </select></div>
  <div class="f"><label>الاتجاه</label>
   <select id="shOr"><option value="l">أفقي</option>
    <option value="p">رأسي</option></select></div>
 </div>
 <div class="row2" id="shCustomRow" hidden>
  <div class="f"><label>العرض مم</label>
   <input id="shCW" type="number" inputmode="decimal" min="100" max="2000" step="1"></div>
  <div class="f"><label>الارتفاع مم</label>
   <input id="shCH" type="number" inputmode="decimal" min="100" max="2000" step="1"></div>
 </div>
 <div class="row2">
  <div class="f"><label>الهامش مم</label>
   <input id="shMar" type="number" inputmode="decimal" min="0" max="60" step="1"></div>
  <div class="f u-4dd61" >
   <label class="chk"><input type="checkbox" id="shTb">
    بلوك العنوان</label></div>
 </div>
 <div class="btnrow"><button id="shCenter">تمركز على الرسم</button></div>
 <div class="row2">
  <div class="f"><label>الورقة النشطة</label>
   <select id="shActive"></select></div>
  <div class="f"><label>عدد الأوراق</label>
   <span class="ro num" id="shCount">0</span></div>
 </div>
 <div class="btnrow">
  <button id="shAdd">＋ ورقة</button>
  <button id="shRen">أعِد التسمية</button>
  <button id="shDel" class="del">حذف</button>
 </div>
 <div class="btnrow">
  <button id="shPrev">السابقة</button>
  <button id="shNext">التالية</button>
 </div>
 <div id="vpList" class="hint"></div>
 <div id="shInfo" class="hint"></div>
 <div class="row"><label>المشروع</label>
  <input id="tProj" type="text"></div>
 <div class="row2">
  <div class="f"><label>المالك</label><input id="tOwner" type="text">
  </div>
  <div class="f"><label>الموقع</label><input id="tLoc" type="text">
  </div>
 </div>
 <div class="row2">
  <div class="f"><label>اللوحة</label><input id="tSheet" type="text">
  </div>
  <div class="f"><label>المراجعة</label><input id="tRev" type="text">
  </div>
 </div>
 <div class="row"><label>الرسم بواسطة</label>
  <input id="tBy" type="text"></div>
</details>

<details class="sec" data-sec="insp" open><summary>الفاحص</summary>
 <div class="btnrow"><button id="bInsp" class="pri">افحص (F7)</button>
 </div>
 <div id="insp"></div>
 <details class="sub" id="codeBox"><summary>اشتراطات الكود (تُعدَّل)</summary>
  <label class="chk"><input type="checkbox" id="codeOn">
   افحص الاشتراطات مع «افحص»</label>
  <div id="codeF"></div>
  <div class="btnrow"><button id="codeRst">استعِد القيم الافتراضية</button>
  </div>
  <p class="hint" id="codeInfo"></p>
 </details>
</details>

<details class="sec" data-sec="export"><summary>التصدير والملفّ</summary>
 <div class="row2">
  <div class="f"><label>دقّة PNG</label>
   <input id="xDpi" type="number" inputmode="decimal" min="72" max="1200" step="50"
    value="300"></div>
  <div class="f u-4dd61" >
   <label class="chk"><input type="checkbox" id="xDark">
    خلفية داكنة</label></div>
 </div>
 <div class="row2">
  <div class="f u-4dd61" >
   <label class="chk"><input type="checkbox" id="xWarn">
    ألوان التنبيه في المخرَج</label></div>
  <div class="f u-4dd61" >
   <label class="chk" title="يُفرَّغ المشروع والمالك والموقع والمصمّم من بلوك العنوان وبيانات الملفّ (الأصل لا يتغيّر)"><input type="checkbox" id="xStrip">
    بلا بيانات المحرر</label></div>
 </div>
 <label class="chk xall"><input type="checkbox" id="xAllSheets">
  صدّر كل الأوراق</label>
 <div id="xAllOpts" class="xall-opts" hidden>
  <label class="chk"><input type="radio" name="allMode" value="zip" checked>
   ملفات منفصلة ZIP</label>
  <label class="chk"><input type="radio" name="allMode" value="singlePdf">
   PDF واحد مجمّع</label>
 </div>
 <p class="hint" id="xInfo"></p>
 <div class="btnrow">
  <button id="xDxf">DXF</button>
  <button id="xSvg">SVG</button>
 </div>
 <div class="btnrow">
  <button id="xPng">PNG</button>
  <button id="xPdf">PDF</button>
 </div>
 <div class="btnrow">
  <button id="xRep" disabled>احفظ تقرير آخر تصدير</button>
 </div>
 <div class="btnrow">
  <button id="xSave" class="pri">احفظ المشروع</button>
  <button id="xOpen">افتح</button>
 </div>
 <p class="hint">النطاق: الورقة إن كانت مُشغّلة، وإلا الرسم بهامش.
  الأربعة يقرأون أوّليات المشهد نفسها.</p>
</details>

<details class="sec" data-sec="defs"><summary>الإعدادات الافتراضية</summary>
 <div id="defs"></div>
 <div class="btnrow"><button id="dRst" class="del">
  أعِد المصنع</button></div>
 <p class="hint">هذه هي خيارات شريط الأدوات نفسها مجموعةً في
  موضع واحد — لزجة بين الجلسات.</p>
</details>

<details class="sec" data-sec="ai"><summary>المساعد</summary>
 <div class="row"><label>الطلب (Ctrl+Enter يرسل · أو ؟ في سطر
  الإدخال)</label>
  <textarea id="aiAsk" rows="3" class="u-12ee1"></textarea></div>
 <div class="btnrow"><button id="aiSend" class="pri">أرسِل</button>
  <button id="aiReview" title="قراءةٌ فقط — لا تعدّل الرسم">مراجعة ذكية</button>
 </div>
 <label class="chk"><input type="checkbox" id="aiIns">
  أرفِق تقرير الفاحص</label>
 <label class="chk"><input type="checkbox" id="aiDes">
  اسمح بالأوامر الهادمة</label>
 <label class="chk"><input type="checkbox" id="aiTtl">
  أرفِق بلوك العنوان</label>
 <div id="aiBox"></div>
 <div id="aiRevBox"></div>
 <details class="sub"><summary>توليد محلّي (بلا اتصال)</summary><div>
  <p class="hint">أنماطٌ ثابتة معدودة — لا تحتاج إعداد مزوّدٍ ولا
   اتصالاً بالشبكة. مثال: «غرفة 4 في 5 عند 0 0، باب على W1 عند 1.2»</p>
  <div class="row"><label>الوصف</label>
   <textarea id="genAsk" rows="2" class="u-12ee1"></textarea></div>
  <div class="btnrow"><button id="genRun" class="pri">توليد ونفّذ</button>
   <button id="genPrev">معاينة فقط</button></div>
  <div id="genBox"></div>
 </div></details>
 <details class="sub"><summary>الإعداد</summary><div>
  <label class="chk"><input type="checkbox" id="aiOn"> مُشغّل</label>
  <div class="row"><label>مزوّد</label>
   <select id="aiPreset" aria-label="مزوّد جاهز">
    <option value="ollama">Ollama (محلّي)</option>
    <option value="llamacpp">llama.cpp (محلّي)</option>
    <option value="openai">OpenAI</option>
    <option value="groq">Groq</option>
    <option value="gemini">Google Gemini</option>
    <option value="openrouter">OpenRouter</option>
    <option value="custom">مخصّص (المضيفون المدعومون فقط)</option>
   </select></div>
  <div class="row"><label>العنوان</label>
   <input id="aiUrl" type="text"></div>
  <div class="row"><label>الموديل</label>
   <div class="aiModelRow">
    <input id="aiModel" type="text" list="aiModelList"
     placeholder="مثل llama3 …">
    <button id="aiModels" type="button"
     title="جلب النماذج المتاحة من المزوّد">النماذج المتاحة</button>
   </div>
   <datalist id="aiModelList"></datalist>
   <div id="aiModelsBox"></div></div>
  <div class="row2">
   <div class="f"><label>المفتاح</label>
    <input id="aiKey" type="password"></div>
   <div class="f"><label>الحرارة</label>
    <input id="aiTemp" type="number" inputmode="decimal" min="0" max="1" step="0.1">
   </div>
  </div>
  <label class="chk"><input type="checkbox" id="aiVis">
   أرسِل صورة اللوحة (يحتاج موديلاً بصرياً)</label>
  <label class="chk"><input type="checkbox" id="aiKeep">
   احفظ المفتاح في هذا المتصفّح</label>
  <p class="hint">مطفأٌ افتراضاً: المفتاحُ يبقى للجلسة وحدها. إن فعّلته
   يُخزَّن نصّاً غيرَ مشفّرٍ في هذا المتصفّح — لا تفعّله على جهازٍ مشترك.</p>
  <div class="btnrow"><button id="aiKeyClr" class="del">
   امسح المفتاح</button></div>
  <p class="hint">الإعداد في المتصفّح لا في ملفّ المشروع — لا
   يُحفَظ ولا يُصدَّر. لخصوصيةٍ كاملة استعمل Ollama محلّياً:
   <span class="mono">localhost:11434/v1/chat/completions</span>
  </p>
 </div></details>
</details>

<details class="sec" data-sec="guide"><summary>الدليل التعليمي</summary>
 <div id="guidePane"></div>
</details>

<details class="sec" data-sec="state" open><summary>الحالة</summary>
 <div class="btnrow">
  <button id="bNew" class="del">مشروع جديد</button>
  <button id="bFit2">ملاءمة</button>
 </div>
 <div id="sumInfo" class="hint"></div>
</details>`;
}
/* ═══ النماذج ═══ */
const FORMIDS=["#mName","#mScale","#mTxt","#mExt","#mInt","#mH",
 "#mSnap","#mFill","#mDec","#mTick","#oJoins","#oSolo"];
export function loadForms(){
 const m=S.meta;
 $("#mName").value=m.name||"";
 $("#mScale").value=m.scale;
 $("#mTxt").value=m.txtMM;
 $("#mExt").value=mnum(m.tExt);
 $("#mInt").value=mnum(m.tInt);
 $("#mH").value=mnum(m.wallH);
 $("#mSnap").value=mnum(m.snap);
 $("#mFill").value=S.opt.fill;
 $("#mDec").value=String(m.dimDec);
 $("#mTick").value=m.dimTick;
 $("#oJoins").checked=!!+S.opt.joins;
 $("#oSolo").checked=!!+S.opt.colSolo;
}
function readForms(id){
 const m=S.meta;
 m.name=$("#mName").value.trim()||m.name;
 m.scale=clamp(parseInt($("#mScale").value,10)||100,1,5000);
 m.txtMM=clamp(parseFloat($("#mTxt").value)||2.2,0.5,20);
 const chkLen=(el,name)=>{
  const v=el.value.trim();
  if(!v) return;
  if(!isLen(v)){ rep("wr",`${name} ليس طولاً — بقي ${m2(m[name==="الخارجي"?"tExt":name==="الداخلي"?"tInt":name==="الارتفاع"?"wallH":"snap"])} م`); el.value=mnum(m[name==="الخارجي"?"tExt":name==="الداخلي"?"tInt":name==="الارتفاع"?"wallH":"snap"]); return; }
  if(name==="الخارجي") m.tExt=Math.max(50,M(v));
  if(name==="الداخلي") m.tInt=Math.max(50,M(v));
  if(name==="الارتفاع") m.wallH=clamp(M(v),1500,8000);
  if(name==="الالتقاط") m.snap=clamp(M(v),1,5000);
 };
 chkLen($("#mExt"),"الخارجي");
 chkLen($("#mInt"),"الداخلي");
 chkLen($("#mH"),"الارتفاع");
 chkLen($("#mSnap"),"الالتقاط");
 m.dimDec=clamp(parseInt($("#mDec").value,10)||0,0,3);
 m.dimTick=($("#mTick").value==="arrow")?"arrow":"slash";
 S.opt.fill=$("#mFill").value;
 S.opt.joins=$("#oJoins").checked?1:0;
 S.opt.colSolo=$("#oSolo").checked?1:0;
 ensureShape();
}
export function wireForms(){
 FORMIDS.forEach(id=>{
  const el=$(id);
  if(!el)return;
  el.addEventListener("change",(e)=>{edit(()=>readForms(e.target.id));
   refresh(false)});
  el.addEventListener("keydown",e=>{
   if(e.key==="Escape"){el.blur();return}
   e.stopPropagation();
  });
 });
 $("#bNew").onclick=()=>{
  if((S.walls.length||S.cols.length)
   &&!confirm("مشروع جديد؟ سيُفقد غير المحفوظ."))return;
  clearCompareBase(); newState(); loadForms();
  lazy(()=>import("./inspector.js").then(M=>M.clearFindings()),"الفاحص");
  refresh(true); fit();
  rep("ok","مشروع جديد");
 };
 $("#bFit2").onclick=()=>fit();
 $("#lAll").onclick=()=>{
  const n=edit(()=>showAll());
  if(editFailed())return;
  rep(n?"ok":"in",n?`أُظهرت ${n} طبقة`:"كل الطبقات ظاهرة");
  markAllDirty(); refresh(false);
 };
 $("#lUnlock").onclick=()=>{
  const n=edit(()=>unlockAll());
  if(editFailed())return;
  rep(n?"ok":"in",n?`فُتحت ${n} طبقة`:"لا طبقة مقفلة");
  markAllDirty(); refresh(false);
 };
 $("#lPlotAll").onclick=()=>{
  const n=edit(()=>plotAll());
  if(editFailed())return;
  rep(n?"ok":"in",n?`أُعيد طبع ${n} طبقة`:"كلُّها تُطبَع");
  markAllDirty(); refresh(false);
 };
 $("#lReset").onclick=()=>{
  if(!confirm("إعادة جدول الطبقات إلى مصنعه؟ الألوان والأوزان "
   +"والأنواع والشفافية والرؤية والقفل والطبع كلُّها تُصفَّر. "
   +"وحالاتُ الطبقات المحفوظة تبقى."))return;
  edit(()=>resetLays());
  if(editFailed())return;
  LCUR=null;
  rep("ok","أُعيد جدول الطبقات إلى مصنعه");
  markAllDirty(); refresh(false);
 };
 $("#bAxClr").onclick=()=>{
  if(!S.grid.xs.length&&!S.grid.ys.length){rep("in","لا محاور لتُمسح");return}
  if(!confirm("مسح كل المحاور؟"))return;
  let n=0; edit(()=>{n=clearAxes()});
  if(editFailed())return;
  rep("ok",`مُسحت المحاور (${n}) · Ctrl+Z يعيدها`);
  refresh(false);
 };
 $("#bRefAll").onclick=()=>{
  lazy(()=>import("../tools/registry.js").then(R=>R.begin("arearef")),"مرجع المنطقة");
 };
 /* ═══ سجلّ اللوحات ═══
    كلٌّ تُعلَن مرّة، ولا تُرسَم إلّا مرئيّة. جداول المساحات
    والفتحات والورقة والمرجع كانت تُبنى مع كل تعديل حقلٍ ثم تُخفى. */
 reg("lays",  "#lays",   renderLays,   "الطبقات");
 reg("props", "#props",  paintProps,   "الخصائص");
 reg("sched", "#sched",  renderSched,  "جدول المساحات");
 reg("osched","#osched", renderOSched, "جدول الفتحات");
 reg("axes",  "#axInfo", renderAxes,   "المحاور");
 reg("sheet", "#shInfo", ()=>syncSheet(),   "الورقة");
 reg("ref",   "#rInfo",  ()=>renderRef(),   "المرجع");
 reg("state", "#sumInfo",renderSummary,"الحالة");
 /* لوحة الدليل المصغّرة (مرحلة ٩أ، 16.1) — استيرادٌ كسول، صفر
    كلفة إقلاع؛ لا تعديل على guide/wire.js ولا guide/floater.js. */
 lazy(()=>import("../guide/dockPane.js").then(M =>
  import("../guide/wire.js").then(G => M.wireDockPane("#guidePane", reg, G.guideOpen))
 ),"لوح الدليل");
 wirePanels();
 /* عطبٌ في ربط لوحة الأوراق لا يُسقِط الإقلاع كلَّه: يُبلَّغ ويكمل التطبيق. */
 try{wireSheets()}
 catch(e){try{rep("wr","تعذّر ربط لوحة الأوراق: "+((e&&e.message)||e))}catch(_){}}
}
/* ═══ الطبقات ═══
   الترتيبُ والتسميةُ واللونُ من الجدول الحيّ: صفٌّ يُضاف إلى
   laydef يظهر في اللوحة بلا لمسِ هذا الملفّ. */
const LORD=()=>LAYS().map(l=>({L:l.n,n:l.d||l.n,
 col:l.col,aux:AUX.has(l.n)}));
/* الطبقةُ المفتوحةُ للتحرير — حالُ عرضٍ عابرٌ لا تفضيلَ يُحفَظ */
let LCUR=null;
/* إظهار الطبقات الفارغة — حالُ عرضٍ عابرٌ كـ LCUR، الأصل إخفاؤها */
let LEMPTY=false;
const LFN={col:"لون الشاشة",pcol:"لون الورق",lw:"وزن الخطّ",
 lt:"نوع الخطّ",op:"الشفافية",aci:"رمز ACI",d:"الوصف"};

/* ═══ محرِّرُ الطبقة ═══
   سبعةُ حقولٍ كانت مكتوبةً في الجدول ومقروءةً في المصدِّرين
   الأربعة، وبلا مدخلٍ من الواجهة. */
function laysEditor(nm){
 const l=layOf(nm);
 if(!l)return "";
 const aux=AUX.has(nm);
 return `<details class="sub" open><summary>${esc(l.d||nm)} `
  +`<span class="mono u-c1d97" >${esc(nm)}</span>`
  +`</summary><div>`
  +F2(FF("لون الشاشة",
      `<input type="color" data-lf="col" value="${esc(l.col)}">`),
     FF("لون الورق",
      `<input type="color" data-lf="pcol" value="${esc(l.pcol)}">`))
  +F2(FF("وزن الخطّ مم",
      `<select data-lf="lw">`+LWS.map(([w,t])=>
       `<option value="${w}"${w===l.lw?" selected":""}>`
       +`${esc(t)}</option>`).join("")+`</select>`),
     FF("نوع الخطّ",
      `<select data-lf="lt">`+ltList().map(r=>
       `<option value="${esc(r.k)}"${r.k===l.lt?" selected":""}>`
       +`${esc(r.label)}</option>`).join("")+`</select>`))
  +F2(FF("الشفافية ٪",
      `<input type="number" inputmode="decimal" class="num" data-lf="op" min="0" `
      +`max="90" step="5" value="${l.op}">`),
     FF("رمز ACI",
      `<input type="number" inputmode="decimal" class="num" data-lf="aci" min="0" `
      +`max="256" step="1" value="${l.aci}">`))
  +F("الوصف",`<input type="text" data-lf="d" `
    +`value="${esc(l.d||"")}">`)
  +`<p class="hint">لونان لا لونٌ واحد: الجدار على شاشةٍ داكنة `
  +`قريبٌ من الأبيض وعلى الورق أسود — عكسُ خلفيةٍ لا انجراف. `
  +`ولونُ الورق هو لونُ الشاشة الفاتحة نفسه، وهو ما يُكتَب في `
  +`DXF لوناً حقيقياً (420) ورمزَ ACI احتياطاً.`
  +(aux?`<br>طبقةٌ مساعدة: تُرسَم ولا كياناتَ تُحدَّد عليها، `
    +`فلا قفلَ لها.`:"")
  +`</p>`
  +(isCustom(nm)
    ?`<div class="btnrow"><button id="lDel" class="del">`
     +`حذف الطبقة المخصصة</button></div>`:"")
  +`</div></details>`;
}
/* ═══ حالاتُ الطبقات ═══ لقطةٌ مسمّاة — هيئةٌ لا هويّة ═══ */
function laysStates(){
 const A=layStates();
 return `<details class="sub"><summary>حالات الطبقات`
  +(A.length?` · ${A.length}`:"")+`</summary><div>`
  +(A.length
   ? `<div class="row2"><div class="f">`
     +`<select id="lStName">`
     +A.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`)
      .join("")+`</select></div>`
     +`<div class="f u-fe2da" >`
     +`<button id="lStGo" class="pri u-03732" >طبّق</button>`
     +`<button id="lStDel" class="del u-7f452" `
     +`>✕</button></div></div>`
   : `<p class="hint">لا حالاتٍ محفوظة</p>`)
  +`<div class="btnrow"><button id="lStSave">`
  +`احفظ الحالة الجارية…</button></div>`
  +`<p class="hint">تحمل الرؤية والقفل والطبع واللونين والوزن `
  +`والنوع والشفافية — ولا تحمل الاسم ولا الوصف: هيئةٌ لا هويّة. `
  +`وهي بياناتُ مشروعٍ تُحفَظ في الملفّ وتدخل التاريخ.</p>`
  +`</div></details>`;
}
function renderLays(box){
 if(LCUR&&!hasLay(LCUR))LCUR=null;
 const C=layCounts();
 /* الفارغة (عدّها صفر) تُخفى، إلا ما يهمّ المستخدم: المفتوحة للتحرير،
    والمخفيّة أو المقفلة (حالٌ غيّرها بيده ولا يجوز أن تضيع عنه). */
 const ALL=LORD();
 const keep=x=>LEMPTY||(C[x.L]||0)>0||x.L===LCUR||!vis(x.L)||locked(x.L);
 const ROWS=ALL.filter(keep), EMPTY=ALL.length-ROWS.length;
 box.innerHTML=ROWS.map(x=>{
  const on=vis(x.L), lk=locked(x.L), pl=plots(x.L);
  const n=C[x.L]||0, cur=(LCUR===x.L);
  /* عنوانُ القفل يُحسَب هنا: كسرُ السطر داخل ${…} كان يفتح قالباً
     ثانياً فيصير النصُّ وسماً له — رميٌ يُسقِط بناءَ الجدول كلّه. */
  const ltip=x.aux?"طبقةٌ مساعدة — لا كياناتَ تُقفَل"
   :(lk?"افتح":"اقفل");
  return `<div class="lrow${on?"":" off"}${cur?" cur":""}">`
   +`<button data-loff="${esc(x.L)}" title="${on?"أخفِ":"أظهر"}" `
   +`class="lbtn">`
   +`${on?"◉":"○"}</button>`
   /* الطبعُ مستقلٌّ عن الرؤية: A-REFR مصنعُه «لا يُطبَع»، ولا
      سبيلَ إلى طبعه قبل هذا الزرّ. */
   +`<button data-lplot="${esc(x.L)}" `
   +`title="${pl?"تُطبَع":"لا تُطبَع"}" `
   +`class="lbtn${pl?"":" dim"}">${pl?"⎙":"⌀"}</button>`
   +`<button data-llock="${esc(x.L)}" title="${esc(ltip)}"`
   +`${x.aux?" disabled":""} `
   +`class="lbtn${lk?" lk":""}">${lk?"▣":"▢"}</button>`
   +`<button data-lsel="${esc(x.L)}" title="خصائص الطبقة" `
   +`class="lsw" data-bg="${esc(x.col||"#888")}"></button>`
   +`<button data-lsel="${esc(x.L)}" title="خصائص الطبقة" `
   +`class="lname${cur?" cur":""}">`
   +`${esc(x.n)}</button>`
   +`<span class="ro lcnt">`
   +`${n}</span>`
   +`<button data-liso="${esc(x.L)}" title="انفراد" `
   +`class="lbtn">◧</button>`
   +`</div>`;
 }).join("")
 +((EMPTY||LEMPTY)
   ?`<div class="btnrow"><button id="lEmpty">`
    +(LEMPTY?"إخفاء الطبقات الفارغة":`إظهار الفارغة (${EMPTY})`)
    +`</button></div>`:"")
 +`<div class="btnrow"><button id="lAdd" class="pri">＋ إضافة طبقة…</button></div>`
 +(LCUR?laysEditor(LCUR):"")
 +laysStates();
 const W=[];
 if(anyHidden())W.push(`${hiddenCount()} كياناً مخفيّاً — لن `
  +`يُصدَّر ولن يُحدَّد`);
 const np=noPlotCount();
 if(np)W.push(`${np} كياناً يُرى ولا يُطبَع`);
 if(anyLocked())W.push(`طبقاتٌ مقفلة — تُرى ولا تُلمَس`);
 if(W.length)box.innerHTML+=`<p class="hint warn">`
  +W.map(esc).join("<br>")+`</p>`;
 paintBg(box);
}
/* لونٌ من البيانات لا يُكتَب في سمة style (CSP بلا 'unsafe-inline')؛ يُحمَل
   في data-bg ويُطبَّق هنا عبر CSSOM الذي تسمح به السياسة. */
export function paintBg(root){
 root.querySelectorAll("[data-bg]").forEach(el=>{
  el.style.background=el.getAttribute("data-bg");
 });
}
/* ═══ لوحات الخصائص ═══ */
const F=(l,i)=>`<div class="row"><label>${l}</label>${i}</div>`;
const F2=(a,b)=>`<div class="row2">${a}${b}</div>`;
const FF=(l,i)=>`<div class="f"><label>${l}</label>${i}</div>`;
const IN=(p,k,v,x)=>`<input data-p="${p}" data-k="${k}" `
 +`type="${k==="num"?"number":"text"}" value="${esc(v)}" ${x||""}>`;
const SE=(p,arr,cur)=>`<select data-p="${p}" data-k="sel">`
 +OPT(arr,cur)+`</select>`;
const CK2=(p,on,lbl)=>`<div class="row"><label class="chk">`
 +`<input type="checkbox" data-p="${p}" data-k="chk"`
 +`${on?" checked":""}> ${lbl}</label></div>`;
const RO=v=>`<span class="ro num">${esc(v)}</span>`;

/* ═══ متحكِّمُ الحقل ═══ للوحاتِ الثلاث ═══
   المُوحَّدُ هو المتحكِّم لا الصفّ: props تلفّه في .row وquickprops
   في .qf، فالغلافُ هيئةُ لوحةٍ والمتحكِّمُ عقدُ حقل — اسمُ السمة
   وقائمةُ العناصر والحدُّ والقيمةُ وحالُ التعدّد.

   C سياقُ العرض: kind (جماعيّ ⇒ data-bk/bf) · val · mixed · own
   · num (‏len رقمياً لا نصّاً) */
const HTML_LIMITS=1;   /* سِمَتا min/max على العدديّ — أطفئها إن
                          نازعت CSS الخاصّةَ بـ:invalid */
const fldTag=(d,C)=>C.kind
 ? `data-bk="${esc(C.kind)}" data-bf="${esc(d.k)}" `
   +`data-k="${esc(d.t)}"`
 : `data-p="${esc(d.k)}" data-k="${esc(d.t)}"`;

/* الثابتُ يصل الحقلَ سِمةً · والتابعُ لا: قيمتُه تتبدّل بحاضنه،
   وسِمةٌ كاذبةٌ أسوأ من غيابها. وparseVal يفحصهما جميعاً. */
const fldAttr=d=>{
 if(d.t!=="num")return "";
 let a=` step="${d.step||(d.int?1:0.1)}"`;
 if(HTML_LIMITS){
  if(typeof d.min==="number")a+=` min="${d.min}"`;
  if(typeof d.max==="number")a+=` max="${d.max}"`;
 }
 return a;
};
const fldShow=(d,v)=>(v==null||v==="")?""
 :((d.t==="len")?mnum(v):String(v));

export function fldCtl(d,val,ctx){
 const C=ctx||{};
 const tag=fldTag(d,C), mix=!!C.mixed;
 if(d.t==="chk")
  return `<input type="checkbox" ${tag}`
   +`${(!mix&&+val)?" checked":""}${mix?' data-mix="1"':""}>`;
 if(d.t==="sel")
  return `<select ${tag}>`
   +(mix?`<option value="" selected>— متعدّد`
     +`${C.own?` (${C.own})`:""} —</option>`:"")
   +(d.items||[]).map(([v,n])=>`<option value="${esc(v)}"`
    +`${(!mix&&String(val)===String(v))?" selected":""}>`
    +`${esc(n)}</option>`).join("")
   +`</select>`;
 /* len نصٌّ في الثلاث: الأرقامُ الهندية والفاصلةُ العربية تُقبَل،
    وclass="num" يعزل الاتجاه. وكان رقمياً في الجماعية والسريعة
    فتُرفَض «٢٫٥» فيهما وتُقبَل في المفردة. */
 const asNum=(d.t==="num");
 return `<input type="${asNum?"number":"text"}" ${tag} class="num" `
  +`value="${esc(mix?"":fldShow(d,val))}"`
  +(mix?` placeholder="متعدّد${C.own?` (${C.own})`:""}"`:"")
  +fldAttr(d)+`>`;
}
const fldLab=(d,C)=>esc(d.n)
 +((C&&C.own!=null&&C.all!=null&&C.own<C.all)
  ? ` <span class="ro u-78d84" >`
    +`${C.own}/${C.all}</span>` : "");
const fldTip=(d,C)=>(d.hint&&(!C||C.hint!==0))
 ? `<p class="hint">${esc(d.hint)}</p>` : "";

/* القيمةُ من ctx.val إن أُعطيت (الجماعية) وإلّا من الكيان */
const fldVal=(kind,e,d,C)=>(C&&C.val!==undefined)
 ? C.val : fieldVal(kind,e,d.k);

/* صفٌّ كامل */
function fldRow(kind,e,key,ctx){
 const d=fldOf(kind,key);
 if(!d)return "";
 const C=ctx||{};
 const v=fldVal(kind,e,d,C);
 if(d.t==="chk")
  return `<div class="row"><label class="chk">`
   +fldCtl(d,v,C)+` ${fldLab(d,C)}</label></div>`+fldTip(d,C);
 return F(fldLab(d,C),fldCtl(d,v,C))+fldTip(d,C);
}
/* نصفُ صفّ — يُركَّب يدوياً مع حقلٍ غيرِ مولَّد.
   وhint لا يُرسَم هنا: <p> داخل row2 يكسر التخطيط. */
function fldHalf(kind,e,key,ctx){
 const d=fldOf(kind,key);
 if(!d)return "";
 const C=ctx||{};
 return FF(fldLab(d,C),fldCtl(d,fldVal(kind,e,d,C),C));
}

function wallProps(w){
 const d=dir(w);
 /* القوسيّ: الطولُ طولُ القوس (wallLen)، والزاويةُ زاويةُ الوتر لا
    معنى لها للمستخدم — فيُعرَض نصفُ القطر والزاويةُ الممسوحة والوتر.
    ولا محاذاةَ له: جسمُه متماثلٌ حول مساره دائماً (band لا تقرؤها). */
 const arc=isArc(w), P=arc?arcParams(w):null;
 let h=`<div class="phead">${esc(w.id)} · ${arc?"جدار قوسي":"جدار"}</div>`;
 h+=F2(FF(arc?"طول القوس م":"الطول م",RO(m3(wallLen(w)))),
       (arc&&P)?FF("نصف القطر م",RO(m3(P.R)))
        :FF("الزاوية",RO(d?d.ang.toFixed(2)+"°":"—")));
 if(arc&&P)
  h+=F2(FF("زاوية القوس",
        RO((Math.abs(P.sweep)*180/Math.PI).toFixed(1)+"°")),
        FF("الوتر م",RO(m3(Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])))));
 h+=F2(FF("البداية",RO(`${m2(w.a[0])} , ${m2(w.a[1])}`)),
       FF("النهاية",RO(`${m2(w.b[0])} , ${m2(w.b[1])}`)));
 h+=F2(fldHalf("wall",w,"t"), fldHalf("wall",w,"type"));
 if(!arc)h+=fldRow("wall",w,"align",{hint:0});
 else h+=`<p class="hint">القوس مركزيُّ المحاذاة دائماً · لا فتحاتَ عليه</p>`;
 /* ارتفاعُ السترة ليس في الجدول: لا مقابلَ له جماعياً */
 if(isLow(w))h+=F("ارتفاع السترة م",IN("h","len",mnum(lowH(w))));
 if(arc)return h;
 const O=S.opens.filter(o=>o.wall===w.id);
 h+=`<p class="hint">${O.length} فتحة عليه`
  +(O.length?`: ${O.map(o=>o.id).join(" · ")}`:"")+`</p>`;
 return h;
}
function openProps(o){
 const w=wallById(o.wall);
 const K=OK[o.kind]||OK.door;
 const st=openState(o);
 let h=`<div class="phead">${esc(o.id)} · `
  +`${esc(okName(o.kind))}</div>`;
 /* ثلاثةٌ من أربعةِ صفوفٍ تُزوّج مولَّداً بغيرِ مولَّد، فالتخطيطُ
    يبقى مُركَّباً بيدٍ وfldHalf تُعطي النصف. */
 h+=fldRow("open",o,"kind",{hint:0});
 h+=F2(fldHalf("open",o,"w"), fldHalf("open",o,"h"));
 h+=F2(fldHalf("open",o,"sill"),
       FF("الموضع م",IN("s","len",mnum(o.s))));
 if(K.sw)
  h+=F2(FF("المفصّلة",SE("hinge",[["start","البداية"],
        ["end","النهاية"]],o.hinge)),
        fldHalf("open",o,"swing"));
 if(K.pan)h+=F("المصاريع",IN("pan","num",panOf(o),
  'min="1" max="6"'));
 if(o.kind==="niche")
  h+=F2(fldHalf("open",o,"dep"),
        FF("الوجه",SE("face",[["l","يسار المسار"],
         ["r","يمينه"]],o.face||"l")));
 /* ═══ وما بعده عرضٌ محضٌ لا إدخال — لا يُولَّد من جدولٍ عامّ ═══ */
 if(w){
  const A=allowed(w,o.w,o);
  const [a,b]=span(o);
  h+=`<p class="hint">على ${esc(w.id)} · طوله ${m2(wallLen(w))} م · `
   +`المدى ${esc(rng2(a,b,"م"))}`
   +(A.fits?`<br>المواضع الحرّة ${esc(saySpans(A))} م`
     +(A.split?` <span class="warn">(متقطّعة)</span>`:"")
    :`<br><span class="warn">لا موضع حرٌّ بهذا العرض</span>`)
   +`</p>`;
 }
 if(st==="over")
  h+=`<p class="hint warn">تخرج عن مدى جدارها — الطرح مقصوص على
   المدى، والبيانات لم تُمَس. عدّل الموضع أو العرض.</p>`;
 else if(st==="clash")
  h+=`<p class="hint warn">تتراكب مع فتحة أخرى على الجدار نفسه.</p>`;
 return h;
}
function areaProps(a){
 const st=isStale(a);
 let h=`<div class="phead">${esc(a.id)} · منطقة`
  +(st?` · <span class="u-54305">قديمة</span>`:"")+`</div>`;
 h+=fldRow("area",a,"name",{hint:0});
 h+=F2(FF("المساحة م²",RO(sqm(netArea(a)))),
       FF("المحيط م",RO(m3(netPerim(a)))));
 h+=F2(FF("الأضلاع",RO(a.ring.length)),
       fldHalf("area",a,"fill"));
 h+=fldRow("area",a,"showArea",{hint:0});
 h+=`<p class="hint">التسمية ${a.lp?"في موضع صريح — لا تزحف"
  :"في القطب المحسوب · اسحب مقبضها لتثبيتها"}</p>`;
 if(st){
  h+=`<p class="hint warn">تغيّر جدار يجاورها. الحلقة المخزَّنة لم
   تُمَسّ — «تحديث» يعيد خبزها، و«تثبيت» يقبل الوضع الحالي.</p>`;
  h+=`<div class="btnrow">
   <button data-aref="${esc(a.id)}" class="pri">تحديث</button>
   <button data-astm="${esc(a.id)}">تثبيت البصمة</button></div>`;
 }
 return h;
}
function dimProps(d){
 /* rad/dia/ang: مركزٌ/رأسٌ لا طرفان a/b — لوحةٌ خاصّة بلا حقل النوع */
 if(d.kind==="rad"||d.kind==="dia"||d.kind==="ang"){
  const isA=d.kind==="ang";
  let h=`<div class="phead">${esc(d.id)} · بُعد ${DK[d.kind]}</div>`;
  h+=FF(isA?"الزاوية":"المقاس",
   RO(isA?fmtAng(dimValue(d)):dimText(d)));
  if(isA){
   h+=F2(FF("الرأس",RO(`${m2(d.vertex[0])} , ${m2(d.vertex[1])}`)),
         FF("نصف قطر القوس",RO(fmtLen(d.r))));
  }else{
   h+=F2(FF("المركز",RO(`${m2(d.c[0])} , ${m2(d.c[1])}`)),
         FF("نصف القطر م",RO(fmtLen(d.r))));
  }
  h+=fldRow("dim",d,"txt",{hint:0});
  h+=fldRow("dim",d,"style");
  h+=`<p class="hint">المواضع مخزَّنة صريحةً — اسحب المقابض لتحريكها</p>`;
  return h;
 }
 const loose=dimLoose(d,30);
 let h=`<div class="phead">${esc(d.id)} · بُعد ${DK[d.kind]}`
  +(loose?` · <span class="u-54305">معلَّق</span>`:"")
  +`</div>`;
 h+=F2(FF("المقاس م",RO(fmtLen(dimValue(d)))),
       fldHalf("dim",d,"kind"));
 h+=F2(FF("الطرف الأول",RO(`${m2(d.a[0])} , ${m2(d.a[1])}`)),
       FF("الطرف الثاني",RO(`${m2(d.b[0])} , ${m2(d.b[1])}`)));
 h+=fldRow("dim",d,"txt",{hint:0});
 h+=fldRow("dim",d,"style");
 if(isOverridden(d))
  h+=`<p class="hint warn">النصّ البديل يُعرَض بدل المقاس الحقيقي
   (${fmtLen(dimValue(d))} م) وعليه علامة *. أفرغ الحقل ليعود
   المقاس.</p>`;
 if(loose)
  h+=`<p class="hint warn">طرفٌ لا يصادف هندسةً — البُعد لم يُزحَف
   ولم يُحذَف. اسحب مقبضه إلى الموضع الصحيح، أو اتركه.</p>`;
 h+=`<p class="hint">النقطتان وموضع الخطّ مخزَّنة صريحةً — لا ترتبط
  بجدار فلا تزحف معه</p>`;
 return h;
}
function roofProps(r){
 let h=`<div class="phead">${esc(r.id)} · سقف ${esc(RTYPE[r.type]||r.type)}</div>`;
 h+=F2(FF("النوع",RO(RTYPE[r.type]||r.type)),
       FF("الميل %",RO(String(r.slope))));
 h+=F2(FF("المساحة م²",RO(sqm(roofArea(r)))),
       FF("الارتفاع م",RO(fmtLen(r.h))));
 h+=`<p class="hint">اسحب رؤوسه لتعديل الشكل · لتغيير النوع أو الميل\n  احذفه وأعد رسمه بخيارات أداة السقف</p>`;
 return h;
}
function chainProps(c){
 const V=chainVals(c);
 let h=`<div class="phead">${esc(c.id)} · سلسلة `
  +`${c.axis==="h"?"أفقية":"رأسية"}</div>`;
 /* القيَمُ ليست في الجدول: نصٌّ مركَّبٌ يُحلَّل بـparseVals */
 h+=F("القيَم م",IN("vals","text",V.map(v=>mnum(v)).join(" ")));
 h+=F2(FF("العدد",RO(V.length)),
       FF("المجموع م",RO(fmtLen(chainSum(c)))));
 h+=fldRow("chain",c,"total",{hint:0});
 h+=fldRow("chain",c,"style");
 h+=`<div class="btnrow">`
  +`<button data-ccmp="${esc(c.id)}">قارن بالهندسة</button></div>`;
 h+=`<p class="hint">القيَم كما كتبتها. المقارنة تقريرٌ لا تصحيح —
  لا تُعدَّل قيمة إلا بيدك في هذا الحقل.</p>`;
 return h;
}
function annoProps(a){
 let h=`<div class="phead">${esc(a.id)} · ${esc(AK[a.kind])}</div>`;
 if(a.kind==="level"){
  h+=F("المنسوب م",IN("z","len",mnum(a.z)));
  h+=F2(fldHalf("anno",a,"pre"),
        FF("المعروض",RO(levelStr(a))));
 }else{
  h+=F("النصّ",IN("s","text",a.s));
  h+=F2(fldHalf("anno",a,"hm"),
        a.kind==="text"
         ?FF("الدوران °",IN("rot","num",a.rot||0))
         :FF("النقاط",RO(a.pts.length)));
  if(a.kind==="text")h+=fldRow("anno",a,"al",{hint:0});
 }
 return h;
}
function colProps(c){
 const on=colOnWall(c,2);
 let h=`<div class="phead">${esc(c.id)} · عمود`
  +(c.tag?` ${esc(c.tag)}`:"")+`</div>`;
 h+=F2(fldHalf("col",c,"kind"), fldHalf("col",c,"type"));
 if(c.kind==="circ")h+=fldRow("col",c,"w",{hint:0});
 else h+=F2(fldHalf("col",c,"w"), fldHalf("col",c,"h"));
 h+=F2(fldHalf("col",c,"rot"),
       FF("المساحة م²",RO((colArea(c)/1e6).toFixed(3))));
 /* القطبُ والوسمُ ليسا في الجدول: لا مقابلَ لهما جماعياً */
 h+=F2(FF("المركز x",IN("x","len",mnum(c.x))),
       FF("المركز y",IN("y","len",mnum(c.y))));
 h+=F("الوسم",IN("tag","text",c.tag||""));
 h+=`<p class="hint">${on
  ?`يُدمَج مع ${esc(on)} في الجسم المصمَّت — دمجٌ وقت العرض، `
   +`والبيانات مستقلّة`
  :`منفرد — لا يلامس جداراً. المساحة لا تخصمه.`}</p>`;
 return h;
}
function fixProps(f){
 const on=fixOnWall(f,150);
 let h=`<div class="phead">${esc(f.id)} · `
  +`${esc(fixName(f))}</div>`;
 h+=fldRow("fix",f,"kind",{hint:0});
 h+=F2(fldHalf("fix",f,"w"), fldHalf("fix",f,"d"));
 h+=F2(fldHalf("fix",f,"rot"),
       FF("الموضع",RO(`${m2(f.x)} , ${m2(f.y)}`)));
 h+=fldRow("fix",f,"mir",{hint:0});
 h+=`<div class="btnrow"><button data-fsnap="${esc(f.id)}">`
  +`ألصِق بأقرب جدار</button></div>`;
 h+=`<p class="hint">${on?`ظهرها على ${esc(on)}`
  :"ظهرها حرّ"} — الإحداثيات صريحة، والإلصاق أمرٌ لا رابطة</p>`;
 return h;
}
function stairProps(t){
 const c=stCheck(t), gs=stGeoms(t);
 const g=gs.length?{L:gs.reduce((a,x)=>a+x.L,0)}:null;
 let h=`<div class="phead">${esc(t.id)} · درج${t.type&&t.type!=="straight"?" "+esc(t.type):""}`
  +(c.ok?"":` · <span class="u-54305">خارج المدى</span>`)
  +`</div>`;
 h+=F2(fldHalf("stair",t,"w"), fldHalf("stair",t,"n"));
 h+=F2(FF("طول القِلعة م",RO(g?m3(g.L):"—")),
       fldHalf("stair",t,"h"));
 h+=F2(FF("القائمة م",RO(m3(c.rise))),
       FF("النائمة م",RO(m3(c.tread))));
 h+=F2(FF("2ق + ن م",RO(m3(c.rule))),
       fldHalf("stair",t,"up"));
 h+=fldRow("stair",t,"cut",{hint:0});
 if(!c.ok)
  h+=`<p class="hint warn">${c.msgs.map(esc).join("<br>")}<br>`
   +`القياسات كما رسمتها — عدّل الطول أو عدد القوائم. لا شيء `
   +`يُصحَّح تلقائياً.</p>`;
 else
  h+=`<p class="hint u-018d5" >القياسات داخل المدى `
   +`المريح</p>`;
 return h;
}
/* ═══ التحديد المتعدّد ═══ */
/* الحقل الحيّ قراءةٌ — المصدر والنصّ والقدَامة يُقالون ولا يُكتبون هنا:
   التحديثُ بأداة «تحديث الحقول» وحدها لا من هذه اللوحة. */
function liveProps(f){
 let h=`<div class="phead">${esc(f.id)} · حقل حيّ`
  +(f.stale?` · <span class="warn">قديم</span>`:"")+`</div>`;
 h+=`<p class="hint">المصدر: <b class="mono">${esc(f.src)}</b><br>`
  +`النصّ المعروض: ${esc((f.stale?"*":"")+(f.cached||"—"))}</p>`;
 if(f.stale)
  h+=`<p class="hint warn">مصدره قديم أو غائب — «تحديث الحقول» يعيد له الحساب،
   وما زال غائباً يبقى «—» متوسَّماً حتى تُصلح مصدره.</p>`;
 return h;
}
function multiProps(L){
 const G=groupSel(L);
 const KS=groupOrder(G);
 const out=(L.length-KS.reduce((s,k)=>s+G[k].length,0));
 let h=`<p class="hint">${L.length} عنصر: ${esc(summary(G))}`
  +(out?` · ${out} خارج التعديل (مخفيّ أو مقفل)`:"")+`</p>`;
 h+=`<div class="btnrow">
  <button data-run="move">نقل</button>
  <button data-run="copy">نسخ</button>
  <button data-run="rotate">دوران</button></div>
 <div class="btnrow">
  <button data-run="mirror">مرآة</button>
  <button data-run="weld">لحم</button></div>`;
 KS.forEach(k=>{
  const arr=G[k];
  h+=`<div class="phead u-f9ed8" >`
   +`${esc(NAME[k]||k)} · ${arr.length}</div>`;
  FLD[k].forEach(f=>{
   const r=readField(k,arr,f.k);
   if(!r.own)return;                 /* لا أحد يملكه فلا يُعرَض */
   /* arr مصفّاةٌ من groupSel فطولُها هو القابلُ للتعديل فعلاً،
      لا طولُ التحديد الخام (r.n) — والنسبةُ صادقة.
      وhint:0 فالتخطيطُ يبقى كما هو. */
   h+=fldRow(k,null,f.k,{kind:k,
    val:r.mixed?null:r.value, mixed:!!r.mixed,
    own:r.own, all:arr.length, hint:0});
  });
  /* الأوامر الجماعية الصريحة */
  if(k==="col")h+=`<div class="btnrow">`
   +`<button data-brenum="1">أعد الترقيم من أعلى اليمين</button>`
   +`</div>`;
  if(k==="dim")h+=`<div class="btnrow">`
   +`<button data-bcleartxt="1">امسح النصّ البديل</button></div>`;
  if(k==="area")h+=`<div class="btnrow">`
   +`<input id="bASeq" type="text" placeholder="سابقة الاسم" `
   +`class="u-03732">`
   +`<button data-bname="1">سمِّ بالتسلسل</button></div>`
   +`<div class="btnrow"><button data-bclrname="1">`
   +`امسح الأسماء</button></div>`;
 });
 h+=`<p class="hint">الحقل الفارغ بعلامة «متعدّد» لا يُكتب من `
  +`تلقائه — اكتب فيه لتطبّقه على الجميع.</p>`;
 h+=`<div class="btnrow"><button id="pDel" class="del">`
  +`حذف المحدد</button></div>`;
 return h;
}
function paintProps(box){
 const L=selList();
 if(!L.length){
  box.innerHTML=`<p class="hint">لا تحديد — انقر عنصراً، أو اسحب `
   +`إطاراً على الفراغ</p>`;
  eSel(""); return;
 }
 if(L.length>1){
  box.innerHTML=multiProps(L);
  /* المربّع المختلف: ثلاثيّ الحالة حتى تحسمه */
  box.querySelectorAll('[data-mix="1"]').forEach(el=>{
   el.indeterminate=true;
  });
  eSel(`${L.length} عنصر`);
  return;
 }
 const s=L[0];
 let h="";
 if(s.k==="wall"){
  const w=wallById(s.id);
  if(!w){box.innerHTML="";return}
  h=wallProps(w); eSel(`جدار ${w.id}`);
 }else if(s.k==="open"){
  const o=openById(s.id);
  if(!o){box.innerHTML="";return}
  h=openProps(o); eSel(`فتحة ${o.id}`);
 }else if(s.k==="area"){
  const a=areaById(s.id);
  if(!a){box.innerHTML="";return}
  h=areaProps(a); eSel(`منطقة ${a.id}`+(isStale(a)?" (قديمة)":""));
 }else if(s.k==="dim"){
  const d=dimById(s.id);
  if(!d){box.innerHTML="";return}
  h=dimProps(d); eSel(`بُعد ${d.id}`);
 }else if(s.k==="roof"){
  const r=roofById(s.id);
  if(!r){box.innerHTML="";return}
  h=roofProps(r); eSel(`سقف ${r.id}`);
 }else if(s.k==="chain"){
  const c=chainById(s.id);
  if(!c){box.innerHTML="";return}
  h=chainProps(c); eSel(`سلسلة ${c.id}`);
 }else if(s.k==="anno"){
  const a=annoById(s.id);
  if(!a){box.innerHTML="";return}
  h=annoProps(a); eSel(`${AK[a.kind]} ${a.id}`);
 }else if(s.k==="col"){
  const c=colById(s.id);
  if(!c){box.innerHTML="";return}
  h=colProps(c); eSel(`عمود ${c.id}`);
 }else if(s.k==="fix"){
  const f=fixById(s.id);
  if(!f){box.innerHTML="";return}
  h=fixProps(f); eSel(`${fixName(f)} ${f.id}`);
 }else if(s.k==="stair"){
  const t=stById(s.id);
  if(!t){box.innerHTML="";return}
  h=stairProps(t); eSel(`درج ${t.id}`);
 }else if(s.k==="live"){
  const f=liveById(s.id);
  if(!f){box.innerHTML="";return}
  h=liveProps(f); eSel(`حقل حيّ ${f.id}`);
 }else{box.innerHTML="";return}

 const LY=layOfEnt(s);
 if(LY)h+=`<p class="hint">الطبقة: ${esc(LNAME(LY))}`
  +`${locked(LY)?" · مقفلة":""}</p>`;
 h+=`<div class="btnrow"><button id="pDel" class="del">حذف</button>`
  +`</div>`;
 h+=`<p class="hint">الإحداثيات تُعدَّل بالمقابض على اللوحة — `
  +`لا شيء يتحرّك دونك</p>`;
 box.innerHTML=h;
}
/* شريط الحالة يتحدّث دائماً · وجسم اللوحة إن كان مرئيّاً وحده */
const selBrief=()=>{
 const L=selList();
 if(!L.length)return "";
 return (L.length>1)?`${L.length} عنصر`
  :`${NAME[L[0].k]||L[0].k} ${L[0].id}`;
};
export function renderProps(){
 if(!renderPanel("props"))eSel(selBrief());
}
/* SETFIELDS تُحذَف: كانت قائمةً يدويّةً موازيةً لـFLD، ومفاتيحُ
   SET كانت ≡ مفاتيحَ FLD في كل نوع — فالسؤالُ من المصدر. */
const owned=(k,f)=>!!fldOf(k,f);

document.addEventListener("change",e=>{
 /* ═══ محرِّرُ الطبقة ═══ يسبق كل شيء: سماتُه مستقلّة ═══ */
 const lf=e.target.dataset.lf;
 if(lf){
  if(!LCUR){rep("wr","لا طبقةَ مفتوحة");return}
  const num=/^(lw|op|aci)$/.test(lf);
  const v=num?parseInt(e.target.value,10):e.target.value;
  const done=edit(()=>setLay(LCUR,lf,v));
  if(editFailed())return;
  if(!done)rep("er",`${LFN[lf]||lf}: قيمةٌ لا تُقبَل — `
   +`لم يُكتَب شيء`);
  else rep("in",`${LNAME(LCUR)} · ${LFN[lf]||lf}: `
   +`${esc(String(e.target.value))}`);
  markDirty("lays"); refresh(false);
  return;
 }
 /* ═══ الجماعيُّ يسبق المفرد ═══ */
 const bk=e.target.dataset.bk, bf=e.target.dataset.bf;
 if(bk&&bf){
  const kd=e.target.dataset.k;
  const arr=(groupSel(H_sel())[bk])||[];
  if(!arr.length){rep("wr","لا عنصر قابل للتعديل");return}
  let raw;
  if(kd==="chk"){
   e.target.indeterminate=false;
   raw=e.target.checked?1:0;
  }else raw=e.target.value;
  /* والسياسةُ صريحةٌ في موضع النداء: الفراغُ هنا «لا تكتب» */
  const r=edit(()=>applyField(bk,arr,bf,raw,{skipBlank:1}));
  if(r){
   if(r.blank)
    rep("in",`${fldName(bk,bf)}: تُرك فارغاً — لم يُكتب شيء`);
   else{
    rep(r.refused.length?"wr":"ok",sayApply(r));
    r.refused.slice(0,8).forEach(x=>
     rep("er",`  ${x.id}: ${x.msg}`));
    if(r.refused.length>8)
     rep("in",`  … و ${r.refused.length-8} رفضاً آخر`);
    /* والقسرُ مجموعٌ بسببه — كان يقع صامتاً */
    groupForced(r.forced).forEach(m=>rep("in","  "+m));
   }
  }
  refresh(false);
  return;
 }
 /* ═══ محرّر المنفذ: مقياسٌ قياسيٌّ وترشيحُ طبقات ═══ */
 const vps=e.target.dataset.vpscale;
 if(vps){
  const sh=activeSh();
  if(!sh)return;
  const vp=(sh.viewports||[]).find(v=>v.id===vps);
  if(!vp)return;
  const val=parseInt(e.target.value,10);
  if(!val||!VP_SCALES.includes(val)){
   renderSheetsBox(); return;
  }
  edit(()=>setViewportScale(sh.id,vp.id,val));
  if(editFailed())return;
  rep("ok",`${vp.name||vps}: 1:${val}`);
  renderSheetsBox(); draw(); return;
 }
 const vpf=e.target.dataset.vpf;
 if(vpf){
  const sh=activeSh();
  if(!sh)return;
  const vp=(sh.viewports||[]).find(v=>v.id===vpf);
  if(!vp)return;
  const row=document.querySelector(`[data-vp="${vpf}"]`);
  const checked=row
   ? [...row.querySelectorAll('input[data-vpf]:checked')].map(x=>x.value)
   : [];
  edit(()=>updateViewport(sh.id,vp.id,
   {layers:checked.length===LAYS().length?null:checked}));
  if(editFailed())return;
  rep("ok",`${vp.name||vpf}: ${
   checked.length===LAYS().length?"كل الطبقات"
   :checked.length+" طبقة"}`);
  renderSheetsBox(); draw(); return;
 }
 const p=e.target.dataset.p;
 if(!p)return;
 const L=selList();
 if(L.length!==1)return;
 const s=L[0];
 const kind=e.target.dataset.k, raw=e.target.value;
 /* ═══ ما يملكه الجدول يمرّ بمُثبِّته ═══
    parseVal يحلّل ويفحص المدى، فلا فحصَ مسبقٌ هنا ولا رسالةَ
    ثانية — والفراغُ في المفردة قيمةٌ (مسحُ اسمٍ أو نصٍّ بديل). */
 if(owned(s.k,p)){
  const v=(kind==="chk")?(e.target.checked?1:0):raw;
  const r=edit(()=>applyOne(s,p,v));
  if(r){
   if(!r.ok)rep("er",r.msg);
   else if(r.msg)rep("in",r.msg);   /* القسرُ يُقال */
   if(s.k==="open"){
    const o=openById(s.id);
    if(o){
     const st=openState(o);
     if(st==="over")rep("wr",`${o.id} صارت تخرج عن مدى جدارها`);
     else if(st==="clash")
      rep("wr",`${o.id} صارت تتراكب مع فتحة أخرى`);
    }
   }else if(s.k==="stair"){
    const t=stById(s.id);
    if(t){
     const c=stCheck(t);
     if(!c.ok)rep("wr",`${t.id}: `+c.msgs.join(" · "));
     else rep("ok",`${t.id}: ق ${m3(c.rise)} · ن ${m3(c.tread)} م`);
    }
   }
  }
  refresh(false);
  return;
 }
 /* ═══ وما بقي: حقولُ اللوحة المفردة وحدها ═══
    موضعُها وقطبها ومفصّلتها ونصُّها — لا مقابلَ لها جماعياً،
    فتُحلَّل هنا. */
 let v=raw;
 if(kind==="len"){
  if(!isLen(raw)){rep("er",`«${raw}» ليس طولاً`);renderProps();return}
  v=M(raw);
 }else if(kind==="num"){
  v=parseFloat(raw);
  if(!isFinite(v)){rep("er",`«${raw}» ليس رقماً`);renderProps();return}
 }else if(kind==="chk")v=e.target.checked?1:0;

 if(s.k==="wall"){
  const w=wallById(s.id);
  if(!w)return;
  edit(()=>{if(p==="h")w.h=Math.max(200,v)});
 }else if(s.k==="open"){
  const o=openById(s.id);
  if(!o)return;
  edit(()=>{
   if(p==="s")o.s=Math.round(v);
   else if(p==="hinge")o.hinge=(v==="end")?"end":"start";
   else if(p==="pan")o.pan=clamp(Math.round(v),1,6);
   else if(p==="face")o.face=(v==="r")?"r":"l";
  });
  const st=openState(o);
  if(st==="over")rep("wr",`${o.id} صارت تخرج عن مدى جدارها`);
  else if(st==="clash")rep("wr",`${o.id} صارت تتراكب مع فتحة أخرى`);
 }else if(s.k==="chain"){
  const c=chainById(s.id);
  if(!c)return;
  if(p==="vals"){
   try{
    const V=parseVals(raw);
    edit(()=>{c.vals=V});
    rep("ok",`${c.id}: ${V.length} قيمة · `
     +`المجموع ${fmtLen(V.reduce((x,y)=>x+y,0))} م`);
   }catch(er){rep("er",er.message)}
   refresh(false);
   return;
  }
 }else if(s.k==="anno"){
  const a=annoById(s.id);
  if(!a)return;
  edit(()=>{
   if(p==="s")a.s=String(raw).slice(0,120);
   else if(p==="rot")a.rot=deg(v);
   else if(p==="z")a.z=v;
  });
 }else if(s.k==="col"){
  const c=colById(s.id);
  if(!c)return;
  edit(()=>{
   if(p==="x")c.x=Math.round(v);
   else if(p==="y")c.y=Math.round(v);
   else if(p==="tag"){
    const t=String(raw).slice(0,10);
    if(t)c.tag=t; else delete c.tag;
   }
  });
 }
 refresh(false);
});
/* ═══ مستمع النقر ═══ */
document.addEventListener("click",e=>{
 const t=e.target;
 /* صفّ جدول الفتحات ⇒ تحديد فتحاته */
 const osr=t.closest("[data-osel]");
 if(osr){
  const L=String(osr.dataset.osel||"").split(" ").filter(Boolean)
   .map(id=>({k:"open",id})).filter(pickable);
  setSel(L,L[L.length-1]||null);
  rep(L.length?"in":"wr",L.length
   ?`${L.length} فتحة محدَّدة — عدّلها جماعياً من «الخصائص»`
   :"فتحات هذا الصفّ مخفيّة أو مقفلة");
  draw(); return;
 }
 /* الطبقات */
 const lo=t.dataset.loff;
 if(lo){
  edit(()=>toggleOff(lo));
  const d=pruneSel();
  rep(vis(lo)?"in":"wr",
   `${LNAME(lo)}: ${vis(lo)?"ظاهرة":"مخفيّة"}`
   +(d?` · خرج ${d} عنصراً من التحديد`:""));
  markDirty("lays"); refresh(false); return;
 }
 const lp=t.dataset.lplot;
 if(lp){
  edit(()=>setLay(lp,"plot",plots(lp)?0:1));
  rep("in",`${LNAME(lp)}: ${plots(lp)?"تُطبَع"
   :"لا تُطبَع — تُرى على الشاشة وتُستثنى من المخرَج"}`);
  markDirty("lays"); refresh(false); return;
 }
 const ll=t.dataset.llock;
 if(ll){
  edit(()=>toggleLock(ll));
  const d=pruneSel();
  rep("in",`${LNAME(ll)}: ${locked(ll)?"مقفلة — تُرى ولا تُلمَس"
   :"مفتوحة"}`+(d?` · خرج ${d} عنصراً من التحديد`:""));
  markDirty("lays"); refresh(false); return;
 }
 const li=t.dataset.liso;
 if(li){
  edit(()=>isolate(li));
  pruneSel();
  rep("in",`انفراد ${LNAME(li)} — «أظهر الكل» يعيد الجميع`);
  markDirty("lays"); refresh(false); return;
 }
 /* ═══ محرّر المنفذ: إظهار/إخفاء المنفذ · كل الطبقات ═══ */
 const vpv=t.closest("[data-vpvis]");
 if(vpv){
  const id=vpv.dataset.vpvis, sh=activeSh();
  if(!sh)return;
  const vp=(sh.viewports||[]).find(v=>v.id===id);
  if(!vp)return;
  edit(()=>updateViewport(sh.id,id,{visible:vp.visible?0:1}));
  if(editFailed())return;
  rep("in",`${vp.name||id}: ${vp.visible?"ظاهر":"مخفيّ"}`);
  renderSheetsBox(); draw(); return;
 }
 const vpa=t.closest("[data-vpall]");
 if(vpa){
  const row=vpa.closest("[data-vp]");
  if(!row)return;
  const id=row.dataset.vp, sh=activeSh();
  if(!sh)return;
  const vp=(sh.viewports||[]).find(v=>v.id===id);
  if(!vp)return;
  edit(()=>updateViewport(sh.id,id,{layers:null}));
  if(editFailed())return;
  rep("in",`${vp.name||id}: كل الطبقات`);
  renderSheetsBox(); draw(); return;
 }
 /* ═══ فتحُ الطبقة للتحرير ═══ نقرةٌ ثانيةٌ تُغلقه ═══ */
 const lsl=t.closest("[data-lsel]");
 if(lsl){
  const n=lsl.dataset.lsel;
  LCUR=(LCUR===n)?null:n;
  renderPanel("lays",1);
  return;
 }
 if(t.id==="lEmpty"){
  LEMPTY=!LEMPTY;
  renderPanel("lays",1);
  return;
 }
 /* ═══ الطبقة المخصصة — MT2 ═══ */
 if(t.id==="lAdd"){
  const nm=prompt("اسم الطبقة — لاتيني يبدأ بحرف (مثل C-FURN):");
  if(nm==null)return;
  const ds=prompt("الوصف العربي (اختياري):","");
  if(ds===null)return;
  const r=edit(()=>addLay(nm,ds));
  if(editFailed()){renderPanel("lays",1); return}
  rep(r?"ok":"er",r?`أُضيفت طبقة 「${r.n}」`:"اسمٌ غير صالح أو مكرر");
  renderPanel("lays",1);
  return;
 }
 if(t.id==="lDel"){
  if(!LCUR)return;
  if(!confirm(`حذف الطبقة المخصصة «${LCUR}»؟`))return;
  const r=edit(()=>delLay(LCUR));
  if(editFailed()){renderPanel("lays",1); return}
  rep(r?"ok":"wr",r?`حُذفت «${LCUR}»`:"تعذّر حذفها — لم تُحذَف");
  if(r)LCUR=null;
  renderPanel("lays",1);
  return;
 }
 if(t.id==="lStSave"){
  const nm=prompt("اسم حالة الطبقات:",
   layStates()[0]||"تسليم");
  if(nm==null)return;
  const r=edit(()=>stateSave(nm));
  if(editFailed())return;
  rep(r?"ok":"wr",r?`حُفظت الحالة «${r}»`:"الاسم فارغ");
  renderPanel("lays",1);
  return;
 }
 if(t.id==="lStGo"){
  const sel=$("#lStName");
  if(!sel||!sel.value)return;
  const n=edit(()=>stateApply(sel.value));
  if(editFailed())return;
  const d=pruneSel();
  rep(n?"ok":"in",n?`طُبّقت «${sel.value}» · ${n} حقلاً`
   :`«${sel.value}» مطابقةٌ للوضع الجاري`
   +(d?` · خرج ${d} عنصراً من التحديد`:""));
  markAllDirty(); refresh(false);
  return;
 }
 if(t.id==="lStDel"){
  const sel=$("#lStName");
  if(!sel||!sel.value)return;
  if(!confirm(`حذف حالة الطبقات «${sel.value}»؟`))return;
  edit(()=>stateDel(sel.value));
  if(editFailed())return;
  rep("ok",`حُذفت «${sel.value}»`);
  renderPanel("lays",1);
  return;
 }
 /* الأدوات */
 const run=t.dataset.run;
 if(run){
  import("../tools/registry.js").then(R=>{
   R.begin(run);
   const cl=$("#clIn");
   if(cl)cl.focus();
  });
  return;
 }
 /* المناطق */
 const ar=t.dataset.aref;
 if(ar){
  const a=areaById(ar);
  if(!a)return;
  const r=edit(()=>rebake(a,regionLoops()));
  if(r)rep("ok",`${a.id}: ${sqm(r.before)} → ${sqm(r.after)} م²`);
  refresh(false); return;
 }
 const as=t.dataset.astm;
 if(as){
  const a=areaById(as);
  if(!a)return;
  edit(()=>restamp(a));
  rep("in",`${a.id}: ثُبّتت البصمة — الحلقة كما هي`);
  refresh(false); return;
 }
 /* السلسلة */
 if(t.dataset.ccmp){
  lazy(()=>import("../tools/registry.js").then(R=>R.begin("chaincmp")),"مقارنة السلسلة");
  return;
 }
 /* الأداة الصحية */
 const fs=t.dataset.fsnap;
 if(fs){
  const f=fixById(fs);
  if(!f)return;
  const r=snapToWall([f.x,f.y],3000);
  if(!r){rep("wr","لا جدار قريب");return}
  edit(()=>{f.x=r.p[0]; f.y=r.p[1]; f.rot=r.rot});
  rep("ok",`أُلصِقت بـ ${r.wall} — الإحداثيات صريحة بعدها`);
  refresh(false); return;
 }
 /* الأوامر الجماعية */
 if(t.dataset.brenum){
  const arr=(groupSel(H_sel()).col)||[];
  if(!arr.length){rep("wr","لا أعمدة محدَّدة");return}
  const r=edit(()=>renumberCols(arr,"C"));
  if(r)rep("ok",`رُقّم ${r.n} عموداً · ${r.first} … ${r.last}`);
  refresh(false); return;
 }
 if(t.dataset.bcleartxt){
  const arr=(groupSel(H_sel()).dim)||[];
  const n=edit(()=>clearDimTxt(arr));
  if(editFailed())return;
  rep(n?"ok":"in", n?`مُسح النصّ البديل من ${n} بُعد — عادت `
   +`المقاسات الحقيقية`:"لا نصّ بديل في المحدَّد");
  refresh(false); return;
 }
 if(t.dataset.bname){
  const arr=(groupSel(H_sel()).area)||[];
  if(!arr.length){rep("wr","لا مناطق محدَّدة");return}
  const p=($("#bASeq")&&$("#bASeq").value)||"";
  const r=edit(()=>nameAreasSeq(arr,p));
  if(r)rep("ok",`سُمّيت ${r.n} منطقة من الأكبر · `
   +`أوّلها «${r.first}»`);
  refresh(false); return;
 }
 if(t.dataset.bclrname){
  const arr=(groupSel(H_sel()).area)||[];
  if(!arr.length){rep("wr","لا مناطق محدَّدة");return}
  const n=edit(()=>clearAreaNames(arr));
  if(editFailed())return;
  /* الفراغُ في الحقل الجماعيّ يعني «لا تكتب»، فالمسحُ زرٌّ صريح
     — لا معنىً ثانٍ للفراغ يقع خلسة. */
  rep(n?"ok":"in",n?`مُسح اسمُ ${n} منطقة`
   :"لا أسماءَ في المحدَّد");
  refresh(false); return;
 }
 /* الحذف */
 if(t.id==="pDel"){
  const r=delSel();
  if(!r)return;
  rep("ok","حُذف "+delSay(r)
   +(r.skipped?` · تُخطّي ${r.skipped} مخفيّ أو مقفل`:""));
 }
});
/* ═══ الجدول والمحاور والملخّص ═══ */
function renderSched(box){
 const S2=schedule();
 if(!S2.rows.length){
  box.innerHTML=`<p class="hint">لا مناطق — استعمل أداة «منطقة»</p>`;
  return;
 }
 box.innerHTML=S2.rows.map(r=>
  `<div class="ro rrow${r.stale?" stale":""}">`
  +`<span class="rgrow">`
  +`${esc(r.name)}${r.stale?" ⚠":""}</span>`
  +`<span>${sqm(r.ar)}</span></div>`).join("")
  +`<div class="ro u-e6b0c" ><span class="u-03732">المجموع `
  +`(${S2.rows.length})</span><span>${sqm(S2.total)} م²</span></div>`;
}
function renderOSched(box){
 const D2=openSchedule();
 if(!D2.rows.length){
  box.innerHTML=`<p class="hint">لا فتحات — استعمل «باب» أو `
   +`«شباك»</p>`;
  return;
 }
 box.innerHTML=D2.rows.map(r=>{
  const hid=!vis(OK[r.kind].lay);
  return `<div data-osel="${esc(r.ids.join(" "))}" `
   +`title="${esc(r.ids.join(" · "))}" `
   +`class="ro rrow clk${hid?" off":""}">`
   +`<span class="rmark">`
   +`${esc(r.mark)}</span>`
   +`<span class="u-98995">${esc(okName(r.kind))} `
   +`${esc(dm2(r.w,r.h))}`
   +`${r.sill?` · ج ${m2(r.sill)}`:""}`
   +`${r.pan>1?` · ${r.pan} مصاريع`:""}`
   +`${r.dep?` · ع ${m2(r.dep)}`:""}</span>`
   +`<span>${r.n}</span></div>`;
 }).join("")
 +`<div class="ro u-e6b0c" ><span class="u-03732">المجموع `
 +`(${D2.rows.length} نوعاً)</span><span>${D2.total}</span></div>`
 +(D2.bad?`<p class="hint warn">${D2.bad} فتحة معطوبة داخل `
  +`الجدول — الفاحص يسمّيها</p>`:"")
 +`<p class="hint">الرمز مشتقٌّ من ترتيب الجدول: تقريرٌ لا حقلٌ `
  +`يُخزَّن على الفتحة. انقر صفاً لتحديد فتحاته.</p>`;
}
function renderSummary(box){
 const sc=scene();
 const le=looseEnds(2).length;
 const B=sc.B;
 const W=[];
 if(le)W.push(`${le} طرف غير متّصل`);
 if(sc.bad)W.push(`${sc.bad} فتحة معطوبة`);
 if(sc.stale)W.push(`${sc.stale} منطقة قديمة`);
 if(sc.loose)W.push(`${sc.loose} بُعداً معلَّقاً`);
 if(sc.over)W.push(`${sc.over} بُعداً بنصّ بديل`);
 if(sc.hidden)W.push(`${sc.hidden} كياناً مخفيّاً`);
 box.innerHTML=
  `${S.walls.length} جدار · ${S.opens.length} فتحة · `
  +`${S.cols.length} عمود · ${S.fixt.length} أداة · `
  +`${S.stairs.length} درج<br>`
  +`${S.areas.length} منطقة · ${S.dims.length} بُعد · `
  +`${S.chains.length} سلسلة · ${S.anno.length} تأشير`
  +(B?`<br>المدى ${esc(dm2(B.x1-B.x0,B.y1-B.y0,"م"))}`:"")
  +(W.length
   ?`<br><span class="warn">${W.join(" · ")}</span>`
   :"<br>لا ملاحظات");
}
export function syncToggles(){
 [...document.querySelectorAll("[data-rb]")].forEach(b=>
  b.classList.toggle("on",!!+S.rb[b.dataset.rb]));
 const u=$("#bUndo"), r=$("#bRedo");
 if(u)u.disabled=!canUndo();
 if(r)r.disabled=!canRedo();
 try{syncStatus(); syncOverlay(); syncLevelBar()}catch(e){}
}
function renderAxes(box){
 box.innerHTML=`${S.grid.xs.length} محوراً رأسياً (حروف) · `
  +`${S.grid.ys.length} أفقياً (أرقام)`;
}
/* ═══ إدارة الأوراق — 4B ═══ */
function activeSh(){
 const a=Array.isArray(S.sheets)?S.sheets:[];
 if(!a.length)return null;
 return a.find(x=>x.id===S.activeSheet)||a[0];
}
/* ═══ محرّرٌ طبقات المنفذ ومقياسًا قياسيًا ═══
   vp.layers ترشيحُ composeSheet لا تحريرُ جدول الطبقات: null تعني
   «كل الطبقات»، والقائمة المأخوذة من LAYS() هي مخزّنُ الترشيح —
   والنقرةُ تطبَّق عبر updateViewport() ذرياً دون مسّ مصنع الطبقات. */
function vpLayersHtml(vp){
 const all=LAYS();
 if(!all.length)return `<p class="hint">لا طبقات في الجدول</p>`;
 const set=Array.isArray(vp.layers)?new Set(vp.layers):null;
 return `<div class="vpLays">`
  +all.map(l=>{
   const on=!set||set.has(l.n);
   return `<label class="chk"><input type="checkbox"`
    +` data-vpf="${esc(vp.id)}" value="${esc(l.n)}"`
    +`${on?" checked":""}> ${esc(LNAME(l.n))}${
      isCustom(l.n)?` <span class="ro">(مخصصة)</span>`:""}</label>`;
  }).join("")
  +`</div>`
  +`<div class="btnrow"><button type="button"`
  +` data-vpall="${esc(vp.id)}">كل الطبقات</button></div>`;
}
function renderSheetsBox(){
 const sel=$("#shActive"), cnt=$("#shCount"), list=$("#vpList");
 if(!sel)return;
 const sheets=Array.isArray(S.sheets)?S.sheets:[];
 const cur=activeSh();
 sel.innerHTML=sheets.map((sh,i)=>
  `<option value="${esc(sh.id)}"${cur&&sh.id===cur.id?" selected":""}>`
  +`${esc(sh.name||("ورقة "+(i+1)))}</option>`).join("");
 if(cnt)cnt.textContent=String(sheets.length);
 if(!list)return;
 if(!cur||!Array.isArray(cur.viewports)||!cur.viewports.length){
  list.innerHTML=cur
   ?`<p class="hint">«${esc(cur.name||"ورقة")}» بلا منافذ — استعمل `
    +`أداة «منفذ ورقة».</p>`
   :`<p class="hint">لا ورقة بعد — أضف ورقة جديدة.</p>`;
  return;
 }
 const shown=cur.viewports.filter(v=>v&&v.visible).length;
 const rows=cur.viewports.map((vp,i)=>{
  if(!vp)return "";
  const p=vp.paperRect||{};
  const w=p.x1-p.x0, h=p.y1-p.y0;
  const t=viewportTransform(vp);
  const sc=t?Math.max(1,Math.round((1/t.k)/5)*5):null;
  const scaleSel=VP_SCALES.map(s=>
   `<option value="${s}"${sc===s?" selected":""}>1:${s}</option>`)
   .join("");
  const scaleRow=VP_SCALES.length
   ? `<div class="row"><label>المقياس</label>`
     +`<select data-vpscale="${esc(vp.id)}" class="num">${scaleSel}</select>`
     +`</div>`
   : "";
  const nm=esc(vp.name||(`منفذ ${i+1}`));
  return `<div class="vpEd" data-vp="${esc(vp.id)}">`
   +`<div class="vpRow${vp.visible?"":" off"}">`
   +`<button type="button" class="lbtn" data-vpvis="${esc(vp.id)}"`
   +` title="${vp.visible?"أخفِ":"أظهر"}">${vp.visible?"◉":"○"}</button>`
   +`<span class="vpName">${nm}</span>`
   +`<span class="ro num">${esc(dim2(w.toFixed(0),h.toFixed(0),"مم"))}</span>`
   +`</div>`+scaleRow
   +`<details class="sub"><summary>طبقات المنفذ</summary>`
   + vpLayersHtml(vp)
   +`</details>`
   +`</div>`;
 }).join("");
 list.innerHTML=`<b>${esc(cur.name||"ورقة")}</b> · `
  +`${cur.viewports.length} منفذاً · ${shown} ظاهراً`
  +`<div class="vpRows">${rows}</div>`;
}
function wireSheets(){
 const sel=$("#shActive");
 if(sel){
  sel.addEventListener("change",()=>{
   if(!sel.value)return;
   edit(()=>{S.activeSheet=sel.value;});
   renderSheetsBox(); syncStatus(); draw();
  });
 }
 const bind=(id,fn)=>{
  const b=$("#"+String(id).replace(/^#+/,"")); if(b)b.addEventListener("click",fn)};
 bind("#shAdd",()=>{
  if(!Array.isArray(S.sheets))S.sheets=[];
  if(S.sheets.length>=200){rep("wr","بلغت 200 ورقة");return}
  edit(()=>{
   const sh=mkSheet({name:`ورقة ${S.sheets.length+1}`,
    size:S.sheet.size,customW:S.sheet.customW,customH:S.sheet.customH,
    orient:S.sheet.orient,margin:S.sheet.margin,
    tb:S.sheet.tb,north:S.sheet.north});
   S.sheets.push(sh); S.activeSheet=sh.id;
  });
  renderSheetsBox(); syncStatus(); draw();
 });
 bind("#shRen",()=>{
  const cur=activeSh(); if(!cur){rep("er","لا ورقة نشطة");return}
  const nm=prompt("اسم الورقة:",cur.name||"");
  if(nm==null)return;
  const v=String(nm).trim().slice(0,200)||cur.name;
  edit(()=>{const t=activeSh(); if(t)t.name=v;});
  renderSheetsBox(); syncStatus();
 });
 bind("#shDel",()=>{
  const cur=activeSh(); if(!cur){rep("er","لا ورقة نشطة");return}
  if(!confirm(`حذف ورقة «${cur.name}» مع منافذها؟`))return;
  const id=cur.id;
  edit(()=>{
   if(!Array.isArray(S.sheets))return;
   S.sheets=S.sheets.filter(x=>x.id!==id);
   if(S.activeSheet===id)S.activeSheet=(S.sheets[0]||{}).id||null;
  });
  renderSheetsBox(); syncStatus(); draw();
 });
 bind("#shPrev",()=>{
  if(!Array.isArray(S.sheets)||S.sheets.length<2)return;
  edit(()=>{
   const i=S.sheets.findIndex(x=>x.id===S.activeSheet);
   const j=(i-1+S.sheets.length)%S.sheets.length;
   S.activeSheet=S.sheets[j].id;
  });
  renderSheetsBox(); syncStatus(); draw();
 });
 bind("#shNext",()=>{
  if(!Array.isArray(S.sheets)||S.sheets.length<2)return;
  edit(()=>{
   const i=S.sheets.findIndex(x=>x.id===S.activeSheet);
   const j=(i+1)%S.sheets.length;
   S.activeSheet=S.sheets[j].id;
  });
  renderSheetsBox(); syncStatus(); draw();
 });
 renderSheetsBox();
}
export function refresh(reload){
 if(reload)loadForms();
 /* حرسٌ في موضعٍ واحد: أي تعديلٍ للطبقات أو حذفٍ أو تراجعٍ قد
    يُبقي في التحديد ما لا يُحدَّد. التنظيف هنا يُغني عن نداءٍ في
    كل مسار — وهو صامتٌ لأن مساره الخاص يُبلِّغ بعدده. */
 pruneSel();
 renderSheetsBox();
 syncToggles();
 // D6-16: لا تعيد بناء الجداول لحقل اسم واحد
 if(reload) markAllDirty();
 else markDirty("props");
 renderVisible(1);      /* المرئيّ المتّسخ · والمغلق يبقى موسوماً */
 draw();
}
