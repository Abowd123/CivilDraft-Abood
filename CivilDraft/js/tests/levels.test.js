/* ═══ المرحلة 3 — L1: المستويات ═══
   يثبت أن الجديد يأخذ المستوى النشط، وأن القديم يطبَّع بلا صمت،
   وأن الغائب يقرأ صفراً أرضياً.  node js/tests/levels.test.js */
import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addCol}=await import("../core/cols.js");
const {addArea}=await import("../core/areas.js");
const LV=await import("../core/level.js");

group("المستوى النشط الافتراضي",()=>{
 newState();
 eq(LV.activeLevel(S.meta),0,"مصنع الحالة: مستوى أرضي 0");
});

group("الجديد يأخذ المستوى النشط",()=>{
 newState();
 S.meta.level=2;
 const w=addWall([0,0],[3000,0],200,"int","c");
 const c=addCol("rect",[1000,1000],400,400,0,"conc");
 const a=addArea([[0,0],[3000,0],[3000,3000],[0,3000]],"قاعة");
 eq(w.level,2,"الجدار أُسنِد إلى الطابق 2");
 eq(c.level,2,"العمود أُسنِد إلى الطابق 2");
 eq(a.level,2,"المنطقة أُسنِدت إلى الطابق 2");
});

group("القديم بلا مستوى يُطبَّع إلى النشط بلا صمت",()=>{
 newState();
 S.meta.level=3;
 addWall([0,0],[3000,0],200,"int","c");
 const w=S.walls[0];
 w.level=null;                       /* ملف قديم */
 ensureShape();
 eq(w.level,3,"اكتسب المستوى النشط");
 eq(LV.levelOf(w),3,"levelOf يقرأه موحّداً");
});

group("levelOf يَحرس السيء والغائب ولا يرمي",()=>{
 eq(LV.levelOf(null),0,"null ⇒ أرضي");
 eq(LV.levelOf({level:-5}),-5,"لا يخترع قسراً عند السالب — يقرأه المدخل");
 eq(LV.normLevel(-5),0,"والتطبيع يمنع السالب");
 eq(LV.normLevel("12"),12,"نصٌّ رقميّ صحيح");
 eq(LV.levelsOf(S).length>0,true,"قائمة المستويات حيّة");
});

process.exit(summary());
