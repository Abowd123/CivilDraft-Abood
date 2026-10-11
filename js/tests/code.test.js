/* ═══ ٣٫٤ — لوحة تحرير اشتراطات الكود ═══
   القيَم كانت «إرشاديةٌ تُعدَّل» بلا مدخل تعديل، وsaveCode بلا مستدعٍ.
   هذا الملفّ يغطّي ثلاث طبقات:
     ١ · النواة: setCodeVal تتحقّق وتحفظ وتحوّل الوحدات، وloadCode
         تحرس من ملفٍّ فاسد، وresetCode تعيد المصنع.
     ٢ · الأثر: تعديلُ حدٍّ يغيّر ما يُبلِّغه codeCheck فعلاً.
     ٣ · الواجهة (شِبه DOM): الحقول تُبنى من CODE_FIELDS، والتعديلُ
         يُكتَب والرفضُ يُبلَّغ ويعيد الحقل إلى قيمته.

   التشغيل:  node js/tests/code.test.js                            */
import {shim,shimCanvas,shimDOM,fire,setVal,group,ok,eq,near,summary}
 from "./harness.js";
shim();
shimCanvas();
const doc=shimDOM();
/* inspector.js يستورد canvas.js الذي يطلب #cv عند التحميل: قماشٌ من
   shimCanvas في #stage كما تفعل ui.js */
doc.body.innerHTML=`<div id="stage"></div>`;
(()=>{
 const cv=doc.createElement("canvas");
 cv.setAttribute("id","cv");
 doc.getElementById("stage").appendChild(cv);
 const g=doc.getElementById.bind(doc);
 doc.getElementById=id=>(id==="cv")?cv:g(id);
})();

const {S,newState,ensureShape}=await import("../core/state.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const C=await import("../core/code.js");
const {HOOK}=await import("../ui/bus.js");
const INS=await import("../ui/inspector.js");

const LSK="civildraft.code";
const stored=()=>JSON.parse(localStorage.getItem(LSK)||"null");

group("النواة: setCodeVal تحوّل الوحدات وتحفظ",()=>{
 C.resetCode();
 localStorage.removeItem(LSK);
 let r=C.setCodeVal("doorW",0.9);
 ok(r.ok,"قيمةٌ في المدى تُقبَل");
 eq(C.CODE.doorW,900,"المتر يصير مليمتراً في الحالة");
 eq(stored().doorW,900,"وتُحفَظ فوراً في التخزين المحلّي (saveCode متّصلة)");
 r=C.setCodeVal("roomMin",8);
 eq(C.CODE.roomMin,8e6,"والمتر المربّع يصير مليمتراً مربّعاً");
 r=C.setCodeVal("light",12.5);
 near(C.CODE.light,0.125,1e-9,"والنسبة المئوية تصير كسراً");
 eq(C.codeShown("doorW"),0.9,"والعرض يعود بالوحدة المقروءة بلا ذيل كسري");
 eq(C.codeShown("light"),12.5,"وكذلك النسبة");
 r=C.setCodeVal("doorWet","٠٫٧٥");
 ok(r.ok&&C.CODE.doorWet===750,"والأرقام العربية والفاصلة ٫ تُقرأ");
 r=C.setCodeVal("doorH","1,9");
 ok(r.ok&&C.CODE.doorH===1900,"والفاصلة اللاتينية كذلك");
});

group("النواة: الرفض لا يكتب شيئاً",()=>{
 C.resetCode();
 const before=JSON.stringify(C.CODE);
 [["doorW",80,"خارج المدى (مليمتر بدل متر)"],
  ["doorW",-1,"سالب"],
  ["doorW","abc","نصّ"],
  ["doorW",NaN,"NaN"],
  ["light",0,"نسبةٌ صفر"],
  ["ceilH",10,"ارتفاعٌ فوق الحدّ"]].forEach(([k,v,why])=>{
  const r=C.setCodeVal(k,v);
  ok(!r.ok&&typeof r.msg==="string"&&r.msg.length>0,`يُرفَض ${why} برسالة`);
 });
 eq(JSON.stringify(C.CODE),before,"والحالة لم تتغيّر حرفاً");
 ok(!C.setCodeVal("nope",1).ok,"وحقلٌ غير معروف يُرفَض");
 ok(/0\.5.*2\.5|2\.5.*0\.5/.test(C.setCodeVal("doorW",99).msg),
  "ورسالة الرفض تذكر المدى المعقول");
});

group("النواة: loadCode تحرس من ملفٍّ فاسد",()=>{
 C.resetCode();
 localStorage.setItem(LSK,JSON.stringify({
  doorW:-5, doorH:"2100", corrW:NaN, ceilH:99999, roomMin:7e6,
  light:0.2, on:0, hack:1}));
 C.loadCode();
 eq(C.CODE.doorW,C.CODE_DEF.doorW,"سالبٌ يُتجاهَل فيبقى الافتراضي");
 eq(C.CODE.doorH,C.CODE_DEF.doorH,"ونصٌّ يُتجاهَل");
 eq(C.CODE.ceilH,C.CODE_DEF.ceilH,"وخارجُ المدى يُتجاهَل");
 eq(C.CODE.roomMin,7e6,"والصالح يُقرأ");
 near(C.CODE.light,0.2,1e-9,"وكسر النسبة الصالح يُقرأ");
 eq(C.CODE.on,0,"ومفتاح on يقبل ٠ و١");
 ok(!("hack" in C.CODE),"ولا يدخل مفتاحٌ غريب");
 C.setCodeOn(true);
 eq(C.CODE.on,1,"setCodeOn تُشغّل");
 eq(stored().on,1,"وتحفظ");
});

group("النواة: saveCode صريحة وقابلة للنداء المباشر",()=>{
 C.resetCode();
 C.CODE.doorW=1100;
 C.saveCode();
 eq(stored().doorW,1100,"saveCode تكتب الحالة الجارية كما هي");
 C.resetCode();
});

group("النواة: resetCode وcodeChanged",()=>{
 C.resetCode();
 eq(C.codeChanged().length,0,"بعد المصنع لا فرق");
 C.setCodeVal("doorW",1.0);
 C.setCodeVal("corrW",1.2);
 eq(C.codeChanged().join(","),"doorW,corrW","والمعدَّل يُسمّى");
 C.resetCode();
 eq(C.CODE.doorW,C.CODE_DEF.doorW,"والمصنع يعود");
 eq(stored().doorW,C.CODE_DEF.doorW,"ويُحفَظ المصنع لا القيمة القديمة");
 ok(Object.isFrozen(C.CODE_DEF),"ونسخة المصنع مجمَّدة");
 eq(C.CODE_FIELDS.length,18,"ثمانيةَ عشرَ حقلاً قابلاً للتعديل — سبعةٌ منها للدرج (P-تحسين)");
 ok(C.CODE_FIELDS.every(d=>d.k in C.CODE_DEF),
  "وكلُّ حقلٍ يقابل مفتاحاً في CODE");
 ok(C.CODE_FIELDS.every(d=>{
  const v=C.CODE_DEF[d.k]*d.f;
  return v>=d.min&&v<=d.max;
 }),"وكلّ قيمةٍ افتراضية داخل مدى حقلها — وإلا رُفض المصنع نفسه");
});

group("الأثر: تعديل الحدّ يغيّر ما يبلّغه الفاحص",()=>{
 newState(); ensureShape(); C.resetCode();
 const P=[[0,0],[6000,0],[6000,4000],[0,4000]];
 for(let i=0;i<4;i++)W.addWall(P[i],P[(i+1)%4],250,"ext","c");
 const w=S.walls[0];
 O.addOpen(w,3000,"door",850,2100,0);
 const has=()=>C.codeCheck().some(f=>f.code==="c-dw");
 ok(has(),"باب ٨٥٠ على جدارٍ خارجي دون الحدّ ٩٠٠ فيُنبَّه");
 C.setCodeVal("doorExt",0.8);
 ok(!has(),"وبعد خفض الحدّ إلى ٠٫٨٠ يزول التنبيه");
 C.setCodeVal("doorExt",0.9);
 ok(has(),"وبعد رفعه يعود");
 C.setCodeOn(false);
 ok(!has(),"وإطفاء الفحص يُسكته كلّه");
 C.resetCode();
});

group("الواجهة: الحقول تُبنى وتُعدَّل وتُرفَض",()=>{
 C.resetCode();
 doc.body.innerHTML=`<div id="codeF"></div>`
  +`<input type="checkbox" id="codeOn"><button id="codeRst"></button>`
  +`<p id="codeInfo"></p>`;
 const reports=[];
 HOOK.report=(k,m)=>reports.push([k,m]);
 INS.wireCodeBox();
 const $=s=>doc.querySelector(s);
 /* الحقول تُبنى ديناميكياً من CODE_FIELDS، فتُصاب بسمة data-cf لا بمعرّفٍ ثابت */
 const cf=k=>doc.querySelector(`[data-cf="${k}"]`);
 eq(doc.querySelectorAll("[data-cf]").length,18,"ثمانيةَ عشرَ حقلاً في اللوحة");
 eq(cf("doorW").value,"0.8","حقل الباب يعرض المتر لا المليمتر");
 eq(cf("roomMin").value,"6","والمساحة بالمتر المربّع");
 eq(cf("light").value,"10","والإضاءة بالمئة");
 ok($("#codeOn").checked,"ومفتاح التشغيل يعكس الحالة");
 ok(/الافتراضية/.test($("#codeInfo").textContent),"والتلميح يقول إنها افتراضية");

 setVal(cf("doorW"),"0.95");
 eq(C.CODE.doorW,950,"التعديل يصل إلى CODE");
 eq(stored().doorW,950,"ويُحفَظ");
 ok(/1 قيمة/.test($("#codeInfo").textContent),"والتلميح يعدّ المعدَّل");

 setVal(cf("doorW"),"95");
 eq(C.CODE.doorW,950,"والقيمة المرفوضة لا تُكتَب");
 eq(cf("doorW").value,"0.95","والحقل يعود إلى قيمته");
 eq(reports[reports.length-1][0],"er","والرفض يُبلَّغ خطأً");
 ok(/المدى/.test(reports[reports.length-1][1]),"وبسببه");

 setVal($("#codeOn"),false);
 eq(C.CODE.on,0,"إطفاء المفتاح يصل إلى CODE");

 $("#codeRst").click();
 eq(C.CODE.doorW,C.CODE_DEF.doorW,"وزرّ الاستعادة يعيد المصنع");
 eq(cf("doorW").value,"0.8","والحقول تُعاد رسمها");
 ok($("#codeOn").checked,"والمفتاح يعود مشغَّلاً");
});
process.exit(summary()?1:0);
