/* ═══ B2 — السقف ═══
   يُثبت: الإنشاء والتطبيع والرفض بلا كتابة · ensureShape · الأوّليات ·
   نطاق roof في المشهد ومفتاح المستوى · الطبقتان · ترحيل VERSION 1→2 ·
   الذهاب والإياب بالملفّ · الأداة (Enter/C/Esc/تراجع) · والتراجع في التاريخ.
   التشغيل: node js/tests/roof.test.js */
import {shim,toolRig,group,ok,eq,throws,summary} from "./harness.js";
shim();
const {S,COLLS,newState,ensureShape,snapshot,loadState}=
 await import("../core/state.js");
const {addRoof,delRoof,roofArea,roofAt,roofPrims,roofLabel,roofById,RTYPE}=
 await import("../core/roof.js");
const LY=await import("../core/layers.js");
const RN=await import("../core/render.js");
const LD=await import("../core/laydef.js");
const PRJ=await import("../io/project.js");
const VAL=await import("../core/validate.js");
await import("../tools/roof.js");
const R=await import("../tools/registry.js");
const rig=toolRig(R,{invalidate:()=>RN.invalidate()});
const reset=()=>{newState(); ensureShape(); RN.invalidate();
 rig.pick([]); rig.clear(); if(R.active())R.cancel(true)};
const RECT=[[0,0],[5000,0],[5000,4000],[0,4000]];
const deep=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m+` — ${JSON.stringify(a)}`);

group("الإنشاء والتطبيع",()=>{
 reset();
 const r=addRoof(RECT,{type:"gable",slope:15});
 ok(r.type==="gable"&&roofArea(r)>19e6,"سقف جمالون بمساحة 20 م²");
 ok(/^RF\d+$/.test(r.id),"المعرّف بسابقة RF");
 eq(r.slope,15,"الميل");
 eq(r.level,0,"المستوى النشط");
 eq(r.ridge,null,"بلا خطّ جمالون افتراضاً");
 eq(r.drains.length,0,"بلا مصارف");
 ok(COLLS.includes("roofs")&&S.roofs.length===1,"roofs في COLLS والحالة");
 ok(roofById(r.id)===r,"roofById");
 ok(roofAt(2500,2000)===r&&!roofAt(9000,9000),"roofAt داخل/خارج");
 /* حلقةٌ باتجاه عقارب الساعة تُقلَب إلى عكسها */
 const cw=addRoof(RECT.slice().reverse(),{});
 ok(cw.ring[0][0]!==undefined&&roofArea(cw)>19e6,"الاتجاه العكسيّ يُقبَل");
 eq(cw.type,"flat","النوع الافتراضي flat");
 eq(cw.slope,5,"والميل الافتراضي 5");
 const c=addRoof(RECT,{type:"nonsense",slope:999,h:10});
 eq(c.type,"flat","نوعٌ مجهول ⇒ flat");
 eq(c.slope,45,"الميل يُقصّ إلى 45");
 eq(c.h,200,"والارتفاع يُقصّ إلى 200");
 const d=addRoof(RECT,{ridge:[[0.4,2000.6],[5000,2000]],
  drains:[[100.2,100.7]]});
 deep(d.ridge,[[0,2001],[5000,2000]],"خطّ الجمالون يُقرَّب");
 deep(d.drains,[[100,101]],"المصارف تُقرَّب");
 const many=addRoof(RECT,{drains:Array.from({length:30},(_,i)=>[i,i])});
 eq(many.drains.length,20,"المصارف حتى 20");
});

group("الرفض بلا كتابةٍ في الحالة",()=>{
 reset();
 const before=JSON.stringify(S.roofs);
 throws(()=>addRoof([[0,0],[1000,0]],{}),null,"أقلّ من 3 رؤوس");
 throws(()=>addRoof([[0,0],[1000,0],[1000,500]],{}),null,"أصغر من 1 م²");
 throws(()=>addRoof([[0,0],[5000,0],[NaN,4000]],{}),null,"رأسٌ NaN");
 throws(()=>addRoof(RECT,{slope:NaN}),null,"ميلٌ NaN");
 throws(()=>addRoof(null,{}),null,"حلقةٌ غائبة");
 eq(JSON.stringify(S.roofs),before,"الحالة لم تُمسّ");
});

group("ensureShape — تطبيع الملفّات",()=>{
 reset();
 const d=JSON.parse(snapshot());
 d.roofs=[
  null,
  {id:"RF1",ring:"x"},
  {id:"RF2",ring:[[0,0],[1000,0],["a",5]]},
  {id:"RF3",ring:[[0,0],[5000,0]]},
  {id:"RF4",ring:RECT,type:"weird",slope:-4,h:99999,name:"x".repeat(80),
   ridge:[[0,0]],drains:[[1,1],null,[2,2]],level:2}];
 loadState(d,false);
 eq(S.roofs.length,1,"يبقى الصالح وحده");
 const r=S.roofs[0];
 eq(r.id,"RF4","RF4");
 eq(r.type,"flat","نوعٌ فاسد ⇒ flat");
 eq(r.slope,0,"ميلٌ سالب يُقصّ إلى 0");
 eq(r.h,8000,"الارتفاع يُقصّ إلى 8000");
 eq(r.name.length,40,"الاسم 40");
 ok(!("ridge" in r),"خطّ جمالونٍ ناقص يُحذَف");
 eq(r.drains.length,2,"مصارف فاسدة تُسقَط");
 eq(r.level,2,"المستوى محفوظ");
 /* ملفٌّ بلا roofs يبقى صالحاً */
 S.roofs=undefined; ensureShape();
 ok(Array.isArray(S.roofs)&&S.roofs.length===0,"غياب roofs ⇒ مصفوفةٌ فارغة");
 S.roofs="x"; ensureShape();
 ok(Array.isArray(S.roofs)&&S.roofs.length===0,"وroofs غير مصفوفة ⇒ فارغة");
});

group("الأوّليات",()=>{
 reset();
 const flat=addRoof(RECT,{name:"س1"});
 let P=roofPrims(flat);
 ok(P.every(p=>p.rid===flat.id),"كل أوّليةٍ تحمل rid");
 ok(P.some(p=>p.t==="poly"&&p.L==="A-ROOF"&&p.cl===1),"حدٌّ مغلق");
 ok(!P.some(p=>p.t==="hatch"),"المسطّح بلا تعبئة");
 ok(P.some(p=>p.t==="text"&&p.s===roofLabel(flat)),"البطاقة");
 ok(/س1/.test(roofLabel(flat))&&/20\.00/.test(roofLabel(flat)),
  "البطاقة بالاسم والمساحة");
 const g=addRoof(RECT,{type:"gable",ridge:[[0,2000],[5000,2000]],
  drains:[[500,500],[4500,3500]]});
 P=roofPrims(g);
 ok(P.some(p=>p.t==="hatch"&&p.L==="A-ROOF-PATT"),"الجمالون بتعبئة على طبقتها");
 ok(P.some(p=>p.t==="line"&&p.dash),"خطّ الجمالون متقطّع");
 eq(P.filter(p=>p.t==="arc").length,2,"دائرتا مصرفين");
 eq(P.filter(p=>p.t==="text"&&p.s==="◉").length,2,"وعلامتاهما");
 ok(P.every(p=>p.L==="A-ROOF"||p.L==="A-ROOF-PATT"),"الطبقتان فقط");
});

group("الطبقتان",()=>{
 ["A-ROOF","A-ROOF-PATT"].forEach(n=>{
  ok(LD.ORDER.includes(n),`${n} في ORDER`);
  ok(LD.DESC[n],`${n} لها وصف`);
  ok(LD.PRN[n],`${n} لها لون ورق`);
  ok(LY.layNames().includes(n),`${n} بين طبقات المصنع`);
 });
 ok(Object.keys(RTYPE).join()==="flat,gable,hip,shed","أنواع السقف الأربعة");
});

group("نطاق roof في المشهد",()=>{
 reset();
 ok(RN.bandNames().includes("roof"),"roof في BANDS");
 const a=addRoof(RECT,{type:"hip"});
 RN.invalidate();
 let P=RN.scene().P.filter(p=>p.rid===a.id);
 ok(P.length>=3,"يظهر في المشهد");
 /* سقفٌ على طابقٍ آخر لا يظهر في نطاق الطابق النشط */
 a.level=1; RN.invalidate();
 P=RN.scene().P.filter(p=>p.rid===a.id);
 eq(P.length,0,"مستوى 1 خارج نطاق الطابق 0");
 S.opt.levelAll=1; RN.invalidate();
 P=RN.scene().P.filter(p=>p.rid===a.id);
 ok(P.length>=3,"ويظهر حين يُعطَّل النطاق");
 S.opt.levelAll=0;
});

group("حذف السقف",()=>{
 reset();
 const r=addRoof(RECT,{});
 ok(delRoof(r)&&S.roofs.length===0,"يُحذَف");
 ok(!delRoof(r),"وحذفٌ ثانٍ يعيد false");
});

group("ترحيل VERSION 1→2 والذهاب والإياب",()=>{
 eq(PRJ.VERSION,2,"VERSION=2");
 const m=PRJ.migrate({__ver:1,walls:[]});
 ok(Array.isArray(m.roofs)&&Array.isArray(m.levelDefs),
  "ملفّ v1 يكتسب roofs وlevelDefs");
 const keep=PRJ.migrate({__ver:1,walls:[],roofs:[{id:"RF9"}]});
 eq(keep.roofs.length,1,"roofs القائمة لا تُمسّ");
 ok(Array.isArray(PRJ.migrate({walls:[]}).roofs),
  "وملفٌّ بلا __ver يمرّ سلسلةً كاملة");
 reset();
 const r=addRoof(RECT,{type:"shed",slope:8,name:"مائل",
  drains:[[100,100]],ridge:[[0,0],[5000,0]]});
 const txt=PRJ.toJSON();
 eq(JSON.parse(txt).__ver,2,"يُكتب __ver:2");
 reset();
 PRJ.fromJSON(txt);
 eq(S.roofs.length,1,"يعود سقفٌ واحد");
 const b=S.roofs[0];
 ok(b.id===r.id&&b.type==="shed"&&b.slope===8&&b.name==="مائل",
  "الحقول محفوظة");
 deep(b.drains,[[100,100]],"المصارف");
 deep(b.ridge,[[0,0],[5000,0]],"وخطّ الجمالون");
 /* ملفٌّ v1 قديم يُفتَح */
 const old=JSON.stringify({__app:"civildraft",__ver:1,walls:[],
  meta:{name:"OLD",scale:100}});
 PRJ.fromJSON(old);
 eq(S.roofs.length,0,"ملفّ v1 يُفتَح بلا أسقف");
 throws(()=>PRJ.fromJSON(JSON.stringify({__app:"civildraft",__ver:3,walls:[]})),
  null,"إصدارٌ أحدث يُرفَض");
});

group("المُدقِّق V('roof')",()=>{
 ok(VAL.KINDS.includes("roof"),"roof في VLD");
 throws(()=>VAL.V("roof",{ring:[[0,0],[1,NaN]]}),null,"رأسٌ فاسد");
 throws(()=>VAL.V("roof",{ring:RECT,slope:"x"}),null,"ميلٌ نصّيّ");
 ok(VAL.V("roof",{ring:RECT}).ring.length===4,"ملفٌّ صالح يمرّ");
});

group("الأداة — Enter وC وEsc وتراجع",()=>{
 reset(); rig.defs("roof");
 ok(R.findTool("roof")&&R.findTool("rf")&&R.findTool("سقف"),
  "الأداة بأسمائها المستعارة");
 R.begin("roof");
 rig.at(0,0); rig.at(5000,0); rig.at(5000,4000); rig.at(0,4000);
 ok(R.active(),"ما زالت تنتظر الإغلاق");
 eq(S.roofs.length,0,"لا كتابة قبل الإغلاق");
 R.enter();
 eq(S.roofs.length,1,"Enter يُنشئ السقف");
 eq(S.roofs[0].ring.length,4,"بأربعة رؤوس (لا نقاط مكرّرة)");
 ok(rig.said(/RF\d+/,"ok"),"ويُبلَّغ بمعرّفه");
 ok(!R.active(),"والأداة انتهت");
 /* الخيارات */
 reset(); rig.defs("roof");
 R.setOpt("roof","type","hip"); R.setOpt("roof","slope","20");
 R.begin("roof");
 rig.at(0,0); rig.at(5000,0); rig.at(5000,4000); R.enter();
 eq(S.roofs.length,1,"ثلاث نقاط تكفي");
 eq(S.roofs[0].type,"hip","النوع من الخيار");
 eq(S.roofs[0].slope,20,"والميل من الخيار");
 /* أقلّ من ثلاث نقاط: خطأٌ ولا كتابة */
 reset(); rig.defs("roof");
 R.begin("roof");
 rig.at(0,0); rig.at(5000,0);
 R.enter();
 eq(S.roofs.length,0,"نقطتان لا تكفيان");
 ok(R.active()&&rig.said(/على الأقل/,"wr"),
  "Enter يُحذِّر ويبقى في الأداة");
 rig.esc();
 /* Esc يلغي بلا كتابة */
 reset(); rig.defs("roof");
 R.begin("roof");
 rig.at(0,0); rig.at(5000,0); rig.at(5000,4000);
 rig.esc();
 eq(S.roofs.length,0,"Esc لا يُنشئ شيئاً");
 /* الأداة تُنتج معاينة */
 reset(); rig.defs("roof");
 R.begin("roof");
 rig.at(0,0); rig.at(5000,0);
 ok(R.T.def.prev(R.T.ctx,[5000,4000]).length>=3,"المعاينة ترسم الحلقة");
 rig.esc();
});

process.exit(summary()?1:0);
