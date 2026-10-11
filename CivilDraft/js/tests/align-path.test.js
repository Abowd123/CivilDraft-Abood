/* ═══ التسوية والمصفوفةُ على مسار ═══ §٣/٨ و§٣/٩
   كان النقلُ يدويّاً واحداً واحداً (العينُ تخطئ بمليمتراتٍ تظهر في
   التصدير)، والمصفوفةُ الثالثةُ غائبةً (المستطيلةُ والقطبيةُ موجودتان)
   وهي ما يلزم لأعمدةِ شرفةٍ منحنيةٍ أو بلاطِ ممشى.
   وأهمُّ ما يُقاس هنا: التباعدُ **بطول القوس** لا بوتر الأضلاع —
   على نصفِ دائرةٍ الفرقُ بينهما يُرى بالعين.
   التشغيل:  node js/tests/align-path.test.js                        */
import {shim,group,ok,eq,near,deep,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,clearHistory,edit,undo}=
 await import("../core/state.js");
const M =await import("../core/modify.js");
const CO=await import("../core/cols.js");
const PL=await import("../core/plines.js");
const W =await import("../core/walls.js");
const DIM=await import("../core/dims.js");

const reset=()=>{newState(); ensureShape(); clearHistory()};
const col=(x,y,w)=>{
 let c=null;
 edit(()=>{c=CO.addCol("rect",[x,y],w||400)},"عمود");
 return c;
};
const pline=(pts,o)=>{
 let p=null;
 edit(()=>{p=PL.addPline(pts,o)},"مسار");
 return p;
};
const G=l=>M.grab(l.map(c=>({k:"col",id:c.id})));
const xs=()=>S.cols.map(c=>c.x).sort((a,b)=>a-b);
const ys=()=>S.cols.map(c=>c.y).sort((a,b)=>a-b);

group("العقدُ معلَنٌ ومصدَّر",()=>{
 deep(M.ALIGN_AXES,["x","y"],"محوران لا أكثر");
 deep(M.ALIGN_MODES,["min","mid","max","dist"],
  "وأربعُ حالاتٍ: ثلاثُ محاذياتٍ وتوزيع");
 M.ALIGN_MODES.forEach(m=>ok(/[\u0600-\u06FF]/.test(M.alignWhy(m)),
  `${m}: سببٌ عربيٌّ مقروء`));
});

group("المحاذاةُ على الوسط: المرجعُ من كلِّ المحدَّد مجتمعاً",()=>{
 reset();
 const A=[col(0,0),col(1000,300),col(2000,-200)];
 const P=M.alignPlan(G(A),"y","mid");
 /* مراكزُ الصناديق 0 و300 و-200 ⇒ المتوسّطُ ≈33 */
 eq(P.target,33,"المرجعُ متوسّطُ المراكزِ الثلاثة");
 eq(P.moves.length,3,"وثلاثتُها تتحرّك");
 eq(P.axis,"y","على المحور الرأسيّ");
 M.alignAll(G(A),"y","mid");
 deep(ys(),[33,33,33],"والنتيجةُ خطٌّ واحد");
 deep(xs(),[0,1000,2000],"والمحورُ الآخرُ لم يُمَسّ");
});

group("المحاذاةُ إلى الأدنى والأقصى",()=>{
 reset();
 const A=[col(0,0),col(1000,300),col(2000,-200)];
 M.alignAll(G(A),"y","min");
 /* الأدنى: حدُّ الصندوقِ الأسفلُ لأصغرِها = -200-200 = -400 ⇒ y=-200 */
 deep(ys(),[-200,-200,-200],"الأدنى يجمعها على أسفلِ أدناها");
 reset();
 const B=[col(0,0),col(1000,300),col(2000,-200)];
 M.alignAll(G(B),"y","max");
 deep(ys(),[300,300,300],"والأقصى على أعلى أعلاها");
});

group("التسويةُ تنقل ولا تَشُدّ",()=>{
 reset();
 const A=[col(0,0,400),col(1000,300,800)];
 const w0=S.cols.map(c=>c.w).sort((a,b)=>a-b);
 M.alignAll(G(A),"y","mid");
 deep(S.cols.map(c=>c.w).sort((a,b)=>a-b),w0,
  "الأحجامُ كما هي — الهيئةُ تبقى والموضعُ يتغيّر");
});

group("التوزيعُ يحفظ الطرفَين ويُقاس على المراكز",()=>{
 reset();
 const A=[col(0,0),col(1500,0),col(2000,0),col(9000,0)];
 const P=M.alignPlan(G(A),"x","dist");
 eq(P.step,3000,"الخطوةُ (9000-0)÷3");
 M.alignAll(G(A),"x","dist");
 deep(xs(),[0,3000,6000,9000],"الطرفانِ ثابتانِ وما بينهما موزَّع");
});

group("ما لا يُوزَّع يُرفَض بسببٍ مكتوب",()=>{
 reset();
 const one=[col(0,0)];
 let e="";
 try{M.alignPlan(G(one),"x","mid")}catch(x){e=x.message}
 ok(/عنصرَين/.test(e),`عنصرٌ واحدٌ مرفوض: ${e}`);
 reset();
 const two=[col(0,0),col(1000,0)];
 e="";
 try{M.alignPlan(G(two),"x","dist")}catch(x){e=x.message}
 ok(/ثلاثة/.test(e),`والتوزيعُ يحتاج ثلاثةً: ${e}`);
 /* طرفانِ في موضعٍ واحدٍ: لا مدًى */
 reset();
 /* عمودانِ بمركزٍ واحدٍ يُرفَضانِ في addCol (تكرارٌ حقيقيّ)، فمدًى
    الصفرِ يُبنى على المحور الآخر: ثلاثةٌ على خطٍّ أفقيٍّ واحدٍ
    مراكزُها الرأسيةُ متساوية ⇒ لا مدًى للتوزيع رأسياً. */
 const flat=[col(0,0),col(1000,0),col(2000,0)];
 e="";
 try{M.alignPlan(G(flat),"y","dist")}catch(x){e=x.message}
 ok(/مدًى|موضعٍ واحد/.test(e),`ولا مدًى يُوزَّع فيه: ${e}`);
});

group("المسوَّى أصلاً لا يُنقَل",()=>{
 reset();
 const A=[col(0,500),col(1000,500),col(2000,500)];
 const P=M.alignPlan(G(A),"y","mid");
 eq(P.moves.length,0,"لا حركةَ — فالأداةُ تقول «مسوّاةٌ أصلاً» ولا تنفّذ");
});

group("طولُ المسار: القوسُ بمداه لا بوتره",()=>{
 reset();
 /* نصفُ دائرةٍ وترُها 5000 ⇒ نق 2500، والطولُ πr ≈ 7854 */
 const p=pline([[0,0],[5000,0]],{bulge:[1]});
 near(M.pathLength(p),Math.PI*2500,3,"نصفُ الدائرة πr لا الوتر 5000");
 const q=pline([[0,0],[6000,0],[6000,6000]]);
 eq(M.pathLength(q),12000,"والمستقيمُ مجموعُ أضلاعه");
});

group("العيّناتُ والموضعُ عند طولٍ معيّن",()=>{
 /* `pathSamples` و`pathAt` مصدَّرتانِ لأنّ الأداةَ تبني بهما
    المعاينةَ بلا نسخٍ: الصليبُ يُرسَم عند نفسِ المواضعِ التي
    سيُنسَخ إليها — فلا شبحٌ يكذب. */
 reset();
 const p=pline([[0,0],[4000,0],[4000,3000]]);
 const SM=M.pathSamples(p);
 ok(SM.length>=3,"عيّناتٌ على كلِّ رأس");
 eq(SM[0].t,0,"تبدأ من الصفر");
 eq(SM[SM.length-1].t,7000,"وتنتهي بطولِ المسار كلِّه");
 ok(SM.every((x,i)=>i===0||x.t>=SM[i-1].t),"والطولُ تراكميٌّ لا ينقص");
 const h=M.pathAt(SM,3500);
 deep(h.p,[3500,0],"والموضعُ عند 3500 على الضلعِ الأوّل");
 eq(M.pathAt(SM,7000).p[1],3000,"وعند النهايةِ آخرُ رأس");
 /* خارجَ المدى يُقصَر ولا يُرمى: المعاينةُ تُنادى كلَّ إطار */
 deep(M.pathAt(SM,99999).p,[4000,3000],"وما فوق الطولِ يُقصَر");
 deep(M.pathAt(SM,-500).p,[0,0],"وما تحت الصفرِ كذلك");
 eq(M.pathAt([],100),null,"ومسارٌ فارغٌ يُعيد null لا يرمي");
 /* والمَيلُ معلَنٌ عند كلِّ عيّنة — عليه يقوم «يتبع الميل» */
 ok(SM.every(x=>isFinite(x.ang)),"ولكلِّ عيّنةٍ ميلٌ منتهٍ");
 near(M.pathAt(SM,1000).ang,0,0.01,"الضلعُ الأفقيُّ ميلُه صفر");
 near(Math.abs(M.pathAt(SM,5000).ang),90,0.01,"والرأسيُّ 90°");
});

group("المصفوفةُ على مسارٍ مستقيم",()=>{
 reset();
 const c=col(0,0);
 const p=pline([[0,0],[6000,0],[6000,6000]]);
 const r=M.arrayPath(G([c]),p,5,0);
 eq(r.n,5,"خمسةُ عناصر");
 eq(r.step,3000,"الخطوةُ 12000÷4 — المفتوحُ يبلغ نهايتَه بالضبط");
 eq(S.cols.length,5,"الأصلُ وأربعُ نسخ");
 deep(S.cols.map(x=>[x.x,x.y]),
  [[0,0],[3000,0],[6000,0],[6000,3000],[6000,6000]],
  "والمواضعُ تتبع الزاويةَ لا الوتر");
});

group("المصفوفةُ على قوس: التباعدُ بطول القوس",()=>{
 reset();
 const c=col(0,0);
 const p=pline([[0,0],[5000,0]],{bulge:[1]});
 const r=M.arrayPath(G([c]),p,4,0);
 near(r.step,Math.PI*2500/3,3,"الخطوةُ ثلثُ طولِ القوس");
 /* أربعةُ مواضعَ على نصفِ دائرةٍ ⇒ 0° و60° و120° و180° من المركز.
    الوترُ أفقيٌّ والقوسُ أسفلَه (bulge موجب ⇒ مسحٌ سالب)، فالمركزُ
    (2500,0) والنقاطُ على نق 2500 بزوايا منتظمة. */
 const P=S.cols.map(x=>[x.x,x.y]).sort((a,b)=>a[0]-b[0]);
 eq(P.length,4,"أربعةُ أعمدة");
 P.forEach(q=>near(Math.hypot(q[0]-2500,q[1]),2500,4,
  `(${q[0]},${q[1]}) على نصفِ القطر — لا على الوتر`));
 /* والمسافاتُ المتتاليةُ (أوتارٌ بين نقاطٍ متساويةِ القوس) متساوية */
 const d=[];
 for(let i=0;i+1<P.length;i++)
  d.push(Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]));
 near(d[0],d[1],5,"والأوتارُ بينها متساوية");
 near(d[1],d[2],5,"كلُّها");
});

group("المسارُ المغلقُ لا تتراكب أخيرتُه على أولاه",()=>{
 reset();
 const c=col(0,0);
 const p=pline([[0,0],[4000,0],[4000,4000],[0,4000]],{closed:1});
 const r=M.arrayPath(G([c]),p,4,0);
 eq(r.closed,1,"يُعلَن مغلقاً");
 eq(r.step,4000,"والطولُ 16000 يُقسَم على 4 لا على 3");
 eq(S.cols.length,4,"أربعةُ أعمدةٍ على الأركان");
 deep(S.cols.map(x=>[x.x,x.y]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),
  [[0,0],[0,4000],[4000,0],[4000,4000]],"ولا تكرارَ في الأوّل");
});

group("الدورانُ مع الميل اختياريٌّ والمرفوضُ يُسمّى",()=>{
 reset();
 const c=col(0,0);
 const p=pline([[0,0],[4000,0],[4000,4000]]);
 const r=M.arrayPath(G([c]),p,3,1);
 eq(r.rot,1,"يُعلَن أنّه تبع الميل");
 eq(S.cols.length,3,"ثلاثةُ أعمدة");
 /* العمودُ المربّعُ يدور: الزاويةُ تتغيّر على الضلع الرأسيّ */
 ok(S.cols.some(x=>Math.abs(x.rot||0)>1),
  "وأحدُها دار فعلاً مع انعطاف المسار");
 /* البُعدُ لا يدور إلّا بمضاعفات 90°: مع «يتبع الميل» يُرفَض
    ويُسمّى في refused، ومع إطفائه يُنسَخ عادياً. المسارُ منعطفٌ
    بزاويةٍ غيرِ قائمةٍ فالميلُ يتغيّر. */
 reset();
 let d=null;
 edit(()=>{d=DIM.addDim("h",[0,0],[1000,0],0)},"بُعد");
 const gd=M.grab([{k:"dim",id:d.id}]);
 const p2=pline([[0,0],[4000,2000],[8000,0]]);
 let e2="";
 try{M.arrayPath(gd,p2,3,1)}catch(x){e2=x.message}
 ok(/90°/.test(e2),`المرفوضُ يُسمّى سببُه: ${e2}`);
 eq(S.dims.length,1,"ولا نصفَ تنفيذٍ — بُعدٌ واحدٌ كما كان");
 /* وبإطفاء «يتبع الميل» يُنسَخ */
 const r3=M.arrayPath(M.grab([{k:"dim",id:d.id}]),p2,3,0);
 eq(S.dims.length,3,"وبلا دورانٍ يُنسَخ ثلاثةً");
 deep(r3.refused,[],"ولا مرفوض");
});

group("الحدودُ والتراجع",()=>{
 reset();
 const c=col(0,0);
 const p=pline([[0,0],[1000,0]]);
 /* العددُ يُحَدّ عند 200 لا يُرفَض — كالمصفوفتَين الأُختَين */
 const rc=M.arrayPath(G([c]),p,600,0);
 eq(rc.n,200,"العددُ محدودٌ بـ200");
 /* والحدُّ الصلبُ 500 نسخةً يُرفَض بسببٍ رقميّ: 4 عناصرَ × 199 */
 reset();
 const many=[col(0,0),col(0,1000),col(0,2000),col(0,3000)];
 const p3=pline([[0,0],[9000,0]]);
 let e="";
 try{M.arrayPath(G(many),p3,200,0)}catch(x){e=x.message}
 ok(/500/.test(e),`فوق الحدِّ الصلبِ مرفوضٌ بسببٍ رقميّ: ${e}`);
 reset();
 const c2=col(0,0);
 const p2=pline([[0,0],[6000,0],[6000,6000]]);
 const n0=S.cols.length;
 M.arrayPath(G([c2]),p2,5,0);
 eq(S.cols.length,5,"نُسِخت");
 undo();
 eq(S.cols.length,n0,"والتراجعُ خطوةٌ واحدةٌ تُعيد الحالَ");
});

group("مسارٌ لا يصلح يُرفَض لا يُبلَع",()=>{
 reset();
 const c=col(0,0);
 let e="";
 try{M.arrayPath(G([c]),{pts:[[0,0]]},3,0)}catch(x){e=x.message}
 ok(/نقطتان|يصلح/.test(e),`نقطةٌ واحدةٌ مرفوضة: ${e}`);
 e="";
 try{M.arrayPath(G([c]),{pts:[[0,0],[0,0]]},3,0)}catch(x){e=x.message}
 ok(/صفر|يصلح|نقطتان/.test(e),`وطولٌ صفرٌ مرفوض: ${e}`);
});

process.exit(summary()?1:0);
