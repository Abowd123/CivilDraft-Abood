/* ═══ دفعة 7.2 — سقف LIM.elements + طرد نسخ الصور غير المشار إليها ═══
   node js/tests/phase7-2.test.js */
import {shim} from "./harness.js";
shim();
import {group,ok,eq,summary} from "./harness.js";
import {S,ensureShape,DEF,edit,undo,redo} from "../core/state.js";
import {setImage} from "../core/underlay.js";
import {LIM} from "../core/limits.js";

const reset=()=>{Object.assign(S,DEF()); S.__shapeLog=null; ensureShape()};
const wall=i=>({id:"W"+(i+1),a:[0,i*10],b:[5000,i*10],t:200,type:"int",align:"c"});
const dropsOf=k=>((S.__shapeLog&&S.__shapeLog.g)||[])
 .filter(x=>x.type==="drop"&&x.kind===k).reduce((n,x)=>n+x.n,0);

group("بند 31-36: ما فوق LIM.elements يُقصّ ويُسجَّل",()=>{
 reset();
 const MX=LIM.elements.max;
 S.walls=Array.from({length:MX+5},(_,i)=>wall(i));
 ensureShape();
 eq(S.walls.length,MX,"الجدران قُصّت إلى الحدّ");
 eq(dropsOf("wall"),5,"والسجلّ يذكر العدد المُسقَط بدقّة (5)");
 eq(S.walls[0].id,"W1","والقصّ من الذيل: الأوائل باقية");
});
group("عند الحدّ تماماً وتحته: لا إسقاط",()=>{
 reset();
 S.walls=Array.from({length:LIM.elements.max},(_,i)=>wall(i));
 ensureShape();
 eq(S.walls.length,LIM.elements.max,"لا قصّ عند الحدّ");
 eq(dropsOf("wall"),0,"ولا تسجيل");
});
group("مثيلات الكتل تخضع للسقف نفسه (لا لحدّ التعريفات)",()=>{
 reset();
 const MX=LIM.elements.max;
 S.blocks=Array.from({length:MX+3},(_,i)=>({id:"b"+(i+1),block:"B",x:i,y:0}));
 ensureShape();
 eq(S.blocks.length,MX,"المثيلات قُصّت إلى LIM.elements لا إلى blockDefs");
 ok(MX>LIM.blockDefs.max,"وحدُّ التعريفات (أصغر) لم يُستعمل خطأً");
 eq(dropsOf("block"),3,"والسجلّ صحيح");
});

/* ═══ بند 40: النسخ غير المشار إليها تُطرَد أوّلاً ═══
   UCAP=8. تسلسلٌ ينتهي بثماني صورٍ حيّة في سلسلة التراجع وثلاثٍ
   يتيمةٍ من فرعٍ أُلغي — لو طُرد الأقدمُ لضاعت A1..A3 من التراجع. */
group("بند 40/41: فرعٌ أُلغي لا يُزيح نسخاً ما زال التراجع يحتاجها",()=>{
 reset();
 const img=n=>"data:image/png;base64,"+"A".repeat(210*1024+n);
 const A=[1,2,3,4,5,6].map(i=>img(i));
 A.forEach(a=>setImage(a));
 undo(); undo(); undo();                  /* الحالة: A3 · الذيل (A4..A6) في الإعادة */
 eq(S.underlay.src,A[2],"بعد ثلاثة تراجعات: A3");
 const B=[11,12,13,14,15].map(i=>img(i));
 B.forEach(b=>setImage(b));               /* تحميلٌ جديد يُلغي فرع A4..A6 */
 eq(S.underlay.src,B[4],"الحالة الحالية B5");
 const want=[B[3],B[2],B[1],B[0],A[2],A[1],A[0],""];
 want.forEach((w,i)=>{
  undo();
  ok(S.underlay.src===w,`التراجع ${i+1} يعيد الصورة الصحيحة`
   +(S.underlay.src===w?"":` (طولها ${S.underlay.src.length} بدل ${w.length})`));
 });
 redo(); redo();
 eq(S.underlay.src,A[1],"وإعادتان تصلان A2");
});
process.exit(summary());
