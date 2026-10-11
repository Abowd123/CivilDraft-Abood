/* ═══ حارسُ جدولِ الرموزِ والكثافة ═══ حرسُ المرحلةِ ٣ (audit/10-ui-plan.md)
   الدّعوى التي يحرسها هذا الملفّ: أنّ المسافاتَ صارت **سلّماً واحداً**
   لا ٣٩٢ قيمةً مبثوثةً، وأنّ الكثافةَ **مضاعفٌ واحدٌ** لا ورقةُ أنماطٍ
   ثانيةٌ تتفرّق، وأنّ الانتقالَ **لم يُغيّر مظهراً** عند `--d:1`.
   ولا متصفّح: هذا فحصُ قاعدةٍ في الملفّ لا قياسُ بكسلٍ على شاشةٍ —
   الأثرُ المرئيُّ مكانُه «لم يُتحقَّق منه» (audit/08).
   التشغيل:  node js/tests/tokens.test.js                            */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,eq,summary} from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const TOK=rd("css/tokens.css"), HTML=rd("index.html");

/* الملفّاتُ المهاجَرةُ: قشرةُ الواجهةِ وحدَها — وهي ما تعنيه الكثافةُ
   فعلاً. والنوافذُ المنفردةُ (دليلٌ · ترحيبٌ · تقريرٌ · ثلاثيٌّ …)
   مؤجَّلةٌ بإعلانٍ لا بإغفالٍ، ولا كثافةَ تلزمها. */
const MIG=["base","ribbon","dock","status","cmd","tools","panels","palette","util"];
/* درجاتُ السلّم: مبنيّةٌ على القيَمِ المستعملةِ فعلاً لا على سلّمِ ٤
   نقيٍّ — إذ كان النقيُّ سيُزيح ٦ إلى ٨ و١٠ إلى ١٢، وذاك تغييرٌ
   بصريٌّ لا أتحقّق منه بلا متصفّح. */
const SCALE=[1,2,3,4,5,6,8,10,12,14,16];
/* القيَمُ الباقيةُ خارجَ السلّمِ — مُثبَّتةٌ لتنقصَ لا لتزيد. */
const OFFMAX={base:6,ribbon:7,dock:3,status:1,tools:2,palette:1,cmd:0,panels:0,util:0};
const OFFTOTAL=20;
const PROP=/^\s*(padding|margin|gap|row-gap|column-gap|padding-block|padding-inline|margin-block|margin-inline|inset|inset-block|inset-inline|top|bottom)(-[a-z]+)?\s*:([^;{}]*)/;

/* يُقرأ كلُّ سطرٍ، ويُطرَح منه ما كان داخلَ var() أو calc() لأنّه
   مُرمَّزٌ أصلاً، ثمّ تُحصى البكسلاتُ الحرفيّةُ الباقية. */
function scan(name){
 const on=[],off=[],neg=[];
 for(const ln of rd("css/"+name+".css").split("\n")){
  const m=PROP.exec(ln); if(!m) continue;
  const v=m[3].replace(/var\([^)]*\)/g,"").replace(/calc\([^)]*\)/g,"");
  for(const g of v.matchAll(/(-?)(\d+(?:\.\d+)?)px/g)){
   const px=+g[2], rec=name+": "+ln.trim().slice(0,70);
   if(g[1]==="-") neg.push(rec);
   else if(SCALE.includes(px)) on.push(rec);
   else off.push(rec);
  }
 }
 return {on,off,neg};
}
const SC={}; for(const n of MIG) SC[n]=scan(n);

group("الملفُّ والترتيب",()=>{
 ok(/--d:\s*1\b/.test(TOK),"المضاعفُ الأساسُ واحدٌ — فالمظهرُ كما كان حرفاً");
 ok(/href="css\/tokens\.css"/.test(HTML),"الجدولُ مرتبطٌ في الصفحة");
 /* الترتيبُ معنى: الرموزُ قبلَ من يستعملُها، وإلّا قُرِئت فارغةً. */
 const order=[...HTML.matchAll(/href="css\/([a-z0-9-]+)\.css"/g)].map(m=>m[1]);
 const iT=order.indexOf("tokens");
 ok(iT>=0,"tokens في سلسلةِ التحميل");
 for(const n of ["theme",...MIG])
  ok(iT<order.indexOf(n),`tokens قبلَ ${n}`);
 /* boot.css وحدَه قبلَه: شاشةُ الإقلاعِ لا تنتظر جدولاً. */
 eq(order.filter((n,i)=>i<iT).join(","),"boot","boot وحدَه يسبقُ الجدول");
});

group("السلّم",()=>{
 for(const s of SCALE){
  const nm=s===1?"--s-px":"--s-"+s;
  const re=new RegExp(nm.replace(/-/g,"\\-")+":\\s*calc\\(\\s*"+s+"px\\s*\\*\\s*var\\(--d\\)\\s*\\)");
  ok(re.test(TOK),`${nm} = ${s}px × الكثافة`);
 }
 /* لا درجةَ بلا مضاعفٍ: درجةٌ ثابتةٌ تكسر الكثافةَ صامتةً. */
 const degs=[...TOK.matchAll(/(--s-[a-z0-9]+)\s*:\s*([^;]+);/g)];
 eq(degs.length,SCALE.length,"عددُ الدرجاتِ هو عددُ السلّمِ بلا زيادة");
 for(const [,nm,val] of degs)
  ok(/var\(--d\)/.test(val),`${nm} يُضرَب بالكثافة`);
 ok(/--r-pill:\s*999px/.test(TOK),"نصفُ القطرِ القرصيُّ مُرمَّز");
});

group("لا بكسلَ على السلّمِ مبثوثاً",()=>{
 for(const n of MIG){
  const on=SC[n].on;
  eq(on.length,0,`css/${n}.css بلا قيمةِ سلّمٍ حرفيّةٍ`+(on.length?" — "+on[0]:""));
 }
});

group("الاستثناءاتُ مُعلَنةٌ ومُثبَّتة",()=>{
 let tot=0;
 for(const n of MIG){
  const c=SC[n].off.length; tot+=c;
  ok(c<=OFFMAX[n],`css/${n}.css: ${c} ≤ ${OFFMAX[n]} خارجَ السلّم`);
 }
 ok(tot<=OFFTOTAL,`المجموعُ ${tot} ≤ ${OFFTOTAL} — النقصُ مرحَّبٌ والزيادةُ تُفشِل`);
 /* الشعرةُ السالبةُ الوحيدةُ: تُلاصِق التبويبَ بجسمِه، ولو ضُرِبت
    بالكثافةِ بانَ الخطُّ. استثناءٌ بإعلانٍ لا بإغفال. */
 const neg=MIG.flatMap(n=>SC[n].neg);
 ok(neg.length<=2,`إزاحتان سالبتان لا أكثرُ (${neg.length})`);
 /* وكلُّ سالبةٍ تحمل تعليلَها في سطرِها: السالبُ يُقاس بما يُلاصِقه
    لا بالفراغِ، فضربُه بالكثافةِ يُفكُّ اللصوق. */
 for(const n of MIG)
  for(const ln of rd("css/"+n+".css").split("\n")){
   if(!PROP.test(ln)) continue;
   const v=ln.replace(/var\([^)]*\)/g,"").replace(/calc\([^)]*\)/g,"");
   if(/-\d+(\.\d+)?px/.test(v))
    ok(/\/\*/.test(ln),`${n}: السالبةُ مُعلَّلةٌ في موضعِها`);
  }
 /* وما خرج عن السلّمِ معلَنٌ في ترويسةِ الجدولِ لا في ذاكرتي. */
 ok(/٧|٩|١١|١٣|١٨|٢٠|٢٢|٢٦/.test(TOK),"القيَمُ خارجَ السلّمِ مذكورةٌ في الترويسة");
 ok(/لا سلّمُ ٤ بكسلٍ نقيّ|سلّمٌ نقيّ/.test(TOK),"سببُ رفضِ السلّمِ النقيِّ مكتوب");
});

group("الكثافاتُ الثلاث",()=>{
 const blocks=[...TOK.matchAll(/\[data-density="([a-z]+)"\]\s*\{([^}]*)\}/g)];
 eq(blocks.length,2,"كتلتان فقط — والمريحةُ غيابُ السمةِ لا قيمةٌ ثالثة");
 const seen=blocks.map(b=>b[1]).sort().join(",");
 eq(seen,"compact,touch","المدمَجةُ واللمسيّةُ");
 for(const [,name,body] of blocks){
  /* الكثافةُ تضغط الفراغَ لا تُعيد تصميمَ الشاشة: مضاعفٌ واحدٌ
     ولا لونٌ ولا طبقةٌ ولا خطّ. */
  const decls=body.split(";").map(s=>s.trim()).filter(Boolean);
  eq(decls.length,1,`${name}: إعلانٌ واحدٌ`);
  ok(/^--d:/.test(decls[0]),`${name}: المضاعفُ وحدَه`);
  ok(!/--c|color|--z-|font|background/.test(body),`${name}: لا لونَ ولا طبقةَ ولا خطّ`);
  const v=parseFloat(decls[0].split(":")[1]);
  ok(v>0.7&&v<1.35,`${name}: المضاعفُ ${v} في حدٍّ معقول`);
 }
});

group("أهدافُ اللمسِ لا تُضغَط",()=>{
 /* P5-001: ٤٤ بكسلاً مفروضةٌ بـmin-height لا بالحشو. فلو صارت
    درجةً في السلّمِ لأكلتها «المدمَجة». الحارسُ يمنع ذلك. */
 ok(!SCALE.includes(44),"٤٤ ليست درجةً في السلّم");
 let hits=0, bad=[];
 for(const n of MIG)
  for(const ln of rd("css/"+n+".css").split("\n")){
   if(!/min-(height|width)|min-block-size|min-inline-size/.test(ln)) continue;
   if(/44px|var\(--tap\)/.test(ln)) hits++;
   if(/min-(height|block-size)\s*:\s*var\(--s-/.test(ln)) bad.push(n+": "+ln.trim());
  }
 ok(hits>0,"أهدافُ ٤٤ قائمةٌ في القشرة");
 eq(bad.length,0,"لا هدفَ لمسٍ مربوطٌ بالكثافة"+(bad.length?" — "+bad[0]:""));
});

group("سلّمُ الحركةِ مستعمَلٌ لا مُعلَنٌ وحده",()=>{
 /* ═══ درسٌ من هذه الدفعة ═══
    `--t-fast` و`--t-slow` أُعلِنا في المرحلةِ ٣ و**لم يُستعمَلا قطُّ**:
    رمزانِ ميّتانِ مرَّ عليهما الحارسُ لأنّه فحص **الإعلانَ** ولا
    الاستعمال. فكلُّ رمزٍ هنا يُفحَص مستعمَلاً — كما يفعل `cover.js`
    بالرموزِ المُصدَّرة. */
 const CSS=MIG.concat(["theme","touch","helpbot","panels"])
  .map(n=>rd("css/"+n+".css")).join("\n");
 for(const k of ["--t-fast","--t-sm","--t-slow","--t-sheet","--press",
  "--sunken","--ring"])
  ok(CSS.includes(`var(${k})`),`${k} مستعمَلٌ فعلاً لا مُعلَنٌ وحده`);
 /* والمكسبُ الأكبرُ: ٥٤ مدّةً مبثوثةً كانت تتجاهل تقليلَ الحركةِ.
    فالمتبقّي مبثوثاً يُثبَّت ليَنقُص: وكلُّه في `boot.css` الذي
    **يُحمَّل قبل** جدولِ الرموزِ فلا يقرأ رمزاً — استثناءٌ بإعلان. */
 const order=[...rd("index.html").matchAll(/href="css\/([a-z0-9-]+)\.css"/g)]
  .map(m=>m[1]);
 ok(order.indexOf("boot")<order.indexOf("tokens"),
    "boot.css قبلَ الرموزِ — فاستثناؤه سببٌ لا إغفال");
 let raw=0, where=[];
 for(const n of ["base","ribbon","dock","status","cmd","tools","panels",
  "palette","util","theme","touch","helpbot","modern","guide","welcome",
  "blocks","history","view3d","report","pricing","tour","underlay"]){
  const s=rd("css/"+n+".css");
  for(const m of s.matchAll(/transition(?:-duration)?\s*:([^;}]*)/g)){
   /* `0s` تأخيرٌ مقصودٌ لا مدّةٌ تُرمَّز (إظهارُ/إخفاءُ visibility) */
   const v=m[1].replace(/\bvar\([^)]*\)/g,"").replace(/\b0s\b/g,"");
   const hits=v.match(/[\d.]+m?s/g);
   if(hits){raw+=hits.length; where.push(n+":"+hits.join("/"))}
  }
 }
 eq(raw,0,"صفرُ مدّةٍ مبثوثةٍ خارجَ boot"+(raw?" — "+where[0]:""));
 /* ولا رمزَ مدّةٍ يفلت من تقليلِ الحركة: هذا هو عقدُ الكتلة. */
 const rm=/@media\s*\(prefers-reduced-motion:reduce\)\s*\{([\s\S]*?)\}\s*\}/
  .exec(TOK)[1];
 for(const k of ["--t","--t-fast","--t-sm","--t-slow","--t-sheet"])
  ok(new RegExp(k.replace(/-/g,"\\-")+":\\s*1ms").test(rm),
     `${k} تُصفَّر مع تقليلِ الحركة`);
});

group("لمساتُ المتصفّحِ الأصيلة",()=>{
 /* أربعُ خصائصَ تُغيِّر الإحساسَ ولا تُزيح بكسلاً: لا تخطيطَ تمسُّه
    ولا تباينَ تخفضه — فهي خارجُ «تجميلٍ بلا قياس». */
 for(const [k,why] of [
  ["accent-color","الضوابطُ الأصيلةُ بلونِ العلامةِ لا بأزرقِ النظام"],
  ["caret-color","ومؤشّرُ الكتابةِ كذلك"],
  ["scrollbar-color","وأشرطةُ التمريرِ من `--thumb` القائمِ للسمتَين"],
  ["::selection","وتحديدُ النصِّ بلونِ العلامةِ الهادئ"]])
  ok(TOK.includes(k),why);
 ok(/scrollbar-width:thin/.test(TOK),"والشريطُ رقيقٌ لا عريض");
 /* وميضُ اللمسِ الرماديُّ يُطفأ **على اللمسِ وحدَه**: إطفاؤه على
    الماوسِ لا معنى له، ووضعُه في استعلامٍ عامٍّ يُفقِد القصدَ. */
 ok(/@media \(pointer:coarse\)\{[\s\S]{0,160}tap-highlight-color:transparent/
    .test(TOK),"ووميضُ اللمسِ يُطفأ على اللمسِ وحدَه");
 /* ورجعُ الضغطِ يبقى: إطفاءُ الوميضِ بلا رجعٍ يجعل النقرةَ صامتةً. */
 ok(/:active\{[^}]*var\(--press\)|var\(--press\)/.test(rd("css/ribbon.css")),
    "ورجعُ الضغطِ قائمٌ فلا تصير النقرةُ صامتة");
 /* وطلبُ تباينٍ أعلى يُستجاب له، وهو تفضيلٌ لا نقطةُ توقفٍ بالعرضِ
    فلا سطرَ يلزمه في مصفوفةِ الأجهزة (P5-011). */
 ok(/@media \(prefers-contrast:more\)/.test(TOK),"وتباينٌ أعلى لمن طلبه");
 ok(/--ring-w:3px/.test(TOK),"وحلقةُ تركيزٍ أسمكُ معه");
});

group("المدّاتُ الزمنية",()=>{
 const f=/--t-fast:\s*(\d+)ms/.exec(TOK), s=/--t-slow:\s*(\d+)ms/.exec(TOK);
 ok(f&&s,"المدّتان مُعلَنتان");
 eq(+f[1],120,"السريعُ ١٢٠ms — حدُّ الخطّةِ الأدنى");
 eq(+s[1],180,"البطيءُ ١٨٠ms — حدُّها الأعلى");
 /* والدرجتانِ المضافتانِ من القياسِ: ١٤٠ هي الأشيعُ (٣٠ موضعاً من
    ٥٤)، و٢٦٠ مدّةُ الورقةِ السفليةِ القائمةُ سلفاً. والخطّةُ أعلنت
    نطاقاً ١٢٠–١٨٠ **للحركةِ الصغيرة**، والورقةُ تدخل الشاشةَ كاملةً
    فلها مدّتُها — استثناءٌ بسببٍ لا تجاوزٌ. */
 const m=/--t-sm:\s*(\d+)ms/.exec(TOK), sh=/--t-sheet:\s*(\d+)ms/.exec(TOK);
 eq(+m[1],140,"والأشيعُ ١٤٠ms — من القياسِ لا من الذوق");
 eq(+sh[1],260,"وورقةُ الهاتفِ ٢٦٠ms كما كانت");
 ok(+f[1]<+m[1]&&+m[1]<+s[1]&&+s[1]<+sh[1],"والسلّمُ مرتَّبٌ صاعداً");
 ok(+f[1]<+s[1],"السريعُ أسرعُ من البطيء");
 /* ومن طلب تقليلَ الحركةِ يُستجَب له مرّةً واحدةً هنا لا في كلِّ ملفّ. */
 const rm=/@media\s*\(prefers-reduced-motion:reduce\)\s*\{([\s\S]*?)\}\s*\}/.exec(TOK);
 ok(rm,"كتلةُ تقليلِ الحركةِ موجودة");
 for(const v of ["--t","--t-fast","--t-slow"])
  ok(new RegExp(v.replace(/-/g,"\\-")+":\\s*1ms").test(rm[1]),`${v} تُصفَّر`);
});

group("الوصلُ في الشيفرة",()=>{
 const wire=rd("js/ui/ribbon/wire.js"), st=rd("js/ui/store.js"),
       app=rd("js/app.js"), sch=rd("js/ui/ribbon/schema.js"),
       ico=rd("js/ui/icons.js");
 ok(/export const DENSITIES=\["comfy","compact","touch"\]/.test(wire),
    "القائمةُ مصدرٌ واحدٌ في الشيفرة");
 ok(/removeAttribute\("data-density"\)/.test(wire),
    "المريحةُ تُزيل السمةَ — الغيابُ هو الأساسُ لا قيمةٌ ثالثة");
 ok(/density:"comfy"/.test(st),"الأساسُ محفوظٌ في التفضيلات");
 ok(/\^\(comfy\|compact\|touch\)\$/.test(st),"قيمةٌ فاسدةٌ تُردُّ إلى الأساس");
 ok(/applyDensity\(\)/.test(app),"تُطبَّق عند الإقلاعِ لا عند أوّلِ نقرةٍ");
 /* المرحلة ٤ نقلت ضبطَ البرنامجِ إلى قائمةِ التطبيق، والكثافةُ منه.
    فبيتُها مُعلَنٌ في `HOME_MENU` ومعروضٌ في `appmenu.js` — والحارسُ
    يفرض الأمرَين فلا يُعلَن ما لا يُرى ولا يُعرَض ما لا بيتَ له. */
 ok(/"density"/.test(sch),"للكثافةِ بيتٌ معلَنٌ في المخطَّط");
 ok(/act:"density"/.test(rd("js/ui/appmenu.js")),
    "وصفٌّ ظاهرٌ في قائمة التطبيق");
 ok(/\bdensity:'/.test(ico),"وللزرِّ أيقونة");
 ok(/density:\s*\{fn:\(\)=>densityCycle\(\)\}/.test(wire),"الزرُّ موصولٌ بالدوران");
});

group("نصفُ القطرِ القرصيّ",()=>{
 /* ٩٩٩px كان مبثوثاً خمسَ مرّاتٍ؛ بقيت واحدةٌ في نافذةٍ مؤجَّلةٍ. */
 let raw=0;
 for(const n of MIG) raw+=(rd("css/"+n+".css").match(/999px/g)||[]).length;
 eq(raw,0,"لا ٩٩٩px حرفيّةً في القشرة");
 ok(/var\(--r-pill\)/.test(rd("css/ribbon.css")+rd("css/base.css")+rd("css/palette.css")+rd("css/util.css")),
    "القشرةُ تستعمل الرمزَ");
});

process.exit(summary()?1:0);
