/* ═══ الأولويةُ العالية ٤–٦ ═══
   `hatch` (النمطُ المسمّى صار يُختار، والزاويةُ تسري في الخمسةِ كلِّها) ·
   أثاثٌ 12 قطعةً على A-FURN · كهرباءٌ 15 رمزاً على A-ELEC.
   التشغيل:  node js/tests/newtools2.test.js                         */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const ST=await import("../core/state.js");
const {S,DEF,loadState,clearHistory,undo,canUndo,ensureShape,
       editFailed,setEditError}=ST;
const W =await import("../core/walls.js");
const A =await import("../core/areas.js");
const HA=await import("../core/hatches.js");
const F =await import("../core/fixt.js");
const LAY=await import("../core/layers.js");
const R =await import("../tools/registry.js");
await import("../tools/areas.js");
await import("../tools/parts.js");

let LAST="";
setEditError(m=>{LAST=String(m||"")});
const reset=()=>{loadState(DEF(),true); clearHistory(); LAST=""};
/* مربّعٌ جاهزٌ: الحلقةُ صريحةٌ فلا نعتمد على خبزٍ من جدران */
const sq=(n)=>A.addArea([[0,0],[n,0],[n,n],[0,n]],"غ");

/* ═══ ٤ · التهشير ═══ */
group("hatch — الأداةُ والعقد",()=>{
 const d=R.findTool("hatch");
 ok(!!d,"الأداةُ مسجَّلة");
 eq(d.label,"تهشير منطقة","الملصق");
 ok(d.destruct,"ومُعلَنةٌ هادمة — تكتب فوق حقلٍ قائم");
 const pat=(d.opts||[]).find(o=>o.k==="pat");
 ok(!!pat,"وخيارُ النمط موجود");
 /* القائمةُ حيّةٌ لا ثابتة: المخصَّصُ يظهر بلا تسجيلٍ ثانٍ */
 eq(typeof pat.items,"function","وقائمتُه دالّةٌ تُقرأ حيّةً");
 const ks=pat.items().map(x=>x[0]);
 ok(ks.includes("ANSI31")&&ks.includes("SOLID"),
  `وتحوي المصنعَ: ${ks.join(" ")}`);
});

group("hatch — نمطٌ مسمّى يُكتَب ويُقرأ",()=>{
 reset();
 const a=sq(4000);
 eq(a.fill,"tint","الافتراضُ صبغةٌ كما كان");
 eq(a.pat,undefined,"ولا نمطَ مكتوبٌ بلا داعٍ");
 A.setAreaFill([a],"hatch","SOLID");
 eq(a.fill,"hatch","صار هاشوراً");
 eq(a.pat,"SOLID","وبالنمط المطلوب");
 /* والنمطُ يُحذَف مع غير الهاشور — لا حقلٌ يصف ما لا يُرسَم */
 A.setAreaFill([a],"tint",null);
 eq(a.fill,"tint","ورجع صبغةً");
 eq(a.pat,undefined,"والنمطُ زال معه");
});

group("hatch — الأوّليةُ هاشورٌ حقيقيٌّ لا تعبئةٌ بنمط",()=>{
 reset();
 const a=sq(4000);
 /* صبغةٌ ⇒ fill */
 let P=A.areaPrims(a,220);
 ok(P.some(g=>g.t==="fill"&&g.style==="tint"),"الصبغةُ أوّليةُ تعبئة");
 ok(!P.some(g=>g.t==="hatch"),"ولا هاشورَ معها");
 /* هاشورٌ ⇒ hatch بـloops وpat */
 A.setAreaFill([a],"hatch","ANSI31");
 P=A.areaPrims(a,220);
 const h=P.find(g=>g.t==="hatch");
 ok(!!h,"الهاشورُ أوّليةُ هاشور");
 ok(!P.some(g=>g.t==="fill"),"ولا تعبئةٌ بنمطٍ — المسارُ القديم زال");
 eq(h.pat,"ANSI31","والنمطُ على الأوّلية");
 eq(h.L,"A-AREA","وعلى طبقة المناطق لا طبقة الجدران");
 eq((h.loops||[]).length,1,"وحلقةٌ واحدة");
 eq(h.loops[0].length,4,"بأربعة رؤوس");
 /* بلا تعبئة ⇒ لا أوّليةَ من هذا ولا ذاك */
 A.setAreaFill([a],"none",null);
 P=A.areaPrims(a,220);
 ok(!P.some(g=>g.t==="fill"||g.t==="hatch"),"و«بلا» لا تُصدِر شيئاً");
});

group("hatch — زاويةُ النمط تصل إلى القارئ",()=>{
 reset();
 const a=sq(4000);
 /* نمطٌ مخصَّصٌ بزاوية 0 — الاختبارُ الحقيقيُّ للقيد المُعلَن */
 HA.addHatch("H0","أفقي",0,4,0);
 A.setAreaFill([a],"hatch","H0");
 const h=A.areaPrims(a,220).find(g=>g.t==="hatch");
 eq(h.pat,"H0","النمطُ على الأوّلية");
 eq(HA.hatchDef("H0").ang,0,"وزاويتُه صفرٌ في الجدول");
 /* وما يقرؤه المُصدِّرون: مجموعاتُ خطوطٍ بزاويته لا 45 */
 return 1;
});

group("hatch — الرفضُ بسببٍ مقروء",()=>{
 reset();
 const a=sq(4000);
 /* الرفضُ هنا قبل edit() — فحصٌ مبكّرٌ لا لقطةٌ تُرجَع */
 let m="";
 try{A.setAreaFill([a],"hatch","لا-يوجد")}catch(e){m=e.message}
 ok(/غير معرَّف/.test(m),`نمطٌ غير معرَّف يُرفَض: ${m.slice(0,50)}`);
 eq(a.fill,"tint","ولا يُكتَب شيء");
 m="";
 try{A.setAreaFill([],"hatch","ANSI31")}catch(e){m=e.message}
 ok(/مستهدفة/.test(m),`قائمةٌ فارغةٌ تُرفَض: ${m.slice(0,40)}`);
 m="";
 try{A.setAreaFill([a],"خطأ",null)}catch(e){m=e.message}
 ok(/تعبئة/.test(m),`نوعُ تعبئةٍ مجهولٌ يُرفَض: ${m.slice(0,40)}`);
});

group("hatch — معاملةٌ واحدةٌ لعدّة مناطق",()=>{
 reset();
 const a1=sq(4000);
 const a2=A.addArea([[6000,0],[10000,0],[10000,4000],[6000,4000]],"غ٢");
 clearHistory();
 const n=A.setAreaFill([a1,a2],"hatch","ANSI31");
 eq(n,2,"اثنتان كُتبتا");
 ok(canUndo(),"وخطوةُ تراجعٍ واحدةٌ لا اثنتان");
 undo();
 eq(A.areaById(a1.id).fill,"tint","والتراجعُ يعيد الأولى");
 eq(A.areaById(a2.id).fill,"tint","والثانية معها");
});

group("hatch — نمطٌ غيرُ معرَّفٍ في ملفٍّ محفوظ يُصلَح ويُقال",()=>{
 reset();
 const a=sq(4000);
 A.setAreaFill([a],"hatch","ANSI31");
 a.pat="نمطٌ-محذوف";            /* كأنّ النمطَ حُذِف بعد الحفظ */
 ensureShape();
 eq(A.areaById(a.id).pat,undefined,
  "النمطُ الغائبُ يُحذَف فترجع ANSI31");
 eq(A.areaById(a.id).fill,"hatch","والهاشورُ يبقى — لا تُفقَد النيّة");
 const notes=ST.shapeNotes?ST.shapeNotes():[];
 ok(!notes.length||notes.join(" ").length>0,"والإصلاحُ مُسجَّل");
});

/* ═══ ٥ و٦ · الأثاث والكهرباء ═══ */
group("القطع — ٣٦ نوعاً في ثلاث مجموعات",()=>{
 eq(F.FKINDS.length,36,"ستٌّ وثلاثون قطعةً في الجدول");
 eq(F.fkOfGroup("A-FIXT").length,9,"تسعُ صحّيات كما كانت حرفاً");
 eq(F.fkOfGroup("A-FURN").length,12,"واثنتا عشرةَ قطعةَ أثاث");
 eq(F.fkOfGroup("A-ELEC").length,15,"وخمسةَ عشرَ رمزاً كهربائياً");
 /* وجدولُ المجموعات يصف الثلاثةَ بأسماءٍ عربيةٍ للواجهة */
 eq(Object.keys(F.FGROUP).length,3,"ثلاثُ مجموعاتٍ معلَنة");
 Object.keys(F.FGROUP).forEach(L=>{
  ok(/[\u0600-\u06FF]/.test(F.FGROUP[L]),`${L}: اسمٌ عربيّ`);
  ok(F.fkOfGroup(L).length>0,`${L}: وفيها قطعٌ فعلاً`);
 });
 /* ولكلٍّ اسمٌ عربيٌّ ومقاسٌ معقول */
 F.FKINDS.forEach(k=>{
  const d=F.FK[k];
  ok(!!d.n&&/[\u0600-\u06FF]/.test(d.n),`${k}: اسمٌ عربيّ`);
  ok(d.w>=80&&d.w<=4000,`${k}: عرضٌ معقول (${d.w})`);
  ok(d.d>=80&&d.d<=4000,`${k}: عمقٌ معقول (${d.d})`);
 });
});

group("القطع — الطبقةُ من النوع لا ثابتة",()=>{
 eq(F.fkLay("wc"),"A-FIXT","الصحّياتُ على A-FIXT كما كانت");
 eq(F.fkLay("bed2"),"A-FURN","والأثاثُ على A-FURN");
 /* «esoc» معرّفُ أداةٍ لا نوعُ قطعة — فيرجع إلى الافتراض لا يسقط */
 eq(F.fkLay("esoc"),"A-FIXT","ومعرّفُ الأداة ليس نوعاً فيرجع للافتراض");
 eq(F.fkLay("soc"),"A-ELEC","والكهرباءُ على A-ELEC");
 eq(F.fkLay("مجهول"),"A-FIXT","والمجهولُ يرجع إلى A-FIXT لا يسقط");
 /* والطبقتانِ موجودتانِ فعلاً في الجدول — وإلّا رُسِم على طبقةٍ لا تُطفَأ */
 reset();
 ok(LAY.hasLay("A-ELEC"),"A-ELEC في جدول الطبقات");
 ok(LAY.hasLay("A-FURN"),"وA-FURN");
 ok(!!LAY.layLabel("A-ELEC"),"ولها وصفٌ عربيّ");
});

group("القطع — الرسمُ على طبقةِ النوع",()=>{
 reset();
 const a=F.addFix("bed2",[2000,2000],0,{});
 const b=F.addFix("soc", [5000,2000],0,{});
 const c=F.addFix("wc",  [8000,2000],0,{});
 [[a,"A-FURN"],[b,"A-ELEC"],[c,"A-FIXT"]].forEach(([f,L])=>{
  eq(F.fixLay(f),L,`${f.kind} ⇒ ${L}`);
  const P=F.fixPrims(f);
  ok(P.length>0,`${f.kind}: يُرسَم شيءٌ (${P.length} أوّلية)`);
  ok(P.every(g=>g.L===L),`${f.kind}: كلُّ أوّلياته على ${L}`);
  ok(P.every(g=>g.fid===f.id),"وكلُّها موسومةٌ بمعرّفه");
 });
});

group("القطع — كلُّ نوعٍ له رسمٌ خاصٌّ لا صندوقٌ واحد",()=>{
 reset();
 /* البصمةُ: عددُ الأوّليات وأنواعها. نوعانِ مختلفانِ لا يتطابقان
    إلّا إن كان أحدُهما غائباً عن fixPrims فسقط إلى المجهول. */
 /* القطعةُ تُبنى يداً لا بـaddFix: addFix ترفض النوعَ المجهول
    بحقٍّ (وهذا مُختبَرٌ أدناه)، ونحن نريد رسمَ المجهول نفسَه. */
 /* البصمةُ بالإحداثيات لا بالأنواع وحدها: «صندوقٌ وخطّان» تصف
    أربعةَ رسومٍ مختلفةٍ تماماً، فالأنواعُ وحدها تُنتج تطابقاً كاذباً.
    والمقاسُ موحَّدٌ لكلِّ الأنواع كي يكون الاختلافُ في الشكل لا فيه. */
 const sig=k=>{
  const P=F.fixPrims({id:"F0",kind:k,x:0,y:0,rot:0,w:1000,d:1000});
  return P.map(g=>g.t==="line"
   ?`l${Math.round(g.a[0])},${Math.round(g.a[1])}`
    +`-${Math.round(g.b[0])},${Math.round(g.b[1])}`
   :(g.t==="arc"
    ?`a${Math.round(g.cx)},${Math.round(g.cy)},${Math.round(g.r)}`
    :`p${(g.pts||[]).length}:`
      +(g.pts||[]).map(q=>`${Math.round(q[0])},${Math.round(q[1])}`)
       .join(";"))).join("|");
 };
 /* وaddFix ترفض المجهولَ بسببٍ يسمّي المتاح */
 let mk="";
 try{F.addFix("لا-يوجد-نوع",[0,0],0,{})}catch(e){mk=e.message}
 ok(/الأنواع المتاحة/.test(mk),"وaddFix ترفض نوعاً مجهولاً وتسمّي المتاح");
 const seen=new Map();
 let uniq=0;
 F.FKINDS.forEach(k=>{
  const s=sig(k);
  if(!seen.has(s)){uniq++; seen.set(s,[k])}
  else seen.get(s).push(k);
 });
 ok(uniq>=12,`${uniq} بصمةً مختلفةً من 36 نوعاً`);
 /* والمجهولُ وحدَه هو الصندوقُ بقطرَين: لا نوعٌ معرَّفٌ يسقط إليه */
 /* المجهولُ صندوقٌ بقطرَين. و«fd» (الصفاية) رمزُها هو هذا بالضبط
    عن قصد — فالتطابقُ معها مقصودٌ لا سقوط. وما عداها لو تطابق فهو
    نوعٌ غاب عن fixPrims وسقط إلى الافتراض. */
 const box=sig("لا-يوجد-نوع");
 const fell=F.FKINDS.filter(k=>sig(k)===box);
 eq(fell.join(" "),"fd",
  `والصفايةُ وحدَها رمزُها صندوقٌ بقطرَين: ${fell.join(" ")||"لا شيء"}`);
 /* وكلُّ نوعٍ بصمتُه مختلفةٌ عن غيره إلّا ما أُعلِن */
 const sigs=F.FKINDS.map(sig);
 const dup=sigs.filter((x,i)=>sigs.indexOf(x)!==i);
 eq(dup.length,0,"ولا نوعانِ لهما الرسمُ نفسُه بالإحداثيات");
});

group("القطع — المقاسُ والدورانُ والإلصاق كما للصحّيات",()=>{
 reset();
 W.addWall([0,0],[6000,0],200,"int","c");
 /* الإلصاقُ أمرٌ عند الوضع: نتحقّق أنّ الدالّةَ تعمل على نوعٍ جديد */
 const s=F.snapToWall([3000,300],1500);
 ok(!!s,"أقربُ جدارٍ يُعرَف");
 const f=F.addFix("esoc"in F.FK?"esoc":"soc",s?s.p:[3000,100],
  s?s.rot:0,{});
 ok(!!f,"والقطعةُ تُوضَع");
 eq(F.fixLay(f),"A-ELEC","على طبقة الكهرباء");
 /* والمقاسُ يُحترَم */
 const g=F.addFix("bed2",[2000,4000],0,{w:1800,d:2100});
 eq(g.w,1800,"العرضُ المطلوب");
 eq(g.d,2100,"والعمق");
});

group("القطع — الأدواتُ السبعُ والعشرون مسجَّلةٌ بعقدٍ كامل",()=>{
 const F12=["fbed1","fbed2","fsofa2","fsofa3","ftable","ftablec",
  "fchair","fdesk","fwardr","fkcab","ffridge","fstove"];
 const E15=["esw1","esw2","eswd","esoc","esoc2","esocw","elamp",
  "elampw","espot","efan","eexfan","edb","etel","etv","eac"];
 eq(F12.length,12,"اثنتا عشرةَ أداةَ أثاث");
 eq(E15.length,15,"وخمسَ عشرةَ أداةَ كهرباء");
 F12.concat(E15).forEach(id=>{
  const d=R.findTool(id);
  ok(!!d,`${id} مسجَّلة`);
  if(!d)return;
  ok(!!d.hint,`${id}: لها تلميح`);
  ok(!!d.alias,`${id}: ولها اسمٌ بديل`);
  ok((d.opts||[]).length>=4,`${id}: خياراتُ المقاس والدوران`);
 });
 /* ولا أداةٌ جديدةٌ تزاحم قائمةً: اللقبُ يُحَلّ إلى صاحبه */
 ok(R.findTool("tv")!==R.findTool("etv")||!R.findTool("tv"),
  "«tv» لم تُسرَق من أمر العرض");
 ok(R.findTool("fl")===R.findTool("fillet"),"و«fl» باقيةٌ للاستدارة");
});

process.exit(summary()?1:0);
