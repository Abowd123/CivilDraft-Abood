/* ═══ المصغِّرُ لا يمسّ إلّا التعليقات ═══ (خطّة 1.1.0 · البند ب)
   حالاتُ الفخّ كلُّها: بدايةُ تعليقٍ داخل نصٍّ وقالبٍ وتعبيرٍ نمطيّ، وقالبٌ
   متداخل، وقسمةٌ مقابلَ تعبير، وASI. كلُّ حالةٍ تُقيَّم قبل وبعد: نفسُ القيمة.
   التشغيل:  node js/tests/strip.test.js                                  */
import {group,ok,eq,summary} from "./harness.js";
const {stripJS,stripCSS,stripHTML}=await import("../../scripts/strip.js");
const run=src=>new Function(src)();
const SL="/", ST="*";              /* لا نكتب بداية التعليق حرفياً هنا */
const C0=SL+ST, C1=ST+SL;
const CASES=[
 ["نصٌّ فيه بدايةُ تعليق", `return "a${C0}b"+'${C1}c'`],
 ["قالبٌ فيه بدايةُ تعليق", "return `x"+C0+"y`"],
 ["قالبٌ متداخلٌ بداخله تعليق", "const a=2; return `p${ a /* داخلي */ + `q${a}r` }s`"],
 ["تعبيرٌ نمطيٌّ فيه نجمة", `return ${SL}\\${ST}+${SL}.test("${ST}${ST}")`],
 ["تعبيرٌ فيه شرطتان", "return /a\\/\\/b/.test('a//b')"],
 ["تعبيرٌ بصنفٍ فيه شرطة", "return /[/]x/.test('/x')"],
 ["قسمةٌ بعد قوس", "const a=8,b=2,g=1; return (a)/b/g"],
 ["تعبيرٌ بعد return", "return /x/g.flags"],
 ["تعليقُ سطرٍ في آخر سطر", "const a=1 // تعليق\nreturn a"],
 ["ASI: تعليقٌ كتليٌّ متعدّدُ الأسطر بين جملتين", `let a=1\n${C0}\n x \n${C1}\nlet b=2\nreturn a+b`],
 ["ASI: return ثم سطر", "return (function(){ return\n 5 })()"],
 ["تعبيرٌ فيه علامتا تنصيص ثم تعليق", "const r=/[\"']/; // تعليق\nreturn r.test('\"')"],
 ["تعبيرٌ فيه علامةُ قالب ثم تعليق", "const r=/`/; "+C0+" x "+C1+" return r.test('`')"],
 ["تعبيرٌ صنفُه يبدأ بشرطةٍ ونجمة", "const r=/[/"+"*]x/; const k=3; "+C0+" ت "+C1+" return r.test('*x')+k"],
 ["سلسلةٌ بهروب", `return "a\\"${C0}"`],
];
group("القيمةُ نفسُها قبل التصغير وبعده",()=>{
 CASES.forEach(([n,src])=>{
  let a,b,e=null;
  try{a=run(src); b=run(stripJS(src))}catch(x){e=x}
  ok(!e&&JSON.stringify(a)===JSON.stringify(b),n+(e?" — "+e.message:` (${JSON.stringify(a)})`));
 });
});
group("التعليقاتُ تزول فعلاً",()=>{
 const o=stripJS(`${C0} ترويسة ${C1}\n  const a=1; // ذيل\n\n\n  ${C0}x${C1}const b=2`);
 ok(!o.includes("ترويسة")&&!o.includes("ذيل"),"المتنُ زال");
 ok(!/^\s/m.test(o.replace(/\n+$/,"")),"والمسافاتُ البادئة");
 ok(!/\n\n/.test(o),"والأسطرُ الفارغة");
});
group("القالبُ متعدّدُ الأسطر يُحفَظ حرفاً بمسافاته",()=>{
 const src="return `<div>\n   <b>x</b>\n\n</div>`";
 eq(run(stripJS(src)),run(src),"HTML القالب كما هو");
});
group("CSS وHTML",()=>{
 eq(stripCSS(`a{color:red} ${C0} x ${C1}\n  b{content:"${C0}"}`).trim(),`a{color:red}\nb{content:"${C0}"}`,"CSS: التعليق يزول والنصّ يبقى");
 ok(!stripHTML("<p>a</p><!-- سرّ -->\n\n<p>b</p>").includes("سرّ"),"HTML: التعليق يزول");
});
process.exit(summary()?1:0);
