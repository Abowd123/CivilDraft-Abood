/* ═══ اختبار 2.1: المحلّل الموحَّد ═══
   أرقام · أطوال · زوايا · نقاط · منطقيّ — بصيغ الإدخال العربية
   والفارسية وكلّ حالات الرفض وأكوادها.                            */
import {shim,group,ok,eq,deep,throws,summary} from "./harness.js";
shim();
const {ParseError,parseNumber,parseLength,parseAngle,parsePoint,parseBool}=
 await import("../core/parse.js");
const {LIM}=await import("../core/limits.js");
const code=fn=>{try{fn();return null}catch(e){return e.code||("?"+e.message)}};

group("parseNumber — القبول",()=>{
 eq(parseNumber("42"),42,"صحيح");
 eq(parseNumber("3.14"),3.14,"عشريّ");
 eq(parseNumber("-5"),-5,"سالب");
 eq(parseNumber("٤٢"),42,"عربيّ");
 eq(parseNumber("۴۲"),42,"فارسيّ");
 eq(parseNumber("٣٫٥"),3.5,"فاصلة عشرية عربية ٫");
 eq(parseNumber("1,5"),1.5,"فاصلة لاتينية");
 eq(parseNumber("3،5"),3.5,"فاصلة عربية ،");
 eq(parseNumber(7),7,"رقمٌ أصليّ");
 eq(parseNumber("",{def:9}),9,"الافتراضيّ للفارغ");
 eq(parseNumber("  ",{def:9}),9,"والافتراضيّ للبياض");
 eq(parseNumber("5",{lim:{min:0,max:10}}),5,"داخل الحدّ");
});
group("parseNumber — الرفض بسببٍ مكتوب",()=>{
 eq(code(()=>parseNumber("abc")),"NOT_A_NUMBER","نصّ");
 eq(code(()=>parseNumber("3m")),"NOT_A_NUMBER","وحدةٌ في رقم");
 eq(code(()=>parseNumber("")),"EMPTY","فراغ");
 eq(code(()=>parseNumber(null)),"EMPTY","null");
 eq(code(()=>parseNumber(undefined)),"EMPTY","undefined");
 eq(code(()=>parseNumber(NaN)),"NOT_FINITE","NaN");
 eq(code(()=>parseNumber(Infinity)),"NOT_FINITE","Infinity");
 eq(code(()=>parseNumber("-1",{lim:{min:0}})),"OUT_OF_RANGE","تحت الحدّ");
 eq(code(()=>parseNumber("99",{lim:{max:10}})),"OUT_OF_RANGE","فوق الحدّ");
 throws(()=>parseNumber("abc"),/ليس رقماً/,"والرسالةُ تسمّي القيمة");
});
group("parseLength — الأطوال (مم)",()=>{
 eq(parseLength("3"),3000,"3 ⇒ متر");
 eq(parseLength("3m"),3000,"3m");
 eq(parseLength("300cm"),3000,"300cm");
 eq(parseLength("3000mm"),3000,"3000mm");
 eq(parseLength("٣"),3000,"عربيّ");
 eq(parseLength("2٫5"),2500,"٢٫٥");
 eq(parseLength(3),3000,"رقمٌ = متر");
 eq(parseLength("",{def:1}),1,"افتراضيّ");
 eq(parseLength("100mm",{lim:LIM.thickness}),100,"سماكةٌ صالحة");
});
group("parseLength — الرفض",()=>{
 eq(code(()=>parseLength("abc")),"NOT_A_LENGTH","نصّ");
 eq(code(()=>parseLength("1e99")),"NOT_A_LENGTH","أسّ");
 eq(code(()=>parseLength("")),"EMPTY","فراغ");
 eq(code(()=>parseLength("5000000")),"NOT_A_LENGTH","فوق سقف الإحداثيّ (Mx)");
 eq(code(()=>parseLength("0",{lim:LIM.thickness})),"OUT_OF_RANGE","سماكة 0");
 eq(code(()=>parseLength("20",{lim:LIM.thickness})),"OUT_OF_RANGE","سماكة 20 م");
});
group("parseAngle",()=>{
 eq(parseAngle("45"),45,"45");
 eq(parseAngle("-90"),270,"لفٌّ سالب");
 eq(parseAngle("450"),90,"لفّ 450");
 eq(parseAngle("٤٥"),45,"عربيّ");
 eq(parseAngle("45°"),45,"رمز الدرجة");
 eq(parseAngle("-90",{wrap:false}),-90,"بلا لفّ");
 eq(code(()=>parseAngle("abc")),"NOT_A_NUMBER","نصّ");
 eq(code(()=>parseAngle("")),"EMPTY","فراغ");
});
group("parsePoint — الصيغ",()=>{
 deep(parsePoint("3,4"),[3000,4000],"مطلق");
 deep(parsePoint("-1,-2"),[-1000,-2000],"سالب");
 deep(parsePoint("@5,3",[1000,1000]),[6000,4000],"نسبيّ");
 deep(parsePoint("5<90"),[0,5000],"قطبيّ");
 deep(parsePoint("@5<0",[1000,1000]),[6000,1000],"قطبيّ نسبيّ");
 deep(parsePoint("50cm,200mm"),[500,200],"وحدات");
 deep(parsePoint("٣,٤"),[3000,4000],"أرقام عربية");
 deep(parsePoint("5",[0,0],[1,0]),[5000,0],"مسافةٌ بالاتجاه");
});
group("parsePoint — الرفض بسببٍ مكتوب",()=>{
 eq(code(()=>parsePoint("")),"EMPTY","فراغ");
 eq(code(()=>parsePoint("abc")),"NOT_A_POINT","لا صيغة");
 eq(code(()=>parsePoint("@5,3")),"BASE_MISSING","@ بلا أساس");
 eq(code(()=>parsePoint("@5,3",[NaN,0])),"BAD_BASE","أساسٌ فاسد");
 eq(code(()=>parsePoint("5",[0,0])),"NO_DIR","مسافةٌ بلا اتجاه");
 eq(code(()=>parsePoint("999999999999,0")),"OUT_OF_RANGE","X خارج الحدّ");
 eq(code(()=>parsePoint("0,999999999999")),"OUT_OF_RANGE","Y خارج الحدّ");
 eq(code(()=>parsePoint("3x4")),"DIMENSION","مقاسٌ ليس نقطة");
 eq(code(()=>parsePoint("<45")),"ANGLE_LOCK","قفل زاوية");
 eq(code(()=>parsePoint("5")),"LENGTH_ONLY","طولٌ بلا اتجاه");
 throws(()=>parsePoint("@5,3"),/نقطة أساس/,"ورسالةُ BASE_MISSING مقروءة");
});
group("parseBool",()=>{
 [["true",1],["نعم",1],["صحيح",1],["1",1],["on",1],[true,1],
  ["false",0],["لا",0],["0",0],["off",0],[false,0]].forEach(([v,e])=>
  eq(parseBool(v),!!e,`«${v}»`));
 eq(code(()=>parseBool("xyz")),"NOT_A_BOOL","نصّ غير منطقيّ");
 eq(code(()=>parseBool("")),"EMPTY","فراغ");
});
group("ParseError — البنية",()=>{
 try{parseNumber("abc");ok(false,"لم يُرمَ شيء")}
 catch(e){
  ok(e instanceof ParseError&&e instanceof Error,"ParseError وError معاً");
  eq(e.name,"ParseError","الاسم");
  ok(e.code&&e.message,"رمزٌ ورسالة");
 }
});
process.exit(summary()?1:0);
