/* ═══ حارسُ الجوّالِ واللمس ═══ حرسُ المرحلةِ ٧ (audit/10-ui-plan.md)
   شرطُ الإقفالِ المكتوبُ في الخطّة: **«حرّاسُ الجوّالِ القائمةُ تبقى
   خضراءَ، ويُضاف: كلُّ أداةٍ تُستعمَل بإصبعٍ واحدةٍ على ٣٦٠ بكسلاً»**.

   و«بإصبعٍ واحدةٍ» تُقاس بسلسلةٍ لا بالرأي، وكلُّ حلقةٍ منها تُفحَص
   هنا: على ٣٦٠ بكسلاً يوجد سطحٌ **أسفلَ الشاشةِ** (شريطُ الإبهام)،
   وفيه **بحثٌ** هدفُه ٤٤ بكسلاً، والبحثُ يفتح لوحةَ الأوامرِ، ولوحةُ
   الأوامرِ تُغطّي **كلَّ** أداةٍ مسجَّلة (أثبتَته المرحلةُ ١). فإن
   صدقت الحلقاتُ صدقت الدّعوى، وإن انكسرت واحدةٌ سقط البناء.
   ولا متصفّح: فحصُ بنيةٍ وقاعدةٍ لا قياسُ بكسلٍ على شاشة.
   التشغيل:  node js/tests/thumb.test.js                            */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>{try{return readFileSync(join(ROOT,p),"utf8")}catch(e){return ""}};
const TC=rd("css/touch.css"), HTML=rd("index.html");
/* استخراجُ كتلةِ قاعدةٍ بأقواسِها المتوازنةِ — لا regex يتعثّر بالتعشيش */
const block=(css,q)=>{
 const i=css.indexOf(q); if(i<0)return "";
 let d=0,k=css.indexOf("{",i),s=k;
 for(;k<css.length;k++){ if(css[k]==="{")d++; else if(css[k]==="}"){d--; if(!d)break} }
 return css.slice(s,k+1);
};
const PHONE="@media (max-width:768px)";

shim(); shimCanvas();
const doc=shimDOM();
for(const id of ["thumb","recent","cv"]){
 const e=doc.createElement(id==="cv"?"canvas":"div");
 e.setAttribute("id",id); doc.body.appendChild(e);
}
if(!globalThis.window)
 globalThis.window={prompt:()=>null,confirm:()=>true};
for(const f of ["draw","sketch","openings","parts","roof","areas","modify",
 "annotate","ref","boq","boqreport","elev","section","sheet","clouds",
 "groups","macros"])await import(`../tools/${f}.js`);
for(const f of ["hygiene","gate","levelManager","appcmds","viewcmds",
 "blockpanel"])await import(`../ui/${f}.js`);
const R =await import("../tools/registry.js");
const RB=await import("../ui/recentbar.js");
const ST=await import("../ui/store.js");
const S =await import("../ui/ribbon/schema.js");
const AC=await import("../ui/appcmds.js");

group("سطحٌ في منطقةِ الإبهام",()=>{
 ok(/id="thumb"/.test(HTML),"شريطُ الإبهامِ في الصفحة");
 ok(/role="toolbar"/.test(HTML.slice(HTML.indexOf('id="thumb"')-120,
   HTML.indexOf('id="thumb"')+120)),"وله دورُ شريطِ أدوات");
 /* مخفيٌّ على الحاسوبِ ومُظهَرٌ على الهاتفِ: سطحٌ واحدٌ يُرى. */
 ok(/#thumb\{display:none\}/.test(TC),"مخفيٌّ افتراضاً");
 const ph=TC.slice(TC.indexOf("#thumb{display:none}"));
 const b=block(ph,"#thumb{\n    position:fixed")||block(ph,"  #thumb{");
 ok(/position:fixed/.test(b),"ومثبَّتٌ لا يتبع التمرير");
 /* **أسفلَ** الشاشةِ لا أعلاها: هذا هو جوهرُ المرحلة. */
 ok(/bottom:calc\(var\(--rbH/.test(b),
    "وموضعُه من الأسفلِ بارتفاعِ الشريطِ المنشور");
 ok(!/\btop\s*:/.test(b),"ولا يُقاس من الأعلى");
 /* و«مؤخّراً» في الترويسةِ يُخفى فلا سطحانِ لشيءٍ واحد. */
 ok(/#recent\{display:none ?!important\}/.test(TC),
    "و«مؤخّراً» الأعلى يُخفى على الهاتف");
 /* ولا يركب الشريطَ السفليَّ ولا يُركَب: الثلاثةُ تتراصف بـ--rbH. */
 for(const sel of ["hb-fab","#fabDock"])
  ok(new RegExp(sel.replace("#","#")+"[^}]*var\\(--rbH").test(TC),
     `${sel} يحسب ارتفاعَ الشريطِ فلا يتراكب`);
});

group("كلُّ هدفٍ فيه ٤٤ بكسلاً",()=>{
 /* P5-001: الشريطُ وُجِد ليُنقَر بالإبهام، فهدفٌ أصغرُ من ٤٤ يُفقِده
    سببَ وجوده. والقاعدةُ تُقرأ من الملفِّ لا من الذاكرة. */
 const b=block(TC,"#thumb button{");
 ok(b.length>0,"لأزرارِه قاعدةٌ صريحة");
 ok(/inline-size:44px/.test(b)&&/block-size:44px/.test(b),
    "٤٤ × ٤٤ بكسلاً");
 ok(/focus-visible/.test(TC),"وللتركيزِ حلقةٌ مرئيّة");
 /* والشريطُ يُمرَّر أفقياً عند الضيقِ ولا يفيض خارجَ الشاشة: سبعةُ
    أهدافٍ × ٤٤ = ٣٠٨ + الفواصلُ تقارب ٣٦٠ بكسلاً بالضبط. */
 const t=block(TC,"  #thumb{");
 ok(/overflow-x:auto/.test(t),"ويُمرَّر أفقياً عند الضيق");
 ok(/max-width:96vw/.test(t),"ولا يفيض عن الشاشة");
 eq(RB.QUICK_N+1,7,"سبعةُ أهدافٍ: بحثٌ وستُّ أدوات");
 ok((RB.QUICK_N+1)*44<=360,
    `${(RB.QUICK_N+1)*44} بكسلاً ≤ ٣٦٠ — يسع الشاشةَ المرجعية`);
});

group("الأدواتُ السريعةُ ستٌّ دائماً",()=>{
 eq(RB.QUICK_N,6,"ستٌّ — الرقمُ مُصدَّرٌ لا مبثوث");
 /* البذرةُ مُعلَنةٌ وحيّةٌ: معرّفٌ ميّتٌ فيها يعني زرّاً يكسر. */
 eq(RB.QUICK_SEED.length,RB.QUICK_N,"والبذرةُ تكفي لملءِ الستّ");
 for(const id of RB.QUICK_SEED)
  ok(!!R.findTool(id),`بذرةٌ حيّةٌ: ${id}`);
 eq(new Set(RB.QUICK_SEED).size,RB.QUICK_SEED.length,"ولا تكرارَ فيها");
 /* السجلُّ فارغٌ ⇒ الشريطُ **ليس** فارغاً: هذا هو سببُ البذرة. */
 ST.UIS.recent=[];
 const L0=RB.quickList();
 eq(L0.length,6,"سجلٌّ فارغٌ ⇒ ستٌّ من البذرة");
 eq(L0.join(","),RB.QUICK_SEED.join(","),"وهي البذرةُ بترتيبها");
 /* والمُستعمَلُ **يسبق** البذرةَ ويدفعها خارجاً — وإلّا لم يتعلّم. */
 ST.UIS.recent=["hatch","boq"];
 const L1=RB.quickList();
 eq(L1[0],"hatch","الأحدثُ أوّلاً");
 eq(L1[1],"boq","ثمّ الذي قبله");
 eq(L1.length,6,"والبذرةُ تُكمِل الستّ");
 ok(!L1.includes("text"),"وآخرُ البذرةِ دُفِع خارجاً");
 eq(new Set(L1).size,6,"ولا تكرارَ بين المُستعمَلِ والبذرة");
 /* سجلٌّ ممتلئٌ ⇒ لا بذرةَ أصلاً: الشريطُ صار سجلَّ استعمالٍ خالصاً. */
 ST.UIS.recent=["hatch","boq","elev","section","roof","slab"];
 const L2=RB.quickList();
 eq(L2.length,6,"سجلٌّ ممتلئٌ ⇒ ستٌّ");
 ok(RB.QUICK_SEED.every(s=>!L2.includes(s)),"ولا بذرةَ فيه");
 ST.UIS.recent=[];
});

group("الرسمُ صادقٌ ولا يكذب",()=>{
 ST.UIS.recent=["hatch"];
 eq(RB.renderThumb(),6,"يُرسَم ستّاً");
 const B=doc.querySelector("#thumb");
 const btns=[...B.querySelectorAll("button")];
 eq(btns.length,7,"سبعةُ أزرارٍ: بحثٌ وستُّ أدوات");
 eq(btns[0].getAttribute("id"),"thSrch","والبحثُ أوّلاً — أقربُ للإبهام");
 ok(btns.every(b=>b.getAttribute("aria-label")),
    "ولكلِّ زرٍّ تسميةٌ لقارئِ الشاشة");
 /* البذرةُ لم تُستعمَل، فوصفُها «استعملتَها مؤخّراً» كذبٌ يُفقِد
    الثقة. التلميحُ يفرّق الاثنَين — وهذا قرارٌ مُعلَنٌ في الملفّ. */
 const h=btns.find(b=>b.dataset.rc==="hatch");
 const w=btns.find(b=>b.dataset.rc==="wall");
 ok(/استعملتَها مؤخّراً/.test(h.getAttribute("title")),
    "المُستعمَلُ يُقال إنّه مُستعمَل");
 ok(w&&!/استعملتَها مؤخّراً/.test(w.getAttribute("title")),
    "والبذرةُ لا تُنسَب إلى استعمالٍ لم يحدث");
 ST.UIS.recent=[];
});

group("مستمعٌ واحدٌ لا يتسرّب",()=>{
 /* P2-001: الشريطُ يُعاد بناؤه مع كلِّ استعمالٍ، فمستمعٌ لكلِّ زرٍّ
    يتسرّب. والتفويضُ على الحاملِ مرّةً واحدةً — و`dataset.wired`
    يمنع التكرارَ إن نُوديَ التوصيلُ ثانيةً. */
 const src=rd("js/ui/recentbar.js");
 ok(/export function wireThumb/.test(src),"للتوصيلِ دالّةٌ واحدة");
 ok(/B\.dataset\.wired/.test(src),"ولا يُوصَل مرّتَين");
 eq((src.match(/addEventListener/g)||[]).length,2,
    "مستمعانِ فقط: حاملٌ لكلِّ شريط");
 ok(RB.wireThumb(),"يُوصَل");
 ok(RB.wireThumb(),"والنداءُ الثاني لا يُضيف مستمعاً");
 /* ومنطقُ التشغيلِ واحدٌ للشريطَين: نسختانِ تتفرّقان. */
 eq((src.match(/R\.begin\(/g)||[]).length,1,"وتشغيلُ الأداةِ في موضعٍ واحد");
 /* وفتحُ البحثِ **خطّافٌ** لا استيرادٌ: `palette.js` يستورد هذا
    الملفَّ، فالعكسُ دورة. */
 ok(/setSearchHook/.test(src),"ولفتحِ البحثِ خطّاف");
 ok(/setSearchHook\(paletteOpen\)/.test(rd("js/ui/palette.js")),
    "واللوحةُ تحقنه");
 ok(!/from "\.\/palette\.js"/.test(src),"ولا استيرادَ عكسيٌّ يصنع دورة");
 /* وغيابُ الخطّافِ يُعلَن ولا يُبلَع: زرٌّ صامتٌ أسوأُ من زرٍّ يشكو. */
 ok(/HOOK\.report\("wr"/.test(src),"وغيابُه يُقال");
});

group("السلسلةُ تُكمِل الدّعوى: كلُّ أداةٍ بإصبع",()=>{
 /* الحلقةُ الأخيرة: البحثُ يفتح لوحةَ الأوامرِ، فإن غطّت اللوحةُ
    كلَّ أداةٍ فكلُّ أداةٍ تُبلَغ من منطقةِ الإبهام. والتغطيةُ تُقاس
    لا تُفترَض — وهي الدّعوى نفسُها التي أقفلتها المرحلةُ ١. */
 const ids=[...new Set(R.toolList().filter(d=>d&&d.id).map(d=>d.id))];
 ok(ids.length>=150,`${ids.length} أداةً مسجَّلة`);
 const none=ids.filter(id=>!S.homeOfTool(id,AC.ACTOF));
 eq(none.length,0,"صفرُ أداةٍ بلا بيتٍ تُعلِنه اللوحة");
 /* ولوحةُ الأوامرِ نفسُها تُفتَح باللمسِ لا بالاختصارِ وحده. */
 ok(/data-rcsrch/.test(rd("js/ui/recentbar.js")),"وزرُّ البحثِ مُعلَّمٌ");
 ok(/#thumb #thSrch\{/.test(TC),"وله تنسيقٌ يميّزه");
});

group("حرّاسُ الجوّالِ القائمةُ لم تُمَسّ",()=>{
 /* شرطُ الإقفالِ يقول «تبقى خضراء»، فهذه الدّعاوى تُعاد هنا صراحةً
    كي لا يكون خضارُها مصادفةً في ملفٍّ آخر. */
 ok(/--touch:44px/.test(TC),"متغيّرُ اللمسِ ٤٤ بكسلاً");
 ok(/max-width:768px/.test(TC),"ونقطةُ الهاتفِ موثَّقة");
 /* ومصفوفةُ الأجهزةِ: لا نقطةَ توقفٍ جديدةٍ بلا سطرٍ فيها (P5-011) —
    وشريطُ الإبهامِ استعمل ٧٦٨ الموثَّقةَ ولم يُضِف نقطةً. */
 const hdr=TC.slice(0,TC.indexOf("*/"));
 ok(/≤768/.test(hdr),"و٧٦٨ مذكورةٌ في مصفوفةِ الأجهزة");
 const mq=[...TC.matchAll(/max-width:(\d+)px/g)].map(m=>+m[1]);
 for(const w of new Set(mq))
  ok(new RegExp("≤?"+w).test(hdr)||w===1080||w===1100,
     `نقطةُ ${w} موثَّقةٌ في المصفوفة`);
});

process.exit(summary()?1:0);
