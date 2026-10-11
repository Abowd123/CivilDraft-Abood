#!/usr/bin/env node
/* ═══ مولّدُ جدولِ الأدواتِ في docs/tools.md ═══ المرحلة ٨ من
   audit/10-ui-plan.md
   لِمَ مولّدٌ لا تحريرُ يدٍ؟ لأنّ المرحلةَ ٤ نقلت **١٥٣ مدخلاً** من
   بيتٍ إلى بيتٍ، وكلُّ بيتٍ مكتوبٌ بيدٍ في هذا الملفِّ كان سيتقادم
   صامتاً — وهو بعينه العيبُ الذي كلّفَنا المرحلتَين ٢ و٤ (جدولٌ ثانٍ
   ينجرف عن مصدره). فالبيوتُ تُقرَأ من `schema.js` مباشرةً.

   **وما يُكتَب بيدٍ يبقى بيد:** عمودُ «ملاحظة» نصٌّ إنسانيٌّ فيه
   أسبابٌ مكتوبةٌ (⚠ هادمة · قيودٌ معلَنةٌ · طبقاتٌ)، فيُقرَأ من
   الملفِّ القائمِ بمعرّفِ الأداةِ **ويُعاد كما هو**. المولّدُ يملك
   البيتَ والاختصارَ والأمرَ، والإنسانُ يملك السببَ.

   التشغيل:  node scripts/gen-tools-doc.js            يكتب
             node scripts/gen-tools-doc.js --check     يفشل إن تقادم
   و`--check` هو ما يناديه الحارسُ، فلا يُسلَّم بناءٌ ووثيقتُه قديمة. */
import {readFileSync,writeFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const DOC=join(ROOT,"docs/tools.md");

/* بيئةٌ صغيرةٌ تكفي لتحميلِ السجلِّ والمخطَّطِ خارجَ المتصفّح —
   نفسُ ما تفعله الاختباراتُ، لا محرّكٌ ثانٍ يتفرّق عنها. */
const {shim,shimCanvas,shimDOM}=await import("../js/tests/harness.js");
shim(); shimCanvas();
const D=shimDOM();
{const cv=D.createElement("canvas"); cv.setAttribute("id","cv");
 D.body.appendChild(cv);}
/* `optbar.js` يربط مستمعاً على `#optbar` عند الاستيراد (عقدٌ مُعلَنٌ في
   ترويسته و`dom.js` يعرفه)، فالعنصرُ يُهيَّأ قبلَه لا بعده. */
for(const id of ["optbar","tools","ribbon"]){
 const e=D.createElement("div"); e.setAttribute("id",id);
 D.body.appendChild(e);
}
if(!globalThis.window)
 globalThis.window={prompt:()=>null,confirm:()=>true};
for(const f of ["draw","sketch","openings","parts","roof","areas","modify",
 "annotate","ref","boq","boqreport","elev","section","sheet","clouds",
 "groups","macros"])await import(`../js/tools/${f}.js`);
for(const f of ["hygiene","gate","levelManager","appcmds","viewcmds",
 "blockpanel"])await import(`../js/ui/${f}.js`);
const R =await import("../js/tools/registry.js");
const S =await import("../js/ui/ribbon/schema.js");
const AC=await import("../js/ui/appcmds.js");
const OB=await import("../js/ui/optbar.js");

const old=readFileSync(DOC,"utf8");
/* ═══ حفظُ ما كتبه الإنسان ═══ المفتاحُ أوّلُ أمرٍ بين علامتَين في
   عمودِ «الأمر النصي»، وهو معرّفُ الأداةِ حرفاً. */
const NOTE=new Map(), SHORT=new Map();
for(const m of old.matchAll(/^\|([^|]*)\|\s*`(\w+)`([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/gm)){
 NOTE.set(m[2],m[6].trim());
 SHORT.set(m[2],m[5].trim());
}

/* أدواتُ شريطِ الأدواتِ العلويِّ: عنوانُ الزرِّ فيه هو اختصارُه */
const TBAR=new Map();
for(const b of (OB.BAR||[])) if(b&&b.cmd) TBAR.set(b.cmd,b.title||"");

const tabName=new Map(S.RIBBON.map(t=>[t.id,t.n]));
const ktOf=new Map(S.RIBBON.map(t=>[t.id,t.kt||""]));
const AR="٠١٢٣٤٥٦٧٨٩";
const ar=s=>String(s).replace(/\d/g,d=>AR[+d]);

const L=R.toolList().filter(d=>d&&d.id);
const rows=new Map();          /* tabId → صفوف */
const special=[];
for(const d of L){
 const h=S.homeOfTool(d.id,AC.ACTOF);
 const al=String(d.alias||"").trim().split(/\s+/).filter(Boolean);
 /* الأمرُ النصيُّ: المعرّفُ ثمّ ألقابُه — واللاتينيُّ القصيرُ أوّلاً
    لأنّه ما يُكتَب فعلاً، والعربيُّ بعده شرحاً. */
 /* واللقبُ المطابقُ للمعرّفِ يُطرَح: «`tour` · `tour`» تكرارٌ لا خبر. */
 const lat=al.filter(a=>/^[a-z0-9]+$/i.test(a)&&a!==d.id);
 const arb=al.filter(a=>!/^[a-z0-9]+$/i.test(a));
 const cmd="`"+d.id+"`"+(lat.length?" · "+lat.map(a=>"`"+a+"`").join(" · "):"")
  +(arb.length?" — "+arb.join("، ").replace(/_/g," "):"");
 const tb=TBAR.has(d.id)?"شريط الأدوات<br>":"";
 const where=h?(h.ctx?`سياقيّ: ${h.tabName}`
  :(h.tab==="appmenu"?"قائمة التطبيق"
   :(h.tab==="qat"?"وصولٌ سريع"
    :(h.tab==="elsewhere"?h.path
     :`${h.tabName} ◂ ${h.panelName}`+(ktOf.get(h.tab)?` (Alt+${ar(ktOf.get(h.tab))})`:"")))))
  :"—";
 const sc=SHORT.get(d.id)||(TBAR.get(d.id)?("`"+TBAR.get(d.id)+"`"):"—");
 const note=NOTE.get(d.id)||(R.isDestruct(d)?"⚠ هادمة":"");
 const row=`| ${d.label||d.id} | ${cmd} | ${tb}${where} | ${sc} | ${note} |`;
 const key=(h&&!h.ctx&&/^(draw|edit|annt|serv|view|out|mng)$/.test(h.tab))
  ?h.tab:"__sp";
 if(key==="__sp")special.push(row);
 else{ if(!rows.has(key))rows.set(key,[]); rows.get(key).push(row); }
}
const HEAD="| الأداة | الأمر النصي | الزر | اختصار | ملاحظة |\n|---|---|---|---|---|";
const out=[];
for(const t of S.RIBBON){
 const r=(rows.get(t.id)||[]).sort((a,b)=>a.localeCompare(b,"ar"));
 if(!r.length)continue;
 out.push(`## ${t.n} (${r.length})`,"",HEAD,...r,"");
}
special.sort((a,b)=>a.localeCompare(b,"ar"));
out.push(`## أدوات بمدخل خاص (${special.length})`,"",
 "> بيتُها لوحةٌ أو نافذةٌ أو سطحُ تسريعٍ لا زرُّ شريطٍ — ومُعلَنٌ",
 "> في `HOME_ELSEWHERE` و`HOME_MENU` و`QAT`، يفرضه `ui-reach`.","",
 HEAD,...special,"");
/* سطرٌ فارغٌ قبلَ ما لا يملكه المولّد: Markdown يلصق العنوانَ بالجدولِ
   فيُفقِده كونَه عنواناً. */
out.push("");

/* الاستبدالُ موضعيٌّ: من أوّلِ قسمِ تبويبٍ إلى ما قبل «## ملاحظات».
   وما قبلَ ذلك وما بعده نصٌّ إنسانيٌّ لا يملكه المولّد. */
const i=old.indexOf("\n## ");
const j=old.indexOf("\n## ملاحظات");
if(i<0||j<0||j<=i){
 console.error("gen-tools-doc: لم أجد حدودَ الجدولِ في docs/tools.md");
 process.exit(1);
}
/* الحدُّ الأوّلُ: أوّلُ قسمِ تبويبٍ **بعد** قسمِ الاختصاراتِ العامّة —
   أي بدايةُ ما يملكه المولّد. وكان الحسابُ يقع على القسمِ الذي يليه
   فيبقى أوّلُ قسمٍ قديماً (وقد وقع فعلاً: «رئيسي» نجا بعد حذفِ
   تبويبه). فالحدُّ يُقاس من `k` لا من الذي بعده. */
const k=old.indexOf("\n## ",old.indexOf("## الاختصارات العامة"));
if(k<0){
 console.error("gen-tools-doc: لم أجد قسمَ الاختصاراتِ العامّة");
 process.exit(1);
}
const body=out.join("\n");
const built=old.slice(0,k+1)+body+old.slice(j+1);
const total=L.length;
if(process.argv.includes("--check")){
 if(built!==old){
  console.error("gen-tools-doc: docs/tools.md متقادمٌ — شغِّل "
   +"node scripts/gen-tools-doc.js");
  process.exit(1);
 }
 console.log(`docs/tools.md مطابقٌ — ${total} أداة`);
}else{
 writeFileSync(DOC,built);
 console.log(`كُتِب docs/tools.md — ${total} أداة في `
  +`${[...rows.keys()].length} تبويباً و${special.length} بمدخلٍ خاصّ`);
}
