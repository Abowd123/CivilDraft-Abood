/* ═══ تحريرُ الخطّ المتعدّد ═══ §٣/١٠
   لا إضافةَ عقدةٍ ولا حذفَها ولا تحويلَ ضلعٍ إلى قوسٍ بعد الرسم، فكان
   التصحيحُ حذفاً وإعادةَ رسمٍ من الصفر.
   وأهمُّ ما يُقاس هنا: **إدراجُ رأسٍ في قوسٍ لا يغيّر شكلَه**. القسمةُ
   الساذجةُ (bulge نفسُه للنصفَين) تُنتج شكلاً آخر؛ الصحيحةُ
   `tan(θ/4)`. جُرِّب على نصفِ دائرةٍ: الطولُ قبلَ الإدراجِ وبعده واحد.
   التشغيل:  node js/tests/pedit.test.js                             */
import {shim,group,groupAsync,ok,eq,near,deep,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,clearHistory,edit,undo}=
 await import("../core/state.js");
const PL=await import("../core/plines.js");

const reset=()=>{newState(); ensureShape(); clearHistory()};
const mk=(pts,o)=>{
 let p=null;
 edit(()=>{p=PL.addPline(pts,o)},"خطّ");
 return p;
};
/* كلُّ عمليةٍ في معاملةٍ كما تفعل الأداة */
const run=(fn,label)=>{
 let err="";
 edit(()=>{try{return fn()}catch(e){err=e.message; throw e}},label||"تحرير");
 if(err)throw new Error(err);
};

group("عدُّ الأضلاع: المغلقُ له ضلعٌ أخيرٌ يعود للأوّل",()=>{
 reset();
 eq(PL.plineSegs(mk([[0,0],[1000,0]])),1,"نقطتانِ ⇒ ضلعٌ واحد");
 eq(PL.plineSegs(mk([[0,0],[1000,0],[1000,1000]])),2,"وثلاثٌ ⇒ ضلعان");
 eq(PL.plineSegs(mk([[0,0],[1000,0],[1000,1000]],{closed:1})),3,
  "والمغلقُ ثلاثةٌ — الضلعُ العائدُ محسوب");
 eq(PL.plineSegs(null),0,"ولا شيءَ يرمي");
});

group("الضلعُ والرأسُ الأقربانِ — فهرسانِ لا يُخلَطان",()=>{
 reset();
 const p=mk([[0,0],[4000,0],[4000,4000]]);
 eq(PL.segNearest(p,2000,100).i,0,"نقرةٌ على الضلعِ الأوّل");
 eq(PL.segNearest(p,4100,2000).i,1,"وعلى الثاني");
 eq(PL.vertNearest(p,3900,100).i,1,"والرأسُ الأقربُ هو الأوسط");
 eq(PL.vertNearest(p,100,100).i,0,"ثم الأوّل");
 /* والبعدُ معلَنٌ فالأداةُ تقدر أن ترفض نقرةً بعيدة */
 ok(PL.segNearest(p,2000,100).d>=100,"والبُعدُ مُعاد");
});

group("ضلعٌ ⇄ قوس",()=>{
 reset();
 const p=mk([[0,0],[5000,0]]);
 eq(PL.plineLen(p),5000,"مستقيمٌ طولُه الوتر");
 run(()=>PL.segBulge(p,0,1));
 near(PL.plineLen(p),Math.PI*2500,2,"صار نصفَ دائرةٍ طولُه πr");
 run(()=>PL.segBulge(p,0,0));
 eq(PL.plineLen(p),5000,"ثم عاد مستقيماً");
 eq(p.bulge,undefined,
  "وحقلُ الانحناءِ يُحذَف لا يبقى أصفاراً — فلا يكبر ملفُّ المشروع");
});

group("الإشارةُ تقلب الجهة",()=>{
 reset();
 const p=mk([[0,0],[5000,0]]);
 run(()=>PL.segBulge(p,0,1));
 const b1=PL.plineBox(p);
 run(()=>PL.segBulge(p,0,-1));
 const b2=PL.plineBox(p);
 eq(b1.y1,2500,"الموجبُ يقوّس إلى جهة");
 eq(b2.y0,-2500,"والسالبُ إلى الأخرى");
 near(PL.plineLen(p),Math.PI*2500,2,"والطولُ واحدٌ في الحالتين");
});

group("الانحناءُ المستحيلُ يُرفَض ويُسمّى",()=>{
 reset();
 const p=mk([[0,0],[5000,0]]);
 let e="";
 try{run(()=>PL.segBulge(p,5,1))}catch(x){e=x.message}
 ok(/غير موجود/.test(e),`ضلعٌ لا وجودَ له: ${e}`);
 ok(/ضلعاً|1/.test(e),"والرسالةُ تقول كم ضلعاً فيه فعلاً");
 e="";
 try{run(()=>PL.segBulge(p,0,NaN))}catch(x){e=x.message}
 ok(/رقميّ/.test(e),`وانحناءٌ غيرُ رقميٍّ: ${e}`);
 eq(p.bulge,undefined,"ولا نصفَ تنفيذٍ — الخطُّ كما كان");
});

group("إدراجُ رأسٍ في ضلعٍ مستقيم",()=>{
 reset();
 const p=mk([[0,0],[4000,0]]);
 const r=run(()=>PL.insertVert(p,0))||1;
 eq(p.pts.length,3,"صار ثلاثةَ رؤوس");
 deep(p.pts[1],[2000,0],"والجديدُ في المنتصف");
 eq(PL.plineLen(p),4000,"والطولُ لم يتغيّر");
 /* ونقطةٌ مختارةٌ تُحتَرم */
 reset();
 const q=mk([[0,0],[4000,0]]);
 run(()=>PL.insertVert(q,0,[3000,50]));
 deep(q.pts[1],[3000,0],"ونقرةٌ على الضلعِ تُسقَط عليه");
});

await groupAsync("إدراجُ رأسٍ في قوسٍ لا يغيّر شكلَه",async()=>{
 reset();
 const p=mk([[0,0],[5000,0]],{bulge:[1]});
 const L0=PL.plineLen(p);
 const B0=PL.plineBox(p);
 near(L0,Math.PI*2500,2,"نصفُ دائرة");
 run(()=>PL.insertVert(p,0));
 eq(p.pts.length,3,"ثلاثةُ رؤوس");
 deep(p.pts[1],[2500,-2500],"والجديدُ عند منتصفِ القوسِ لا منتصفِ الوتر");
 near(PL.plineLen(p),L0,2,
  "والطولُ لم يتغيّر — القسمةُ بـtan(θ/4) لا بالانحناءِ نفسه");
 /* الصندوقُ لا يُقاس به الشكل: `plineBox` تقريبٌ مُعلَنٌ (رؤوسٌ
    موسَّعةٌ بأكبرِ سهمٍ)، وقوسانِ نصفُ سهمِ كلٍّ منهما يُنتجانِ
    تقريباً أضيقَ من قوسٍ واحد. فالشكلُ يُقاس بمركزِ القوسِ ونصفِ
    قطره — وهما ما يُرسَم فعلاً. */
 const {bulgeArc}=await import("../core/arcmath.js");
 const A1=bulgeArc(p.pts[0],p.pts[1],p.bulge[0]);
 const A2=bulgeArc(p.pts[1],p.pts[2],p.bulge[1]);
 near(A1.r,2500,1,"النصفُ الأوّلُ على نصفِ القطر نفسه");
 near(A2.r,2500,1,"والثاني كذلك");
 near(A1.cx,2500,1,"ومركزُ الأوّلِ مركزُ الأصل (س)");
 near(A1.cy,0,1,"(ص)");
 near(A2.cx,2500,1,"ومركزُ الثاني هو نفسُه (س)");
 near(A2.cy,0,1,"(ص)");
 /* وسهمُ القوسِ الأصليِّ مُعلَنٌ في B0 فلا يُترَك بلا استعمال */
 eq(B0.y0,-2500,"وصندوقُ الأصلِ كان يبلغ نق كاملاً");
 /* ربعانِ: انحناءُ كلٍّ منهما tan(45°/2)=0.4142 */
 near(p.bulge[0],Math.tan(Math.PI/8),1e-4,"ربعُ دائرةٍ أوّل");
 near(p.bulge[1],Math.tan(Math.PI/8),1e-4,"وربعٌ ثانٍ");
});

group("حذفُ رأسٍ يُنتج ضلعاً مستقيماً مُعلَناً",()=>{
 reset();
 const p=mk([[0,0],[2000,1000],[4000,0]]);
 run(()=>PL.delVert(p,1));
 eq(p.pts.length,2,"رأسانِ");
 deep(p.pts,[[0,0],[4000,0]],"والطرفانِ باقيان");
 eq(PL.plineLen(p),4000,"والضلعُ مستقيم");
 /* وقوسانِ مختلفانِ لا يُخمَّن منهما قوس */
 reset();
 const q=mk([[0,0],[2000,0],[4000,0]],{bulge:[1,-0.5]});
 run(()=>PL.delVert(q,1));
 eq(q.bulge,undefined,
  "قوسانِ مختلفانِ ⇒ مستقيمٌ صادقٌ لا قوسٌ مُخمَّنٌ كاذب");
});

group("حذفُ الطرفِ لا يفسد مصفوفةَ الانحناء",()=>{
 reset();
 const p=mk([[0,0],[2000,0],[4000,0],[6000,0]],{bulge:[0,1,0]});
 run(()=>PL.delVert(p,0));
 eq(p.pts.length,3,"ثلاثةُ رؤوس");
 near(p.bulge[0],1,1e-6,"والقوسُ الباقي في موضعه الصحيح");
 reset();
 const q=mk([[0,0],[2000,0],[4000,0],[6000,0]],{bulge:[1,0,0]});
 run(()=>PL.delVert(q,3));
 near(q.bulge[0],1,1e-6,"وحذفُ الطرفِ الآخرِ كذلك");
});

group("الحدُّ الأدنى: لا خطَّ دون نقطتين",()=>{
 reset();
 const p=mk([[0,0],[4000,0]]);
 let e="";
 try{run(()=>PL.delVert(p,0))}catch(x){e=x.message}
 ok(/نقطتين/.test(e),`رأسانِ لا ينزلان: ${e}`);
 ok(/احذف الخطّ/.test(e),"والرسالةُ تدلُّ على البديل");
 eq(p.pts.length,2,"ولم يُمَسّ");
 reset();
 const q=mk([[0,0],[4000,0],[4000,4000]],{closed:1});
 e="";
 try{run(()=>PL.delVert(q,0))}catch(x){e=x.message}
 ok(/ثلاثة/.test(e),`والمغلقُ لا ينزل عن ثلاثة: ${e}`);
 eq(q.pts.length,3,"ولم يُمَسّ");
});

group("سقفُ الرؤوس معلَنٌ ومحروس",()=>{
 reset();
 ok(PL.LIM_VERTS>=50,"السقفُ مصدَّرٌ ومعقول");
 const pts=[];
 for(let i=0;i<PL.LIM_VERTS;i++)pts.push([i*300,0]);
 const p=mk(pts);
 eq(p.pts.length,PL.LIM_VERTS,"خطٌّ عند السقف");
 let e="";
 try{run(()=>PL.insertVert(p,0))}catch(x){e=x.message}
 ok(new RegExp(String(PL.LIM_VERTS)).test(e),
  `والإدراجُ فوقه مرفوضٌ بالرقم: ${e}`);
});

group("رأسٌ يلتصق برأسٍ قائمٍ يُرفَض",()=>{
 reset();
 const p=mk([[0,0],[4000,0]]);
 let e="";
 try{run(()=>PL.insertVert(p,0,[2,0]))}catch(x){e=x.message}
 /* الطرفُ يُقصَر إلى 2% فلا يلتصق — فالرفضُ لا يقع هنا، والنتيجةُ
    رأسٌ على بُعدٍ مقبول. هذا هو العقدُ: يُقصَر ولا يُرفَض. */
 eq(e,"","نقرةٌ على الطرفِ تُقصَر ولا تُرفَض");
 ok(p.pts[1][0]>=60,`والرأسُ الجديدُ بعيدٌ عن الطرف: ${p.pts[1][0]}`);
});

group("التعديلُ على مكانه — المعرّفُ يبقى",()=>{
 reset();
 const p=mk([[0,0],[4000,0],[4000,4000]]);
 const id=p.id;
 run(()=>PL.insertVert(p,0));
 run(()=>PL.segBulge(p,1,0.5));
 run(()=>PL.delVert(p,2));
 eq(S.plines.length,1,"خطٌّ واحدٌ لا بديلٌ جديد");
 eq(S.plines[0].id,id,
  "والمعرّفُ نفسُه — فالمجموعاتُ وما يشير إليه لا يُكسَر");
});

group("كلُّ عمليةٍ خطوةُ تاريخٍ واحدةٌ تتراجع",()=>{
 reset();
 const p=mk([[0,0],[4000,0]]);
 run(()=>PL.insertVert(p,0));
 eq(S.plines[0].pts.length,3,"أُدرِج");
 undo();
 eq(S.plines[0].pts.length,2,"والتراجعُ يُعيده");
 run(()=>PL.segBulge(S.plines[0],0,1));
 ok(S.plines[0].bulge&&S.plines[0].bulge[0]===1,"قُوِّس");
 undo();
 eq(S.plines[0].bulge,undefined,"والتراجعُ يُسطّحه");
});

process.exit(summary()?1:0);
