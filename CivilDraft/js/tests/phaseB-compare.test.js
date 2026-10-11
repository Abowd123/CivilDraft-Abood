/* ═══ المرحلة B — مقارنة الإصدارات (3) ═══
   node js/tests/phaseB-compare.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,snapshot,pushHistory,clearHistory,stateVer,touch}=
 await import("../core/state.js");
const W=await import("../core/walls.js");
const RN=await import("../core/render.js");
const C=await import("../core/compare.js");
const reset=()=>{newState(); ensureShape(); clearHistory(); C.clearCompareBase()};
const only=(a,coll)=>a.filter(x=>x.coll===coll);

group("diff بالمعرّف",()=>{
 reset();
 const w=W.addWall([0,0],[3000,0],200,"ext","c");
 const base=JSON.parse(snapshot());
 w.b=[4000,0];
 const d=C.diff(base);
 ok(only(d.changed,"walls").some(x=>x.id===w.id&&x.k==="wall"),"حقلٌ تغيّر ⇒ changed");
 eq(only(d.added,"walls").length,0,"لا مضاف"); eq(only(d.removed,"walls").length,0,"لا محذوف");
 const w2=W.addWall([0,500],[3000,500],200,"int","c");
 ok(only(C.diff(base).added,"walls").some(x=>x.id===w2.id),"جدار جديد ⇒ added");
 S.walls=S.walls.filter(x=>x.id!==w.id);
 ok(only(C.diff(base).removed,"walls").some(x=>x.id===w.id),"جدار زال ⇒ removed");
 eq(C.diff(null).added.length,0,"بلا أساس: فارغ");
 eq(C.diff(JSON.parse(snapshot())).changed.length,0,"مطابقة الذات: لا فروق");
 ok(C.diff({...base,title:"غيره"}).meta.includes("title"),"meta تُرصَد");
});

group("أشكال الرسم: المحذوف من لقطة الأساس",()=>{
 reset();
 const w=W.addWall([0,0],[3000,0],200,"ext","c");
 const base=JSON.parse(snapshot());
 S.walls=S.walls.filter(x=>x.id!==w.id);
 C.setCompareBase(base);
 const sh=C.diffShapes();
 eq(sh.removed.length,1,"المحذوف له شكلٌ رغم غيابه من S");
 ok(sh.removed[0].sh&&sh.removed[0].sh.t,"شكلٌ بنوع");
 const w3=W.addWall([0,900],[3000,900],200,"int","c");
 const s2=C.diffShapes();
 ok(s2.added.some(x=>x.x.id===w3.id&&x.sh),"المضاف من الحالة الجارية");
 eq(RN.scene().P.some(g=>g.compare),false,"الفروق لا تدخل scene()");
});

group("الكاش ودورة الحياة والسجلّ",()=>{
 reset();
 pushHistory(snapshot(),"أ");
 W.addWall([0,0],[3000,0],200,"ext","c");
 const w2=W.addWall([0,500],[3000,500],200,"int","c");
 const base=C.baseObjectAt(0);
 eq(base.walls.length,0,"baseObjectAt(0) = البداية");
 C.setCompareBase(base); ok(C.compareActive(),"فعّالة");
 const g0=C.compareGen();
 const v1=C.diffView(); ok(C.diffView()===v1,"الكاش يثبت بلا تغيير");
 w2.b=[9000,500];
 touch(); ok(stateVer()>0&&C.diffView()!==v1,"touch يُبطل الكاش");
 C.clearCompareBase(); ok(!C.compareActive()&&C.compareGen()>g0,"تُمسَح");
 eq(C.diffShapes().added.length,0,"بلا أساس لا أشكال");
 eq(JSON.stringify(C.currentObject().walls.length),String(S.walls.length),"currentObject");
});

process.exit(summary()?1:0);
