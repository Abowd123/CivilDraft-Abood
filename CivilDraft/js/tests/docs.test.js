/* ═══ حارسُ التوثيق ═══ إقفالُ المرحلةِ ٨ (audit/10-ui-plan.md)
   وثيقةٌ متقادمةٌ أسوأُ من لا وثيقة: من يقرأها يبني على ما لم يبقَ.
   فالحارسُ يفرض ثلاثاً:
     ١) `docs/tools.md` **مولَّدٌ ومطابقٌ** — بتشغيلِ المولّدِ بـ`--check`
        في العمليةِ نفسِها، لا بمقارنةِ أرقامٍ مكتوبةٍ بيد.
     ٢) `docs/ui.md` يحمل الأرقامَ **المقيسةَ الآنَ** لا نسخةً جمدت.
     ٣) وكلُّ قاعدةٍ يُعلِنها لها **حارسٌ موجودٌ فعلاً** — قاعدةٌ بلا
        حارسٍ وعدٌ لا يُنفَّذ، وهو ما تمنعه الخطّةُ صراحةً.
   التشغيل:  node js/tests/docs.test.js                             */
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {group,groupAsync,ok,eq,summary} from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>{try{return readFileSync(join(ROOT,p),"utf8")}catch(e){return ""}};
const UI=rd("docs/ui.md"), TL=rd("docs/tools.md");
/* الأرقامُ في الوثيقةِ عربيةُ الرسمِ — تُحوَّل لتُقارَن بالمقيس */
const AR="٠١٢٣٤٥٦٧٨٩";
const num=s=>String(s).replace(/[٠-٩]/g,d=>String(AR.indexOf(d)));
const has=(t,re)=>re.test(num(t));

await groupAsync("docs/tools.md مولَّدٌ ومطابق",async()=>{
 ok(existsSync(join(ROOT,"scripts/gen-tools-doc.js")),"للمولّدِ ملفّ");
 ok(/gen-tools-doc\.js/.test(TL),"والوثيقةُ تُعلِن أنّها مولَّدة");
 /* الفحصُ الحقيقيُّ: يُشغَّل المولّدُ ويُقابَل ناتجُه بالملفّ. وهذا
    أقوى من مقارنةِ عدَدٍ مكتوبٍ: لو تغيّر بيتُ أداةٍ واحدةٍ لسقط. */
 const {execFileSync}=await import("node:child_process");
 let okRun=true, out="";
 try{
  out=execFileSync(process.execPath,
   ["scripts/gen-tools-doc.js","--check"],
   {cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"]});
 }catch(e){okRun=false; out=String(e.stdout||"")+String(e.stderr||"")}
 ok(okRun,"`--check` يمرُّ — الوثيقةُ غيرُ متقادمة"
  +(okRun?"":" — "+out.trim().slice(0,160)));
 ok(/150/.test(out)||/150/.test(num(TL)),"و١٥٠ أداةً مذكورة");
 /* ولا بيتٌ قديمٌ نجا: أسماءُ التبويباتِ المحذوفةِ لا تُذكَر كبيوت. */
 for(const dead of ["رئيسي ◂","معماري ◂","إدراج ◂"])
  ok(!TL.includes(dead),`لا بيتَ قديمٍ «${dead}»`);
 /* وقاعدةُ الموضعِ الواحدِ تعني ألّا تبقى إشاراتُ «(+n)». */
 ok(!/\(\+\d+\)/.test(TL),"ولا «(+n)» — الموضعُ واحدٌ");
});

group("docs/ui.md يحمل المقيسَ الآن",()=>{
 ok(UI.length>3000,"الوثيقةُ مكتوبةٌ لا هيكل");
 for(const s of ["خريطةُ واجهة","قواعدُ مفروضةٌ بحارس",
  "كيف تُضيف أداةً","استُبعِد صراحةً","سُحِبت بالقياس",
  "إعادةُ قياسِ كلِّ رقم"])
  ok(UI.includes(s),`قسمٌ: ${s}`);
 /* الأرقامُ تُقابَل بالمقيسِ لا تُقرَأ وحدَها */
 ok(has(UI,/\|\s*\*\*150\*\*\s*\|/),"١٥٠ أداةً");
 ok(has(UI,/\*\*7\*\*/),"سبعةُ تبويبات");
 ok(has(UI,/\*\*35\*\*/),"خمسةٌ وثلاثون لوحاً");
 ok(has(UI,/\*\*194\*\*/),"١٩٤ مدخلاً");
 ok(has(UI,/\*\*100/),"مئةٌ بالمئةِ ظاهرٌ مباشرةً");
 ok(has(UI,/15\/15/),"السياقيُّ ١٥/١٥");
 ok(has(UI,/\*\*14\*\*/),"أربعَ عشرةَ لوحةَ إرساء");
 /* والسحبُ الثلاثيُّ مذكورٌ: من يقرأ الخطّةَ وحدَها قد يبني عليها. */
 ok(UI.includes(".rbCol"),"ودعوى «وراءَ منسدلة» مسحوبةٌ بالدليل");
 ok(UI.includes("guide"),"و`guide` بلا مُفتتِحٍ مذكورةٌ");
 ok(UI.includes("touch.css"),"والورقةُ السفليةُ المنجَزةُ سلفاً");
});

group("كلُّ قاعدةٍ لها حارسٌ موجود",()=>{
 /* جدولُ القواعدِ يُعلِن حارساً لكلِّ سطرٍ — فالحارسُ المذكورُ يجب أن
    يكون **ملفّاً قائماً**، وإلّا كان الجدولُ وعداً لا عقداً. */
 const sec=UI.slice(UI.indexOf("قواعدُ مفروضةٌ بحارس"),
                    UI.indexOf("استُبعِد صراحةً"));
 /* يُقرَأ **عمودُ الحارسِ وحدَه** (الخليةُ الأخيرةُ من كلِّ صفٍّ):
    عمودُ القاعدةِ يحمل أسماءَ خصائصَ وشيفرةً (`left`/`right`/`--z-*`)
    فقراءةُ السطرِ كلِّه تُحوِّلها إلى «حرّاسٍ» لا وجودَ لها. */
 const named=new Set();
 for(const ln of sec.split("\n")){
  const c=ln.split("|").map(x=>x.trim()).filter(Boolean);
  if(c.length<2||/^-+$/.test(c[0]))continue;
  for(const m of c[c.length-1].matchAll(/`([a-z0-9-]+)`/g))
   named.add(m[1]);
 }
 /* العددُ عددُ حرّاسٍ **فريدةٍ** لا عددُ قواعدَ: الحارسُ الواحدُ يحرس
    قواعدَ عدّةً (`dom` يحرس الاتجاهَ والطبقاتِ واللمسَ)، فالصفوفُ
    أكثرُ من الحرّاس بالقصد. */
 ok(named.size>=9,`${named.size} حارساً فريداً مذكوراً`);
 for(const n of named){
  const cands=[`js/tests/${n}.test.js`,`js/tests/${n}.js`,
   `scripts/${n}.js`];
  ok(cands.some(p=>existsSync(join(ROOT,p))),
     `الحارسُ «${n}» ملفٌّ قائم`);
 }
 /* والعكسُ: حرّاسُ الخطّةِ العشرةُ كلُّها قائمةٌ — فلا حارسٌ وُعِد
    به ولم يُكتَب. */
 for(const f of ["ui-reach","ribbon-shape","ctx-complete","optbar",
  "tokens","palette-cover","dock-reach","thumb","tools-real","docs"])
  ok(existsSync(join(ROOT,`js/tests/${f}.test.js`))
   ||existsSync(join(ROOT,`js/tests/${f}.js`)),`حارسُ الخطّةِ: ${f}`);
});

group("الخطّةُ مُقفَلةٌ ثماني مراحل",()=>{
 const P=rd("audit/10-ui-plan.md");
 ok(P.length>9000,"الخطّةُ قائمةٌ");
 /* كلُّ مرحلةٍ موسومةٌ منجَزةً — والوسمُ يُقرَأ من الوثيقةِ لا
    يُفترَض. */
 for(let i=1;i<=8;i++){
  const d="١٢٣٤٥٦٧٨"[i-1];
  const re=new RegExp("~~المرحلة "+d+"[^~]*~~[^\\n]*منجَزة");
  ok(re.test(P),`المرحلة ${d} موسومةٌ منجَزة`);
 }
 ok(existsSync(join(ROOT,"audit/11-ui-migration.md")),"وجدولُ الهجرةِ قائم");
 const M=rd("audit/11-ui-migration.md");
 ok(has(M,/209/),"ويغطّي ٢٠٩ مدخلاً");
});

group("لا وثيقتان تتناقضان في حالةِ الخطّة",()=>{
 /* كان INDEX يقول «لم يُنفَّذ منها شيءٌ» وترويسةُ الخطّةِ «المرحلتان ١
    و٢» وKNOWN-DEFECTS «ثماني مراحل» — ثلاثُ حالاتٍ لواقعٍ واحد. */
 const P=rd("audit/10-ui-plan.md"), I=rd("audit/INDEX.md");
 const head=P.split("\n").slice(0,6).join("\n");
 ok(!/الباقي للتنفيذ/.test(head),"ترويسةُ الخطّةِ لا تدّعي عملاً باقياً");
 ok(/المراحل ١–٨/.test(head),"وتُعلِن المراحلَ ١–٨ منجَزة");
 ok(!/لم يُنفَّذ منها شيءٌ بعد/.test(I),"وINDEX لا يقول «لم يُنفَّذ منها شيء»");
 ok(/ثماني مراحلَ/.test(rd("KNOWN-DEFECTS.md")),"وKNOWN-DEFECTS يوافقهما");
});

process.exit(summary()?1:0);
