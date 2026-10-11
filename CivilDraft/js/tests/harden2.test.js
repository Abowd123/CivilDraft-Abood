/* ═══ التحليلُ الحذِر والمصدرُ الواحد ═══
   P2-008 لا ناتجَ JSON يُدمَج بلا فحصِ شكل · P2-010 مُنتقي الصورة
   المرجعية تنفيذٌ واحدٌ لا نسختان · P2-011 حدودُ العرض من مصدرٍ
   واحد · P2-012 ما يحتاج تركيباً يُنادى صريحاً ومرّةً واحدة.
   التشغيل:  node js/tests/harden2.test.js                         */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,deep,summary} from "./harness.js";
shim();
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");

const D=await import("../core/delegate.js");

group("P2-008 · parseObj/parseArr لا تمرّران ما ليس شكلَه",()=>{
 eq(D.parseObj('{"a":1}').a,1,"كائنٌ مستوٍ يمرّ");
 eq(D.parseObj('[1,2]'),null,"ومصفوفةٌ تُرفَض");
 eq(D.parseObj('5'),null,"ورقمٌ يُرفَض");
 eq(D.parseObj('"نصّ"'),null,"ونصٌّ يُرفَض");
 eq(D.parseObj('null'),null,"وnull يُرفَض");
 eq(D.parseObj('{فاسد'),null,"والفاسدُ يُرفَض بلا رمي");
 eq(D.parseObj(null),null,"وlا قيمةَ أصلاً");
 deep(D.parseArr('[1,2]'),[1,2],"ومصفوفةٌ تمرّ من parseArr");
 eq(D.parseArr('{"a":1}'),null,"وكائنٌ يُرفَض منها");
 ok(D.isPlain({}),"isPlain للكائن");
 ok(!D.isPlain([]),"ولا للمصفوفة");
 ok(!D.isPlain(null),"ولا لـnull");
});

group("P2-008 · mergeKnown: المفاتيحُ المعروفة وأنواعُها وحدها",()=>{
 const shape={n:0,s:"",f:false,a:[]};
 const t={...shape};
 eq(D.mergeKnown(t,{n:5,s:"ن",f:true,a:[1]},shape),4,"أربعةٌ قُبلت");
 eq(t.n,5,"والرقمُ كُتب");
 const u={...shape};
 eq(D.mergeKnown(u,{n:"ليس رقماً",zz:9,a:{}},shape),0,
  "ولا شيءَ من نوعٍ مخالفٍ أو مفتاحٍ غريب");
 eq(u.zz,undefined,"والمفتاحُ الغريبُ لم يدخل");
 eq(D.mergeKnown(u,[1,2],shape),0,"ومصفوفةٌ مصدراً تُرفَض");
 eq(D.mergeKnown(u,null,shape),0,"وnull كذلك");
});

const M=new Map();
globalThis.localStorage={
 getItem:k=>(M.has(k)?M.get(k):null),
 setItem:(k,v)=>{M.set(k,String(v))},
 removeItem:k=>{M.delete(k)}, clear:()=>M.clear(),
 get length(){return M.size}, key:i=>[...M.keys()][i]||null};
/* بنودٌ فاسدةٌ ومصفوفةٌ وسعرٌ نصّيّ — كانت تُدمَج كما هي */
localStorage.setItem("civildraft:pricing",JSON.stringify({
 "wall.ext":{rate:120,unit:"م²"},
 "bad.text":{rate:"غالي"},
 "bad.arr":[1,2],
 "bad.null":null,
 "bad.num":7
}));
const PR=await import("../core/pricing.js?p2008");
group("P2-008 · جدولُ الأسعار يُنظَّف عند القراءة",()=>{
 PR.loadRates&&PR.loadRates();
 const R=PR.allRates();
 ok(typeof R==="object"&&!Array.isArray(R),"الجدولُ كائنٌ مستوٍ");
 eq(PR.getRate("wall.ext"),120,"البندُ السليمُ قُرئ");
 eq(PR.getRate("bad.text"),0,"والسعرُ النصّيُّ لم يدخل");
 eq(PR.getRate("bad.num"),0,"ولا البدائيُّ");
 ok(!("bad.arr" in R)||typeof R["bad.arr"]==="object",
  "ولا المصفوفةُ بندَ سعر");
 Object.keys(R).forEach(k=>ok(isFinite(+R[k].rate),
  `كلُّ بندٍ سعرُه رقمٌ منتهٍ — ${k}`));
});

group("P2-010 · مُنتقي الصورة المرجعية تنفيذٌ واحد",()=>{
 const pal=rd("js/ui/palette.js"), app=rd("js/ui/appcmds.js");
 const body=/new\s+FileReader\s*\(\)[\s\S]{0,400}?readAsDataURL/;
 ok(body.test(app),"التنفيذُ في appcmds.js");
 ok(!/readAsDataURL/.test(pal),"ولا نسخةَ ثانيةً في palette.js");
 ok(/import\(\s*["']\.\/appcmds\.js["']\s*\)/.test(pal),
  "بل palette يستورده");
 ok(!/UNDERLAY_MAX_SRC/.test(pal),
  "والحدُّ لم يبقَ مكرَّراً في palette.js");
 /* والحدُّ نفسُه من مصدرٍ واحد */
 ok(/MAX_SRC/.test(app),"والحدُّ يُقرأ من core/underlay.js");
});

const {UILIM}=await import("../core/limits.js");
group("P2-011 · UILIM معلَنٌ ومُستعمَل",()=>{
 ["searchResults","paletteResults","menuResults","layerRows",
  "logRows","debounceMs","saveDebounceMs"].forEach(k=>{
  ok(UILIM[k]&&isFinite(UILIM[k].def),`UILIM.${k} معلَنٌ برقم`);
  ok(Object.isFrozen(UILIM[k]),`و${k} مجمَّدٌ فلا يُعدَّل بالخطأ`);
 });
 ok(Object.isFrozen(UILIM),"والجدولُ كلُّه مجمَّد");
 /* والمواضعُ التي نُقلت تقرأ منه لا من رقمٍ حرفيّ */
 const dp=rd("js/guide/dockPane.js"), gw=rd("js/guide/wire.js");
 ok(/UILIM\.searchResults/.test(dp),"dockPane يقرأ searchResults");
 ok(/UILIM\.debounceMs/.test(dp),"ويقرأ debounceMs");
 ok(!/slice\(0, ?12\)/.test(dp),"ولا رقمَ 12 حرفياً فيه");
 ok(!/setTimeout\(paint, ?120\)/.test(dp),"ولا 120 حرفياً");
 ok(/UILIM\.menuResults/.test(gw),"وwire يقرأ menuResults");
});

group("P2-012 · التركيبُ صريحٌ ومرّةً واحدة",()=>{
 const cu=rd("js/ui/ribbon/custom.js"), app=rd("js/app.js");
 /* لا مستمعٌ يُركَّب أثناء تقييم الوحدة */
 ok(!/^if\(typeof window!=="undefined"&&window\.addEventListener\)\{/m.test(cu),
  "لا تركيبَ من أثرٍ جانبيٍّ للاستيراد");
 ok(/export function initRibbonCustom\(/.test(cu),"بل دالّةُ تركيبٍ مُصدَّرة");
 ok(/initRibbonCustom\(\)/.test(app),"وapp.js ينادِيها صريحاً");
 /* الترتيب: التركيبُ قبل ملء الخطّافات وقبل البناء */
 /* القياسُ داخل جسم build() وحده — سطرُ الاستيراد في الأعلى يحمل
    الاسمَ نفسَه ولا يُعَدّ نداءً */
 const body=app.slice(app.indexOf("function build(){"));
 const iInit=body.indexOf("initRibbonCustom()");
 const iHook=body.indexOf("HOOK.props=");
 const iBuild=body.indexOf("buildRibbon(");
 const iWire=body.indexOf("wireRibbon(");
 ok(iInit>0,"النداءُ داخل build()");
 ok(iHook>iInit,"وقبل ملء الخطّافات");
 ok(iBuild<0||iBuild>iInit,"وقبل بناء الشريط");
 ok(iWire<0||iWire>iInit,"وقبل توصيله");
});

const CU=await import("../ui/ribbon/custom.js?p2012");
group("P2-012 · initRibbonCustom لا تُركِّب مرّتين",()=>{
 ok(!CU.ribbonCustomWired(),"قبل النداء غيرُ مركَّبة");
 let n=0;
 const prev=globalThis.addEventListener;
 globalThis.addEventListener=()=>{n++};
 ok(CU.initRibbonCustom(),"النداءُ الأوّل يُركِّب");
 eq(n,1,"مستمعٌ واحد");
 ok(!CU.initRibbonCustom(),"والثاني لا يُركِّب");
 ok(!CU.initRibbonCustom(),"ولا الثالث");
 eq(n,1,"ويبقى واحداً");
 ok(CU.ribbonCustomWired(),"والعلامةُ مقروءة");
 if(prev)globalThis.addEventListener=prev; else delete globalThis.addEventListener;
});

process.exit(summary()?1:0);
