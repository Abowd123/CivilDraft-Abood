/* ═══ مقياسُ التغطية ═══
   يقيس ما لا يقيسه غيره: أيُّ رمزٍ مُصدَّرٍ لا يمسّه اختبارٌ واحد.
   والقياسُ ساكن — يقرأ المصادر ولا يُنفِّذها — فلا يحتاج قماشاً ولا
   واجهةً، ويعمل على المشروع كلِّه لا على ما استُورد.

   ═══ ثلاث طبقاتٍ ═══
   beh  سلوكيّ: يُنادى في ملفِّ اختبارٍ يُنفَّذ فتُفحَص نتيجتُه
   str  بنيويّ: يُذكَر في dom.js وحده — بنيتُه محروسةٌ وسلوكُه لا
   none مكشوف: لا شيء

   ═══ والدفتر عقدٌ لا قائمةَ استثناءات ═══
   كلُّ مكشوفٍ يحتاج سطراً بسببه، والسببُ يُقرأ: «واجهةٌ تحتاج
   أحداثاً» مقبول، و«لم أصل إليه» مقبولٌ ومُعلَن، و«لا سبب» ليس
   مقبولاً. والمُدخَلُ الميّت يُسقِط البناء كالمكشوف: رمزٌ صار
   مُغطّىً أو زال يبقى فيه فيُوهِم بعجزٍ قائم.

   ═══ والأرضيّة تُرفَع بيدٍ ولا تنزل بنفسها ═══
   FLOOR نسبةٌ تُرفَع حين تُكتَب اختبارات، ولا تُخفَض أبداً — فالانحدار
   يُسقِط البناء.

   التشغيل:  npm run cover
   والسرد:   npm run cover:list                                    */
import {readdirSync,readFileSync,statSync} from "node:fs";
import {join,relative,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,eq,skip,summary} from "./harness.js";
import {discoverTestFiles,DENYLIST} from "./all.js";

const HERE=fileURLToPath(new URL(".",import.meta.url));
const ROOT=join(HERE,"..","..");
const LIST=process.argv.includes("--list");

/* ═══ الأرضيّة ═══ ارفعها إلى الرقم المطبوع بعد أوّل تشغيل ═══ */
const FLOOR=63;

const walk=(d,out)=>{
 let E=[];
 try{E=readdirSync(d)}catch(e){return out}
 E.forEach(n=>{
  if(n==="node_modules"||n[0]===".")return;
  const p=join(d,n);
  let st=null;
  try{st=statSync(p)}catch(e){return}
  if(st.isDirectory()){walk(p,out); return}
  if(/\.js$/.test(n))out.push(p);
 });
 return out;
};
const REL=p=>relative(ROOT,p).split(sep).join("/");
const SRC=new Map();
walk(join(ROOT,"js"),[]).forEach(p=>{
 try{SRC.set(REL(p),readFileSync(p,"utf8"))}catch(e){}
});
const isTest=r=>/^js\/tests\//.test(r);
const CODE=[...SRC.keys()].filter(r=>!isTest(r)).sort();
/* الاختباراتُ تُستخرَج ولا تُسرَد: ملفٌّ يُضاف يدخل القياس بلا لمسة.
   وharness أداةٌ، وcover وall (المشغّل نفسه) ليسا مرجعَين لنفسيهما. */
/* js/tests/red/ عيوبٌ معروفة تفشل عمداً (يحرسها redguard.test.js): لا تُعدّ\n   تغطيةً سلوكيةً لأنها لا تُثبت شيئاً يعمل. */
const TESTS=[...SRC.keys()].filter(isTest)
 .filter(r=>!/^js\/tests\/red\//.test(r))
 .filter(r=>!/\/(harness|cover|all)\.js$/.test(r)).sort();
const STR=TESTS.filter(r=>/\/dom\.js$/.test(r));
const BEH=TESTS.filter(r=>!/\/dom\.js$/.test(r));
/* ═══ الرموزُ المُصدَّرة ═══
   وإعادةُ التصدير رمزٌ عامٌّ كغيره: من يستورد LAYERS من state.js
   يستعملها ولا يعنيه أين وُلدت. */
function exportsOf(txt){
 const out=new Set();
 [/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm,
  /^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
  /^export\s+class\s+([A-Za-z_$][\w$]*)/gm].forEach(re=>{
  re.lastIndex=0;
  let m;
  while((m=re.exec(txt)))out.add(m[1]);
 });
 const re2=/^export\s*\{([^}]*)\}/gm;
 let m;
 while((m=re2.exec(txt))){
  m[1].split(",").forEach(s=>{
   const q=s.trim();
   if(!q||q[0]==="*")return;
   const as=/\bas\s+([A-Za-z_$][\w$]*)\s*$/.exec(q);
   const n=as?as[1]:q.replace(/\s.*$/,"");
   if(/^[A-Za-z_$][\w$]*$/.test(n))out.add(n);
  });
 }
 return [...out];
}
/* ═══ حلُّ المسار النسبيّ ═══
   "js/tests/tools.js" + "../core/ref.js" ⇒ "js/core/ref.js" — بصيغة
   REL نفسِها، لتُطابَق مفاتيحُ SRC. */
function res(r,spec){
 const dir=r.split("/").slice(0,-1);
 const stack=[];
 /* لاحقةُ الاستعلام تُقلَّم: الاختبار الذي يحتاج نسختين مستقلّتين من
    وحدةٍ واحدة (محاكاةُ تبويبين — انظر store-rev.test.js) يستوردها
    بـ"?tab=A" و"?tab=B". الوحدةُ هي نفسها، والإشارةُ تُنسَب إليها. */
 dir.concat(String(spec).replace(/[?#].*$/,"").split("/")).forEach(p=>{
  if(p===""||p===".")return;
  if(p===".."){stack.pop(); return}
  stack.push(p);
 });
 return stack.join("/");
}
/* ═══ الإشارة ═══ بالموضع لا بالاسم ═══
   invalidate مُصدَّرةٌ من render وlayers، وapplyField من batch،
   وresolve من layers — والمطابقةُ بالاسم وحدها تجعل ذكرَ إحداها
   يُغطّي الأخرى، فتُعلَن تغطيةٌ لا وجودَ لها.

   فتُحلَّل استيراداتُ كل ملفِّ اختبار: اسمُ الوحدة (RN) يُربَط
   بمصدره (js/core/render.js)، والاسمُ المُفكَّك ({polyBool}) كذلك.
   ثم تُطلَب الإشارةُ في نطاق مصدرها وحده.

   والحدُّ المتبقّي مُعلَن: استيرادٌ حركيٌّ (import()) لا يُحلَّل،
   وهو في ui/* وحدها — وقاعدةُ المجلّد تُلزِمها بالحرس البنيويّ
   على أي حال. */
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

/* {a, b as c, d} ⇒ [[a,a],[b,c],[d,d]] */
function braceNames(s){
 const out=[];
 String(s||"").split(",").forEach(x=>{
  const q=x.trim();
  if(!q||q[0]==="*")return;
  const as=/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(q);
  if(as){out.push([as[1],as[2]]); return}
  if(/^[A-Za-z_$][\w$]*$/.test(q))out.push([q,q]);
 });
 return out;
}
/* خريطةُ ملفِّ الاختبار: الاسمُ المحلّيّ ⇒ {mod, orig} */
function bindOf(r,txt){
 const NS=new Map();     /* RN ⇒ js/core/render.js */
 const NM=new Map();     /* polyBool ⇒ [{mod,orig}] */
 const put=(local,mod,orig)=>{
  const A=NM.get(local)||[];
  A.push({mod,orig});
  NM.set(local,A);
 };
 /* import * as X from "…"  ·  import X, {…} from "…" */
 let m;
 const RE=/^import\s+([^;]*?)\s*from\s*["']([^"']+)["']/gm;
 while((m=RE.exec(txt))){
  if(m[2][0]!==".")continue;
  const mod=res(r,m[2]);
  const cl=m[1].trim();
  const ns=/^\*\s+as\s+([A-Za-z_$][\w$]*)$/.exec(cl);
  if(ns){NS.set(ns[1],mod); continue}
  const br=/\{([^}]*)\}/.exec(cl);
  if(br)braceNames(br[1]).forEach(([o,l])=>put(l,mod,o));
  const df=cl.replace(/\{[^}]*\}/,"").replace(/,/g," ").trim();
  if(/^[A-Za-z_$][\w$]*$/.test(df))put(df,mod,"default");
 }
 /* const X=await import("…")  ·  const {a,b}=await import("…") */
 const AW=/(?:const|let|var)\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*await\s+import\(\s*["']([^"']+)["']\s*\)/g;
 while((m=AW.exec(txt))){
  if(m[2][0]!==".")continue;
  const mod=res(r,m[2]);
  const t=m[1].trim();
  if(t[0]==="{")braceNames(t.slice(1,-1))
   .forEach(([o,l])=>put(l,mod,o));
  else NS.set(t,mod);
 }
 return {NS,NM};
}
const BIND=new Map();
TESTS.forEach(r=>BIND.set(r,bindOf(r,SRC.get(r)||"")));

/* هل يُشار إلى (mod#name) في هذا الملفّ؟ */
function refIn(r,mod,name){
 const txt=SRC.get(r)||"";
 const B=BIND.get(r);
 if(!B)return false;
 /* ١ — عبر وحدةٍ مسمّاة: RN.invalidate */
 for(const [ns,m2] of B.NS){
  if(m2!==mod)continue;
  if(new RegExp(`\\b${esc(ns)}\\s*\\.\\s*${esc(name)}\\b`)
   .test(txt))return true;
 }
 /* ٢ — عبر اسمٍ مُفكَّك: النطاقُ محسومٌ بالاستيراد نفسه */
 for(const [local,A] of B.NM){
  if(!A.some(x=>x.mod===mod&&x.orig===name))continue;
  const re=new RegExp(`\\b${esc(local)}\\b`,"g");
  let m3, n=0;
  while((m3=re.exec(txt))){
   /* الاستيرادُ نفسه ليس إشارةً — وإلّا صار كلُّ مستوردٍ مُغطّىً */
   const ls=txt.lastIndexOf("\n",m3.index)+1;
   const le=txt.indexOf("\n",m3.index);
   const line=txt.slice(ls,le<0?txt.length:le);
   if(/^\s*import\b/.test(line))continue;
   if(/=\s*await\s+import\(/.test(line))continue;
   n++;
  }
  if(n)return true;
 }
 return false;
}
const anyIn=(files,mod,name)=>files.some(r=>refIn(r,mod,name));
const ROWS=[];
CODE.forEach(r=>{
 exportsOf(SRC.get(r)||"").forEach(n=>{
  const lv=anyIn(BEH,r,n)?"beh":(anyIn(STR,r,n)?"str":"none");
  ROWS.push({r,n,lv,key:`${r}#${n}`});
 });
});
const N=ROWS.length;
const nBeh=ROWS.filter(x=>x.lv==="beh").length;
const nStr=ROWS.filter(x=>x.lv==="str").length;
const nNone=ROWS.filter(x=>x.lv==="none").length;
const pct=N?Math.round(nBeh/N*1000)/10:0;

/* ═══ قواعدُ المجلّد ═══
   تُغني عن مئة سطر. وشرطُها أن يذكر dom.js كلَّ ملفٍّ فيها: قاعدةٌ
   بلا حرسٍ بنيويٍّ إعفاءٌ لا سبب. */
const DIRS={
 /* ما زال بنيوياً: القوائمُ المنبثقة والإرساءُ والسحبُ والقشرة
    تحتاج تخطيطاً حقيقياً (offsetWidth · getBoundingClientRect ·
    تسلسلَ pointer). وما لا يحتاجه — الخصائصُ والطبقاتُ وشريطُ
    الحالة والبطاقةُ السريعة والسجلُّ والسِّمةُ والأيقونات — مُغطّىً
    سلوكياً في ui.js. */
 "js/ui/":"واجهةٌ تحتاج محرِّكَ تخطيطٍ حقيقياً — القوائمُ المنبثقة "
  +"والقشرةُ وحفظُ الأحجام. وpanels وstore وlayout وtheme وicons "
  +"وprops وstatusbar وquickprops وdock مُغطّاةٌ سلوكياً في "
  +"tests/ui.js، والباقي بنيويٌّ في dom.js",
 "js/tools/":"مُغطّىً سلوكياً في tests/tools.js — وما بقي بنيويٌّ "
  +"في dom.js",
 "js/ai/":"مسارُ المزوّد: شبكةٌ وموافقةُ مستخدم — ai/ops مُغطّىً "
  +"في trace.js، وما عداه بنيويٌّ في dom.js",
 "js/app.js":"مُنسِّقٌ لا منطق: يوصل الخطّافات ويوجّه الأحداث، "
  +"وترتيبُ إقلاعه وحدُّ ما لا يبنيه مفحوصٌ بنيوياً في dom.js "
  +"(مجموعةُ «ترتيب الإقلاع») — وسلوكُه يحتاج مؤشّراً حياً",
 "js/bootguard.js":"حرسُ الإقلاع: يعمل قبل تحميل الوحدات فيرسم "
  +"صندوقَه بلا استيراد، ويمسك الوعود المرفوضة — واختبارُه يحتاج "
  +"إقلاعاً فاشلاً حقيقياً. وبنيتُه مفحوصةٌ في dom.js"
};
/* ═══ الدفتر ═══ لا مُدخَلَ بلا سبب · وأوّلُ تشغيلٍ يُخرِج البقيّة ═══ */
const LEDGER={
 
 "js/core/tables.js#tbkOf":"قارئٌ داخليٌّ للنوع — يُستهلَك من tablePrims/tableSize المُختبَرَين سلوكياً، ولا عقدَ مستقلٌّ له",
 "js/core/tables.js#tblById":"قارئٌ بالمعرّف يستهلكه سجلُّ الكيانات إنتاجياً — والإصابةُ مُختبَرةٌ بـtblAt",
 "js/core/tables.js#tblBBox":"صندوقٌ مشتقٌّ من tblPoly المُختبَر — غلافٌ بسطر",
 "js/core/tables.js#tblLabel":"نصُّ عرضٍ للواجهة لا عقدَ حسابيّ",
 /* المحاور والأبعاد — مرحلة جديدة (12.1) */
 "js/core/dims.js#gridExtent":
  "تحسبُ امتدادَ شبكة المحاور مع الإزاحة الاختيارية S.grid.off",
 "js/core/dims.js#setGridOff":
  "تضبط الإزاحةَ الورقيّة S.grid.off مع التحقّق من الحدود",
 "js/core/sheet.js#tbSidePrims":
  "ترسم بلوك العنوان الجانبيّ شريطاً كاملَ الارتفاع — طراز side",

 "js/guide/auto.js#placements":
  "خريطة تموضع كل أمرٍ في الشريط (تبويب/لوح/أيقونة)؛ تُستهلك داخلياً "
  +"من toolLesson ولا تحتاج اختباراً باسمها المباشر",
 "js/guide/auto.js#autoLessons":
  "مصدر الدروس الآلية الذي يبنيه catalog.js؛ سلوكها مفحوصٌ عبر "
  +"lessons()/lessonById() في guide.catalog.test.js لا باسمها",
 "js/guide/auto.js#toolLessonById":
  "عرضُ درس أداةٍ واحدة مباشرةً؛ تُستهلك مستقبلاً من viewer.js/floater.js "
  +"(مرحلة ٤) ولا اختبار مباشر باسمها بعد",
 "js/guide/auto.js#articleLessonById":
  "عرضُ درس مقالٍ واحد مباشرةً؛ نفس منطق toolLessonById أعلاه، "
  +"تُستهلك مستقبلاً من العارض",
 "js/guide/schema.js#KINDS":
  "جدول أنواع الدرس المقبولة؛ يُستهلك داخلياً من validateLesson ولا "
  +"اختبار مباشر باسمه",
 "js/guide/schema.js#LEVELS":
  "تسميات مستويات الصعوبة الثلاثة للواجهة؛ عرضٌ مستقبليٌّ في viewer.js "
  +"ولا يغيّر نتيجة التحقق",
 "js/guide/schema.js#STEPS_DO":
  "مجموعة أفعال خطوة السيناريو المقبولة؛ يُستهلك داخلياً من "
  +"validateLesson ولا اختبار مباشر باسمه",
 "js/guide/assert.js#wallsBBox":
  "مساعد قياسٍ صافٍ لصندوق الجدران المحفوظة؛ يُستهلك داخلياً من "
  +"CHECKS['rect.clear'] ولا اختبار مباشر باسمه",
 "js/guide/engine.js#runScript":
  "تشغيل سيناريو كاملٍ على جلسةٍ قائمة؛ عرضٌ بديل لِ createSession().run() "
  +"يُستهلك مستقبلاً من viewer.js في وضعَي demo/guide (مرحلة ٤)",
 "js/guide/engine.js#demoLesson":
  "بناء جلسةٍ وتشغيل سيناريو الدرس بالكامل بنداءٍ واحد؛ تُستهلك "
  +"مستقبلاً من floater.js لوضع العرض demo (مرحلة ٤)",
 /* ═══ G3/G4 — الرمل والعارض والنافذة العائمة والمداخل ═══
    الوحدات الأربع (sketch/viewer/floater/wire) تُستهلك بعضها بعضاً
    وتُستهلك من app.js عبر guideRegister — لا من اختبارٍ بالاسم
    المباشر: G4 (guide.wire.test.js) يفحص الأجزاء الخالصة من DOM
    (الفهرس/التغطية/البحث/نصّ الدرس) عمداً، وطبقة فتح النافذة
    والرمل والعرض تحتاج DOM/canvas حقيقيَّين فوق نطاق Node. */
 "js/guide/floater.js#ensureFloater":
  "بناء/استرجاع حاوية النافذة العائمة في DOM؛ يحتاج document حقيقياً "
  +"فوق نطاق اختبار Node — تُستدعى داخلياً من floaterOpen/floaterBody",
 "js/guide/floater.js#floaterOpen":
  "إظهار النافذة العائمة؛ طبقة DOM بحتة يستدعيها wire.js#guideOpen "
  +"ولا اختبار Node مباشر لها",
 "js/guide/floater.js#floaterClose":
  "إخفاء النافذة العائمة؛ يستدعيها زرّ الإغلاق وwire.js#guideOpen "
  +"عند «جرّب في مشروعي» — طبقة DOM بلا اختبار Node مباشر",
 "js/guide/floater.js#floaterIsOpen":
  "حالة ظهور النافذة؛ يقرأها wire.js#guideIsOpen — طبقة DOM بحتة",
 "js/guide/floater.js#floaterBody":
  "حاوية محتوى النافذة العائمة؛ يقرأها wire.js#guideOpen قبل الرسم "
  +"فيها — طبقة DOM بحتة",
 "js/guide/sketch.js#makeSketch":
  "صانع الرمل المصغّر على <canvas> حقيقي؛ يستدعيه wire.js#renderCourse "
  +"بعد بناء DOM الدرس — يحتاج سياق رسم 2d فوق نطاق اختبار Node",
 "js/guide/viewer.js#lessonSections":
  "تطبيع أقسام الدرس بلا DOM؛ سلوكها مفحوصٌ بالفعل ضمنياً عبر "
  +"lessonText() (تستهلكها داخلياً) في guide.wire.test.js — لا باسمها "
  +"المباشر",
 "js/guide/viewer.js#renderLesson":
  "رسم الدرس كاملاً في حاوية DOM؛ يستدعيه wire.js#renderCourse — "
  +"طبقة DOM بحتة بلا اختبار Node مباشر",
 "js/guide/wire.js#guideRegister":
  "نقطة الحقن الوحيدة من app.js (ACT/R/HOOK/extendPalette)؛ تحتاج "
  +"شكل تطبيقٍ حيّ فوق نطاق اختبار Node — بنيتها موثّقةٌ في تعليق "
  +"الملف أعلاه",
 "js/guide/wire.js#guideOpen":
  "فتح الفهرس أو درسٍ بعينه في النافذة العائمة؛ طبقة DOM/canvas "
  +"مجتمعةً — لا اختبار Node مباشر لها، وتُستدعى من extendPalette "
  +"وACT.guide وأزرار «مرتبط»",
 "js/guide/wire.js#guideClose":
  "إغلاق النافذة العائمة؛ غلافٌ رفيعٌ حول floaterClose بلا منطقٍ "
  +"يستحقّ اختباراً منفصلاً",
 "js/guide/wire.js#guideIsOpen":
  "حالة فتح الدليل؛ غلافٌ رفيعٌ حول floaterIsOpen لعملاء app.js "
  +"المستقبليين (زرّ شريطٍ يبدّل حالته)",
 "js/guide/exporter.js#guideFileName":
  "اسم ملفّ التنزيل الثابت لمولّد الدليل المستقل؛ يستهلكه عميل "
  +"تنزيلٍ مستقبليٌّ في app.js (رابط/زر «تصدير الدليل») لا اختبار "
  +"Node — buildStandalone/exportGuideHTML نفساهما مُغطّيان سلوكياً "
  +"في guide.exporter.test.js",
 "js/core/pricing.js#fromJSON":
  "استيراد إعدادات التسعير من ملف المشروع؛ يُستهلَك إنتاجياً من الحفظ والفتح",
 "js/core/pricing.js#formatMoney":
  "تنسيق مبالغ عربية للواجهة؛ يحتاج بيئة عرض ولا يغيّر نتيجة الحساب",
 "js/core/pricing.js#toJSON":
  "تصدير إعدادات التسعير داخل ملف المشروع؛ يُستهلَك إنتاجياً عند الحفظ",
 "js/core/templates.js#getTemplate":
  "قراءة قالب بالاسم للوحة القوالب؛ لا يحتاج الاختبار استدعاءه بالاسم",
 "js/core/underlay.js#draw":
  "رسم الصورة المرجعية على Canvas؛ يحتاج سياق Canvas حياً",
 "js/core/underlay.js#onChange":
  "تسجيل مستمع تحديث الصورة المرجعية؛ ربط واجهة لا يُختبر باسم الدالة",
 "js/core/blocks.js#installBlockSnapshotFn":
  "تسجيل دالّة اللقطة (snapshot من state.js) التي يستدعيها "
  +"defineBlock/removeBlock قُبيل التعديل؛ رابطُ تصميمٍ بين "
  +"وحدتين لا سلوكٌ يُستدعى باسمه من اختبار",
 "js/core/migrate-autosave.js#migrateAutosave":
  "مُختبَرةٌ فعلياً في phase1.test.js وmigrate.test.js، لكن عبر "
  +"استيرادٍ حركيٍّ يمرّ بدالّة مساعدة fresh(f)=>import(f+\"?t\"+n) "
  +"لإعادة تحميل الوحدة نظيفةً بين السيناريوهات (P الداخليّ لا "
  +"يتسرّب) — والفاحص الساكن لا يحلّ نمط الاستدعاء غير الحرفيّ هذا",
 "js/core/migrate-autosave.js#peekOldAutosave":
  "نفس السبب أعلاه: مُختبَرةٌ في الملفَّين نفسِهما عبر نفس دالّة "
  +"fresh() المساعدة، وغير مُكتَشَفةٍ سكونياً لذلك",
 "js/io/boqcsv.js#download":
  "تنزيل CSV عبر Blob ونقرة متصفح؛ يحتاج بيئة متصفح حقيقية",
 "js/io/project.js#dl":
  "تنزيلٌ — يحتاج Blob وURL.createObjectURL وحدثَ نقر",
 "js/io/project.js#pickFile":"مُنتقي ملفّاتٍ — حدثُ متصفّح",
 "js/io/project.js#pickBin":"مُنتقي ملفّاتٍ — حدثُ متصفّح",
 "js/core/batch.js#parseVal":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/batch.js#forceRules":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/batch.js#clearDimTxt":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/batch.js#clearAreaNames":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/batch.js#groupForced":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/batch.js#sayApply":"يُستهلَك إنتاجياً من مزوّد الذكاء (ai)، واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/batch.js#fldName":"يُستهلَك إنتاجياً من أداة (tools)، واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/batch.js#sayForced":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/batch.js#summary":"يُستهلَك إنتاجياً من تصدير/استيراد (io)، واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/cols.js#CK":"يُستهلَك إنتاجياً من أداة (tools)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/cols.js#CT":"يُستهلَك إنتاجياً من أداة (tools)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/cols.js#CMIN":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/cols.js#colById":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/coords.js#trackAngles":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/coords.js#polar":"يُستهلَك إنتاجياً من app.js، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/coords.js#angOf":"يُستهلَك إنتاجياً من أداة (tools)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/coords.js#lenOf":"يُستهلَك إنتاجياً من أداة (tools)، واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/coords.js#D2R":"يُستهلَك إنتاجياً من أداة (tools)، تصدير/استيراد (io)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/coords.js#R2D":"يُستهلَك إنتاجياً من تصدير/استيراد (io)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/dims.js#DK":"يُستهلَك إنتاجياً من أداة (tools)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/dims.js#dimById":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/dims.js#chainById":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/dims.js#annoById":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/dims.js#fmtLen":"يُستهلَك إنتاجياً من أداة (tools)، مزوّد الذكاء (ai)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/entreg.js#NAME":"يُستهلَك إنتاجياً من أداة (tools)، مزوّد الذكاء (ai)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/entreg.js#entDef":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/ents.js#outlineOf":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/ents.js#KINDS":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/fixt.js#delFix":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/fixt.js#fixById":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/fixt.js#fixW":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/geom.js#stitch":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/geom.js#WELD":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/laydef.js#LT":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/laydef.js#ltOf":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/laydef.js#LWS":"يُستهلَك إنتاجياً من تصدير/استيراد (io)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/laydef.js#lwOk":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/laydef.js#layRow":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/laydef.js#DEFLAYS":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/laydef.js#LAYERS":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/layers.js#LT":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/layers.js#ltOf":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/layers.js#lwOk":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/layers.js#DESC":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/modify.js#segsOf":"يُستهلَك إنتاجياً من أداة (tools) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/modify.js#dupWall":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/modify.js#rotP":"يُستهلَك إنتاجياً من أداة (tools) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/modify.js#stretchPrev":"يُستهلَك إنتاجياً من أداة (tools) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/modify.js#WHY":"يُستهلَك إنتاجياً من أداة (tools) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/opens.js#sAt":"يُستهلَك إنتاجياً من أداة (tools)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/opens.js#OK":"يُستهلَك إنتاجياً من أداة (tools)، مزوّد الذكاء (ai)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/opens.js#MINW":"يُستهلَك إنتاجياً من أداة (tools)، مزوّد الذكاء (ai)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/opens.js#EDGE":"يُستهلَك إنتاجياً من مزوّد الذكاء (ai)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/osnap.js#osOn":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/osnap.js#osSummary":"يُستهلَك إنتاجياً من app.js — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/perf.js#perfClear":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/perf.js#perfReport":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/perf.js#bump":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/ref.js#mapper":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/ref.js#applySim":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/ref.js#refGrid":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/sheet.js#northPrims":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/sheet.js#sheetPrims":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/sheet.js#SIZES":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/sindex.js#grid":"يُستهلَك إنتاجياً من app.js، مزوّد الذكاء (ai)، واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/sindex.js#CELL":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/sindex.js#expand":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/stairs.js#stById":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/state.js#refBump":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/state.js#autosave":"يُستهلَك إنتاجياً من app.js، أداة (tools)، مزوّد الذكاء (ai)، واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/state.js#saveResume":"يُستهلَك إنتاجياً من app.js — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/state.js#restore":"يُستهلَك إنتاجياً من app.js، تصدير/استيراد (io)، واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/state.js#LSK":"يُستهلَك إنتاجياً من تصدير/استيراد (io) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/state.js#saveMode":"يُستهلَك إنتاجياً من app.js — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/state.js#setSaveError":"يُستهلَك إنتاجياً من app.js — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/templates.js#setScriptRunner":"يستدعيه tools/tplscript.js عند تحميله ليسجّل منفِّذ القوالب (الاتجاه core ← tools)، ويُختبَر سلوكه عبر apply(\"showcase\") في showcase.test.js",
 "js/core/state.js#LAYERS":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/trace.js#autoOpt":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/trace.js#snapAngles":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/trace.js#mergeCollinear":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/trace.js#joinNodes":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/core/trace.js#planSay":"يُستهلَك إنتاجياً من أداة (tools) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/trace.js#cornerSay":"يُستهلَك إنتاجياً من أداة (tools) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/units.js#norm":"يُستهلَك إنتاجياً من أداة (tools)، مزوّد الذكاء (ai)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/units.js#D2R":"يُستهلَك إنتاجياً من أداة (tools)، تصدير/استيراد (io)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/units.js#mm":"يُستهلَك إنتاجياً من أداة (tools)، تصدير/استيراد (io)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/units.js#rng":"لا يستهلكه شيء — لا اختبارٌ ولا كودٌ آخر — مرشّحٌ لكودٍ ميت يستحقّ مراجعة الحذف",
 "js/core/units.js#pair":"لا يستهلكه شيء — لا اختبارٌ ولا كودٌ آخر — مرشّحٌ لكودٍ ميت يستحقّ مراجعة الحذف",
 "js/core/units.js#arrow":"يُستهلَك إنتاجياً من أداة (tools)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/units.js#rng3":"يُستهلَك إنتاجياً من أداة (tools)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/units.js#dm2":"يُستهلَك إنتاجياً من أداة (tools)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/units.js#idc":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/units.js#bumpIdc":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/walls.js#faces":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/walls.js#MINW":"يُستهلَك إنتاجياً من أداة (tools)، مزوّد الذكاء (ai)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/walls.js#WTYPE":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/walls.js#ALIGN":"يُستهلَك إنتاجياً من أداة (tools)، مزوّد الذكاء (ai)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/walls.js#isWType":"يُستهلَك إنتاجياً من مزوّد الذكاء (ai) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/walls.js#isLow":"يُستهلَك إنتاجياً من مزوّد الذكاء (ai)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/walls.js#lowH":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/walls.js#alignOff":"يُستهلَك إنتاجياً من وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/cp1256.js#CP":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/dxf.js#dxfStats":"يُستهلَك إنتاجياً من تصدير/استيراد (io) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/dxfin.js#MAXLINES":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/io/dxfin.js#MAXOPS":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/io/dxfin.js#MAXSEC":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/io/export.js#exportBox":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/io/export.js#fits":"يُستهلَك إنتاجياً من أداة (tools)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/export.js#pageOf":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/io/export.js#safeName":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/export.js#fileName":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/io/report.js#saveReport":"يحتاج DOM حياً (Blob وa.click) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/export.js#FMT":"يُستهلَك إنتاجياً من واجهة (ui) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/export.js#onSheet":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/io/project.js#MAXFILE":"دالّة/ثابتٌ داخليّ يُستهلَك ضمن ملفّه وحده من دالّةٍ أخرى مُختبَرة سلوكياً، ولا واجهةَ مباشرة له",
 "js/io/store.js#del":"يُستهلَك إنتاجياً من واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/store.js#mode":"يُستهلَك إنتاجياً من أداة (tools)، تصدير/استيراد (io)، واجهة (ui)، وحدة نواة أخرى — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/style.js#hatchLines":"يُستهلَك إنتاجياً من تصدير/استيراد (io) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/style.js#HLAY":"يُستهلَك إنتاجياً من تصدير/استيراد (io) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/elevation.js#VIEWS":"جدول ثوابتَ داخليّ تقرؤه viewAngle وviewName المُختبَرتان سلوكياً، ولا استيراد مباشر له",
 "js/core/elevation.js#VNAME":"جدول ثوابتَ داخليّ تقرؤه viewAngle وviewName المُختبَرتان سلوكياً، ولا استيراد مباشر له",
 "js/io/elev.js#elevPDFz":"نسخةٌ غير متزامنة من elevPDF للضغط — يُستهلَك إنتاجياً من واجهة (ui)، ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/elev.js#PAD":"ثابتُ هامشٍ افتراضي تقرؤه elevPage المُختبَرة سلوكياً عبر قيمتها لا اسمها",
 "js/io/elev.js#safeName":"يُستهلَك إنتاجياً ضمن elevName المُختبَرة سلوكياً، ولا استيراد مباشر له",
 "js/io/elev.js#elevFile":"يُستهلَك إنتاجياً من أداة (tools) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/section.js#MINCUT":"ثابتُ أقصر خطّ قطعٍ مقبول تقرؤه cutFrame المُختبَرة سلوكياً — استُورد في section.test.js لكنه لم يُذكَر إلا في سطر الاستيراد نفسه فلا يُحتسَب استعمالاً",
 "js/core/section.js#PAR":"حدُّ التوازي الداخليّ تقرؤه cutFoot المُختبَرة سلوكياً عبر قيمتها لا اسمها",
 "js/core/section.js#sectRunSay":"يُستهلَك إنتاجياً من أداة (tools) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/sect.js#sectPDFz":"نسخةٌ غير متزامنة من sectPDF للضغط — يُستهلَك إنتاجياً من واجهة (ui)، ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/io/sect.js#PAD":"ثابتُ هامشٍ افتراضي تقرؤه sectPage المُختبَرة سلوكياً عبر قيمتها لا اسمها",
 "js/io/sect.js#safeName":"يُستهلَك إنتاجياً ضمن sectTag وsectFileName المُختبَرتين سلوكياً، ولا استيراد مباشر له",
 "js/io/sect.js#sectFile":"يُستهلَك إنتاجياً من أداة (tools) — ولا اختبار سلوكيّ يستدعيه بالاسم مباشرة",
 "js/core/journal.js#jrMute":"حارس إعادة التشغيل لمنع الإعادة من تسجيل نفسها؛ يُستعمل داخل لوحة الأوامر",
 "js/core/journal.js#jrPlan":"تغليف سجلّ المستخدم في صيغة خطة؛ يُستعمل إنتاجياً من لوحة الأوامر",
 "js/io/snaps.js#snapRestore":"استعادة لقطة عبر التراجع من لوحة الأوامر؛ يحتاج IndexedDB وواجهة",
 "js/io/snaps.js#snapAutoStart":"مؤقت الحفظ التلقائي في جلسة المتصفح؛ لا يُشغّل في اختبارات Node",
 "js/io/snaps.js#snapList":"قراءة فهرس اللقطات للوحة الأوامر؛ لا مسار اختبار DOM مباشر",
 "js/io/snaps.js#snapsClean":"تنظيف فهرس اللقطات الميتة في الخلفية بعد snapsLoad؛ يحتاج IndexedDB فعلياً",
 "js/io/snaps.js#snapAutoStop":"إيقاف مؤقت اللقطات التلقائية؛ أداةٌ للاختبارات والإغلاق",
 "js/io/snaps.js#snapsLoad":"تحميل فهرس اللقطات عند الإقلاع؛ يحتاج localStorage فعلياً",
 "js/io/store.js#snapPut":"كتابة لقطة إلى IndexedDB؛ تحتاج قاعدة متصفح فعلية",
 "js/io/store.js#snapGet":"قراءة لقطة من IndexedDB؛ تُستعمل عبر استعادة الواجهة",
 "js/io/store.js#snapDel":"حذف لقطة من IndexedDB؛ تُستعمل عبر إدارة اللقطات",
 "js/core/level.js#levelTag":
  "تسمية عرضية للمستوى (0 أرضي · n طابق n)؛ تُستهلَك إنتاجياً من "
  +"boq.js وelevation.js وsection.js في رسائل الإسقاط والحصيلة، "
  +"ولا اختبار سلوكيّ يستدعيها بالاسم مباشرة",
 "js/core/level.js#levelCounts":
  "إحصاء عناصر كل مستوى (جدرانٍ وفتحاتٍ ومناطقَ وأعمدة)؛ مُعَدَّةٌ "
  +"لواجهة تبديل الطابق المستقبلية (L3) ولا تستهلكها اختبارات "
  +"L1/L2 الحاليّة",
 /* boqLevel: كانت هنا مكشوفةً بلا اختبار، وصارت beh فعلياً عبر
    fix-level.test.js وboq-levels.test.js (F2·F3) — أُزيلت. */
 /* ═══ تعارضُ التبويبين — P4-009 ═══
    العقدُ نفسه مُختبَرٌ سلوكياً في store-rev.test.js (مراجعةٌ
    وcompare-and-swap ونسخةٌ جانبية). ما يبقى مكشوفاً هو طبقةُ
    القرار: حوارٌ مرئيٌّ يُنادى من app.js وحده ويحتاج confirm. */
 "js/core/state.js#setConflict":
  "تسجيلُ خطّاف التعارض؛ يُستهلَك إنتاجياً من app.js وحده كما "
  +"setSaveError وsetRefLost، ولا اختبار سلوكيّ يستدعيه بالاسم",
 "js/core/state.js#takeNewer":
  "فرعُ «حمّل الأحدث» في حوار التعارض؛ يُنادى من app.js بعد confirm "
  +"ويحتاج مخزناً حياً — والعقدُ المقابل في io/store.js مُختبَرٌ سلوكياً",
 "js/core/state.js#keepMine":
  "فرعُ «ثبّت نسختي» في حوار التعارض؛ يُنادى من app.js بعد confirm — "
  +"ومسارُ force نفسه مُختبَرٌ سلوكياً في store-rev.test.js",
 "js/core/state.js#conflictCopy":
  "قراءةُ النسخة المحتفظ بها جانباً لعرضها في الحوار؛ تُستهلَك من "
  +"app.js، وconflictGet تحتها مُختبَرةٌ سلوكياً",
 "js/core/state.js#conflictDrop":
  "مسحُ النسخة الجانبية بعد أن يحسم المستخدم؛ تُستهلَك من الواجهة، "
  +"وconflictClear تحتها مُختبَرةٌ سلوكياً",
 "js/io/project.js#DUPSCAN_MAX":
  "سقفُ طول النصّ الذي يُفحَص معجميّاً للمفاتيح المكرّرة (P4-004)؛ "
  +"يُقرأ داخل dupKeys المُختبَرة سلوكياً في fidelity.test.js، ولا "
  +"اختبارَ يستدعيه بالاسم",
 /* ═══ تسريبُ المستمعات والمراقبين — P2-001 · P2-002 · P2-013 · P2-005 ═══
    العقدُ مُختبَرٌ سلوكياً في leaks.test.js؛ وما يبقى مكشوفاً أدواتُ
    teardown ينادوها الواجهةُ أو المستقبل لا الاختبار. */
 "js/core/delegate.js#writePref":
  "كاتبُ التفضيلات الموحَّد؛ أثرُه مُختبَرٌ سلوكياً عبر saveCode/saveOpts "
  +"وpersist في اختباراتها، ولا اختبارَ يستدعيه بالاسم",
 "js/ai/net.js#setAiError":
  "تسجيلُ خطّاف فشل حفظ إعداد المزوّد؛ يُستهلَك من app.js وحده",
 "js/core/delegate.js#prefSaid":
  "قائمةُ المفاتيح التي أُبلِغ عن فشلها؛ أداةُ تشخيصٍ لا تُنادى إنتاجياً",
 "js/core/delegate.js#setPrefError":
  "تسجيلُ خطّاف فشل كتابة التفضيلات؛ يُستهلَك من app.js وحده كما "
  +"setSaveError، ولا اختبارَ يستدعيه بالاسم",
 "js/io/snaps.js#snapQueue":
  "طابورُ عمليات اللقطات؛ أثرُه مُختبَرٌ سلوكياً عبر snapTake/snapDrop "
  +"المتزامنتين في leaks.test.js، ولا مسارَ ينادِيه مباشرةً",
 "js/io/snaps.js#snapBusy":
  "هل في الطابور عملٌ جارٍ — أداةُ تشخيصٍ للواجهة ولم تُستهلَك بعد",
 "js/ui/ribbon/overflow.js#ribbonObservers":
  "أسماءُ مراقبي الشريط؛ أداةُ تشخيصٍ محلّيّة (الملفُّ بلا استيرادٍ بقصد) "
  +"ولا اختبارَ يستدعيها — تحتاج DOM حياً",
 "js/ui/ribbon/overflow.js#disposeRibbonObservers":
  "فصلُ مراقبي الشريط عند teardown؛ يحتاج DOM حياً ولا مسارَ إنتاجيٍّ "
  +"ينادِيه بعد (لا teardown للشريط اليوم)",
 /* ثم ما يُخرجه:  npm run cover:list  */
};

const dirOf=r=>Object.keys(DIRS).find(d=>r.startsWith(d))||null;
const excused=x=>!!(LEDGER[x.key]||dirOf(x.r));

if(LIST){
 const miss=ROWS.filter(x=>x.lv==="none"&&!excused(x));
 console.log(`/* ${miss.length} رمزاً مكشوفاً — الصقها في LEDGER `
  +`واكتب سببَ كلٍّ */`);
 miss.forEach(x=>console.log(` "${x.key}":"",`));
 console.log(`/* سلوكيّ ${pct}% (${nBeh}/${N}) · بنيويّ ${nStr}`
  +` · مكشوف ${nNone} */`);
 process.exit(0);
}
/* ═══ التقرير ═══ */
const byFile=new Map();
ROWS.forEach(x=>{
 let e=byFile.get(x.r);
 if(!e){e={beh:0,str:0,none:0,n:0}; byFile.set(x.r,e)}
 e[x.lv]++; e.n++;
});
console.log(`\n── التغطية ──`);
console.log(`  ${N} رمزاً مُصدَّراً في ${CODE.length} ملفّاً`);
console.log(`  ${BEH.length} ملفَّ اختبارٍ سلوكيّ · `
 +`${STR.length} بنيويّ`);
console.log(`  سلوكيّ ${nBeh} (${pct}%) · بنيويّ ${nStr}`
 +` · مكشوف ${nNone}`);
[...byFile.entries()].filter(([r,e])=>e.none>0)
 .sort((a,b)=>b[1].none-a[1].none).slice(0,14)
 .forEach(([r,e])=>console.log(
  `  ${String(e.none).padStart(3)} مكشوفاً · ${r}`
  +(dirOf(r)?"  (قاعدةُ مجلّد)":"")));
console.log("");

group("دفترُ التغطية",()=>{
 ok(N>200,`${N} رمزاً مُصدَّراً — المسحُ يقرأ المشروع`);
 ok(CODE.length>25,`و${CODE.length} ملفّاً`);
 ok(BEH.length>=5,`و${BEH.length} ملفَّ اختبارٍ سلوكيّ`);
 ok(STR.length===1,"وواحدٌ بنيويّ — dom.js");
 /* لا مكشوفَ بلا سبب */
 const bare=ROWS.filter(x=>x.lv==="none"&&!excused(x));
 eq(bare.length,0, bare.length
  ? `${bare.length} رمزاً مكشوفاً بلا سبب — أوّلُها `
    +`${bare.slice(0,4).map(x=>x.key).join(" · ")} · `
    +`شغّل «npm run cover:list» والصق الحصيلة في LEDGER`
  : "كلُّ مكشوفٍ له سببٌ مكتوب");
 /* ولا مُدخَلَ ميّت */
 const now=new Map(ROWS.map(x=>[x.key,x]));
 Object.keys(LEDGER).forEach(k=>{
  const x=now.get(k);
  ok(!!x,`${k}: ما زال مُصدَّراً`);
  if(x)eq(x.lv,"none",
   `${k}: ما زال مكشوفاً — صار «${x.lv}» فيُحذَف من الدفتر`);
  ok(String(LEDGER[k]||"").length>8,`${k}: وسببُه مكتوب`);
 });
 /* وقاعدةُ المجلّد شرطُها حرسٌ بنيويّ */
 const dom=SRC.get("js/tests/dom.js")||"";
 Object.keys(DIRS).forEach(d=>{
  const F=CODE.filter(r=>r.startsWith(d));
  ok(F.length>0,`${d}: فيه ملفّات`);
  F.forEach(r=>ok(dom.includes(r)||dom.includes("../"+r.slice(3)),
   `${r}: مذكورٌ في dom.js — القاعدةُ لا تُعفي من الحرس`));
 });
 ok(pct>=FLOOR,`التغطية السلوكية ${pct}% ≥ الأرضيّة ${FLOOR}%`);
 /* ═══ وملفُّ اختبارٍ لا يُنادى أسوأ من غيابه ═══
    npm test وnpm run test:all كلاهما node js/tests/all.js، وهو
    يكتشف كل ملفّ .js هنا عدا DENYLIST — فالضمانة الحقيقية الآن
    ليست ذِكرَ الاسم نصّاً في package.json (ذاك كان يكذب: ملفٌّ
    بلا سكربتٍ مخصَّص كان يمرّ خلسةً عبر السلسلة اليدوية القديمة
    فقط)، بل: كل ملفّ اختبارٍ إمّا يكتشفه all.js أو مُستثنًى بسببٍ
    صريح في DENYLIST هناك. */
 const discovered=new Set(discoverTestFiles(join(ROOT,"js/tests"))
  .map(f=>`js/tests/${f}`));
 TESTS.concat(["js/tests/cover.js"]).forEach(r=>
  ok(discovered.has(r)||DENYLIST.includes(r.replace(/^js\/tests\//,"")),
   `${r}: يكتشفه all.js أو مُستثنًى صراحةً في DENYLIST`));
 /* ═══ المطابقةُ بالموضع ═══ حرسٌ على المقياس نفسه ═══ */
 const dup=new Map();
 ROWS.forEach(x=>{
  const A=dup.get(x.n)||[];
  A.push(x);
  dup.set(x.n,A);
 });
 const shared=[...dup.values()].filter(A=>A.length>1);
 ok(shared.length>0,
  `${shared.length} اسماً مُصدَّراً من أكثر من ملفّ — `
  +`فالمطابقةُ بالاسم وحدها تكذب`);
 /* invalidate من render وlayers وsindex: الأولى مُغطّاةٌ سلوكياً
    وسواها لا — ولو كانت المطابقةُ بالاسم لظهرت كلُّها مُغطّاة. */
 const inv=ROWS.filter(x=>x.n==="invalidate");
 eq(inv.length,3,"وinvalidate من ثلاثة مواضع");
 ok(inv.some(x=>x.lv==="beh"),"وإحداهما مُغطّاةٌ سلوكياً");
 ok(new Set(inv.map(x=>x.lv)).size>1
  ||inv.every(x=>x.lv==="beh"),
  "والتغطيةُ تُنسَب إلى موضعها لا إلى اسمها");
 /* والاستيرادُ نفسه ليس إشارةً */
 ok(!ROWS.some(x=>x.r==="js/tests/harness.js"),
  "وharness أداةٌ لا مرجعٌ لنفسه");
});
process.exit(summary()?1:0);
