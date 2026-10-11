/* ═══ ٤٫١ + ٤٫٢ — فهرس الفتحات وكاش pickable ═══
   الفهرسان تحسينُ أداءٍ لا سلوك: الجواب يجب أن يبقى كما كان بالضبط،
   وأن يُبطَل الكاش حين يتغيّر ما يقلبه. فالاختبار هنا يقيس الصحّة
   بعد كلّ نوع تغيير (إضافة · حذف · استبدال المصفوفة · نقل فتحةٍ إلى
   جدارٍ آخر · تراجع · إخفاء طبقةٍ · قفلها · تغيير نوع الجدار/الفتحة).

   التشغيل:  node js/tests/index.test.js                           */
import {shim,group,ok,eq,throws,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,touchGeom,touchOpen,edit,undo}=
 await import("../core/state.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const L=await import("../core/layers.js");
const M=await import("../core/modify.js");
const E=await import("../core/ents.js");

const reset=()=>{newState(); ensureShape()};
const two=()=>{
 reset();
 const a=W.addWall([0,0],[6000,0],200,"int","c");
 const b=W.addWall([0,3000],[6000,3000],200,"int","c");
 return [a,b];
};
/* المرجع: ما كانت opensOf القديمة تُعيده حرفاً بحرف */
const slow=id=>S.opens.filter(o=>o.wall===id);
const same=(id,msg)=>{
 const A=O.opensOf(id).map(o=>o.id).join(",");
 const B=slow(id).map(o=>o.id).join(",");
 eq(A,B,msg);
};

group("opensOf: يطابق المرشِّح الخطّي بعد كل نوع تغيير",()=>{
 const [a,b]=two();
 O.addOpen(a,1000,"door",900,2100,0);
 O.addOpen(a,3000,"window",1000,1200,900);
 O.addOpen(b,2000,"door",900,2100,0);
 same(a.id,"بعد الإضافة (الجدار الأول)");
 same(b.id,"والثاني");
 eq(O.opensOf(a.id).length,2,"جدارٌ بفتحتين");
 eq(O.opensOf("W-none").length,0,"وجدارٌ مجهول بلا شيء");
 ok(Object.isFrozen(O.opensOf(a.id)),"والقائمة المشتركة مجمَّدة");
 throws(()=>{"use strict"; O.opensOf(a.id).push({})},/./,
  "ومحاولةُ إفسادها تفشل صريحاً");

 O.delOpen(O.opensOf(a.id)[0]);
 same(a.id,"بعد الحذف");
 eq(O.opensOf(a.id).length,1,"وبقيت واحدة");

 /* استبدال المصفوفة كما يفعل cascade وتحميل اللقطة */
 S.opens=S.opens.filter(o=>o.wall!==b.id);
 same(b.id,"بعد استبدال المصفوفة بلا touch");
 eq(O.opensOf(b.id).length,0,"وفتحات الجدار المحذوف زالت");

 /* دفعٌ مباشر بلا touch — الطول يتغيّر فيُبطَل */
 S.opens.push({id:"OX1",wall:a.id,kind:"door",s:5000,w:600,h:2000,sill:0});
 same(a.id,"بعد دفعٍ مباشر");
 ok(O.opensOf(a.id).some(o=>o.id==="OX1"),"والمدفوعة ظاهرة");
});

group("openById: تطابق find القديمة",()=>{
 const [a]=two();
 const o1=O.addOpen(a,1000,"door",900,2100,0);
 const o2=O.addOpen(a,3000,"window",1000,1200,900);
 ok(O.openById(o1.id)===o1&&O.openById(o2.id)===o2,"تُعيد الكائن نفسه لا نسخة");
 eq(O.openById("nope"),null,"والمجهول null");
 O.delOpen(o1);
 eq(O.openById(o1.id),null,"والمحذوف يزول من الفهرس");
});

group("opensOf: نقلُ الفتحات بالقطع يُعلَن صراحةً",()=>{
 const [a]=two();
 O.addOpen(a,1000,"door",900,2100,0);
 O.addOpen(a,5000,"window",1000,1200,900);
 const before=O.opensOf(a.id).length;
 eq(before,2,"فتحتان قبل القطع");
 /* الجدار طوله ٦ م: نقطعه عند ٣ م، فتنتقل الثانية إلى الجدار الجديد
    بتغيير o.wall في موضعه — لا طولٌ ولا مصفوفةٌ يتغيّران */
 M.breakWall(a.id,[3000,0]);
 const newW=S.walls[S.walls.length-1];
 same(a.id,"الجدار الأصلي بعد القطع");
 same(newW.id,"والجدار الجديد");
 eq(O.opensOf(a.id).length,1,"بقيت فتحةٌ واحدة في الأصل");
 eq(O.opensOf(newW.id).length,1,"وانتقلت الأخرى إلى الجديد");
 /* بلا invalidateOpens لبقي الفهرس القديم — يُختبَر صراحةً */
 O.invalidateOpens();
 same(a.id,"وبعد إبطالٍ صريح لا فرق");
});

group("التراجع: الفهرس يتبع اللقطة",()=>{
 const [a]=two();
 edit(()=>{O.addOpen(a,1000,"door",900,2100,0)},"فتحة");
 eq(O.opensOf(a.id).length,1,"بعد الإضافة");
 undo();
 eq(O.opensOf(a.id).length,0,"وبعد التراجع");
 same(a.id,"مطابقٌ للمرجع");
});

group("pickable: يتبع الطبقات والأنواع",()=>{
 const [a]=two();
 const o=O.addOpen(a,1000,"door",900,2100,0);
 const sw={k:"wall",id:a.id}, so={k:"open",id:o.id};
 ok(L.pickable(sw)&&L.pickable(so),"كلاهما قابلٌ للتحديد افتراضياً");
 ok(L.pickable(null),"وغياب الهدف لا يحجب");
 ok(L.pickable({k:"wall",id:"W-none"}),"وكيانٌ غير موجود لا يُحجَب (كما كان)");
 ok(L.pickable({k:"zzz",id:"x"}),"ونوعٌ مجهول كذلك");

 /* إخفاء طبقة الأبواب: الفتحة تسقط والجدار يبقى */
 edit(()=>{L.setLay("A-DOOR","off",1)},"إخفاء");
 ok(!L.pickable(so),"طبقةٌ مخفيّة ⇒ الفتحة غير قابلة");
 ok(L.pickable(sw),"والجدار على طبقةٍ أخرى قابل");
 undo();
 ok(L.pickable(so),"والتراجع يُعيدها");

 /* القفل */
 edit(()=>{L.setLay("A-WALL","lk",1)},"قفل");
 ok(!L.pickable(sw),"طبقةٌ مقفلة ⇒ الجدار غير قابل");
 ok(L.pickable(so),"والفتحة بلا أثر");
 edit(()=>{L.setLay("A-WALL","lk",0)},"فكّ");
 ok(L.pickable(sw),"وفكُّ القفل يُعيده");
});

group("pickable: تغيّر نوع الكيان يقلب الجواب",()=>{
 const [a]=two();
 const o=O.addOpen(a,1000,"window",1000,1200,900);
 const sw={k:"wall",id:a.id}, so={k:"open",id:o.id};
 edit(()=>{L.setLay("A-DOOR","off",1)},"إخفاء الأبواب");
 ok(L.pickable(so),"الشباك على A-GLAZ فقابل");
 /* الشباكُ يصير باباً: طبقتُه تنتقل إلى A-DOOR المخفيّة */
 o.kind="door"; touchOpen();
 ok(!L.pickable(so),"وبعد أن صار باباً على طبقةٍ مخفيّة لا يُحدَّد");
 o.kind="window"; touchOpen();
 ok(L.pickable(so),"وعودتُه تُعيده");

 /* الجدار يصير سترة: طبقتُه A-WALL-LOW */
 edit(()=>{L.setLay("A-WALL-LOW","off",1)},"إخفاء السترات");
 ok(L.pickable(sw),"الجدار العادي قابل");
 a.type="low"; touchGeom();
 ok(!L.pickable(sw),"وبعد أن صار سترةً على طبقةٍ مخفيّة لا يُحدَّد");
 a.type="int"; touchGeom();
 ok(L.pickable(sw),"وعودتُه تُعيده");
});

group("opensOf: تغيير o.wall في موضعه",()=>{
 const [a,b]=two();
 const o=O.addOpen(a,1000,"door",900,2100,0);
 O.opensOf(a.id);                       /* يُسخِّن الفهرس */
 /* مع touch: نسخةُ VER تُبطله */
 o.wall=b.id; touchOpen();
 same(a.id,"بعد النقل مع touchOpen (الجدار القديم)");
 same(b.id,"والجديد");
 eq(O.opensOf(b.id).length,1,"وانتقلت الفتحة");
 /* بلا touch: الفهرس لا يعلم حتى يُعلَن صراحةً */
 o.wall=a.id;
 O.invalidateOpens();
 same(a.id,"وبعد invalidateOpens الصريحة بلا touch");
 eq(O.opensOf(a.id).length,1,"عادت الفتحة");
 eq(O.opensOf(b.id).length,0,"وخلا الجدار الآخر");
});

group("pickEnts: يطابق حسابَ الطبقات المباشر",()=>{
 const [a,b]=two();
 O.addOpen(a,1000,"door",900,2100,0);
 O.addOpen(b,2000,"window",1000,1200,900);
 const slowPick=()=>{
  const out=[];
  S.walls.forEach(w=>{
   const lay=w.type==="low"?"A-WALL-LOW":"A-WALL";
   if(L.vis(lay)&&!L.locked(lay))out.push("wall:"+w.id);
  });
  S.opens.forEach(o=>{
   const lay=O.okOf(o.kind).lay;
   if(L.vis(lay)&&!L.locked(lay))out.push("open:"+o.id);
  });
  return out.sort().join("|");
 };
 const fast=()=>E.pickEnts().filter(s=>s.k==="wall"||s.k==="open")
  .map(s=>s.k+":"+s.id).sort().join("|");
 eq(fast(),slowPick(),"الكلّ قابلٌ للتحديد — المرجعان متّفقان");
 edit(()=>{L.setLay("A-GLAZ","off",1)},"إخفاء الزجاج");
 eq(fast(),slowPick(),"وبعد إخفاء طبقة");
 ok(fast().split("|").length===slowPick().split("|").length&&
  !/open:O\d+/.test(fast().split("|").filter(x=>/A-GLAZ/.test(x)).join()),
  "وعددهما واحد");
 edit(()=>{L.setLay("A-DOOR","lk",1)},"قفل الأبواب");
 eq(fast(),slowPick(),"وبعد قفل أخرى");
 undo(); undo();
 eq(fast(),slowPick(),"وبعد التراجع عنهما");
});
process.exit(summary()?1:0);
