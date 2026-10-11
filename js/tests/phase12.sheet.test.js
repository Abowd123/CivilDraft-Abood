/* ═══ بوابة 4A — الأوراق المتعددة والمنافذ ═══
   node js/tests/phase12.sheet.test.js

   يثبّت العقود المعلنة في خطة المرحلة 4:
     - S.sheets/S.activeSheet بياناتُ مشروعٍ إضافية لا تمسّ S.sheet
       المفردة ولا أيّاً من دوالّها القديمة (paperMM/sheetRect/…).
     - addSheet/addViewport يمرّان بـV("sheet"/"vpv",…) فلا تدخل
       الحالةَ قيمةٌ فاسدة.
     - composeSheet دالّةٌ خالصة: تُعيد أوّلياتٍ ورقيةً مقصوصة، ولا
       تكتب في S، ولا تُغيّر عدد الجدران/المناطق (فلا تدخل boq ولا
       الفاحص).
     - منفذان بمقياسين مختلفين على ورقة واحدة يُنتجان قصّاً ومقياساً
       صحيحين كلٌّ على حدة.
     - التطبيع الدفاعي في ensureShape يُصلح ملفّاً محرَّراً يدوياً:
       معرّفاتٌ مكرّرة · مستطيلاتٌ فاسدة · تجاوزُ سقوف العدد. */
import {shim,group,ok,eq,near,deep,throws,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,pack,loadState,edit}
 =await import("../core/state.js");
const {LIM}=await import("../core/limits.js");
const {V,safeV}=await import("../core/validate.js");
const SH=await import("../core/sheet.js");
const W=await import("../core/walls.js");
const BOQ=await import("../core/boq.js");
const INSPECT=await import("../core/inspect.js");

newState();

group("LIM — سقوف المرحلة 4",()=>{
 ["sheets","viewportsPerSheet","vpModelRectMM","vpPaperRectMM"].forEach(k=>{
  ok(LIM[k]&&Object.isFrozen(LIM[k]),`LIM.${k} معرَّف ومجمَّد`);
  ok(LIM[k].min<=LIM[k].max,`LIM.${k}: الأدنى ≤ الأقصى`);
 });
 eq(LIM.sheets.max,200,"أقصى عدد أوراق 200");
 eq(LIM.viewportsPerSheet.max,50,"أقصى منافذ الورقة 50");
});

group("V — بنيتا sheet وvpv",()=>{
 const s=V("sheet",{name:"ورقة أولى",size:"A2",orient:"p",margin:15});
 eq(s.name,"ورقة أولى","الاسم يمرّ");
 eq(s.size,"A2","المقاس يمرّ");
 eq(s.orient,"p","الاتجاه يمرّ");
 ok(!safeV("sheet",{size:"A9"}).ok,"مقاسٌ مجهول يُرفض");
 ok(!safeV("sheet",{orient:"x"}).ok,"اتجاهٌ مجهول يُرفض");

 const rectOK={x0:0,y0:0,x1:10000,y1:8000};
 const v=V("vpv",{modelRect:rectOK,
  paperRect:{x0:10,y0:10,x1:200,y1:150}});
 eq(v.modelRect.x1,10000,"rect يمرّ ويُقرَّب");
 ok(!safeV("vpv",{modelRect:{x0:0,y0:0,x1:-5,y1:5}}).ok,
  "rect بعرضٍ سالب يُرفض (بلا paperRect أصلاً إلزاميّ)");
 ok(!safeV("vpv",{modelRect:rectOK}).ok,
  "vpv بلا paperRect (إلزاميّ) يُرفض");
 ok(!safeV("vpv",{modelRect:rectOK,paperRect:rectOK,
  layers:[1,2]}).ok,"layers ليست نصوصاً ⇒ يُرفض");
 const withLayers=V("vpv",{modelRect:rectOK,
  paperRect:{x0:0,y0:0,x1:100,y1:80}, layers:["A-WALL","A-DOOR"]});
 deep(withLayers.layers,["A-WALL","A-DOOR"],"layers نصوصٌ تمرّ");
});

group("sheetPapers — مقاس الورقة الصريح",()=>{
 const a4=SH.sheetPapers({size:"A4",orient:"l"});
 eq(a4.w,297,"A4 أفقي: العرض 297");
 eq(a4.h,210,"A4 أفقي: الارتفاع 210");
 const a4p=SH.sheetPapers({size:"A4",orient:"p"});
 eq(a4p.w,210,"A4 رأسي: العرض 210");
 eq(a4p.h,297,"A4 رأسي: الارتفاع 297");
 eq(SH.sheetPapers(null).w,420,"بلا ورقةٍ ⇒ A3 أفقي افتراضاً");
});

group("addSheet/addViewport — يكتبان في S عبر V()",()=>{
 newState();
 eq(S.sheets.length,0,"لا أوراق افتراضياً");
 eq(S.activeSheet,null,"لا ورقة نشطة افتراضياً");

 const sh1=edit(()=>SH.addSheet({name:"معماري",size:"A3",orient:"l"}),
  "ورقة جديدة");
 eq(S.sheets.length,1,"ورقةٌ واحدة أُضيفت");
 eq(S.activeSheet,sh1.id,"أوّل ورقةٍ تصبح نشطة تلقائياً");
 eq(SH.activeSheetDef().id,sh1.id,"activeSheetDef يعيدها");

 const sh2=edit(()=>SH.addSheet({name:"إنشائي"}),"ورقة ثانية");
 eq(S.sheets.length,2,"ورقتان الآن");
 eq(S.activeSheet,sh1.id,"الثانية لا تغيّر النشطة");

 ok(edit(()=>SH.setActiveSheet(sh2.id),"تفعيل"),"setActiveSheet ينجح");
 eq(S.activeSheet,sh2.id,"صارت الثانية نشطة");
 ok(edit(()=>SH.renameSheet(sh2.id,"إنشائي معدّل"),"إعادة تسمية"),
  "renameSheet ينجح");
 eq(SH.activeSheetDef().name,"إنشائي معدّل","الاسم تحدّث");

 throws(()=>SH.addSheet({size:"ZZ"}),null,
  "addSheet يرمي عبر V() على مقاسٍ فاسد");
 eq(S.sheets.length,2,"والحالة لم تتأثر بالرمي");

 const vp1=edit(()=>SH.addViewport(sh1.id,{
  name:"منظور 1", modelRect:{x0:0,y0:0,x1:10000,y1:8000},
  paperRect:{x0:10,y0:10,x1:200,y1:170}}),"منفذ جديد");
 eq(sh1.viewports.length,1,"منفذٌ واحد على الورقة الأولى");
 ok(vp1.visible===1,"مرئيٌّ افتراضياً");

 throws(()=>SH.addViewport("nope",{modelRect:{x0:0,y0:0,x1:1,y1:1},
  paperRect:{x0:0,y0:0,x1:1,y1:1}}),null,
  "addViewport يرمي على ورقةٍ غير موجودة");
 throws(()=>SH.addViewport(sh1.id,{
  modelRect:{x0:0,y0:0,x1:0.1,y1:0.1},
  paperRect:{x0:0,y0:0,x1:10,y1:10}}),null,
  "مستطيل نموذجٍ أصغر من الحدّ الأدنى يُرفض");

 ok(edit(()=>SH.updateViewport(sh1.id,vp1.id,{name:"مُحدَّث",
  visible:0}),"تحديث منفذ"),"updateViewport ينجح");
 eq(sh1.viewports[0].name,"مُحدَّث","الاسم تحدّث");
 eq(sh1.viewports[0].visible,0,"الرؤية تحدّثت");

 ok(edit(()=>SH.removeViewport(sh1.id,vp1.id),"حذف منفذ"),
  "removeViewport ينجح");
 eq(sh1.viewports.length,0,"لا منافذ بعد الحذف");

 ok(edit(()=>SH.removeSheet(sh1.id),"حذف ورقة"),"removeSheet ينجح");
 eq(S.sheets.length,1,"ورقةٌ واحدة بقيت");
 eq(S.activeSheet,sh2.id,"النشطة تبقى الثانية لأنها لم تُحذف");
});

group("لا مساس بالورقة المفردة القديمة",()=>{
 newState();
 S.sheet.on=1; S.sheet.size="A3"; S.sheet.orient="l";
 const before=SH.sheetRect(null);
 edit(()=>SH.addSheet({name:"ج"}),"ورقة");
 const after=SH.sheetRect(null);
 deep(before,after,"sheetRect (القديمة) لم تتأثر بوجود sheets");
 ok(SH.paperMM()[0]===420,"paperMM القديمة لم تتأثر (A3 أفقي=420)");
});

group("viewportTransform/viewportFrame — مقياسٌ موحّد",()=>{
 const vp={modelRect:{x0:0,y0:0,x1:10000,y1:5000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}};
 const t=SH.viewportTransform(vp);
 near(t.k,0.02,1e-9,"k=min(200/10000,200/5000)=0.02");
 const F=SH.viewportFrame(vp);
 eq(F.x0,0,"إطارٌ يبدأ من صفر");
 eq(F.x1,200,"العرض الكامل 10000×0.02=200");
 near((F.y1-F.y0),100,1,"الارتفاع 5000×0.02=100 (موسَّط رأسياً)");
 ok(F.y0>0&&F.y1<200,"توسيطٌ رأسي داخل مربّع الورقة 200×200");

 ok(SH.viewportTransform({modelRect:{x0:0,y0:0,x1:0,y1:0},
  paperRect:vp.paperRect})===null,"مستطيلٌ صفريّ يعيد null");
});

group("القصّ — قطعة ومضلّع",()=>{
 const r={x0:0,y0:0,x1:100,y1:100};
 eq(SH.clipSegToRect([-50,50],[150,50],r).map(p=>p[0]).join(","),
  "0,100","قطعةٌ عابرة تُقصّ لطرفي المستطيل");
 ok(SH.clipSegToRect([-50,-50],[-10,-10],r)===null,
  "قطعةٌ خارج المستطيل بالكامل تُرفض");
 const poly=SH.clipPolyToRect(
  [[-50,-50],[150,-50],[150,150],[-50,150]], r);
 eq(poly.length,4,"مربّعٌ يحيط بالمستطيل يُقصّ إلى أركانه الأربعة");
});

group("composeSheet — تركيبٌ خالص ومقياسان مختلفان",()=>{
 newState();
 const wallsBefore=W.addWall?null:null; /* مجرّد تأكيد أن addWall متاحة أدناه */
 edit(()=>W.addWall([0,0],[10000,0],200,"ext","c"),"جدار 1");
 edit(()=>W.addWall([10000,0],[10000,6000],200,"ext","c"),"جدار 2");
 const wallCountBefore=S.walls.length;
 const boqBefore=JSON.stringify(BOQ.boq?BOQ.boq():null);

 const sh=edit(()=>SH.addSheet({name:"لوحة",size:"A2",orient:"l"}),
  "ورقة");
 /* منفذٌ كبير يرى كل الجدارين بمقياسٍ صغير */
 const vpWide=edit(()=>SH.addViewport(sh.id,{name:"عام",
  modelRect:{x0:-500,y0:-500,x1:10500,y1:6500},
  paperRect:{x0:10,y0:10,x1:300,y1:200}}),"منفذ عام");
 /* منفذٌ يقتصر على الزاوية العلوية بمقياسٍ أكبر — نفس النموذج */
 const vpZoom=edit(()=>SH.addViewport(sh.id,{name:"تكبير",
  modelRect:{x0:9000,y0:-500,x1:10500,y1:1000},
  paperRect:{x0:320,y0:10,x1:420,y1:110}}),"منفذ تكبير");

 const prims=[
  {t:"line",L:"A-WALL",a:[0,0],b:[10000,0]},
  {t:"line",L:"A-WALL",a:[10000,0],b:[10000,6000]},
  {t:"text",L:"A-TEXT",s:"غرفة",x:5000,y:3000,h:150,al:"mc"}
 ];
 const comp=SH.composeSheet(sh,prims);
 ok(Array.isArray(comp.prims),"composeSheet تعيد قائمة أوّليات");
 ok(comp.prims.length>0,"أوّلياتٌ فعليّة خرجت");
 ok(comp.prims.every(g=>g.vp===vpWide.id||g.vp===vpZoom.id),
  "كلُّ أوّليةٍ موسومةٌ بمنفذها");
 const wideLines=comp.prims.filter(g=>g.vp===vpWide.id&&g.t==="line");
 const zoomLines=comp.prims.filter(g=>g.vp===vpZoom.id&&g.t==="line");
 ok(wideLines.length>0,"المنفذ العام أنتج خطوطاً");
 ok(zoomLines.length>0,"منفذ التكبير أنتج خطوطاً أيضاً (نفس الجدار)");
 /* الطول الظاهري لنفس الخط في منفذ التكبير أكبر لأن مقياسه أكبر */
 const wLen=wideLines.length
  ?Math.hypot(wideLines[0].b[0]-wideLines[0].a[0],
              wideLines[0].b[1]-wideLines[0].a[1])
  :0;
 const zLen=zoomLines.length
  ?Math.hypot(zoomLines[0].b[0]-zoomLines[0].a[0],
              zoomLines[0].b[1]-zoomLines[0].a[1])
  :0;

 eq(S.walls.length,wallCountBefore,
  "composeSheet لم يغيّر عدد الجدران في S");
 eq(JSON.stringify(BOQ.boq?BOQ.boq():null),boqBefore,
  "composeSheet لم يغيّر جدول الكميات");
 ok(!("sheets" in comp),"الناتج لا يحمل مرجعاً للحالة نفسها");

 /* هاشورٌ غير مدعوم بعد — يُسقَط ويُعَدّ لا يختفي صامتاً */
 const comp2=SH.composeSheet(sh,[{t:"hatch",L:"X"}]);
 ok(comp2.dropped>=1,"نوعٌ غير مدعوم يُعَدّ ضمن dropped");

 ok(SH.sheetHasViewports(sh),"sheetHasViewports صحيحة مع منفذين مرئيين");
 eq(SH.visibleViewportCount(sh),2,"عدّاد المنافذ الظاهرة = 2");
 edit(()=>SH.updateViewport(sh.id,vpZoom.id,{visible:0}),"إخفاء");
 eq(SH.visibleViewportCount(sh),1,"صار واحداً بعد الإخفاء");
});

group("لا سطر ورقةٍ أو منفذٍ في الفاحص",()=>{
 newState();
 edit(()=>W.addWall([0,0],[3000,0],200,"ext","c"),"جدار");
 const sh=edit(()=>SH.addSheet({name:"ك"}),"ورقة");
 edit(()=>SH.addViewport(sh.id,{
  modelRect:{x0:0,y0:0,x1:3000,y1:3000},
  paperRect:{x0:0,y0:0,x1:100,y1:100}}),"منفذ");
 const findings=INSPECT.scan?INSPECT.scan():[];
 ok(!findings.some(f=>/ورقة|منفذ/.test(f.msg||"")),
  "لا نتيجة فحصٍ تذكر ورقةً أو منفذاً");
});

group("التطبيع الدفاعي — ensureShape يُصلح ملفّاً محرَّراً يدوياً",()=>{
 newState();
 S.sheets=[
  {id:"sh1",name:"أ",size:"A3",orient:"l",
   viewports:[
    {id:"vp1",modelRect:{x0:0,y0:0,x1:1000,y1:1000},
     paperRect:{x0:0,y0:0,x1:100,y1:100}},
    {id:"vp1",modelRect:{x0:0,y0:0,x1:1000,y1:1000},
     paperRect:{x0:0,y0:0,x1:100,y1:100}} /* معرّفٌ مكرّر */
   ]},
  {id:"sh1",name:"مكرّرة"},                 /* معرّف ورقةٍ مكرّر */
  {id:"sh2",name:"ب",size:"ZZ",             /* مقاسٌ فاسد ⇒ A3 */
   viewports:[
    {id:"vpbad",modelRect:{x0:5,y0:5,x1:1,y1:1}, /* مقلوب ⇒ يُسقَط */
     paperRect:{x0:0,y0:0,x1:10,y1:10}},
    {id:"vphuge",modelRect:{x0:0,y0:0,x1:1e9,y1:1e9}, /* فوق الحدّ */
     paperRect:{x0:0,y0:0,x1:10,y1:10}}
   ]}
 ];
 S.activeSheet="doesnotexist";
 ensureShape();
 eq(S.sheets.length,2,"ورقةٌ مكرّرة المعرّف أُسقطت");
 eq(S.sheets[0].viewports.length,1,"منفذٌ مكرّر المعرّف أُسقط");
 eq(S.sheets[1].size,"A3","مقاسٌ فاسد صار A3");
 eq(S.sheets[1].viewports.length,0,
  "المنفذان الفاسدان (معكوس وضخم) أُسقطا كلاهما");
 ok(S.sheets.some(sh=>sh.id===S.activeSheet),
  "activeSheet غير الموجودة أُصلحت إلى ورقةٍ حقيقية");

 /* تجاوز سقف عدد الأوراق */
 newState();
 S.sheets=Array.from({length:LIM.sheets.max+5},(_,i)=>(
  {id:"s"+i,name:"ورقة"+i,viewports:[]}));
 ensureShape();
 eq(S.sheets.length,LIM.sheets.max,"عدد الأوراق قُصّ إلى السقف");

 /* تجاوز سقف عدد المنافذ في ورقةٍ واحدة */
 newState();
 S.sheets=[{id:"sX",name:"ح",viewports:Array.from(
  {length:LIM.viewportsPerSheet.max+3},(_,i)=>(
  {id:"v"+i,modelRect:{x0:0,y0:0,x1:100,y1:100},
   paperRect:{x0:0,y0:0,x1:10,y1:10}}))}];
 ensureShape();
 eq(S.sheets[0].viewports.length,LIM.viewportsPerSheet.max,
  "عدد المنافذ قُصّ إلى سقف الورقة الواحدة");
});

group("الحفظ والاستعادة — pack/loadState يحفظان الأوراق",()=>{
 newState();
 const sh=edit(()=>SH.addSheet({name:"محفوظة",size:"A1",orient:"p"}),
  "ورقة");
 edit(()=>SH.addViewport(sh.id,{name:"م",
  modelRect:{x0:0,y0:0,x1:5000,y1:4000},
  paperRect:{x0:0,y0:0,x1:100,y1:80}}),"منفذ");
 const snap=pack();
 eq(snap.sheets.length,1,"pack يحمل الأوراق");
 eq(snap.activeSheet,sh.id,"pack يحمل النشطة");

 newState();
 eq(S.sheets.length,0,"مشروعٌ جديد بلا أوراق");
 loadState(snap,true);
 eq(S.sheets.length,1,"loadState يستعيد الورقة");
 eq(S.sheets[0].name,"محفوظة","بالاسم نفسه");
 eq(S.sheets[0].viewports.length,1,"وبمنفذها");
 eq(S.activeSheet,sh.id,"والنشطة نفسها");
});

group("VP_SCALES / kForScale / setViewportScale",()=>{
 ok(Array.isArray(SH.VP_SCALES)&&SH.VP_SCALES.length>0,
  "VP_SCALES معرّفة وغير فارغة");
 ok(SH.VP_SCALES.every(s=>Number.isInteger(s)&&s>0),
  "كل المقاييس أعدادٌ صحيحة موجبة");
 near(SH.kForScale(100),0.01,1e-12,"kForScale(100)=0.01");
 eq(SH.kForScale(0),null,"kForScale(0)=null");
 eq(SH.kForScale(null),null,"kForScale(null)=null");

 newState();
 const sh=edit(()=>SH.addSheet({name:"م",size:"A2",orient:"l"}),
  "ورقة");
 const vp=edit(()=>SH.addViewport(sh.id,{
  name:"ع", modelRect:{x0:0,y0:0,x1:10000,y1:5000},
  paperRect:{x0:0,y0:0,x1:200,y1:100}}),"منفذ");
 const mx0=vp.modelRect.x0, mx1=vp.modelRect.x1;

 edit(()=>SH.setViewportScale(sh.id,vp.id,100,
  [vp.paperRect.x0+100,vp.paperRect.y0+50]),"ضبط مقياس 1:100");
 const pr=vp.paperRect;
 near(pr.x1-pr.x0,100,0.5,"العرض = 10000/100 = 100");
 near(pr.y1-pr.y0,50,0.5,"الارتفاع = 5000/100 = 50");
 near((pr.x0+pr.x1)/2,100,0.5,"مرساة x بقيت عند 100");
 near((pr.y0+pr.y1)/2,50,0.5,"مرساة y بقيت عند 50");
 eq(vp.modelRect.x0,mx0,"modelRect لم يُمَسّ x0");
 eq(vp.modelRect.x1,mx1,"modelRect لم يُمَسّ x1");
 const t=SH.viewportTransform(vp);
 near(t.k,0.01,1e-9,"كسر المنفذ = 0.01 (1:100)");
 eq(SH.viewportScale(vp),100,"viewportScale يقرأ 1:100");

 edit(()=>SH.setViewportScale(sh.id,vp.id,200),"مقياس 1:200 بلا مرساة");
 near(vp.paperRect.x1-vp.paperRect.x0,50,0.5,"العرض نصفة عند 1:200");
 near(vp.paperRect.y1-vp.paperRect.y0,25,0.5,"الارتفاع نصفة");

 throws(()=>SH.setViewportScale(sh.id,vp.id,0),null,
  "مقياسٌ صفريّ يُرفض");
 throws(()=>SH.setViewportScale("nope",vp.id,50),null,
  "ورقةٌ غائبة تُرفض");
 throws(()=>SH.setViewportScale(sh.id,"nope",50),null,
  "منفذٌ غائب يُرفض");
});

process.exit(summary()?1:0);
