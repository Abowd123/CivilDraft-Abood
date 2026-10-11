/* ═══ دفعة 3.7 — حماية الكتل ═══
   node js/tests/phase3.7.test.js

   يفحص:
     • safeBlockName يرفض الأسماء الخطرة ويقبل الآمنة
     • defineBlock يستعمل safeBlockName ويرفض primitives تحوي HTML
     • checkDefs يستعمل safeBlockName وcheckPrims (عبر defineBlock)
     • gallery.js لا يستعمل innerHTML لبيانات ai/*، ويستعمل
       textContent للعنوان/التصنيف/الوصف
     • blockpanel.js يبقى على textContent (لا رجوع)
     • blockdraw.js لا يلمس DOM (رسم Canvas فقط)
     • smartblocks.js وtemplates_lib.js لا HTML

   والغاية: أن تبقى الكتل آمنةً بنيوياً — أي كتلةٍ باسم خطِر أو
   primitive يحمل حقل HTML يُرفَض في المنبع، وأي عرضٍ لبيانات
   ai/* يبقى عبر textContent. */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,throws,summary} from "./harness.js";
shim();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,"")
 .replace(/^\s*\/\/.*$/gm,"");

const {safeBlockName,defineBlock,checkDefs,hasBlock,removeBlock}=await import("../core/blocks.js");

group("safeBlockName: يقبل الأسماء الآمنة",()=>{
 eq(safeBlockName("door"),"door","door");
 eq(safeBlockName("window"),"window","window");
 eq(safeBlockName("iconDoor"),"iconDoor","iconDoor");
 eq(safeBlockName("my-block_2"),"my-block_2","my-block_2");
 eq(safeBlockName("A"),"A","حرف واحد");
 eq(safeBlockName("a".repeat(64)),"a".repeat(64),"64 حرفاً (الحدّ)");
});

group("safeBlockName: يرفض الأسماء الخطرة",()=>{
 throws(()=>safeBlockName(""),/غير صالح/,"فارغ");
 throws(()=>safeBlockName(null),/غير صالح/,"null");
 throws(()=>safeBlockName("<script>"),/غير صالح/,"<script>");
 throws(()=>safeBlockName('a"b'),/غير صالح/,'a"b');
 throws(()=>safeBlockName("a'b"),/غير صالح/,"a'b");
 throws(()=>safeBlockName("a b"),/غير صالح/,"فراغ");
 throws(()=>safeBlockName("a/b"),/غير صالح/,"شرطة مائلة");
 throws(()=>safeBlockName("a.b"),/غير صالح/,"نقطة");
 throws(()=>safeBlockName("1abc"),/غير صالح/,"يبدأ برقم");
 throws(()=>safeBlockName("a".repeat(65)),/غير صالح/,"65 حرفاً (فوق الحدّ)");
 throws(()=>safeBlockName("كتلة"),/غير صالح/,"عربي");
});

group("defineBlock: يستعمل safeBlockName",()=>{
 throws(()=>defineBlock({name:"<bad>",prims:[]}),/غير صالح/,"اسم خبيث");
 /* اسمٌ فارغ يُرفَض قبل الوصول إلى safeBlockName أصلاً — الشرط
    !def.name يلتقطه أوّلاً (سلسلةٌ فارغةٌ falsy)، برسالته الخاصّة. */
 throws(()=>defineBlock({name:"",prims:[]}),/name مطلوب/,"اسم فارغ");
 throws(()=>defineBlock({}),/name مطلوب/,"بلا name");
 const d=defineBlock({name:"test_ok_37",title:"اختبار",prims:[]});
 eq(d.name,"test_ok_37","الاسم محفوظ");
 ok(hasBlock("test_ok_37"),"DEFS يحوي الكتلة");
 removeBlock("test_ok_37",{force:true});
});

group("defineBlock: يرفض primitives تحوي HTML",()=>{
 throws(()=>defineBlock({name:"bad1",prims:[
  {t:"line",a:[0,0],b:[1,1],html:"<script>"}]}),/محظور/,"حقل html");
 throws(()=>defineBlock({name:"bad2",prims:[
  {t:"line",a:[0,0],b:[1,1],innerHTML:"x"}]}),/محظور/,"حقل innerHTML");
 throws(()=>defineBlock({name:"bad3",prims:[
  {t:"line",a:[0,0],b:[1,1],outerHTML:"x"}]}),/محظور/,"حقل outerHTML");
 const d=defineBlock({name:"ok1",prims:[
  {t:"line",a:[0,0],b:[1,1]},
  {t:"circle",c:[0,0],r:5}]});
 eq(d.prims.length,2,"primitives محفوظة");
 removeBlock("ok1",{force:true});
});

group("checkDefs: يستعمل safeBlockName وcheckPrims",()=>{
 const r1=checkDefs({defs:[{name:"<bad>",prims:[]}]});
 eq(r1.ok,0,"اسم خبيث مرفوض");
 ok(/غير صالح/.test(r1.why),"السبب مذكور");
 const r3=checkDefs({defs:[
  {name:"a1",prims:[]},
  {name:"a2",prims:[{t:"line",a:[0,0],b:[1,1]}]}]});
 eq(r3.ok,1,"تعريفات سليمة تمرّ");
 eq(r3.good.length,2,"عدد التعريفات");
});

group("gallery.js: لا innerHTML لبيانات ai/*",()=>{
 const src=rd("js/ui/gallery.js");
 const c=strip(src);
 const cardBody=/function\s+card\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}\n/.exec(c);
 ok(!!cardBody,"دالّة card موجودة");
 if(cardBody){
  ok(!/\.innerHTML\s*=/.test(cardBody[1]),"card لا تستعمل innerHTML");
 }
 ok(/title\.textContent\s*=/.test(c),"title.textContent");
 ok(/cat\.textContent\s*=/.test(c),"cat.textContent");
 ok(/desc\.textContent\s*=/.test(c),"desc.textContent");
 ok(/document\.createElement\("span"\)/.test(c),"createElement(\"span\")");
 ok(!/\$\{item\.label\}/.test(c),"لا ${item.label} خام");
 ok(!/\$\{item\.cat\}/.test(c),"لا ${item.cat} خام");
 ok(!/\$\{item\.desc\}/.test(c),"لا ${item.desc} خام");
});

group("blockpanel.js: يبقى على textContent",()=>{
 const src=rd("js/ui/blockpanel.js");
 ok(/textContent\s*=/.test(src),"يستعمل textContent");
 const c=strip(src);
 ok(!/innerHTML\s*=.*b\.title/.test(c),"لا innerHTML لـb.title");
});

group("blockdraw.js: لا يلمس DOM",()=>{
 const src=rd("js/ui/blockdraw.js");
 ok(!/document\./.test(src),"لا document");
 ok(!/innerHTML/.test(src),"لا innerHTML");
 ok(!/createElement/.test(src),"لا createElement");
});

group("smartblocks.js وtemplates_lib.js: لا HTML",()=>{
 ["js/ai/smartblocks.js","js/ai/templates_lib.js"].forEach(f=>{
  const src=rd(f);
  ok(!/innerHTML/.test(src),`${f}: لا innerHTML`);
  ok(!/document\./.test(src),`${f}: لا document`);
 });
});

group("installDefaults: الأسماء الافتراضية تمرّ عبر safeBlockName",()=>{
 /* door/window/table أسماءٌ آمنة أصلاً — نتحقّق فقط أنها لا تزال
    كذلك بعد أي تعديلٍ مستقبليّ على installDefaults. */
 const src=rd("js/core/blocks.js");
 ["door","window","table"].forEach(n=>{
  ok(new RegExp(`name:\\s*"${n}"`).test(src),`installDefaults يحوي ${n}`);
  ok(safeBlockName(n)===n,`${n} يمرّ عبر safeBlockName`);
 });
});

process.exit(summary());
