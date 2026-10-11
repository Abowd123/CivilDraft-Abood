/* ═══ أدوات المناطق ═══
   الخبز أمرٌ يُنفَّذ مرّة، ونتيجته كائن مستقلّ — لا كشفٌ يُعاد
   في كلّ رسمة، ولا حدود وهمية تُخترع ليقتنع كاشف. */
import {S} from "../core/state.js";
import {sqm,m2} from "../core/units.js";
import {addArea,regionAt,areaAt,areaById,rebake,isStale,setAreaFill,
        netArea,FILLS} from "../core/areas.js";
import {regionLoops,loopOpen,loopOpenAt} from "../core/render.js";
import {vis} from "../core/layers.js";
import {pArea,centroid} from "../core/geom.js";
import {defTool,H,rec,dirty,ov,ovOn,pvText,pvLine} from "./registry.js";
import {patList,patLabel,patOk,hatchDef} from "../core/hatches.js";

const GRN="#5cd98e", YEL="#ffd06b";
const visW=()=>vis("A-WALL")||vis("A-WALL-LOW");

defTool({
 id:"area", alias:"a منطقه غرفه", label:"منطقة",
 hint:"انقر داخل حلقة مغلقة · Enter ينهي",
 opts:[
  {k:"name", label:"الاسم",       type:"text",def:""},
  {k:"num",  label:"رقّم تلقائياً",type:"chk", def:1},
  {k:"showArea",label:"أظهر المساحة",type:"chk",def:1},
  {k:"fill", label:"التعبئة",     type:"sel",
   items:Object.keys(FILLS).map(k=>[k,FILLS[k]]), def:"tint"}],
 steps:[
  {p:"انقر داخل المنطقة (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    /* الهندسة لا تُخفى، لكن الخبز من جدرانٍ لا تراها يوقعك في
       حلقةٍ لا تفهم مصدرها — فالتنبيه لازم */
    if(!visW())
     H.rep("wr","طبقة الجدران مخفيّة — الخبز يقرأ الجدران كلّها "
      +"على أي حال. أظهرها لترى ما تخبزه.");
    const ex=areaAt(p[0],p[1]);
    if(ex)throw new Error(`توجد ${ex.id} هنا — احذفها أو حدّثها`);
    const ring=regionAt(regionLoops(),p[0],p[1]);
    if(!ring){
     /* السببُ ليس دائماً جداراً مفتوحاً: قد يكون الاتحادُ نفسه
        لم يُخَط. وبعد اللحم لا يقع ذلك لتفاوتٍ دون المليمترين،
        فإن وقع فالمدخلُ معطوبٌ فعلاً — والموضعُ يُقال، لأن
        «أغلق الجدران» بلا مكانٍ نصيحةٌ لا تُنفَّذ. */
     const g=loopOpen(), at=loopOpenAt();
     throw new Error(
      "لا حلقة مغلقة تحيط بهذه النقطة — أغلق الجدران أوّلاً "
      +"(المعيَّنات الحمراء تدلّ على الأطراف غير المتّصلة)"
      +(g?` · وفي اتحاد الأجسام ${g} قطعةً لم تُخَط`
        +(at?` — آخرُها عند (${m2(at[0])}، ${m2(at[1])})`:"")
        +". أزِح أحد الجدارَين هناك بخطوة الالتقاط ثم أعِد "
        +"المحاولة." : ""));
    }
    let nm=String(ov("area","name")||"").trim();
    if(ovOn("area","num")){
     const n=S.areas.length+1;
     nm=nm?`${nm} ${n}`:`منطقة ${n}`;
    }
    const a=addArea(ring,nm,{
     showArea:ovOn("area","showArea")?1:0,
     fill:ov("area","fill")});
    rec(ctx,a,"areas");
    H.rep("ok",`${a.id} ${a.name} · ${sqm(netArea(a))} م² · `
     +`${a.ring.length} ضلعاً · خُبزت كائناً مستقلّاً`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  const ring=regionAt(regionLoops(),g[0],g[1]);
  if(!ring)return [];
  const o=[];
  for(let i=0;i<ring.length;i++)
   o.push({t:"l",a:ring[i],b:ring[(i+1)%ring.length],c:GRN});
  o.push(pvText(centroid(ring),
   `${sqm(Math.abs(pArea(ring)))} م² · ${ring.length} ضلعاً`,GRN));
  return o;
 }});

/* ═══ تحديث المناطق المحدَّدة ═══
   يعيد الخبز بأمرك، ويذكر فرق المساحة.
   destruct: يعيد خبز حلقاتٍ قائمة — فلا يُصدِره المزوّد بلا
   تصريحٍ من المستخدم. */
/* ═══ تهشير منطقة ═══ P-جديد (الأولوية ٤)
   كان جدولُ الأنماط كاملاً في core/hatches.js، ومحرِّرُه في
   styleManager، والمنطقةُ تحمل `fill:"hatch"` — ولا طريقَ لقول
   «هشّر هذه بهذا النمط»: النمطُ لا يُختار أصلاً، والزاويةُ مطبوعةٌ
   45° (قيدٌ مُعلَنٌ في رأس hatches.js).

   الأداةُ تكتب حقلَين: نوعَ التعبئة واسمَ النمط. وتعمل على التحديد
   إن وُجِد، وإلّا على ما تنقره — فلا «كلُّ المناطق» ضمناً.
   وقائمةُ الأنماط تُقرأ حيّةً من `patList()` فالمخصَّصُ الذي أضفتَه
   في مدير الهيئة يظهر هنا بلا تسجيلٍ ثانٍ. */
defTool({
 id:"hatch", alias:"h تهشير هشر هاشور", label:"تهشير منطقة",
 destruct:1,
 hint:"المحدَّد أو ما تنقره — النمطُ من الشريط",
 opts:[
  {k:"fill",label:"التعبئة",type:"sel",
   items:Object.keys(FILLS).map(k=>[k,FILLS[k]]), def:"hatch"},
  {k:"pat", label:"النمط", type:"sel",
   items:()=>patList().map(p=>[p.k,p.label]), def:"ANSI31",
   hint:"تُحرَّر الأنماطُ في «مدير الهيئة»"}],
 start(ctx){
  const L=H.sel().filter(s=>s.k==="area")
   .map(s=>areaById(s.id)).filter(Boolean);
  if(!L.length)return true;          /* لا تحديد ⇒ انقر */
  apply(ctx,L);
  return false;
 },
 steps:[
  {p:"انقر المنطقة (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const a=areaAt(p[0],p[1]);
    if(!a)throw new Error(
     "لا منطقة هنا — التهشيرُ على مناطقَ مخبوزةٍ لا على فراغ. "
     +"استعمل «منطقة» أوّلاً");
    apply(ctx,[a]);
   }}],
 prev(ctx,g){
  if(!g)return [];
  const a=areaAt(g[0],g[1]);
  if(!a)return [];
  const o=[];
  for(let i=0;i<a.ring.length;i++)
   o.push({t:"l",a:a.ring[i],b:a.ring[(i+1)%a.ring.length],c:GRN});
  const f=ov("hatch","fill"), k=ov("hatch","pat");
  o.push(pvText(centroid(a.ring),
   `${a.id} ⇐ ${FILLS[f]||f}`+((f==="hatch")?` · ${patLabel(k)}`:""),
   GRN));
  return o;
 }});
/* الكتابةُ في موضعٍ واحد: التحديدُ والنقرُ يمرّان بها معاً */
function apply(ctx,list){
 const f=ov("hatch","fill");
 const k=ov("hatch","pat");
 if(!FILLS[f])throw new Error(`نوعُ تعبئةٍ غير معروف «${f}»`);
 if(f==="hatch"&&!patOk(k))
  throw new Error(`نمطٌ غير معرَّف «${k}» — `
   +`المعرَّفةُ: ${patList().map(p=>p.k).join(" · ")}`);
 const done=setAreaFill(list,f,(f==="hatch")?k:null);
 dirty(ctx);
 list.forEach(a=>rec(ctx,a,"areas"));
 H.rep("ok",`${done} منطقةً ⇐ ${FILLS[f]}`
  +((f==="hatch")?` بنمط «${patLabel(k)}» `
   +`(زاوية ${hatchDef(k).ang}° · تباعد ${hatchDef(k).mm} مم ورقية)`:"")
  +" — يسري على الشاشة وكلِّ تصدير");
}

defTool({
 id:"arearef", alias:"ar حدث تحديث", label:"تحديث المناطق",
 hint:"يعيد خبز المحدَّد من الهندسة الحالية",
 destruct:1,
 opts:[],
 start(ctx){
  const L=H.sel().filter(s=>s.k==="area");
  const T=L.length?L.map(s=>areaById(s.id)).filter(Boolean)
   :S.areas.filter(isStale);
  if(!T.length){
   H.rep("in",L.length?"لا منطقة محدَّدة"
    :"لا منطقة قديمة تحتاج تحديثاً");
   return false;
  }
  const loops=regionLoops();
  let n=0, fail=0;
  T.forEach(a=>{
   try{
    const r=rebake(a,loops);
    n++;
    const d=r.after-r.before;
    H.rep("ok",`${a.id} ${a.name}: ${sqm(r.before)} → `
     +`${sqm(r.after)} م²`
     +(Math.abs(d)>1?` (${d>0?"+":""}${sqm(d)})`:" (بلا تغيّر)"));
   }catch(e){fail++; H.rep("er",e.message)}
  });
  if(n)dirty(ctx);
  H.rep(fail?"wr":"ok",`حُدّثت ${n} منطقة`
   +(fail?` · تعذّرت ${fail}`:"")
   +(L.length?"":" (كانت قديمة)"));
  return false;                    /* أمر لحظي — لا خطوات */
 },
 steps:[]});

/* ═══ قياسُ المساحة الحرّة بالنقر ═══ §٣ (أولوية منخفضة)
   «منطقة» تُنشئ كياناً دائماً: اسمٌ وتعبئةٌ وبطاقةٌ تدخل جدولَ
   الكمّيات. ومن يريد أن **يسأل** فقط («كم مساحةُ هذا الصالون؟»)
   كان عليه أن يخبز منطقةً ثم يحذفها — فيُلوِّث جدولَ الكمّياتِ
   بخطوتَي تاريخٍ لسؤالٍ عابر.

   هذه الأداةُ **لا تكتب شيئاً**: لا كيانَ ولا خطوةَ تاريخ. تقرأ
   الحلقةَ نفسَها التي يقرؤها الخبزُ (`regionAt`) فالرقمُ مطابقٌ
   لما كانت المنطقةُ ستُعطيه بالضبط — لا تقديرٌ ثانٍ يتفرّق عن
   الأوّل.

   والتجميعُ لأنّ السؤالَ الحقيقيَّ مركَّبٌ غالباً: «كم مساحةُ
   الشقّةِ؟» = صالونٌ + ممرٌّ + ثلاثُ غرف. فكلُّ نقرةٍ تُضاف
   ويُعرَض المجموعُ الجاري، وEnter يُنهي بخلاصة. */
defTool({
 id:"marea", alias:"mar قياس_مساحه قياس_مساحة مساحه_حرة",
 label:"قياس مساحة",
 hint:"انقر داخل حلقاتٍ مغلقة — تُجمَع · Enter ينهي · لا يُكتَب شيء",
 steps:[
  {p:"انقر داخل المنطقة (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    if(!visW())
     H.rep("wr","طبقة الجدران مخفيّة — القياس يقرأ الجدران كلّها "
      +"على أي حال");
    const ring=regionAt(regionLoops(),p[0],p[1]);
    if(!ring){
     H.rep("wr","لا حلقةَ مغلقةً هنا — الجدرانُ لا تُحيط هذا الموضع");
     return;
    }
    const ar=Math.abs(pArea(ring));
    const pr=perimOf(ring);
    ctx.v.rings=(ctx.v.rings||[]).concat([ring]);
    ctx.v.sum=(ctx.v.sum||0)+ar;
    const n=ctx.v.rings.length;
    H.rep("ok",`${sqm(ar)} م² · محيطٌ ${m2(pr)} م`
     +(n>1?` · المجموع ${sqm(ctx.v.sum)} م² في ${n} حلقات`:""));
   }}],
 prev(ctx,g){
  const o=[];
  /* المقيسُ يبقى معلَّماً: تنقر خمسَ غرفٍ وترى أيَّها عددتَ */
  (ctx.v.rings||[]).forEach(r=>{
   for(let i=0;i<r.length;i++)
    o.push(pvLine(r[i],r[(i+1)%r.length],GRN));
   o.push(pvText(centroid(r),`${sqm(Math.abs(pArea(r)))} م²`,GRN));
  });
  /* والحلقةُ تحت المؤشّرِ تُعلَّم بلونٍ آخرَ قبل النقر */
  if(g){
   const h=regionAt(regionLoops(),g[0],g[1]);
   if(h&&!(ctx.v.rings||[]).some(r=>same(r,h))){
    for(let i=0;i<h.length;i++)
     o.push(pvLine(h[i],h[(i+1)%h.length],YEL));
    o.push(pvText(centroid(h),`${sqm(Math.abs(pArea(h)))} م²`,YEL));
   }
  }
  return o;
 },
 done(ctx){
  const n=(ctx.v.rings||[]).length;
  if(!n){H.rep("in","لم يُقَس شيء"); return}
  H.rep("ok",`المجموع ${sqm(ctx.v.sum)} م² في ${n} `
   +`${n===1?"حلقة":"حلقات"} — لم يُكتَب شيءٌ في المشروع`);
 }});
/* محيطُ حلقةٍ — تقريبٌ بالأضلاع (لا أقواسَ في حلقاتِ الخبز) */
function perimOf(r){
 let s=0;
 for(let i=0;i<r.length;i++){
  const a=r[i], b=r[(i+1)%r.length];
  s+=Math.hypot(b[0]-a[0],b[1]-a[1]);
 }
 return Math.round(s);
}
/* حلقتانِ متطابقتانِ؟ — بأوّلِ رأسٍ وعددِه: حلقاتُ الخبزِ تأتي
   من المصدرِ نفسِه فالمقارنةُ الرخيصةُ كافيةٌ هنا */
const same=(a,b)=>a.length===b.length
 &&a[0][0]===b[0][0]&&a[0][1]===b[0][1];
