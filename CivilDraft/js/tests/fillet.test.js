/* ═══ استدارة الركن (Fillet) — قوسٌ حقيقي لا قوسٌ مطليّ ═══
   التركيز: الهندسةُ المخزنة جدارٌ bulge لا ثلاثةُ أضلاع، والمركزُ
   عند الركنِ ونصفُ القطر مضبوط، والرفضُ كلُّه بسببٍ معلَن (توازٍ ·
   زاويةٌ مفرطحة · نصفُ قطرٍ لا يكفي السماكة · متبقٍّ دون MINW ·
   تحرّك بعد التخطيط)، والفتحةُ العابرة تُطرَح والباقي لا يزحف.
   التشغيل: node js/tests/fillet.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const ST=await import("../core/state.js");
const {S,DEF,loadState,clearHistory,undo,canUndo,snapshot}=ST;
const W=await import("../core/walls.js");
const M=await import("../core/modify.js");
const AM=await import("../core/arcmath.js");
const O=await import("../core/opens.js");

const reset=()=>{loadState(DEF(),true); clearHistory()};

group("fillet — ركن ٩٠° يُنتج جداراً قوسياً حقيقياً",()=>{
 reset();
 const w1=W.addWall([0,0],[5000,0],200,"int","c");
 const w2=W.addWall([5000,0],[5000,5000],200,"int","c");
 const pl=M.filletPlan(w1.id,w2.id,1000,[0,0],[5000,5000]);
 ok(Math.abs(pl.bulge+0.4142)<0.001,
  `bulge ≈ 0.4142 مفصلياً: ${pl.bulge.toFixed(4)}`);
 let m=""; try{M.filletApply(pl)}catch(e){m=e.message}
 eq(m,"","التنفيذ تمّ بلا خطأ");
 eq(S.walls.length,3,"ثلاثة جدران: اثنان مقطوعان وقوس");
 const arc=S.walls[2];
 ok(AM.isArc(arc),"الجدار الجديد قوسيّ");
 const P=AM.arcParams(arc);
 eq(Math.round(P.cx),5000,"المركز عند الركن");
 eq(Math.round(P.cy),0,"وعلى المحور");
 eq(Math.round(P.R),1000,"وبنصف القطر المطلوب");
 ok(Math.abs(P.sweep+Math.PI/2)<1e-6,
  "واجتياح ٩٠° مع الساعة (bulge سالب)");
 eq(arc.t,200,"وسماكةُ القوس هي سماكةُ الجدارين");
 ok(canUndo(),"خطوةُ تراجعٍ واحدة");
 undo();
 eq(S.walls.length,2,"التراجع يعيد الجدارين الأصليين");
 eq(S.walls[0].b[0],5000,"بلا أثر قطع");
});

group("fillet — الرفضُ كلُّه بسببٍ معلَن بلا كتابة",()=>{
 reset();
 const w1=W.addWall([0,0],[5000,0],200,"int","c");
 const w2=W.addWall([5000,0],[5000,5000],200,"int","c");
 /* جدرانُ الإعداد لسيناريوهات الرفض (توازٍ · زاويةٌ مفرطحة) تُضاف
    هنا، قبل أخذ لقطة الأساس n0 — فما نقيسه بعدها هو أثر filletPlan
    وحدها (خالصةٌ لا تكتب)، لا أثرَ إضافة الجدران المساعدة. */
 const wp=W.addWall([0,1000],[5000,1000],200,"int","c");
 const w3=W.addWall([5000,0],[10000,100],200,"int","c");
 const n0=snapshot();
 /* توازٍ */
 let m=""; try{M.filletPlan(w1.id,wp.id,500,[0,0],[0,1000])}catch(e){m=e.message}
 ok(/متوازيان/.test(m),"المتوازيان يُرفضان: "+m);
 /* نصفُ قطرٍ لا يكفي السماكة: t=200 ⇒ الأدنى 101 */
 m=""; try{M.filletPlan(w1.id,w2.id,100,[0,0],[5000,5000])}catch(e){m=e.message}
 ok(/لا يكفي سماكة/.test(m),"نصف قطر 100 مرفوض: "+m);
 /* متبقٍّ دون MINW: طولُ كلّ جدارٍ 5000، فنصفُ قطرٍ 4980 يُبقي 20
    مم فقط من كلّ جهة — دون MINW=50 */
 m=""; try{M.filletPlan(w1.id,w2.id,4980,[0,0],[5000,5000])}catch(e){m=e.message}
 ok(/الأدنى/.test(m),"نصف قطرٍ يترك أقلّ من الأدنى يُرفَض: "+m);
 /* زاويةٌ مفرطحة: جدارٌ شبه متّحد الاتجاه */
 m=""; try{M.filletPlan(w1.id,w3.id,500,[0,0],[10000,100])}catch(e){m=e.message}
 ok(/زاوية/.test(m),"الزاوية المفرطحة تُرفَض: "+m);
 eq(snapshot(),n0,"ولا كتابةَ في كل المحاولات");
});

group("fillet — الفتحةُ العابرة تُطرَح والباقي لا يزحف",()=>{
 reset();
 const w1=W.addWall([0,0],[5000,0],200,"int","c");
 W.addWall([5000,0],[5000,5000],200,"int","c");
 /* بابٌ عند 4500 (يمتدّ 4050..4950) يدخل منطقة القطع 4000..5000 */
 O.addOpen(w1,4500,"door",900,2100);
 const far=O.addOpen(w1,2000,"door",900,2100);   /* بعيدٌ عن القطع */
 const pl=M.filletPlan(w1.id,S.walls[1].id,1000,[0,0],[5000,5000]);
 const r=M.filletApply(pl);
 eq(r.lost,1,"فتحةٌ واحدة عُبِرَت فطُرِحت");
 eq(S.opens.length,1,"وفتحةٌ واحدة بقيت");
 eq(S.opens[0].id,far.id,"والباقية هي البعيدة حرفاً");
 eq(S.opens[0].s,2000,"ولا زحفَ في موضعها");
});

group("fillet — أمانُ الحركة: تحرُّكٌ بعد التخطيط يُبطِل التنفيذ",()=>{
 reset();
 const w1=W.addWall([0,0],[5000,0],200,"int","c");
 W.addWall([5000,0],[5000,5000],200,"int","c");
 const pl=M.filletPlan(w1.id,S.walls[1].id,1000,[0,0],[5000,5000]);
 w1.b=[4950,0];                     /* تحريك الطرف بلا معاملة */
 let m=""; try{M.filletApply(pl)}catch(e){m=e.message}
 ok(/تحرّك بعد التخطيط/.test(m),"التحرّك يُبطِل التنفيذ: "+m);
 eq(S.walls.length,2,"ولا كتابةَ بعد الرفض");
});

process.exit(summary()?1:0);
