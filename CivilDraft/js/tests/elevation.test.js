/* ═══ اختبار الواجهات ═══
   مبنىً مستطيل بأربعة جدران خارجية وجدارٍ داخليّ وفتحتين.

   المسقط (y‑up · مليمتر · لفٌّ عكس الساعة):
     W1 (0,0)→(6000,0)        جنوبيّ
     W2 (6000,0)→(6000,4000)  شرقيّ
     W3 (6000,4000)→(0,4000)  شماليّ
     W4 (0,4000)→(0,0)        غربيّ
     W5 داخليّ — لا يظهر في أي واجهة
     O1 باب على W1: s=2000 w=900  h=2100 sill=0
     O2 شبّاك على W3: s=1000 w=1200 h=1300 sill=900

   ومركز الثقل الموزون بالأطوال (3000,2000) — به تُحسَم جهة الخارج.
   والمعرّفات تُقرأ من الكائنات العائدة لا تُكتَب حرفياً. */
import {shim,shimCanvas,group,eq,ok,deep,throws,summary}
 from "./harness.js";
shim(); shimCanvas();

const {S,newState,ensureShape,touchGeom}
 =await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addOpen}=await import("../core/opens.js");
const {layNames,layOf,plots,resolve,toggleOff,showAll}
 =await import("../core/layers.js");
const {elevation,elevPrims,elevStale,buildElev,lastElev,clearElev,
 elevSay,elevCmd,viewAngle,viewName,angDiff,extRef,outNormal,
 ELAY,TOL}=await import("../core/elevation.js");
const {elevPage,elevName,elevTag,elevSVG,elevDXF,elevPDF}
 =await import("../io/elev.js");

let W1,W2,W3,W4,W5,O1,O2;
function build(){
 newState();
 S.meta.name="TEST";
 S.meta.scale=100;
 S.meta.wallH=3000;
 W1=addWall([0,0],[6000,0],250,"ext","c");
 W2=addWall([6000,0],[6000,4000],250,"ext","c");
 W3=addWall([6000,4000],[0,4000],250,"ext","c");
 W4=addWall([0,4000],[0,0],250,"ext","c");
 W5=addWall([500,1000],[5500,1000],150,"int","c");
 O1=addOpen(W1,2000,"door",900,2100,0);
 O2=addOpen(W3,1000,"window",1200,1300,900);
 ensureShape();
}
function buildCW(){
 newState();
 S.meta.wallH=3000;
 W1=addWall([6000,0],[0,0],250,"ext","c");
 W2=addWall([0,0],[0,4000],250,"ext","c");
 W3=addWall([0,4000],[6000,4000],250,"ext","c");
 W4=addWall([6000,4000],[6000,0],250,"ext","c");
 O1=addOpen(W1,2000,"door",900,2100,0);
 ensureShape();
}
function buildTall(){
 newState();
 S.meta.wallH=3000;
 W1=addWall([0,0],[6000,0],250,"ext","c");
 W2=addWall([6000,0],[6000,4000],250,"ext","c");
 W3=addWall([6000,4000],[0,4000],250,"ext","c");
 W4=addWall([0,4000],[0,0],250,"ext","c");
 O1=addOpen(W1,3000,"opening",1000,3500,0);
 ensureShape();
}
const rect=(s,x,y,w,h,m)=>{
 deep(s?{kind:s.kind,x:s.x,y:s.y,w:s.w,h:s.h,layer:s.layer}:null,
  {kind:"rect",x,y,w,h,layer:ELAY},m);
};

group("viewAngle — الاتجاه والزاوية",()=>{
 eq(viewAngle("S"),270,"الحرف الصريح");
 eq(viewAngle("s"),270,"حرفٌ صغير");
 eq(viewAngle(" n "),90,"فراغٌ حول الحرف");
 eq(viewAngle("45"),45,"نصٌّ رقميّ");
 eq(viewAngle(45),45,"رقمٌ مباشر");
 eq(viewAngle(-90),270,"زاويةٌ سالبة تُطبَّع");
 eq(viewAngle(720),0,"دورةٌ كاملة تُطبَّع");
 throws(()=>viewAngle("NE"),/اتجاه نظر/,"اتجاهٌ مجهول يُرفَض");
 throws(()=>viewAngle(null),/اتجاه نظر/,"العدم يُرفَض");
 eq(viewName(270),"الواجهة الجنوبية","الاسم من الزاوية");
 eq(viewName(315),"واجهة بزاوية 315°","والزاوية الحرّة برقمها");
 eq(TOL,45,"نصف نطاق القبول");
});
group("angDiff — أقصر فرق",()=>{
 eq(angDiff(350,10),-20,"يعبر الصفر");
 eq(angDiff(10,350),20,"والعكس");
 eq(angDiff(270,270),0,"التساوي");
 eq(angDiff(90,270),-180,"المقابل");
});
group("extRef · outNormal — جهةُ الخارج تُستنتَج ولا تُخزَّن",()=>{
 build();
 const ref=extRef();
 eq(Math.round(ref[0]),3000,"مركز الجدران الخارجية · x");
 eq(Math.round(ref[1]),2000,"مركز الجدران الخارجية · y");
 eq(S.walls.length,5,"والداخليّ لا يُوزَن فيه");
 eq(Math.round(outNormal(W1,ref).n.ang),270,"W1 ناظمه جنوباً");
 eq(Math.round(outNormal(W2,ref).n.ang),0,"W2 شرقاً");
 eq(Math.round(outNormal(W3,ref).n.ang),90,"W3 شمالاً");
 eq(Math.round(outNormal(W4,ref).n.ang),180,"W4 غرباً");
 eq(outNormal(W1,ref).sure,1,"الجهة محسومة");
 eq(outNormal(W1,null).sure,0,"وبلا مرجعٍ لا حسم");
});
group("الجنوبية — جدارٌ واحد وفتحةٌ واحدة",()=>{
 build();
 const s=elevation("S");
 eq(s.name,"الواجهة الجنوبية","الاسم");
 eq(s.layer,ELAY,"الطبقة");
 eq(s.n.walls,1,"عدد الجدران");
 eq(s.n.opens,1,"عدد الفتحات");
 eq(s.n.shapes,2,"عدد الأشكال");
 eq(s.shapes.length,2,"المصفوفة بطولها");
 eq(s.runs[0].id,W1.id,"الجدار المختار");
 eq(s.runs[0].flip,0,"لا انعكاس");
 eq(s.runs[0].x0,0,"بداية الفرد");
 eq(s.runs[0].x1,6000,"نهايته");
 eq(s.runs[0].opens,1,"فتحةٌ واحدة عليه");
 rect(s.shapes[0],0,0,6000,3000,"جسم W1");
 rect(s.shapes[1],1550,0,900,2100,"O1");
 eq(s.shapes[0].role,"wall","دور الجسم");
 eq(s.shapes[1].role,"open","دور الفتحة");
 eq(s.shapes[1].id,O1.id,"هويّة الفتحة");
 eq(s.shapes[1].wall,W1.id,"جدارها");
 eq(s.shapes[1].kindOf,"door","ونوعها");
 eq(s.w,6000,"العرض");
 eq(s.h,3000,"الارتفاع");
 deep(s.bbox,{x0:0,y0:0,x1:6000,y1:3000},"الصندوق");
 eq(s.warn.length,0,"لا ملاحظات");
});
group("الشمالية — الشبّاك بجلسته",()=>{
 build();
 const n=elevation("N");
 eq(n.n.walls,1,"عدد الجدران");
 eq(n.runs[0].id,W3.id,"الجدار المختار");
 eq(n.runs[0].flip,0,"لا انعكاس");
 rect(n.shapes[0],0,0,6000,3000,"جسم W3");
 rect(n.shapes[1],400,900,1200,1300,"O2");
 eq(n.shapes[1].id,O2.id,"هويّة الشبّاك");
 eq(n.h,3000,"الارتفاع — الجدار أعلى من (900+1300)");
 eq(n.warn.length,0,"لا ملاحظات");
});
group("الشرقية والغربية — بلا فتحات",()=>{
 build();
 const e=elevation("E");
 eq(e.n.walls,1,"الشرقية · جدارٌ واحد");
 eq(e.runs[0].id,W2.id,"الشرقية · الجدار المختار");
 eq(e.n.opens,0,"الشرقية · لا فتحات");
 rect(e.shapes[0],0,0,4000,3000,"الشرقية · جسم W2");
 eq(e.w,4000,"الشرقية · العرض");
 const w=elevation("W");
 eq(w.n.walls,1,"الغربية · جدارٌ واحد");
 eq(w.runs[0].id,W4.id,"الغربية · الجدار المختار");
 eq(w.w,4000,"الغربية · العرض");
});
group("الداخليّ لا يدخل واجهةً",()=>{
 build();
 const hit=["S","N","E","W"].some(v=>
  elevation(v).runs.some(r=>r.id===W5.id));
 ok(!hit,"W5 غائبٌ عن الأربع");
 eq(elevation("S").runs.length,1,"ولا يُزاد على الجنوبية");
});
group("315° — فردان بترتيبٍ جانبيّ",()=>{
 build();
 const q=elevation(315);
 eq(q.n.walls,2,"جداران");
 eq(q.runs[0].id,W1.id,"الأوّل W1");
 eq(q.runs[1].id,W2.id,"الثاني W2");
 eq(q.runs[0].off,45,"فرق W1 عن اتجاه النظر");
 eq(q.runs[1].off,45,"وفرق W2");
 eq(q.runs[1].x0,6000,"بداية الفرد الثاني");
 eq(q.runs[1].x1,10000,"نهايته");
 eq(q.w,10000,"عرض الفرد كلّه");
 eq(q.shapes.length,3,"جدارَان وفتحة");
 rect(q.shapes[1],1550,0,900,2100,"O1 بموضعها نفسه");
 rect(q.shapes[2],6000,0,4000,3000,"جسم W2 مفروداً");
 eq(elevation(315,{tol:44}).n.walls,0,"بتفاوت 44° لا جدار يُقبَل");
 eq(elevation(315,{tol:46}).n.walls,2,"وبـ46° هما نفسهما");
});
group("gap — فاصلٌ بين الفرود",()=>{
 build();
 const g=elevation(315,{gap:500});
 eq(g.gap,500,"الفاصل مُعلَن");
 eq(g.runs[0].x1,6000,"نهاية الأوّل");
 eq(g.runs[1].x0,6500,"بداية الثاني");
 eq(g.w,10500,"العرض بلا فاصلٍ متأخّر");
});
group("المسار المعاكس — s تُقاس من الطرف الآخر",()=>{
 buildCW();
 const f=elevation("S");
 eq(f.n.walls,1,"جدارٌ واحد");
 eq(f.runs[0].id,W1.id,"الجدار المختار");
 eq(f.runs[0].flip,1,"الانعكاس مُعلَن");
 rect(f.shapes[0],0,0,6000,3000,"الجسم كما هو");
 rect(f.shapes[1],3550,0,900,2100,"O1 معكوسة");
 eq(elevation("N").runs[0].id,W3.id,"والشمالية تختار W3");
});
group("الفتحة الأعلى من جدارها — تُرسَم وتُذكَر",()=>{
 buildTall();
 const t=elevation("S");
 rect(t.shapes[1],2500,0,1000,3500,"تُرسَم كما هي");
 eq(t.h,3500,"ترفع ارتفاع الواجهة");
 eq(t.warn.length,1,"ملاحظةٌ واحدة");
 eq(t.warn[0].code,"tall","رمزها");
 eq(t.warn[0].id,O1.id,"وهويّة صاحبتها");
});
group("elevStale — تقريرٌ لا إعادةُ بناء",()=>{
 build();
 const keep=elevation("S");
 eq(elevStale(keep),false,"قبل التعديل · ليست قديمة");
 touchGeom();
 eq(elevStale(keep),true,"بعد التعديل · تُعلَن قديمة");
 eq(keep.shapes.length,2,"والأشكال كما وُلدت");
 rect(keep.shapes[0],0,0,6000,3000,"الجسم لم يتبدّل");
 ok(/تبدّل/.test(elevSay(keep)),"والسطر يقول ذلك");
});
group("LAST — آخر واجهةٍ في الوحدة لا في S",()=>{
 build();
 clearElev();
 eq(lastElev(),null,"مُفرَّغة");
 ok(/نفّذ ELEV/.test(elevSay()),"والسطر يطلب الأمر");
 const e=buildElev("E");
 eq(lastElev(),e,"صارت هي الأخيرة");
 eq(S.elev,undefined,"ولا حقلَ في الحالة");
 ok(/الواجهة الشرقية/.test(elevSay()),"والسطر يذكرها");
});
group("elevCmd — لا جدار يواجه",()=>{
 newState();
 throws(()=>elevCmd("S"),/لا جدار خارجيّ/,"الفارغ يُرفَض");
 build();
 const e=elevCmd();
 eq(e.name,"الواجهة الجنوبية","وبلا وسيطٍ: الجنوبية");
});
group("elevPrims — poly مغلقة بإزاحة",()=>{
 build();
 const keep=elevation("S");
 const pr=elevPrims(keep,1000,2000);
 eq(pr.length,2,"عددها كعدد الأشكال");
 eq(pr[0].t,"poly","النوع");
 eq(pr[0].L,ELAY,"الطبقة");
 eq(pr[0].cl,1,"مغلقة");
 eq(pr[0].pts.length,4,"أربعة رؤوس");
 deep(pr[0].pts[0],[1000,2000],"الرأس الأوّل بالإزاحة");
 deep(pr[0].pts[2],[7000,5000],"والرأس المقابل");
 deep(pr[1].pts[0],[2550,2000],"ورأس الفتحة (1550+1000)");
 buildElev("S");
 eq(elevPrims(null,0,0).length,2,"وبلا وسيطٍ تُقرأ الأخيرة");
});
group("A-ELEV — في الجدول الحيّ وموضعها من الترتيب",()=>{
 build();
 const l=layOf(ELAY);
 ok(!!l,"الصفّ موجود");
 eq(l.plot,1,"تُطبَع");
 eq(l.off,0,"ليست مخفيّة");
 eq(l.d,"الواجهات","الوصف العربي");
 eq(plots(ELAY),true,"plots تقول نعم");
 eq(resolve(ELAY,"plot").css,"#000000","لون الورق أسود");
 eq(resolve(ELAY,"dark").css,"#e8eef4","ولون الشاشة الداكنة");
 eq(resolve(ELAY,"plot").aci,7,"ورقم ACI");
 const N=layNames();
 /* A-FURN وA-ELEC دخلتا بين A-FIXT وA-ELEV (طبقتا الأثاث والكهرباء)،
    فالمجاورةُ المباشرةُ لم تبقَ — والمحفوظُ هو الترتيبُ النسبيّ. */
 ok(N.indexOf(ELAY)>N.indexOf("A-FIXT"),"بعد A-FIXT");
 eq(N.indexOf(ELAY),N.indexOf("A-ELEC")+1,"وبعد A-ELEC مباشرةً");
 /* A-SECT صارت تفصل A-ELEV عن A-AREA في ORDER بعد إضافة المقاطع —
    فالمجاورة المباشرة انتقلت إليها، لا إلى A-AREA. */
 eq(N.indexOf("A-SECT"),N.indexOf(ELAY)+1,"وقبل A-SECT مباشرةً");
 ok(N.indexOf("A-AREA")>N.indexOf(ELAY),"وA-AREA بعدها في الترتيب");
});
group("normLays — المشروع المحفوظ قبل الإضافة",()=>{
 build();
 S.layers=S.layers.filter(x=>x.n!==ELAY);
 eq(layNames().includes(ELAY),false,"غائبةٌ قبل التطبيع");
 ensureShape();
 eq(layNames().includes(ELAY),true,"أُضيفت تلقائياً");
 const N=layNames();
 eq(N.indexOf(ELAY),N.indexOf("A-ELEC")+1,"في موضعها المصنعي");
 eq(layOf(ELAY).plot,1,"وبحالتها المصنعية");
 toggleOff("A-DIMS");
 ensureShape();
 eq(layOf("A-DIMS").off,1,"وإخفاءُ المستخدم باقٍ");
 showAll();
});
group("elevPage — الصندوق والهامش والاسم",()=>{
 build();
 const e=buildElev("S");
 const P=elevPage(e);
 eq(P.prims.length,2,"أوّليتان");
 deep(P.box,{x0:-200,y0:-200,x1:6200,y1:3200},"صندوقٌ بهامش 200");
 eq(elevPage(e,{pad:0}).box.x1,6000,"وبلا هامشٍ حين يُطلَب");
 eq(P.notes.length,0,"لا ملاحظات والطبقة ظاهرة");
 eq(elevTag(e),"S","رمز الاتجاه");
 eq(elevName(e,"svg"),"TEST-ELEV-S.svg","اسم الملفّ");
 eq(elevName(buildElev(315),"dxf"),"TEST-ELEV-315deg.dxf",
  "والزاوية الحرّة برقمها");
});
group("التصدير — الثلاثة تقرأ الأوّليات نفسها",()=>{
 build();
 const e=buildElev("S");
 const svg=elevSVG(e);
 ok(/^<\?xml/.test(svg.txt),"SVG يبدأ بالإعلان");
 eq((svg.txt.match(/<polygon /g)||[]).length,2,"مضلّعان لا أكثر");
 eq(svg.name,"TEST-ELEV-S.svg","اسمه");
 const dxf=elevDXF(e);
 ok(dxf.bytes instanceof Uint8Array,"DXF بايتات");
 const txt=new TextDecoder("latin1").decode(dxf.bytes);
 ok(txt.includes("\n2\nA-ELEV\n"),"والطبقة معلَنةٌ في جدوله");
 ok(/0\nPOLYLINE\n/.test(txt),"وكياناتٌ فيه");
 ok(/ANSI_1256/.test(txt),"وصفحةُ الترميز");
 eq(dxf.bad,0,"ولا محرفَ تعذّر ترميزه");
 const pdf=elevPDF(e);
 ok(pdf.bytes.length>400,"PDF بحجمٍ معقول");
 eq(pdf.arabic,0,"ولا نصّ عربي في الواجهة");
});
group("التصدير — الطبقة المخفيّة تُبلَّغ ولا تُصدَّر",()=>{
 build();
 const e=buildElev("S");
 toggleOff(ELAY);
 const P=elevPage(e);
 ok(P.notes.some(s=>/مخفيّة/.test(s)),"الملاحظة تُقال");
 const svg=elevSVG(e);
 eq((svg.txt.match(/<polygon /g)||[]).length,0,
  "ولا مضلّع في المخرَج");
 showAll();
 eq((elevSVG(e).txt.match(/<polygon /g)||[]).length,2,
  "وإظهارها يعيدهما");
});

process.exit(summary());
