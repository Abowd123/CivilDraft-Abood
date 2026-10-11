/* ═══ وضع المبتدئ — مرشِّح الشريط ═══
   node js/tests/beginner.test.js */
import {group,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {RIBBON} from "../ui/ribbon/schema.js";
import {beginnerRibbon,BEGINNER} from "../ui/ribbon/beginner.js";
import {flatItems,itemKey} from "../ui/ribbon/custom.js";
import {DEFUI} from "../ui/store.js";
import {LOCAL_TO_WIRE} from "../ui/actions.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const src=f=>readFileSync(join(ROOT,f),"utf8");
const count=T=>T.reduce((n,t)=>n+t.panels.reduce((m,p)=>m+flatItems(p.items).length,0),0);

group("كل مفتاحٍ في BEGINNER له زرٌّ حقيقيّ في الأساس",()=>{
 for(const [t,ps] of Object.entries(BEGINNER))for(const [p,ks] of Object.entries(ps)){
  const bp=(RIBBON.find(x=>x.id===t)||{panels:[]}).panels.find(x=>x.id===p);
  ok(!!bp,`اللوح ${t}/${p} موجود`);
  const have=new Set(flatItems(bp?bp.items:[]).map(itemKey));
  ks.forEach(k=>ok(have.has(k),`${t}/${p}: ${k}`));
 }
});
group("المرشِّح يختصر ولا يُتلف الأساس",()=>{
 const snap=JSON.stringify(RIBBON);
 const B=beginnerRibbon(RIBBON);
 eq(JSON.stringify(RIBBON),snap,"الأساس لم يُمسّ");
 ok(count(B)<count(RIBBON)/3,`أقلّ من ثلث الأزرار (${count(B)}/${count(RIBBON)})`);
 /* المرحلة ٤ حذفت «رئيسي» (كان ٣٣ عنصراً من ٤٤ نسخةً من بيوتِها)،
    فالمبتدئُ صار يرى بيوتَ الأدواتِ الحقيقيةَ مُقلَّمةً لا سطحاً
    ثانياً يتعلّمه ثمّ يُضطرّ إلى نسيانِه. */
 ok(B.some(t=>t.id==="draw"),"«رسم» حاضر");
 ok(!B.some(t=>t.id==="home"),"ولا «رئيسي» — حُذِف في المرحلة ٤");
 ok(B.every(t=>t.panels.length>0),"لا تبويبَ فارغاً");
 B.forEach(t=>t.panels.forEach(p=>p.items.forEach(it=>{
  if(it.group)ok(it.group.length>=2&&it.group.length<=3,`${t.id}/${p.id}: عمودٌ من ٢–٣`);
 })));
 eq(beginnerRibbon([]).length,0,"أساسٌ فارغ ⇒ فارغ بلا رمي");
 const fake=[{id:"zz",n:"Z",panels:[]}];
 eq(beginnerRibbon(fake)[0].id,"zz","لا تطابق ⇒ يعود الشريط كاملاً لا شريطٌ فارغ");
});
group("زرّ الخروج من الوضع حاضرٌ في الوضعين",()=>{
 /* المخرجُ صار **زرّاً دائماً في صفِّ التبويباتِ** (`#rbMode`) لا
    بلاطةً في لوحٍ قد يُخفيه المرشِّحُ نفسُه — وهذا أمتنُ: لا وضعَ
    يُمكِن أن يُخفي بابَ الخروجِ منه. ومدخلٌ ثانٍ في قائمةِ التطبيق.
    والبلاطةُ أُزيلت من الألواحِ لأنّ قاعدةَ الموضعِ الواحدِ صارت
    مطلقةً في الشريط (المرحلة ٤). */
 const has=T=>T.some(t=>t.panels.some(p=>flatItems(p.items).some(i=>i.act==="beginner")));
 ok(!has(RIBBON),"لا بلاطةَ في الألواح — الموضعُ واحدٌ");
 ok(!has(beginnerRibbon(RIBBON)),"ولا في الشريطِ المبتدئ");
 ok(/act:"beginner"/.test(src("js/ui/appmenu.js")),"ومدخلٌ في قائمة التطبيق");
 ok(/id="rbMode"[^>]*data-act="beginner"|data-act="beginner"[\s\S]{0,200}rbMode/.test(src("js/ui/ribbon/render.js"))
  ||/id="rbMode"[\s\S]{0,120}data-act="beginner"/.test(src("js/ui/ribbon/render.js")),"زرٌّ دائم في صفّ التبويبات");
});
group("التفضيل والتوصيل",()=>{
 eq(DEFUI().beginner,0,"افتراضياً مطفأ — لا يتغيّر شريط المستخدم الحاليّ");
 ok(LOCAL_TO_WIRE.has("beginner"),"beginner فعلٌ محلّيٌّ معلَن");
 ok(/beginner:\s*\{fn:/.test(src("js/ui/ribbon/wire.js")),"له منفِّذ في wire.js");
 ok(/shownRibbon\(\)/.test(src("js/ui/ribbon/render.js")),"المصيّر يقرأ shownRibbon");
 ok(/data-wc="beginner"/.test(src("js/ui/welcome.js")),"خيارٌ في بطاقة الترحيب");
});
summary();
