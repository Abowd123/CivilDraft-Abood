/* ═══ المراجعة #5 — ربط core/cols.js وfixt.js وstairs.js بـBOQ ═══
   كانت core/boq.js تحسب المناطق والفتحات والجدران فقط رغم أن
   الأعمدة والأدوات الصحية والدرج بياناتٌ جاهزة ومستعملة في الرسم
   والتعديل والفاحص — فمشروعٌ كلُّه أعمدة كان BOQ يقول عنه «فارغ».
   وcore/pricing.js كان يحمل بند "column" بسعرٍ افتراضيّ (250) منذ
   البداية بلا أيّ عنصرٍ يغذّيه أصلاً — سعرٌ ميتٌ. */
import {shim,group,ok,eq,near,summary} from "./harness.js";
shim();

const {S,newState,ensureShape}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addCol}=await import("../core/cols.js");
const {addFix}=await import("../core/fixt.js");
const {addStair}=await import("../core/stairs.js");
const {boq,boqLine,colRows,fixRows,stairRows}
 =await import("../core/boq.js");
const {toCSV,noteOf}=await import("../io/boq.js");
const {setLay}=await import("../core/layers.js");
const {price,getRate}=await import("../core/pricing.js");

function build(){
 newState();
 S.meta.name="T"; S.meta.wallH=3000;
 addCol("rect",[500,500],300,300,0,"conc");
 addCol("rect",[1500,500],300,300,0,"conc");
 addCol("circ",[2500,500],400,0,0,"steel");
 addFix("wc",[0,0],0);
 addFix("lav",[0,0],0);
 /* رُتِّبت القياسات لتقع داخل المدى المريح: n=17 · H=3000 ⇒
    قائمةٌ ≈176.5مم (ضمن [150,200])؛ L=4200 ⇒ نائمةٌ 262.5مم
    (فوق 250) وقاعدة 2ق+ن ≈615.4مم (ضمن [580,650]). */
 addStair([0,0],[4200,0],1200,17);      /* درجٌ سليم القياسات */
 ensureShape();
}

group("colRows — تجميعٌ بالنوع والمادّة معاً",()=>{
 build();
 const C=colRows();
 eq(C.n,3,"ثلاثة أعمدة");
 eq(C.rows.length,2,"صفّان: مستطيل·خرسانة ودائري·حديد");
 const rc=C.rows.find(r=>r.kind==="rect");
 eq(rc.n,2,"عمودان مستطيلان");
 const cc=C.rows.find(r=>r.kind==="circ");
 eq(cc.n,1,"عمودٌ دائريٌّ واحد");
});

group("fixRows — تجميعٌ بالنوع وحده",()=>{
 build();
 const F=fixRows();
 eq(F.n,2,"أداتان");
 eq(F.rows.length,2,"نوعان: كرسي ومغسلة");
});

group("stairRows — قلعةٌ واحدة سليمة",()=>{
 build();
 const T=stairRows();
 eq(T.n,1,"درجٌ واحد");
 eq(T.bad,0,"سليمٌ (17 قائمة لارتفاع 3م ≈ 176مم قائمة)");
 near(T.len,4200,1,"طول القِلعة");
});

group("boq — الحقول الثلاثة الجديدة حاضرة",()=>{
 build();
 const B=boq();
 eq(B.cols.n,3); eq(B.fixt.n,2); eq(B.stairs.n,1);
});

group("boqLine — يذكر الأعمدة والأدوات والدرج",()=>{
 build();
 const s=boqLine(boq());
 ok(/3 عموداً/.test(s),"عدد الأعمدة");
 ok(/2 أداة/.test(s),"عدد الأدوات");
 ok(/1 درجاً/.test(s),"عدد الدرج");
});

group("مشروعٌ كلُّه أعمدة — BOQ لا يقول «فارغ»",()=>{
 newState(); S.meta.name="X";
 addCol("rect",[0,0],300,300,0,"conc");
 ensureShape();
 const B=boq();
 eq(B.walls.n,0); eq(B.opens.total,0); eq(B.areas.n,0);
 eq(B.cols.n,1,"العمود موجودٌ رغم غياب كلّ شيءٍ آخر");
 ok(!noteOf(B).some(s=>/^المشروع فارغ$/.test(s)),
  "لا رسالة «فارغ» كاذبة — العمود موجود");
});

group("نطاق BOQ — طبقة الأعمدة المخفيّة تُستبعَد وتُبلَّغ",()=>{
 build();
 setLay("A-COLS","off",1);
 const C=colRows();
 eq(C.n,0,"لا عمود داخل النطاق"); eq(C.hidden,3,"ثلاثةٌ مخفيّة");
 const N=noteOf(boq());
 ok(N.some(s=>/مخفيّة/.test(s)&&/3 عنصر/.test(s)),
  "الملاحظة تذكر العدد");
});

group("toCSV — قسم الأعمدة/الأدوات/الدرج يظهر حين توجد",()=>{
 build();
 const C=toCSV(boq());
 ok(/الأعمدة/.test(C.txt),"عنوان قسم الأعمدة");
 ok(/الأدوات الصحية والمطبخية/.test(C.txt),"عنوان قسم الأدوات");
 ok(/الدرج/.test(C.txt),"عنوان قسم الدرج");
});

group("toCSV — لا قسم فارغ حين لا عمود ولا أداة ولا درج",()=>{
 newState(); S.meta.name="Y";
 addWall([0,0],[1000,0],200,"ext","c");
 ensureShape();
 const C=toCSV(boq());
 ok(!/الأدوات الصحية والمطبخية/.test(C.txt),
  "لا قسم أدواتٍ فارغ يُقحَم في مشروعٍ بلا أدوات");
});

group("التسعير — بند column لم يعد ميتاً (المراجعة #5)",()=>{
 build();
 const B=boq();
 eq(getRate("column"),250,"السعر الافتراضي كما كان دائماً");
 const items=[{key:"column",qty:B.cols.n}];
 const P=price(items);
 eq(P.subtotal,3*250,"3 أعمدة × 250 — أول استهلاكٍ فعليّ لهذا البند");
});

group("التسعير — fixture وstair بندان جديدان بسعرٍ افتراضيٍّ صفر",()=>{
 eq(getRate("fixture"),0);
 eq(getRate("stair"),0);
});

process.exit(summary());
