/* ═══ فحصٌ ثابتٌ للواجهة وإتاحةِ الوصول ═══
   P5-001 أهدافُ اللمس 44px · P5-002 خطُّ الإدخال ≥16px على الهاتف ·
   P5-008 سلّمُ طبقاتٍ غيرُ متساوٍ من متغيّراتٍ لا أرقامٍ حرفية ·
   P5-009 تباينُ WCAG محسوبٌ من القيم السداسية في السمتين ·
   P5-011 مصفوفةُ الأجهزة موثَّقة.
   ولا متصفّح: هذا فحصُ قاعدةٍ في الملفّ لا قياسُ بكسلٍ على شاشة —
   الأثرُ المرئيُّ في «لم يُتحقَّق منه» (audit/08).
   التشغيل:  node js/tests/a11y-css.test.js                        */
import {readFileSync,readdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,eq,summary} from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const CSSF=readdirSync(join(ROOT,"css")).filter(n=>/\.css$/.test(n));
const ALL=CSSF.map(n=>["css/"+n,rd("css/"+n)]);
const theme=rd("css/theme.css"), touch=rd("css/touch.css");

/* ═══ التباين ═══ الحسابُ هو حسابُ WCAG نفسه */
const lin=c=>{c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
function lum(hex){
 let h=String(hex).replace("#","").trim();
 if(h.length===3)h=h.split("").map(c=>c+c).join("");
 const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),
       b=parseInt(h.slice(4,6),16);
 return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
}
const ratio=(a,b)=>{
 const la=lum(a),lb=lum(b);
 return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05);
};
/* قيمةُ متغيّرٍ في كتلةٍ: :root أو :root[data-theme="light"] */
function varOf(name,light){
 const block=light
  ? theme.slice(theme.indexOf(':root[data-theme="light"]'))
  : theme.slice(0,theme.indexOf(':root[data-theme="light"]'));
 const m=new RegExp("--"+name+"\\s*:\\s*(#[0-9a-fA-F]{3,8})").exec(block);
 return m?m[1]:null;
}

group("تحديدُ النصِّ يستعمل ما قيس",()=>{
 /* حسابُ التباينِ أعلاه لا قيمةَ له إن استعملت القاعدةُ لونَين
    آخرَين. فالمقيسُ والمرسومُ يُقابَلان — وإلّا كان الحسابُ زينةً. */
 const tk=rd("css/tokens.css");
 const m=/::selection\{([^}]*)\}/.exec(tk);
 ok(m,"لقاعدةِ ::selection وجودٌ");
 ok(/background:var\(--acq\)/.test(m[1]),"خلفيتُها --acq المقيسة");
 ok(/color:var\(--fg\)/.test(m[1]),"ونصُّها --fg المقيس");
});

group("P5-009 · التباينُ محسوبٌ لا مُدَّعى",()=>{
 /* الحاسبةُ نفسُها تُفحَص أوّلاً: أبيضٌ على أسودَ = 21 */
 ok(Math.abs(ratio("#ffffff","#000000")-21)<0.01,"الحاسبةُ صحيحة (21:1)");
 ok(Math.abs(ratio("#777777","#ffffff")-4.48)<0.05,"وعلى قيمةٍ وسطى");
 [["داكنة",0],["فاتحة",1]].forEach(([nm,lt])=>{
  const ac=varOf("ac",lt), acon=varOf("acon",lt);
  const fg=varOf("fg",lt), bg=varOf("bg",lt), fg2=varOf("fg2",lt), bg2=varOf("bg2",lt);
  ok(!!ac&&!!acon,`${nm}: --ac و--acon معلَنان`);
  const r=ratio(acon,ac);
  ok(r>=4.5,`${nm}: النصُّ فوق --ac ${r.toFixed(2)}:1 ≥ 4.5`);
  ok(r>=3,`${nm}: وللعناصر ≥ 3`);
  /* وما كان يفشل: الأبيضُ و--acf فوق --ac */
  const old1=ratio("#ffffff",ac), old2=ratio(varOf("acf",lt),ac);
  ok(r>old1||old1>=4.5,
   `${nm}: --acon ليس أسوأ من الأبيض (${r.toFixed(2)} مقابل ${old1.toFixed(2)})`);
  ok(r>old2,`${nm}: وأفضلُ من --acf (${old2.toFixed(2)})`);
  /* والنصوصُ الأساسية كما كانت سليمة */
  ok(ratio(fg,bg)>=4.5,`${nm}: fg/bg ${ratio(fg,bg).toFixed(2)}:1`);
  ok(ratio(fg2,bg2)>=4.5,`${nm}: fg2/bg2 ${ratio(fg2,bg2).toFixed(2)}:1`);
  /* ═══ تحديدُ النصّ ═══ أُضيف في دفعةِ المؤثّراتِ البصرية.
     وتحديدُ النصِّ **نصٌّ يُقرَأ وهو محدَّدٌ**، فلو كان لونُه فوق
     خلفيتِه ضعيفَ التباينِ لصار التحديدُ إخفاءً. فيُحسَب كغيرِه:
     `--fg` فوق `--acq` في السمتَين — لا «يبدو جميلاً». */
  const acq=varOf("acq",lt);
  ok(!!acq,`${nm}: --acq معلَن`);
  const rs=ratio(fg,acq);
  ok(rs>=4.5,`${nm}: نصُّ التحديدِ فوق --acq ${rs.toFixed(2)}:1 ≥ 4.5`);
 });
 /* ولا أبيضَ حرفيٌّ بقي فوق سطحِ التمييز */
 ALL.forEach(([f,src])=>{
  const bad=/background:\s*var\(--ac\)[^}]*color:\s*#fff/.test(src);
  ok(!bad,`${f}: لا #fff فوق --ac`);
 });
});

group("P5-008 · سلّمُ الطبقات من متغيّراتٍ ومرتَّبٌ",()=>{
 const L={};
 [...theme.matchAll(/--(z-[a-z-]+)\s*:\s*(\d+)/g)].forEach(m=>{L[m[1]]=+m[2]});
 ok(Object.keys(L).length>=18,`${Object.keys(L).length} طبقةً معلَنة`);
 /* القاعدةُ المعلنة: الحوارُ فوق الشريط، والقائمةُ فوق الحوار */
 ok(L["z-dialog"]>L["z-ribbon"],
  `الحوار ${L["z-dialog"]} فوق الشريط ${L["z-ribbon"]}`);
 ok(L["z-menu"]>L["z-dialog"],
  `والقائمة ${L["z-menu"]} فوق الحوار ${L["z-dialog"]}`);
 ok(L["z-ribbon-more"]>L["z-ribbon"],"وقائمةُ الفيضان فوق الشريط");
 ok(L["z-ribbon-more"]<L["z-dialog"],"ودون الحوار — فالحوارُ يغطّيها");
 ok(L["z-palette"]>L["z-menu"],"ولوحةُ الأوامر فوق القوائم");
 ok(L["z-overlay"]>L["z-palette"],"والطبقةُ الحاجبةُ فوقها");
 ok(L["z-splash"]>L["z-overlay"],"وشاشةُ الإقلاع فوق الجميع");
 /* الأزواجُ التي كانت تتساوى صارت متمايزة */
 [["z-dialog","z-helpbot"],["z-helpbot","z-guide"],
  ["z-guide","z-ribedit"],["z-ribedit","z-tour"]].forEach(([a,b])=>{
  ok(L[b]>L[a],`${b} فوق ${a} — لا تساوي`);
 });
 /* ولا رقمَ حرفيٍّ كبيرٍ بقي: ما بقي محلّيٌّ داخل سياقه (≤ 4) */
 const lits=[];
 ALL.forEach(([f,src])=>{
  [...src.matchAll(/z-index:\s*(\d+)/g)].forEach(m=>{
   if(+m[1]>4)lits.push(`${f}:${m[1]}`);
  });
 });
 eq(lits.length,0,"لا رقمَ طبقةٍ حرفيٍّ فوق 4"
  +(lits.length?" — "+lits.join(" · "):""));
});

group("P5-001 · أهدافُ اللمس 44px",()=>{
 const m=/--touch\s*:\s*(\d+)px/.exec(touch);
 ok(!!m&&+m[1]===44,"--touch معلَنٌ 44px");
 /* داخل كتلةِ pointer:coarse وحدها */
 const i=touch.indexOf("@media (pointer:coarse)");
 ok(i>0,"وكتلةُ اللمس موجودة");
 const blk=touch.slice(i,touch.indexOf("/* ─── 2.",i));
 ["#status button","#side button","#navbar button",".zTabs button",
  ".lbtn",".rsrc button",".rpt-x",".pB"].forEach(sel=>{
  ok(blk.includes(sel),`${sel} مذكورٌ في كتلة اللمس`);
 });
 /* ولا قيمةَ دون 44 بقيت في المواضع المذكورة */
 const small=[...blk.matchAll(/min-(?:height|block-size|inline-size):\s*(\d+)px/g)]
  .map(x=>+x[1]).filter(v=>v<44&&v>0);
 eq(small.length,0,"ولا حدٌّ أدنى دون 44px في كتلة اللمس"
  +(small.length?" — "+small.join(" · "):""));
 /* والحارسُ الشامل موجود */
 ok(/button, \[role="button"\], summary, a\.btn\{\s*min-block-size:var\(--touch\)/
  .test(blk),"وحارسٌ شاملٌ لكل زرٍّ تفاعليّ");
});

group("P5-002 · خطُّ الإدخال ≥16px على الهاتف",()=>{
 const i=touch.indexOf("P5-002");
 ok(i>0,"القاعدةُ موجودةٌ وموسومة");
 const blk=touch.slice(i,i+700);
 ok(/font-size:max\(16px/.test(blk),"والقيمةُ max(16px,…) لا أقلّ");
 ["input","select","textarea","#optbar input",".dF input",".qf input",
  "#palette input"].forEach(sel=>
   ok(blk.includes(sel),`${sel} مشمولٌ`));
 /* وفي كتلة اللمس لا يبقى حقلٌ بخطٍّ أصغر يُطبَّق بعدها */
 const ci=touch.indexOf("@media (pointer:coarse)");
 const cblk=touch.slice(ci,touch.indexOf("/* ─── 2.",ci));
 const after=cblk.slice(cblk.indexOf("P5-002"));
 const smaller=[...after.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)]
  .map(x=>+x[1]).filter(v=>v<16);
 eq(smaller.length,0,"ولا خطَّ إدخالٍ أصغرَ بعد القاعدة");
});

group("P5-011 · مصفوفةُ الأجهزة موثَّقة",()=>{
 ok(/مصفوفةُ الأجهزة ونقاطُ التوقف/.test(touch),"الجدولُ مكتوبٌ في الملفّ");
 ["480","640","768","769–900","1080","1100","pointer:coarse"]
  .forEach(k=>ok(touch.includes(k),`${k} مذكورٌ في الجدول`));
 ok(/أكثرُ نطاقٍ تتراكم فيه القواعد/.test(touch),
  "والنطاقُ الأكثرُ تراكماً مُعلَنٌ صريحاً");
 /* وكلُّ نقطةِ توقفٍ مستعملةٍ لها سطرٌ في الجدول */
 /* داخل استعلامات @media وحدها: max-width خاصّيةً على عنصرٍ ليست
    نقطةَ توقف */
 const used=new Set();
 ALL.forEach(([,src])=>{
  [...src.matchAll(/@media[^{]*/g)].forEach(q=>{
   [...q[0].matchAll(/max-width:\s*(\d+)px/g)].forEach(m=>used.add(m[1]));
  });
 });
 const doc=touch.slice(touch.indexOf("مصفوفةُ الأجهزة"),
  touch.indexOf("*/",touch.indexOf("مصفوفةُ الأجهزة")));
 const miss=[...used].filter(w=>!doc.includes(w));
 eq(miss.length,0,"ولا نقطةَ توقفٍ بلا سطرٍ في الجدول"
  +(miss.length?" — "+miss.join(" · "):""));
});

process.exit(summary()?1:0);
