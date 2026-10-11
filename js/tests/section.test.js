/* ═══ اختبار المقاطع ═══
   القيَم المتوقّعة محسوبةٌ باليد ومكتوبةٌ صريحةً — لا تُشتقّ من
   الوحدة نفسها.

   المسقط (y‑up · مليمتر):
     W1 (0,0)→(6000,0)        خارجيّ 250 · جسمه y∈[−125,125]
     W2 (6000,0)→(6000,4000)  خارجيّ 250 · جسمه x∈[5875,6125]
     W3 (6000,4000)→(0,4000)  خارجيّ 250 · جسمه y∈[3875,4125]
     W4 (0,4000)→(0,0)        خارجيّ 250 · جسمه x∈[−125,125]
     W5 (3000,0)→(3000,4000)  داخليّ 150 · جسمه x∈[2925,3075]
     O1 باب على W5: s=2000 w=900  h=2100 sill=0   ⇒ مدى [1550,2450]
     O2 شبّاك على W2: s=2000 w=1200 h=1300 sill=900
     O3 باب على W4: s=1000 w=900  h=2100 sill=0   ⇒ مدى [550,1450]

   خطّ القطع الأساسي: A=(−1000,2000) → B=(7000,2000) · طوله 8000 */
import {shim,shimCanvas,group,eq,ok,deep,throws,summary,toolRig}
 from "./harness.js";
shim(); shimCanvas();

const {S,newState,ensureShape,touchGeom}
 =await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addOpen}=await import("../core/opens.js");
const {layNames,layOf,plots,resolve,toggleOff,showAll}
 =await import("../core/layers.js");
const {elevation,elevWalls,projectWalls,projectWall,viewFrame,
 wallHeight,extRef}=await import("../core/elevation.js");
const {section,sectWalls,sectPrims,sectStale,buildSect,lastSect,
 clearSect,sectSay,sectCmd,cutFrame,cutDist,cutFoot,sOfCut,
 sectName,uOf,SLAY,CUT,MINCUT}=await import("../core/section.js");
const {sectPage,sectFileName,sectTag,sectSVG,sectDXF,sectPDF}
 =await import("../io/sect.js");
const R=await import("../tools/registry.js");
await import("../tools/section.js");     /* يسجّل الأداة */

const A=[-1000,2000], B=[7000,2000];
let W1,W2,W3,W4,W5,O1,O2,O3;
function build(){
 newState();
 S.meta.name="TEST";
 S.meta.scale=100;
 S.meta.wallH=3000;
 W1=addWall([0,0],[6000,0],250,"ext","c");
 W2=addWall([6000,0],[6000,4000],250,"ext","c");
 W3=addWall([6000,4000],[0,4000],250,"ext","c");
 W4=addWall([0,4000],[0,0],250,"ext","c");
 W5=addWall([3000,0],[3000,4000],150,"int","c");
 O1=addOpen(W5,2000,"door",900,2100,0);
 O2=addOpen(W2,2000,"window",1200,1300,900);
 O3=addOpen(W4,1000,"door",900,2100,0);
 ensureShape();
}
const rect=(s,x,y,w,h,m)=>{
 deep(s?{kind:s.kind,x:s.x,y:s.y,w:s.w,h:s.h,layer:s.layer}:null,
  {kind:"rect",x,y,w,h,layer:SLAY},m);
};

/* ═══ الإطار ═══ */
group("cutFrame — محور التوزيع هو خطّ القطع",()=>{
 build();
 const F=cutFrame(A,B,0);
 eq(F.L,8000,"طول الخطّ");
 eq(F.cut,0,"زاويته");
 eq(F.back,0,"لا قلب");
 eq(F.view,270,"وزاوية النظر = زاوية الخطّ − 90");
 ok(Math.abs(F.rt.x-1)<1e-9,"rt.x = 1 — المحور هو الخطّ");
 ok(Math.abs(F.rt.y)<1e-9,"rt.y = 0");
 deep(F.org,[-1000,2000],"المبدأ النقطة الأولى");
 eq(Math.round(uOf(F,[0,2000])),1000,"الأصل يقع عند 1000");
 eq(Math.round(uOf(F,[7000,2000])),8000,"والطرف عند 8000");
 const G=cutFrame(A,B,1);
 eq(G.back,1,"القلب مُعلَن");
 deep(G.org,[7000,2000],"والمبدأ صار الطرف الثاني");
 eq(Math.round(uOf(G,[0,2000])),7000,"فالقراءة معكوسة");
 throws(()=>cutFrame([0,0],[100,0],0),/أقصر|الأقلّ/,
  "خطٌّ أقصر من الحدّ يُرفَض بذكره");
 eq(sectName(0),"مقطع أفقي","التسمية · أفقي");
 eq(sectName(90),"مقطع رأسي","رأسي");
 eq(sectName(30),"مقطع بزاوية 30°","ومائل برقمه");
});

/* ═══ المسافة والوتر ═══ */
group("cutDist — المسافة تُقاس عن الجسم لا عن المسار",()=>{
 build();
 eq(cutDist(W4,A,B),0,"W4 يعبره الخطّ");
 eq(cutDist(W5,A,B),0,"وW5 كذلك");
 eq(cutDist(W2,A,B),0,"وW2");
 eq(Math.round(cutDist(W1,A,B)),1875,"وW1 يبعد 1875 (2000−125)");
 eq(Math.round(cutDist(W3,A,B)),1875,"وW3 مثله");
 eq(cutDist(W1,[1000,50],[5000,50]),0,"خطٌّ داخل الجسم مسافته صفر");
});
group("cutFoot — الوتر من تقاطع الوجهين",()=>{
 build();
 const F=cutFrame(A,B,0);
 const f4=cutFoot(W4,F);
 eq(f4.par,0,"W4 غير موازٍ");
 eq(Math.round(f4.u0),875,"طرفُ وتره الأدنى");
 eq(Math.round(f4.u1),1125,"والأعلى");
 eq(Math.round(f4.skew),250,"وعرضه = سماكته (عمودي)");
 eq(Math.round(f4.ul),1125,"والوجه الأيسر عند 1125");
 eq(Math.round(f4.ur),875,"والأيمن عند 875");
 eq(Math.round(cutFoot(W5,F).skew),150,"وW5 وترُه 150");
 eq(Math.round(sOfCut(W4,F)),2000,"وموضع القطع على مسار W4");
 eq(Math.round(sOfCut(W5,F)),2000,"وعلى W5");
 const D=cutFrame([-1000,1000],[5000,7000],0);
 eq(Math.round(cutFoot(W4,D).skew),354,
  "قطعٌ بـ45° على W4 ⇒ وتر 354 لا 250");
});

/* ═══ المقطع الأساسي ═══ */
group("section — ثلاثة جدران في مواضعها الحقيقية",()=>{
 build();
 const s=section(A,B);
 eq(s.name,"مقطع أفقي","الاسم");
 eq(s.layer,SLAY,"الطبقة");
 eq(s.L,8000,"طول الخطّ");
 eq(s.w,8000,"وعرض المقطع = طوله (موضعٌ حقيقيّ لا فرد)");
 eq(s.h,3000,"والارتفاع من meta.wallH");
 eq(s.unfold,0,"ولا فرد");
 eq(s.n.walls,3,"ثلاثة جدران مقطوعة");
 eq(s.n.opens,2,"وفتحتان");
 eq(s.n.shapes,5,"وخمسة أشكال");
 deep(s.runs.map(r=>r.id),[W4.id,W5.id,W2.id],
  "الترتيب بالموضع: W4 ثم W5 ثم W2");
 rect(s.shapes[0],875,0,250,3000,"جسم W4");
 rect(s.shapes[1],3925,0,150,3000,"جسم W5");
 rect(s.shapes[2],3925,0,150,2100,"O1 تجويفاً كامل السماكة");
 rect(s.shapes[3],6875,0,250,3000,"جسم W2");
 rect(s.shapes[4],6875,900,250,1300,"O2 بجلستها");
 eq(s.shapes[2].role,"open","دور الفتحة");
 eq(s.shapes[2].id,O1.id,"وهويّتها");
 eq(s.shapes[0].role,"wall","ودور الجسم");
 eq(s.runs[0].t,250,"سماكة W4 مُعلَنة");
 eq(s.runs[0].type,"ext","ونوعه");
 eq(s.runs[1].type,"int","والداخليّ يُقطَع كالخارجي");
 eq(s.runs[0].s,2000,"وموضع القطع على مساره");
 eq(s.runs[0].opens,0,"ولا فتحةَ عليه في هذا الموضع");
 eq(s.runs[1].opens,1,"وفتحةٌ على W5");
 eq(s.warn.length,0,"لا ملاحظات");
 deep(s.bbox,{x0:0,y0:0,x1:8000,y1:3000},"الصندوق");
});
group("الفتحة البعيدة عن الخطّ لا تظهر",()=>{
 build();
 const s=section(A,B);
 const ids=s.shapes.map(x=>x.id);
 ok(ids.includes(O1.id),"O1 على الخطّ فتظهر");
 ok(ids.includes(O2.id),"وO2 كذلك");
 ok(!ids.includes(O3.id),
  "وO3 مداها [550,1450] والقطع عند 2000 فلا تظهر");
 eq(s.runs[0].opens,0,"ولا تُعَدّ على جدارها");
});
group("الجدران البعيدة لا تُذكَر ولا تُقطَع",()=>{
 build();
 const q=sectWalls(A,B);
 deep(q.list.map(p=>p.w.id),[W4.id,W5.id,W2.id],"ثلاثةٌ فقط");
 eq(q.miss.length,0,"ولا شيء «قارب ولم يُقطَع»");
 eq(q.tol,CUT,"والنطاق افتراضُه 300");
 /* ═══ إصلاح منطقي: W1/W3 موازيان لخطّ القطع نفسه، فمهما اتّسع
    tol يبقيان في miss (code:"par") لا في list — التوازي يُقصي
    قبل أن تُسأل المسافة رأياً في القبول ═══ */
 eq(sectWalls(A,B,{tol:1000}).list.length,3,
  "وبنطاق 1 م ثلاثةٌ كما كانت");
 eq(sectWalls(A,B,{tol:1000}).miss.length,0,
  "ودون مدىً يبلغ الموازيَين لا مُقارِب");
 const w2000=sectWalls(A,B,{tol:2000});
 eq(w2000.list.length,3,
  "وبنطاق 2 م ثلاثةٌ أيضاً — التوازي لا يُدخلهما مهما اتّسع tol");
 deep(w2000.miss.map(m=>m.id).sort(),[W1.id,W3.id].sort(),
  "لكنّهما يُبلَّغان الآن مُقارِبَين");
});

/* ═══ الموازي والطرف والمدى ═══ */
group("miss — ما قارب الخطَّ ولم يُقطَع يُقال بسببه",()=>{
 build();
 const q=sectWalls([1000,100],[5000,100]);
 deep(q.list.map(p=>p.w.id),[W5.id],"W5 وحده يُقطَع");
 eq(q.miss.length,1,"وواحدٌ قارب ولم يُقطَع");
 eq(q.miss[0].code,"par","والسبب التوازي");
 eq(q.miss[0].id,W1.id,"وهو W1");
 ok(/موازٍ/.test(q.miss[0].msg),"والرسالة تقوله");
 const s=section([1000,100],[5000,100]);
 eq(s.n.walls,1,"والمقطع جدارٌ واحد");
 eq(s.n.miss,1,"والمُقارب مذكورٌ في العدّ");
 ok(s.warn.some(w=>w.code==="par"),"وفي الملاحظات");
});
group("القصّ عند حدّ الخطّ يُعلَن",()=>{
 build();
 const s=section([0,2000],[7000,2000]);
 eq(s.runs[0].id,W4.id,"W4 أوّلاً");
 eq(s.runs[0].clip,1,"وقُصَّ");
 rect(s.shapes[0],0,0,125,3000,"ونصفُه وحده يظهر");
 ok(s.warn.some(w=>w.code==="clip"&&w.id===W4.id),
  "والقصُّ مذكورٌ لا صامت");
 eq(s.runs[1].clip,0,"وW5 لم يُقصَّ");
});
group("خارج مدى الخطّ لا يدخل",()=>{
 build();
 const q=sectWalls([500,2000],[2500,2000]);
 eq(q.list.length,0,"لا جدار يُقطَع");
 eq(q.miss.length,0,"ولا مُقارب");
 throws(()=>sectCmd([500,2000],[2500,2000]),/لا جدار يعبره/,
  "والأمر يُرفَض بسببٍ مذكور");
});

/* ═══ الكوّة ═══ */
group("الكوّة تجويفٌ من وجهها لا عبورٌ للجسم",()=>{
 newState();
 S.meta.wallH=3000;
 const w=addWall([3000,0],[3000,4000],300,"int","c");
 const n=addOpen(w,2000,"niche",600,1200,900,{dep:120,face:"l"});
 ensureShape();
 const s=section(A,B);
 eq(s.n.walls,1,"جدارٌ واحد");
 eq(s.n.opens,1,"وكوّةٌ واحدة");
 rect(s.shapes[0],3850,0,300,3000,"الجسم كامل السماكة");
 eq(s.shapes[1].role,"niche","والكوّة بدورها");
 rect(s.shapes[1],3850,900,120,1200,"تُحفَر 120 من وجهها");
 eq(s.shapes[1].id,n.id,"وهويّتها");
 newState();
 S.meta.wallH=3000;
 const w2=addWall([3000,0],[3000,4000],300,"int","c");
 addOpen(w2,2000,"niche",600,1200,900,{dep:120,face:"r"});
 ensureShape();
 const s2=section(A,B);
 rect(s2.shapes[1],4030,900,120,1200,
  "من الوجه الأيمن ⇒ 4150−120 = 4030");
});

/* ═══ G9-7-11: الكوّة عند حدّ خطّ القطع ═══ */
group("الكوّة عند حدّ الخطّ تُقصّ مع جدارها ولا تتجاوز المجرى",()=>{
 newState();
 S.meta.wallH=3000;
 const w=addWall([3000,0],[3000,4000],300,"int","c");
 addOpen(w,2000,"niche",600,1200,900,{dep:120,face:"l"});
 ensureShape();
 /* الخطّ ينتهي عند 2900: المجرى 2850→2900 (50)، والكوّة عمقها 120 فتُقصّ إلى 50 */
 const s=section([0,2000],[2900,2000]);
 eq(s.runs[0].clip,1,"الجدار قُصَّ عند الحدّ");
 ok(s.warn.some(x=>x.code==="clip"&&x.id===w.id),"والقصّ مُعلَن لا صامت");
 eq(s.shapes.length,2,"جدارٌ وكوّة");
 const n=s.shapes.find(x=>x.role==="niche");
 ok(n&&n.x===2850&&n.w===50,"الكوّة تُقصّ إلى 50 لا 120 (لا تخرج عن المجرى)");
 /* الحدّ بعد عمق الكوّة: تبقى كاملة */
 const s2=section([0,2000],[3000,2000]);
 eq(s2.shapes.find(x=>x.role==="niche").w,120,"وخلف عمقها تبقى كاملة 120");
});

/* ═══ القلب والفرد ═══ */
group("back — النظر من الجهة الأخرى يعكس x",()=>{
 build();
 const s=section(A,B,{back:1});
 eq(s.back,1,"مُعلَن");
 deep(s.runs.map(r=>r.id),[W2.id,W5.id,W4.id],"والترتيب انعكس");
 rect(s.shapes[0],875,0,250,3000,"W2 صار عند 875");
 eq(s.runs[2].x0,6875,"وW4 عند 6875");
 eq(s.w,8000,"والعرض كما هو");
});
group("unfold — الفرد التراكمي حين يُطلَب",()=>{
 build();
 const s=section(A,B,{unfold:1});
 eq(s.unfold,1,"مُعلَن");
 eq(s.runs[0].x0,0,"الأوّل من الصفر");
 eq(s.runs[0].x1,250,"وعرضه سماكته");
 eq(s.runs[1].x0,250,"والثاني يليه بلا فراغ");
 eq(s.runs[1].x1,400,"…");
 eq(s.runs[2].x0,400,"والثالث");
 eq(s.w,650,"والعرض 250+150+250 — لا 8000");
 rect(s.shapes[2],250,0,150,2100,"وO1 تتبع جدارها");
 const g=section(A,B,{unfold:1,gap:500});
 eq(g.runs[1].x0,750,"وgap يفصل الفرود");
 eq(g.w,1650,"بلا فاصلٍ متأخّر");
});

/* ═══ الارتفاع من المصدر نفسه ═══ */
group("الارتفاع — السترة بـw.h والمقطع كالواجهة",()=>{
 newState();
 S.meta.wallH=3000;
 const lw=addWall([3000,0],[3000,4000],200,"low","c",1000);
 ensureShape();
 eq(wallHeight(lw),1000,"السترة ارتفاعُها من w.h");
 const s=section(A,B);
 eq(s.runs[0].h,1000,"والمقطع يقرؤه");
 eq(s.h,1000,"وارتفاع المقطع كذلك");
 rect(s.shapes[0],3900,0,200,1000,"وجسمُها بارتفاعها");
});

/* ═══ لا تتحرّك إلا بأمرك ═══ */
group("sectStale — تقريرٌ لا إعادةُ بناء",()=>{
 build();
 const keep=section(A,B);
 eq(sectStale(keep),false,"قبل التعديل · ليس قديماً");
 touchGeom();
 eq(sectStale(keep),true,"بعده · يُعلَن قديماً");
 eq(keep.shapes.length,5,"والأشكال كما وُلدت");
 rect(keep.shapes[0],875,0,250,3000,"والجسم لم يتبدّل");
 ok(/تبدّل/.test(sectSay(keep)),"والسطر يقوله");
});
group("LAST — في الوحدة لا في S",()=>{
 build();
 clearSect();
 eq(lastSect(),null,"مُفرَّغ");
 ok(/نفّذ SECTION/.test(sectSay()),"والسطر يطلب الأمر");
 const e=buildSect(A,B);
 eq(lastSect(),e,"صار الأخير");
 eq(S.sect,undefined,"ولا حقلَ في الحالة");
 eq(sectPrims(null,0,0).length,5,"وبلا وسيطٍ تُقرأ الأخيرة");
});

/* ═══ الأوّليات ═══ */
group("sectPrims — poly مغلقة بإزاحة",()=>{
 build();
 const t=section(A,B);
 const pr=sectPrims(t,1000,2000);
 eq(pr.length,5,"عددها كعدد الأشكال");
 eq(pr[0].t,"poly","النوع");
 eq(pr[0].L,SLAY,"الطبقة");
 eq(pr[0].cl,1,"مغلقة");
 deep(pr[0].pts[0],[1875,2000],"الرأس الأوّل (875+1000)");
 deep(pr[0].pts[2],[2125,5000],"والمقابل");
});

/* ═══ الطبقة ═══ */
group("A-SECT — في الجدول الحيّ وموضعها",()=>{
 build();
 const l=layOf(SLAY);
 ok(!!l,"الصفّ موجود");
 eq(l.plot,1,"تُطبَع");
 eq(l.d,"المقاطع","الوصف العربي");
 eq(plots(SLAY),true,"plots تقول نعم");
 eq(resolve(SLAY,"plot").css,"#000000","لون الورق");
 const N=layNames();
 eq(N.indexOf(SLAY),N.indexOf("A-ELEV")+1,"بعد A-ELEV");
 eq(N.indexOf("A-AREA"),N.indexOf(SLAY)+1,"وقبل A-AREA");
});
group("normLays — المشروع المحفوظ قبل الإضافة",()=>{
 build();
 S.layers=S.layers.filter(x=>x.n!==SLAY);
 eq(layNames().includes(SLAY),false,"غائبةٌ قبل التطبيع");
 ensureShape();
 eq(layNames().includes(SLAY),true,"أُضيفت تلقائياً");
 eq(layNames().indexOf(SLAY),layNames().indexOf("A-ELEV")+1,
  "في موضعها المصنعي");
});

/* ═══ المشترك ═══ */
group("projectWalls — المشترك يُسقط ولا يقرّر",()=>{
 build();
 const F=viewFrame("S");
 const all=projectWalls(S.walls,F,{ref:extRef()});
 eq(all.length,5,"يُسقط كل جدارٍ سليم — ولا يصفّي بنوع");
 const ext=projectWalls(S.walls,F,{ref:extRef(),
  keep:w=>w.type==="ext"});
 eq(ext.length,4,"وkeep يصفّي قبل الإسقاط");
 deep(ext.map(p=>p.i),[0,1,2,3],
  "وi ترتيبُ المصدر لا ترتيب المُخرَج");
 const p=projectWall(W1,F,extRef(),0);
 eq(p.L,6000,"الطول");
 eq(Math.round(p.n.ang),270,"والناظم الخارجي");
 eq(p.sure,1,"محسوماً");
 eq(p.flip,false,"ولا انعكاس");
 eq(projectWall(W1,F,null,0).sure,0,"وبلا مرجعٍ لا حسم");
});
group("الواجهة لم تتبدّل — حرسُ انحدار",()=>{
 build();
 const e=elevation("S");
 eq(e.n.walls,1,"الجنوبية جدارٌ واحد");
 eq(e.runs[0].id,W1.id,"وهو W1");
 eq(e.runs[0].flip,0,"بلا انعكاس");
 eq(e.w,6000,"وعرضها طولُه");
 eq(e.h,3000,"وارتفاعها");
 const q=elevWalls("S");
 eq(q.view,270,"وelevWalls تُعلن الزاوية");
 eq(q.tol,45,"والتفاوت");
 eq(q.list.length,1,"وقائمتَها");
 /* ═══ إصلاح: كانت القائمة 8 حقول وينقصها "L" — صار 9 مطابقةً
    لِما تُخرجه projectWalls/elevWalls فعلاً ═══ */
 deep(Object.keys(q.list[0]).sort(),
  ["w","i","L","n","off","sure","lat","dep","flip"].sort(),
  "وبحقولها نفسها — لا حقلَ زائدٌ من الاستخراج");
 eq(elevation("E").runs[0].id,W2.id,"والشرقية W2");
 eq(elevation(315).n.walls,2,"و315° جداران");
});

/* ═══ التصدير (io/sect.js) ═══ */
group("sectPage — الصندوق والهامش والاسم",()=>{
 build();
 const e=buildSect(A,B);
 const P=sectPage(e);
 eq(P.prims.length,5,"خمسُ أوّليات");
 deep(P.box,{x0:-200,y0:-200,x1:8200,y1:3200},"صندوقٌ بهامش 200");
 eq(sectPage(e,{pad:0}).box.x1,8000,"وبلا هامشٍ حين يُطلَب");
 eq(P.notes.length,0,"لا ملاحظات والطبقة ظاهرة");
 eq(sectTag(e),"0deg","الرمز زاويةُ الخطّ");
 eq(sectFileName(e,"svg"),"TEST-SECT-0deg.svg","اسم الملفّ");
 eq(sectTag(buildSect(A,B,{back:1})),"0degB","والقلب بـB");
 eq(sectFileName(lastSect(),"dxf"),"TEST-SECT-0degB.dxf","واسمه");
 eq(sectTag(buildSect([0,0],[4000,4000])),"45deg","والمائل 45deg");
 eq(sectFileName(buildSect(A,B),"pdf","A-A"),"TEST-SECT-A-A.pdf",
  "وmark يُكتَب بدلها");
});
group("التصدير — الثلاثة تقرأ الأوّليات نفسها",()=>{
 build();
 const e=buildSect(A,B);
 const svg=sectSVG(e);
 ok(/^<\?xml/.test(svg.txt),"SVG يبدأ بالإعلان");
 eq((svg.txt.match(/<polygon /g)||[]).length,5,"خمسةُ مضلّعات");
 eq(svg.name,"TEST-SECT-0deg.svg","اسمه");
 const dxf=sectDXF(e);
 ok(dxf.bytes instanceof Uint8Array,"DXF بايتات");
 const txt=new TextDecoder("latin1").decode(dxf.bytes);
 ok(txt.includes("\n2\nA-SECT\n"),"والطبقة معلَنةٌ في جدوله");
 ok(/0\nPOLYLINE\n/.test(txt),"وكياناتٌ فيه");
 ok(/ANSI_1256/.test(txt),"وصفحةُ الترميز");
 eq(dxf.bad,0,"ولا محرفَ تعذّر ترميزه");
 const pdf=sectPDF(e);
 ok(pdf.bytes.length>400,"PDF بحجمٍ معقول");
 eq(pdf.arabic,0,"ولا نصّ عربي في المقطع");
});
group("التصدير — الطبقة المخفيّة تُبلَّغ ولا تُصدَّر",()=>{
 build();
 const e=buildSect(A,B);
 toggleOff(SLAY);
 const P=sectPage(e);
 ok(P.notes.some(s=>/مخفيّة/.test(s)),"الملاحظة تُقال");
 eq((sectSVG(e).txt.match(/<polygon /g)||[]).length,0,
  "ولا مضلّع في المخرَج");
 showAll();
 eq((sectSVG(e).txt.match(/<polygon /g)||[]).length,5,
  "وإظهارها يعيدها");
});

/* ═══ الأداة (tools/section.js) ═══ */
group("أداة section — نقطتان ثم تقرير",()=>{
 build();
 const rig=toolRig(R,{});
 rig.defs("section");
 ok(R.begin("section"),"الأداة بدأت");
 eq(R.step().k,"a","الخطوة الأولى نقطة الخطّ الأولى");
 rig.at(A[0],A[1]);
 eq(R.step().k,"b","ثم الثانية");
 rig.at(B[0],B[1]);
 ok(rig.said(/مقطع أفقي/,"ok"),"والحصيلة تُقال");
 ok(rig.said(/W5/,"in"),"وسطرٌ لكل جدارٍ مقطوع");
 eq(rig.errs().length,0,"ولا خطأ");
 eq(lastSect().n.walls,3,"وثلاثة جدران في المقطع");
 ok(R.active(),"والأداة ما زالت فعّالة");
 eq(R.step().k,"a","وعادت إلى الخطوة الأولى");
 rig.esc();
 eq(S.walls.length,5,"والجدران كما كانت");
});
group("mark — يمرّ من الخيار إلى اسم الملفّ",()=>{
 build();
 const rig=toolRig(R,{});
 rig.defs("section");
 R.setOpt("section","fmt","svg");
 R.setOpt("section","save",0);
 R.setOpt("section","mark","B-B");
 R.begin("section");
 rig.at(A[0],A[1]);
 rig.at(B[0],B[1]);
 eq(rig.errs().length,0,"لا خطأ");
 ok(rig.said(/TEST-SECT-B-B\.svg جاهز/,"in"),
  "والرمز في اسم الملفّ لا الزاوية");
 rig.clear();
 R.setOpt("section","mark","A/A");
 rig.at(A[0],A[1]);
 rig.at(B[0],B[1]);
 ok(rig.said(/TEST-SECT-A_A\.svg/,"in"),"«A/A» ⇒ «A_A»");
 rig.clear();
 R.setOpt("section","mark","");
 rig.at(A[0],A[1]);
 rig.at(B[0],B[1]);
 ok(rig.said(/TEST-SECT-0deg\.svg/,"in"),"وبلا رمزٍ تعود الزاوية");
 rig.esc();
 rig.defs("section");
});

process.exit(summary());
