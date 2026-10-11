/* ═══ اختبار 2.2: لا إسقاطَ صامت إلى الصفر ═══
   PT الصارمة وparsePt: كلُّ فشلٍ يُرفَض بسببٍ مكتوب، ولا خطأَ
   يصير (0,0)، ولا NaN/Infinity/خارج الحدّ تمرّ.                   */
import {shim,group,ok,eq,deep,throws,summary} from "./harness.js";
shim();
const {PT,needPT,parsePt,PE}=await import("../core/coords.js");
const U=await import("../core/units.js");
const {LIM}=await import("../core/limits.js");

group("PT — النقطة الكاملة تمرّ",()=>{
 deep(PT([100,200]),[100,200],"نقطةٌ صحيحة");
 deep(PT([100.4,200.6]),[100,201],"تقريبٌ إلى مليمتر");
 deep(PT([0,0]),[0,0],"الأصلُ الحقيقيّ صالح");
 deep(PT([1,2,3]),[1,2],"العنصر الزائد يُهمَل");
 deep(PT([LIM.coord.max,-LIM.coord.max]),[1e9,-1e9],"على الحدّ تماماً");
});
group("PT — ما ليس نقطةً يعيد null لا [0,0]",()=>{
 [null,undefined,[],[1],["a","b"],["3","4"],[NaN,0],[0,NaN],[NaN,NaN],
  [Infinity,0],[0,-Infinity],[1e10,0],[0,-1e10],[LIM.coord.max+1,0],
  {},"3,4",7,[null,null],[undefined,5]].forEach((v,i)=>
  eq(PT(v),null,`مدخل ${i}: ${JSON.stringify(v)} ⇒ null`));
});
group("needPT — الرفض برسالةٍ تسمّي الموضع",()=>{
 deep(needPT([5,6]),[5,6],"نقطةٌ صحيحة تمرّ");
 throws(()=>needPT(null),/غير صالحة/,"null يرمي");
 throws(()=>needPT([NaN,0]),/غير صالحة/,"NaN يرمي");
 throws(()=>needPT([1e10,0],"عمود C1"),/عمود C1/,"ويذكر ما طُلب");
});
group("parsePt — الصيغ الصحيحة",()=>{
 deep(parsePt("3,4",null,null),{k:"pt",p:[3000,4000]},"مطلق");
 deep(parsePt("0,0",null,null),{k:"pt",p:[0,0]},"الأصل");
 deep(parsePt("@5,3",[1000,1000],null),{k:"pt",p:[6000,4000]},"نسبيّ");
 deep(parsePt("5<90",null,null),{k:"pt",p:[0,5000]},"قطبيّ");
 deep(parsePt("50cm,200mm",null,null),{k:"pt",p:[500,200]},"وحدات للرقمين");
 deep(parsePt("٣,٤",null,null),{k:"pt",p:[3000,4000]},"أرقام عربية");
 deep(parsePt("5",null,null),{k:"len",L:5000},"مسافة بلا أساس");
 deep(parsePt("5",[0,0],[1,0]),{k:"pt",p:[5000,0],dde:1},"مسافةٌ باتجاه");
 deep(parsePt("<30",[0,0],null),{k:"ang",a:30},"قفل زاوية");
 deep(parsePt("9x14",null,null),{k:"dim",w:9000,d:14000},"مقاس");
});
group("parsePt — الرفض بسببٍ مكتوب",()=>{
 const c=(s,b,d)=>{const r=parsePt(s,b,d); return r&&r.c};
 eq(c("",null,null),"EMPTY","فراغ");
 eq(c("@5,3",null,null),"BASE_MISSING","@ بلا أساس");
 eq(c("@5,3",[NaN,NaN],null),"BAD_BASE","أساسٌ فاسد");
 eq(c("5",[0,0],null),"NO_DIR","مسافةٌ بلا اتجاه");
 eq(c("999999999999,0",null,null),"OUT_OF_RANGE","X خارج الحدّ");
 eq(c("0,999999999999",null,null),"OUT_OF_RANGE","Y خارج الحدّ");
 eq(c("999999999999<0",null,null),"OUT_OF_RANGE","طولٌ قطبيّ خارج الحدّ");
 eq(c("999999999999x4",null,null),"OUT_OF_RANGE","مقاسٌ خارج الحدّ");
 eq(c("@999999,0",[900000000,0],null),"OUT_OF_RANGE",
  "نسبيٌّ يتجاوز الحدّ بعد الجمع");
 ok(typeof PE.EMPTY==="string"&&PE.OUT_OF_RANGE,"PE يحمل الرسائل");
 const r=parsePt("@5,3",null,null);
 ok(/نقطة أساس/.test(r.m),"والرسالة مكتوبة");
});
group("parsePt — null لما لا صيغةَ له (قرارُ المستدعي)",()=>{
 ["abc","سلام","3e5,0","5,","3,4,5","w7"].forEach(s=>
  eq(parsePt(s,null,null),null,`«${s}» ⇒ null (قد يكون اسمَ أداة)`));
});
group("parsePt — X وY معاً (جوهر 2.2)",()=>{
 /* كان الفاشل منهما يُسقَط صفراً ويُكتَب الآخر */
 const r=parsePt("999999999999,4000",null,null);
 ok(r&&r.k==="err","X فاسد + Y صحيح ⇒ رفضٌ لا [0,4000]");
 const r2=parsePt("3000,999999999999",null,null);
 ok(r2&&r2.k==="err","X صحيح + Y فاسد ⇒ رفضٌ لا [3000,0]");
 ["abc","","@5,3","999999999999,0","0,999999999999","3e5,0","5,",
  "1e400,0","3,4,5"].forEach(s=>{
  const q=parsePt(s,null,null);
  ok(!(q&&q.k==="pt"&&q.p[0]===0&&q.p[1]===0),`«${s}» لم تُنتج (0,0) صامتة`);
 });
});
group("M مقابل Mx — العقد",()=>{
 eq(U.M("سماكة"),0,"M المتساهل يعيد صفراً (عقد الإدخال الحيّ)");
 eq(U.M(""),0,"وM الفارغ صفر");
 eq(U.Mx("سماكة"),null,"Mx يرفض");
 eq(U.Mx(""),null,"وMx الفارغ مرفوض");
 eq(U.Mx(NaN),null,"Mx يرفض NaN");
 eq(U.Mx(Infinity),null,"Mx يرفض Infinity");
});
process.exit(summary()?1:0);
