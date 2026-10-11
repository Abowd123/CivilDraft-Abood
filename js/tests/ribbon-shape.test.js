/* ═══ حارسُ شكلِ الشريط ═══ حرسُ المرحلةِ ٤ (audit/10-ui-plan.md)
   الدّعاوى التي يحرسها:
     ١) سبعةُ تبويباتٍ: ستَّةٌ بالوظيفةِ وسابعٌ للإدارة.
     ٢) **خمسةُ ألواحٍ لكلِّ تبويبٍ** لا أكثر (كان `arch` تسعةً).
     ٣) **ثلاثون عنصراً مقروءاً** لكلِّ تبويبٍ لا أكثر (كان ٧٣).
     ٤) **لا أمرَ في لوحَين** (كان ٣٣ مكرّراً في «رئيسي»).
     ٥) لا عمودَ `G()` في الشريطِ الأساسيِّ — ثلاثةُ مقاساتٍ ظاهرة.
     ٦) **لا أداةَ ضاعت في النقل**: جدولُ الهجرةِ يقابل الجردَ القديم.
   ولا متصفّح: فحصُ بنيةٍ في الوصفِ لا قياسُ بكسلٍ على شاشة.
   التشغيل:  node js/tests/ribbon-shape.test.js                      */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>{try{return readFileSync(join(ROOT,p),"utf8")}catch(e){return ""}};

shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv");
 DOC.body.appendChild(cv);}
if(!globalThis.window)
 globalThis.window={prompt:()=>null,confirm:()=>true};
for(const f of ["draw","sketch","openings","parts","roof","areas","modify",
 "annotate","ref","boq","boqreport","elev","section","sheet","clouds",
 "groups","macros"])await import(`../tools/${f}.js`);
for(const f of ["hygiene","gate","levelManager","styleManager",
 "underlayPanel","pricingPanel","view3d","appcmds","viewcmds",
 "blockpanel"])await import(`../ui/${f}.js`);
const R =await import("../tools/registry.js");
const S =await import("../ui/ribbon/schema.js");
const AC=await import("../ui/appcmds.js");
const AM=await import("../ui/appmenu.js");

const WORK=["draw","edit","annt","serv","view","out"];
const MIG="audit/11-ui-migration.md";

group("التبويباتُ السبعة",()=>{
 const ids=S.tabIds();
 eq(ids.length,7,"سبعةٌ لا أكثرَ ولا أقلّ");
 for(const w of WORK)ok(ids.includes(w),`تبويبٌ وظيفيّ: ${w}`);
 ok(ids.includes("mng"),"وسابعٌ للإدارة");
 /* «رئيسي» حُذِف: كان ٤٤ عنصراً ٣٣ منها نسخةٌ، وسطحُ التسريعِ صار
    شريطَ «مؤخّراً» الذي يتعلَّم (المرحلة ١) لا قائمةً خمَّنها كاتبٌ. */
 ok(!ids.includes("home"),"ولا «رئيسي» — حُذِف بسببٍ مقيس");
 ok(/RECENT_MAX/.test(rd("js/ui/recentbar.js")),
    "وبديلُه شريطُ «مؤخّراً» قائمٌ فعلاً");
 /* الترتيبُ ترتيبُ عملٍ: ارسم · عدّل · أشِر · أضِف · انظر · أخرِج. */
 eq(ids.slice(0,6).join(","),WORK.join(","),"وترتيبُها ترتيبُ عمل");
});

group("خمسةُ ألواحٍ وثلاثون عنصراً",()=>{
 eq(S.RB_MAX_PANELS,5,"الحدُّ مُصدَّرٌ لا مبثوثٌ في الحارسِ وحده");
 eq(S.RB_MAX_READ,30,"وحدُّ المقروءِ كذلك");
 for(const t of S.tabShape()){
  ok(t.panels<=S.RB_MAX_PANELS,
     `${t.id}: ${t.panels} لوحاً ≤ ${S.RB_MAX_PANELS}`);
  ok(t.read<=S.RB_MAX_READ,
     `${t.id}: ${t.read} عنصراً مقروءاً ≤ ${S.RB_MAX_READ}`);
  /* شبكةُ مكتبةٍ تُمسَح بالعينِ، لكنّها ليست بلا حدٍّ: خمسةَ عشرَ
     رمزاً في ثلاثةِ صفوفٍ خمسةُ أعمدةٍ تُلتقَط لمحاً، وثلاثون لا. */
  ok(t.maxLib<=S.RB_MAX_LIB,
     `${t.id}: أكبرُ شبكةٍ ${t.maxLib} ≤ ${S.RB_MAX_LIB}`);
 }
 /* ولا لوحَ فارغٍ: لوحٌ بذيلِه وبلا بلاطةٍ خطأُ تحريرٍ لا تصميم. */
 for(const t of S.RIBBON)
  for(const p of t.panels||[])
   ok((p.items||[]).length>0,`${t.id}/${p.id}: ليس فارغاً`);
});

group("لا أمرَ في لوحَين",()=>{
 const d=S.ribbonDups();
 eq(d.length,0,"صفرُ تكرارٍ في الشريط"
  +(d.length?" — "+d.slice(0,5).map(x=>x.key+"@"+x.at.join("+")).join(" · "):""));
 /* وأسطحُ التسريعِ ثلاثةٌ **مُعلَنةٌ** لا استثناءٌ يُنسى: السياقيُّ
    وشريطُ الوصولِ السريعِ وقائمةُ التطبيق. وكلٌّ منها بيتٌ يعرفه
    `homeOf` — فالاستثناءُ معلَنٌ ومُفيدٌ لا ثقبٌ في القاعدة. */
 ok(Object.keys(S.CTX).length>=15,"السياقيُّ سطحُ تسريعٍ (١٥ نوعاً)");
 ok(S.QAT.filter(x=>!x.sep).length>0,"وشريطُ الوصولِ السريع");
 ok(S.HOME_MENU.length>0,"وقائمةُ التطبيق");
});

group("ثلاثةُ مقاساتٍ كلُّها ظاهرة",()=>{
 const sh=S.ribbonShape();
 eq(sh.groups,0,"لا عمودَ مجموعةٍ في الشريطِ الأساسيّ");
 eq(sh.flatPct,100,"فكلُّ عنصرٍ ظاهرٌ مباشرةً");
 /* والمقاساتُ الثلاثةُ مستعملةٌ فعلاً: مقاسٌ مُعلَنٌ لا يُستعمَل
    تعريفٌ ميّتٌ، ومقاسٌ واحدٌ لكلِّ شيءٍ يُلغي معنى التمييز. */
 let b=0,m=0,s=0;
 for(const t of S.RIBBON)for(const p of t.panels||[])for(const i of p.items||[]){
  if(i.big)b++; else if(i.sm)s++; else m++;
 }
 ok(b>20,`كبيرةٌ مستعملةٌ (${b})`);
 ok(m>20,`ومتوسّطةٌ (${m})`);
 ok(s>30,`وصغيرةٌ للمكتبات (${s})`);
 /* ولا بلاطةَ كبيرةٌ وصغيرةٌ معاً: تعريفٌ متضاربٌ يُرسَم بأحدِهما
    صامتاً، فالتضاربُ يُسقِط البناءَ لا يُحَلّ بالصمت. */
 for(const t of S.RIBBON)for(const p of t.panels||[])for(const i of p.items||[])
  ok(!(i.big&&i.sm),`${t.id}/${p.id}/${i.cmd||i.act}: مقاسٌ واحدٌ`);
 /* والمصيّرُ يعرف الثلاثةَ: صنفٌ لكلِّ مقاسٍ وشبكةٌ تجمع الصغيرة. */
 const rn=rd("js/ui/ribbon/render.js");
 ok(/rbIc/.test(rn)&&/rbGrid/.test(rn),"والمصيّرُ يرسم الصغيرةَ في شبكة");
 ok(/aria-label=/.test(rn),"ويُعطيها تسميةً لقارئِ الشاشة");
 ok(/\.rbIc\{/.test(rd("css/ribbon.css")),"ولها تنسيقٌ");
 ok(/\.rbIc\{inline-size:44px/.test(rd("css/touch.css")),
    "وهي هدفُ لمسٍ ٤٤ بكسلاً على اللمس (P5-001)");
});

group("قائمةُ التطبيقِ بيتٌ لا ينجرف",()=>{
 /* المُعلَنُ في المخطَّطِ والمعروضُ في القائمةِ يجب أن يتطابقا، وإلّا
    أُعلِن بيتٌ لا يُرى أو عُرِض صفٌّ بلا بيت. المقابلةُ **في
    الاتجاهَين** — هذا هو الدرسُ الذي كلّفَنا المرحلةَ ٢. */
 const shown=new Set(AM.ROWS.filter(r=>r&&r.act).map(r=>r.act));
 for(const k of S.HOME_MENU)
  ok(shown.has(k),`المُعلَنُ ${k} معروضٌ في القائمة`);
 /* والعكسُ أرحبُ: القائمةُ تكرّر أفعالاً لها بيوتٌ في الشريطِ (ملفٌّ
    وتصديرٌ وفحصٌ) وهي سطحُ تسريعٍ فلها ذلك — لكن ما ليس له بيتٌ في
    الشريطِ **يجب** أن يكون في `HOME_MENU` وإلّا صار بلا بيت. */
 const inRibbon=new Set([...S.ribbonActs(),...S.ribbonCmds()]);
 const dec=new Set(S.HOME_MENU);
 for(const a of shown)
  ok(inRibbon.has(a)||dec.has(a),`صفُّ القائمةِ ${a} له بيتٌ معلَن`);
});

group("لا أداةَ ضاعت في النقل",()=>{
 /* الحارسُ الأهمُّ: إعادةُ كتابةِ ٢٠٩ عناصرَ قد تُسقِط واحداً صامتاً.
    فالجردُ القديمُ محفوظٌ في جدولِ الهجرةِ (audit/11-ui-migration.md)
    **بمفاتيحه**، وهنا يُقابَل بالواقع: كلُّ مفتاحٍ في الجدولِ له
    بيتٌ اليوم، وكلُّ مفتاحٍ له بيتٌ اليومَ مذكورٌ في الجدول. */
 const md=rd(MIG);
 ok(md.length>2000,"جدولُ الهجرةِ موجودٌ ومكتوب");
 /* خمسةُ أعمدةٍ: مفتاحٌ · تسميةٌ · بيتٌ قديمٌ · بيتٌ جديدٌ · مقاس */
 const rows=[...md.matchAll(/^\|\s*`([act]:[^`]+)`\s*\|([^|]*)\|([^|]*)\|([^|]*)\|/gm)]
  .map(m=>({key:m[1].trim(),old:m[3].trim(),nw:m[4].trim()}));
 ok(rows.length>=200,`الجدولُ يغطّي ${rows.length} مدخلاً (٢٠٩ قديمةً)`);
 const now=new Map();
 for(const t of S.RIBBON)for(const p of t.panels||[])for(const i of p.items||[]){
  const k=i.cmd!=null?("c:"+i.cmd):(i.act?("a:"+i.act):(i.tog?("t:"+i.tog):""));
  if(k)now.set(k,`${t.id}/${p.id}`);
 }
 let moved=0,out=0;
 for(const r of rows){
  if(now.has(r.key)){
   eq(now.get(r.key),r.nw,`${r.key}: الجدولُ يطابق الواقع`);
   if(r.old!==r.nw)moved++;
  }else{
   /* ما خرج من الشريطِ يُعلَن بيتُه الجديدَ نصّاً — لا يُحذَف سطرُه. */
   ok(/قائمة|وصول|سياقيّ/.test(r.nw),`${r.key}: بيتُه الجديدُ معلَنٌ (${r.nw})`);
   out++;
  }
 }
 ok(moved>0,`${moved} مدخلاً تغيّر بيتُه`);
 ok(out>0,`و${out} خرج من الشريطِ ببيتٍ معلَن`);
 /* ولا مدخلَ في الشريطِ اليومَ غائبٌ عن الجدول: الجدولُ مرجعُ المراجعةِ
    فلو نقص سطرٌ لَمَا راجع أحدٌ ذلك القرار. */
 const inTable=new Set(rows.map(r=>r.key));
 for(const k of now.keys())
  ok(inTable.has(k),`${k} مذكورٌ في جدولِ الهجرة`);
});

group("الوصولُ لم ينكسر",()=>{
 /* إعادةُ الكتابةِ لا قيمةَ لها إن ضاعت أداةٌ: هذا هو العقدُ نفسُه
    الذي يحرسه `ui-reach`، ويُعاد هنا على **كلِّ** الأدواتِ لأنّ
    المرحلةَ ٤ هي بعينها من قد يكسره. */
 const ids=[...new Set(R.toolList().filter(d=>d&&d.id).map(d=>d.id))];
 ok(ids.length>=150,`${ids.length} أداةً مسجَّلة`);
 const none=ids.filter(id=>!S.homeOfTool(id,AC.ACTOF));
 eq(none.length,0,"صفرُ أداةٍ بلا بيت"
  +(none.length?" — "+none.slice(0,6).join(" · "):""));
 /* والبيتُ يُقرَأ نصّاً: «لا أعرف» لا تنفع من يسأل أين الأداة. */
 for(const id of ids.slice(0,12)){
  const h=S.homeOfTool(id,AC.ACTOF);
  ok(h&&h.path&&h.path.length>2,`${id}: بيتُه يُقرأ (${h&&h.path})`);
 }
});

process.exit(summary()?1:0);
