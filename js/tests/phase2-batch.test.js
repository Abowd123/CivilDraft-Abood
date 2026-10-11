/* ═══ المرحلة 2 — دفعة صغيرة: حرّاسٌ خضراء ═══
   بند لكل تذكرة، بترتيب الخطة (civildraft-fix-plan.md §3):
     2.1  installDefaults صامت (D3-01)      — core/blocks.js
     2.2  نوع أداة صحية مجهول (D3-03)        — core/fixt.js
     2.3  dyninput.lockField (D6-09)         — ui/dyninput.js (فحصٌ مصدريّ)
     2.4  parsePt والأبعاد (D1-05)           — core/coords.js
     2.5  store.purge (D7-05)                — io/store.js
     2.6  ops.js حقل chk (D8-05)             — ai/ops.js
     2.7  generate.js فاصلة عربية (G8-2-06)  — ai/generate.js
     2.8  quickprops (D6-08)                 — ui/quickprops.js (فحصٌ مصدريّ)
     2.9  index.html (D0-02/D0-03/D0-08)     — فحصٌ مصدريّ
   التشغيل: node js/tests/phase2-batch.test.js                        */
import {shim,group,groupAsync,ok,eq,deep,near,throws,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
shim();

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..","..");
const src=r=>readFileSync(join(ROOT,r),"utf8");
const code=r=>src(r).replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");

/* ═══ 2.1 — installDefaults صامت ═══ */
{
 const {S,newState,ensureShape,canUndo}=await import("../core/state.js");
 const BLK=await import("../core/blocks.js");
 group("2.1 installDefaults لا يدفع تاريخاً وهمياً",()=>{
  newState(); ensureShape();
  eq(canUndo(),false,"ensureShape وحدها: لا تاريخ");
  BLK.installDefaults();
  eq(canUndo(),false,"بعد installDefaults: ما زال لا تاريخ — كان D3-01");
  ok(BLK.hasBlock("door")&&BLK.hasBlock("window")&&BLK.hasBlock("table"),
   "والتعريفات الثلاثة موجودة فعلاً");
 });
}

/* ═══ 2.2 — نوع أداة صحية مجهول يُرفَض لا يُستبدَل ═══ */
{
 const {newState,ensureShape}=await import("../core/state.js");
 const FX=await import("../core/fixt.js");
 group("2.2 addFix ترفض نوعاً مجهولاً — كان D3-03",()=>{
  newState(); ensureShape();
  throws(()=>FX.addFix("foo",[1000,1000],0),/مجهول/,
   "addFix(\"foo\") ترمي بدل أن تصير wc صامتاً");
  const f=FX.addFix("lav",[1000,1000],0);
  eq(f.kind,"lav","نوعٌ صحيحٌ ما زال يمرّ كما هو");
 });
}

/* ═══ 2.4 — parsePt يقبل × والوحدات المستقلّة لكل رقم ═══ */
{
 const {parsePt}=await import("../core/coords.js");
 group("2.4 parsePt — الصيغ الأربع (كان D1-05)",()=>{
  deep(parsePt("9×14",null,null),{k:"dim",w:9000,d:14000},"9×14 (رمز الواجهة)");
  deep(parsePt("3m×4m",null,null),{k:"dim",w:3000,d:4000},"3m×4m");
  deep(parsePt("3m x 4m",null,null),{k:"dim",w:3000,d:4000},"3m x 4m (فراغاتٌ حول x)");
  deep(parsePt("3000x4000mm",null,null),{k:"dim",w:3000,d:4000},
   "3000x4000mm — الطرف الأول بلا وحدة يرث وحدة الثاني (مم)");
  deep(parsePt("300x400cm",null,null),{k:"dim",w:3000,d:4000},"300x400cm يرث السم");
  deep(parsePt("3x4m",null,null),{k:"dim",w:3000,d:4000},"3x4m");
  deep(parsePt("3000mm x 4000mm",null,null),{k:"dim",w:3000,d:4000},"وحدة لكلٍّ منهما");
  /* لا رجوع عن الصيغتين القديمتين */
  deep(parsePt("9x14",null,null),{k:"dim",w:9000,d:14000},"9x14 كما كانت");
  deep(parsePt("9*14",null,null),{k:"dim",w:9000,d:14000},"9*14 كما كانت");
 });
}

/* ═══ 2.5 — store.purge: idb يعكس onsuccess/onerror/المهلة حقاً ═══ */
await groupAsync("2.5 store.purge — out.idb الحقيقيّ (كان D7-05)",async()=>{
 /* بيئة IndexedDB وهمية: قاعدةٌ محجوبة (لا onsuccess ولا onerror،
    فقط انقضاء المهلة) وأخرى تفشل بـonerror صراحةً. */
 globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},
  clear:()=>{},get length(){return 0},key:()=>null};
 globalThis.indexedDB={
  open:()=>{const rq={result:{close(){}}};
   setTimeout(()=>{if(rq.onsuccess)rq.onsuccess()},0); return rq},
  deleteDatabase:()=>{
   const rq={};
   /* لا onsuccess ولا onerror أبداً — محجوبةٌ بتبويبٍ آخر */
   return rq;
  }};
 const ST=await import("../io/store.js?phase2batch1");
 const t0=Date.now();
 const r=await ST.purge();
 const dt=Date.now()-t0;
 ok(r.idb===0,"محجوبةٌ بلا onsuccess ⇒ out.idb=0 لا 1");
 ok(dt>=750,`احترمت السقف 800ms تقريباً (استغرقت ${dt}ms)`);
});

await groupAsync("2.5 store.purge — onsuccess صريح يرفع idb",async()=>{
 globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},
  clear:()=>{},get length(){return 0},key:()=>null};
 globalThis.indexedDB={
  open:()=>{const rq={result:{close(){}}};
   setTimeout(()=>{if(rq.onsuccess)rq.onsuccess()},0); return rq},
  deleteDatabase:()=>{
   const rq={};
   setTimeout(()=>{if(rq.onsuccess)rq.onsuccess()},0);
   return rq;
  }};
 const ST=await import("../io/store.js?phase2batch2");
 const r=await ST.purge();
 ok(r.idb===1,"onsuccess فعليّ ⇒ out.idb=1");
});

/* ═══ 2.6 — ops.js: chk تقبل 0/1/true/false/"0"/"1" حصراً ═══ */
{
 const B=await import("../core/batch.js");
 const {validate}=await import("../ai/ops.js");
 const chkField=Object.keys(B.FLD).map(k=>({k,f:(B.FLD[k]||[]).find(x=>x.t==="chk")}))
  .find(x=>x.f);
 group("2.6 ops.js — حقل chk (كان D8-05)",()=>{
  if(!chkField){ok(true,"لا حقل chk في batch.js — تُخطى"); return}
  const {k:kind,f}=chkField;
  const mk=v=>validate([{op:"field",kind,field:f.k,ids:["X1"],value:v}]);
  ["1",1,true,"true"].forEach(v=>
   eq(mk(v).ok[0]&&mk(v).ok[0].value,1,`«${JSON.stringify(v)}» ⇒ 1`));
  ["0",0,false,"false"].forEach(v=>
   eq(mk(v).ok[0]&&mk(v).ok[0].value,0,`«${JSON.stringify(v)}» ⇒ 0 لا 1`));
  ["yes","no","",null,2,"on"].forEach(v=>{
   const r=mk(v);
   ok(r.ok.length===0&&r.bad.length===1,
    `«${JSON.stringify(v)}» تُرفَض لا تصير 1`);
  });
 });
}

/* ═══ 2.7 — generate.js: الفاصلة العشرية العربية ═══ */
{
 const G=await import("../ai/generate.js");
 group("2.7 generate.js — فاصلةٌ عشرية عربية (كان G8-2-06)",()=>{
  const r=G.opsFromText("غرفة ٤٫٥ في ٥");
  eq(r.unmatched.length,0,"«غرفة ٤٫٥ في ٥» لم تعد unmatched");
  eq(r.ops.filter(o=>o.op==="wall").length,4,"وأنتجت 4 جدران");
  /* الجدار الأول أفقيٌّ بطول 4.5 م (محاذاةٌ مركزية c) */
  const w0=r.ops.find(o=>o.op==="wall");
  near(Math.hypot(w0.b[0]-w0.a[0],w0.b[1]-w0.a[1]),4.5,1e-6,
   "بُعدُ الجدار الأول 4.5 م — قُرئت ٫ فاصلةً عشرية لا حاجزاً");
 });
}

/* ═══ 2.3 — dyninput.lockField: فحصٌ مصدريّ ═══
   لا يُشغَّل بمحاكاة DOM كاملة (وحدةٌ ثقيلة الاعتماد على canvas.js
   وbus.js وregistry.js حيّةً) — الحارس يتحقّق من نمط الإصلاح نفسه:
   Mx الصارمة بدل M المتساهلة، وتقريرٌ بدل قفلٍ صامت. */
{
 const c=code("js/ui/dyninput.js");
 group("2.3 dyninput.lockField يستعمل Mx ويُبلِّغ (كان D6-09)",()=>{
  ok(/import\s*\{[^}]*\bMx\b[^}]*\}\s*from\s*"..\/core\/units.js"/.test(c),
   "يستورد Mx من core/units.js");
  const fn=/function lockField\(i\)\{[\s\S]*?\n\}/.exec(c);
  ok(!!fn,"lockField موجودة");
  const body=fn?fn[0]:"";
  ok(/Mx\(v\)/.test(body),"تستعمل Mx لا M على قيمة الحقل");
  ok(/HOOK\.report\(\s*"wr"/.test(body),"تُبلِّغ (wr) عند الفشل");
  ok(!/R\.lockLen\(M\(v\)\)/.test(body),"لا رجوعَ إلى R.lockLen(M(v)) القديم");
 });
}

/* ═══ 2.8 — quickprops: نقرةٌ مزدوجة تُحرِّر البطاقة ═══ */
{
 const c=code("js/ui/quickprops.js");
 group("2.8 quickprops — dblclick يصفّر qpFree (كان D6-08)",()=>{
  ok(/addEventListener\(\s*"dblclick"/.test(c),"مستمعُ dblclick مُسجَّل");
  const fn=/addEventListener\(\s*"dblclick"[\s\S]*?\n\s*\}\);/.exec(c);
  ok(!!fn,"معالج dblclick موجود");
  const body=fn?fn[0]:"";
  ok(/UIS\.qpFree=0/.test(body),"يصفّر qpFree");
  ok(/place\(\)/.test(body)&&/saveUI\(\)/.test(body),
   "ويعيد place() ويحفظ saveUI()");
 });
}

/* ═══ 2.9 — index.html: تعليقٌ صحيح وfoot-ancestors موثَّق ═══ */
{
 const h=src("index.html");
 group("2.9 index.html (كان D0-02/D0-03/D0-08)",()=>{
  ok(!/آخر الأنماط فتتجاوز/.test(h),
   "لا بقاء للتعليق المضلِّل «modern.css آخر الأنماط»");
  const mIdx=h.indexOf('href="css/modern.css"');
  const afterModern=h.slice(mIdx+'href="css/modern.css"'.length)
   .match(/href="css\/([\w.]+)\.css"/g)||[];
  ok(afterModern.length===1&&/touch\.css/.test(afterModern[0]),
   "بعد modern.css ملفٌّ واحدٌ فقط — touch.css عمداً (D12-EP2)");
  ok(/frame-ancestors/.test(h)&&/meta[\s\S]*?لا من عنصر meta/.test(h),
   "تعليقٌ يوضّح أن frame-ancestors في meta زائدةٌ عملياً");
  ok(/_headers[\s\S]{0,200}netlify\.toml[\s\S]{0,200}static-server\.js/.test(h),
   "ويشير إلى مصادر رأس الحماية الفعلية الثلاثة");
  /* csp.test.js وphase3.3.test.js يشترطان frame-ancestors 'none' في الـmeta */
  ok(/frame-ancestors 'none'/.test(h),"وframe-ancestors 'none' ما زالت في الـmeta");
 });
}

summary();
