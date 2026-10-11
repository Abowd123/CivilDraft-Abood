/* ═══ الصورة المرجعية — لوح التحكّم ═══
   النواة (core/underlay.js) تملك الشفافية والدوران والمقياس والنقل
   والإظهار والقفل والمعايرة، لكن الواجهة لم تكن تعرض غير «تحميل».
   هذا اللوح يوصل تلك الدوال بحقولٍ فقط ولا يضيف منطقاً:
   · الشفافية والإظهار تفضيلا عرضٍ (لا يدخلان التاريخ) — كما قرّرت النواة.
   · الدوران والنقل والمقياس والمعايرة تمرّ بـedit() فتُتراجَع بخطوةٍ واحدة.
   · الرفض (مقفولة، لم تكتمل الأبعاد، قيمةٌ غير رقمية) تُبلِّغه الدوال
     بإرجاع false ونُظهره هنا سطراً في الإخراج.
   اللوح لا يحجب الرسم: يُثبَّت عند طرف الشاشة (css/underlay.css) ويبقى
   مفتوحاً أثناء التعديل، ويُحدَّث حقلُه بعد كل تغيّرٍ أو تراجع دون أن
   يسرق التركيز من الحقل الذي يُكتَب فيه.
   لا onclick ولا style مضمَّن (CSP). */
import {H,defTool,begin,ovLen,dirty,pvLine} from "../tools/registry.js";
import {state,setOpacity,setVisible,setLocked,setRotation,setScale,move,
 calibrate,setImage} from "../core/underlay.js";
import {rptOpen,rptClose,rptBox} from "./rpt.js";
import {chooseUnderlay} from "./appcmds.js";
import {dim2} from "../core/units.js";

const DEG=180/Math.PI;
const r3=n=>Math.round(n*1000)/1000;
/* الإحداثيات العالَمية بالمليمتر — الحقول بالمتر */
const toM=mm=>r3((+mm||0)/1000);

function ready(st){return !!(st.src&&st.w&&st.h&&st.img)}

function body(){
 const st=state();
 if(!st.src){
  return `<p class="hint">لا صورة مرجعية بعد. حمّل صورةً (مخطّطاً ممسوحاً أو `
   +`صورةً جوّية) لتتبّعها.</p>`
   +`<div class="rpt-act"><button type="button" data-ul="load">تحميل صورة…</button>`
   +`<button type="button" data-rpt="close">إغلاق</button></div>`;
 }
 const widthM=ready(st)?toM(st.w*st.mpp):"";
 const heightM=ready(st)?toM(st.h*st.mpp):"";
 return `<div class="ul-row"><label><input type="checkbox" data-f="visible"`
  +`${st.visible?" checked":""}> مرئيّة</label>`
  +`<label><input type="checkbox" data-f="locked"${st.locked?" checked":""}> `
  +`مقفولة (لا نقل)</label></div>`
  +`<div class="ul-row"><label for="ulOp">الشفافية</label>`
  +`<input id="ulOp" type="range" min="0" max="100" step="1" data-f="opacity" `
  +`value="${Math.round((st.opacity==null?0.5:st.opacity)*100)}">`
  +`<output data-o="opacity">${Math.round((st.opacity==null?0.5:st.opacity)*100)}٪</output></div>`
  +`<div class="ul-grid">`
  +`<label>الدوران (°)<input type="number" inputmode="decimal" step="0.1" data-f="rot" `
  +`value="${r3((+st.rot||0)*DEG)}"></label>`
  +`<label>عرض الصورة (م)<input type="number" inputmode="decimal" min="0.001" step="0.01" data-f="width" `
  +`value="${widthM}"${ready(st)?"":" disabled"}></label>`
  +`<label>موضع الزاوية س (م)<input type="number" inputmode="decimal" step="0.01" data-f="x" `
  +`value="${toM(st.x)}"${ready(st)?"":" disabled"}></label>`
  +`<label>موضع الزاوية ص (م)<input type="number" inputmode="decimal" step="0.01" data-f="y" `
  +`value="${toM(st.y)}"${ready(st)?"":" disabled"}></label></div>`
  +`<p class="hint" data-o="dim">${ready(st)
   ?`الحجم الحاليّ ${dim2(widthM,heightM,"م")}`
   :"تُفعَّل حقول الحجم والموضع بعد اكتمال تحميل الصورة."}</p>`
  +`<div class="rpt-act">`
  +`<button type="button" data-ul="cal"${ready(st)?"":" disabled"}>معايرة بنقطتين</button>`
  +`<button type="button" data-ul="load">استبدال الصورة…</button>`
  +`<button type="button" data-ul="del">إزالة الصورة</button>`
  +`<button type="button" data-rpt="close">إغلاق</button></div>`
  +`<p class="hint">المعايرة: انقر نقطتين على الصورة تعرف المسافة بينهما، `
  +`ثم اكتب المسافة الحقيقية.</p>`;
}

const boxOpen=()=>{const b=rptBox(); return b&&b.classList.contains("ul")?b:null};

/* يُحدّث القيَم في مكانها — لا يُعيد بناء DOM فلا يضيع تركيزٌ ولا يُقطَع كتابة */
function sync(){
 const b=boxOpen(); if(!b)return;
 const st=state();
 /* تغيّرت بنيةُ اللوح (حُمّلت صورة أو أُزيلت أو اكتملت أبعادها) */
 const had=!!b.querySelector('[data-f="rot"]');
 const enabled=b.querySelector('[data-f="width"]');
 const wasReady=!!(enabled&&!enabled.disabled);
 if(had!==!!st.src||(had&&wasReady!==ready(st))){
  const bd=b.querySelector(".rpt-b"); if(bd)bd.innerHTML=body();
  return;
 }
 if(!had)return;
 const put=(f,v)=>{
  const el=b.querySelector(`[data-f="${f}"]`);
  if(!el||el===document.activeElement)return;
  if(el.type==="checkbox")el.checked=!!v; else el.value=String(v);
 };
 put("visible",st.visible); put("locked",st.locked);
 const op=Math.round((st.opacity==null?0.5:st.opacity)*100);
 put("opacity",op);
 const out=b.querySelector('[data-o="opacity"]'); if(out)out.textContent=op+"٪";
 put("rot",r3((+st.rot||0)*DEG));
 if(ready(st)){
  put("width",toM(st.w*st.mpp)); put("x",toM(st.x)); put("y",toM(st.y));
  const d=b.querySelector('[data-o="dim"]');
  if(d)d.textContent=`الحجم الحاليّ ${dim2(toM(st.w*st.mpp),toM(st.h*st.mpp),"م")}`;
 }
}
/* يُنادى من app.js بعد كل تغيّرٍ في الصورة (تحميل · تراجع · معايرة) */
export function refreshUnderlayPanel(){sync()}

function reject(msg){H.rep("wr",msg)}

function onField(f,el){
 const st=state();
 switch(f){
  case "visible": setVisible(el.checked); break;
  case "locked": setLocked(el.checked); break;
  case "opacity":
   if(!setOpacity(+el.value/100))reject("قيمة الشفافية غير صالحة");
   break;
  case "rot":
   if(!setRotation(+el.value/DEG))reject("قيمة الدوران غير صالحة");
   break;
  case "width":{
   if(!ready(st)){reject("انتظر اكتمال تحميل الصورة");break}
   const w=+el.value;
   if(!(w>0)||!setScale(w*1000/st.w))reject("عرض الصورة يجب أن يكون رقماً موجباً");
   break;
  }
  case "x": case "y":{
   const b=boxOpen(); if(!b)break;
   const x=+b.querySelector('[data-f="x"]').value*1000;
   const y=+b.querySelector('[data-f="y"]').value*1000;
   if(!move(x,y))reject(st.locked
    ?"الصورة مقفولة — ألغِ القفل قبل النقل"
    :"تعذّر النقل: تأكّد من الأرقام واكتمال تحميل الصورة");
   break;
  }
 }
 sync();
}

export function openUnderlayPanel(){
 const box=rptOpen("الصورة المرجعية",body());
 box.classList.add("ul");
 /* الشفافية: تحديثٌ حيّ أثناء السحب. الباقي عند الإتمام (change) كي لا
    تتحوّل كل ضغطة مفتاحٍ إلى خطوةِ تراجع. */
 box.addEventListener("input",e=>{
  if(rptBox()!==box)return;
  const el=e.target.closest&&e.target.closest("[data-f]");
  if(el&&el.dataset.f==="opacity")onField("opacity",el);
 });
 box.addEventListener("change",e=>{
  if(rptBox()!==box)return;
  const el=e.target.closest&&e.target.closest("[data-f]");
  if(el&&el.dataset.f!=="opacity")onField(el.dataset.f,el);
 });
 box.addEventListener("click",e=>{
  if(rptBox()!==box)return;
  const d=e.target.closest&&e.target.closest("[data-ul]");
  if(!d)return;
  if(d.dataset.ul==="load"){chooseUnderlay(); return}
  if(d.dataset.ul==="del"){
   setImage("");
   H.rep("ok","أُزيلت الصورة المرجعية — يمكن التراجع عنها");
   sync(); return;
  }
  if(d.dataset.ul==="cal"){
   /* يُغلَق اللوح كي لا يحجب النقر على الصورة */
   rptClose(); begin("ulcal");
  }
 });
 return box;
}

/* ═══ معايرة بنقطتين ═══
   كـrefcal للمرجع المستورد لكن على الصورة: المسافة الحقيقية تُضرَب في
   مقياس الصورة الحاليّ ÷ المسافة المقيسة، فتُصحَّح كل القياسات اللاحقة. */
defTool({
 id:"ulcal", alias:"ulcal عاير_الصورة معايرة_الصورة",
 label:"معايرة الصورة المرجعية",
 hint:"نقطتان على الصورة ثم المسافة الحقيقية بينهما",
 ico:"underlay", nojr:1, noplan:1,
 opts:[{k:"d",label:"المسافة الحقيقية م",type:"len",def:"1"}],
 start(){
  const st=state();
  if(!ready(st)||!st.visible){
   H.rep("wr","لا صورة مرجعية ظاهرة — حمّل صورةً أو أظهرها أوّلاً");
   return false;
  }
  return true;
 },
 steps:[
  {p:"النقطة الأولى على الصورة"},
  {p:"النقطة الثانية", base:0,
   each(ctx,p){
    const before=state().mpp;
    const real=ovLen("ulcal","d");
    if(!(real>0)){H.rep("er","المسافة الحقيقية يجب أن تكون رقماً موجباً"); return}
    /* نقاط الأدوات مصفوفاتٌ [x,y] وcalibrate تقرأ {x,y} */
    const q=ctx.pts[0];
    const after=calibrate({x:q[0],y:q[1]},{x:p[0],y:p[1]},real);
    if(after===before){
     H.rep("wr","تعذّرت المعايرة: النقطتان متطابقتان أو المسافة غير صالحة");
     return;
    }
    /* بلا dirty لا تدفع الجلسةُ خطوةً في التاريخ فلا تُتراجَع المعايرة */
    dirty(ctx);
    H.rep("ok",`عُويرت الصورة ×${(after/before).toFixed(5)} · عرضها الآن `
     +`${toM(state().w*after)} م`);
    sync();
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  return [pvLine(ctx.pts[0],g,"#5cd98e")];
 }});

/* فتح اللوح من سطر الأوامر ولوحة الأوامر */
defTool({
 id:"underlayCtl", alias:"ulctl underlaypanel ضبط_الصورة تحكم_الصورة",
 label:"ضبط الصورة المرجعية",
 hint:"الشفافية والدوران والمقياس والموضع والمعايرة",
 ico:"underlay", own:1, nojr:1, noplan:1,
 start(){ openUnderlayPanel(); return false; }
});
