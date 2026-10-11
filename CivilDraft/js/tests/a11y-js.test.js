/* ═══ فحصٌ ثابتٌ لإتاحةِ الوصول في الواجهة ═══
   P5-003 aria-label لكل زرٍّ تُخفى تسميتُه · P5-010 منطقةٌ حيّةٌ
   لرسائل الحالة · P5-013 inputmode على الحقول الرقمية ·
   P5-014 تحريرُ الالتقاط صريحٌ وlostpointercapture يُنظِّف ·
   P5-007 سحبُ نافذة الدليل بإحداثيٍّ منطقيٍّ يعمل في RTL.
   ولا متصفّح: الأثرُ على قارئِ شاشةٍ أو لوحةِ هاتفٍ حقيقيّين في
   «لم يُتحقَّق منه» (audit/08).
   التشغيل:  node js/tests/a11y-js.test.js                         */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,eq,summary} from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");

group("P5-003 · aria-label لكل زرٍّ في شريط الحالة",()=>{
 const s=rd("js/ui/statusbar.js");
 /* القالبانِ اللذانِ يبنيان الأزرار */
 const rb=/data-rb="\$\{esc\(x\.rb\)\}"[\s\S]{0,400}?<\/button>/.exec(s);
 const act=/data-act="\$\{esc\(x\.act\)\}"[\s\S]{0,400}?<\/button>/.exec(s);
 ok(!!rb,"قالبُ زرّ data-rb موجود");
 ok(!!act,"وقالبُ data-act");
 ok(/aria-label=/.test(rb[0]),"الأوّلُ يحمل aria-label");
 ok(/aria-label=/.test(act[0]),"والثاني كذلك");
 ok(/aria-label="\$\{esc\(x\.n\)\}"/.test(rb[0]),
  "والاسمُ من x.n لا نصٌّ ثابت");
 /* وtitle باقٍ للتلميح البصريّ — لا يُستبدَل به */
 ok(/title=/.test(rb[0])&&/title=/.test(act[0]),
  "وtitle باقٍ للتلميح لا بديلاً عن الاسم");
 /* ولا زرَّ في الملفّ بلا اسم: إمّا aria-label، أو نصٌّ ظاهرٌ لا
    تُخفيه CSS. و`.lb` وحدها هي التي تُخفى على الشاشات الضيّقة،
    فزرٌّ نصُّه كلُّه داخلها يحتاج aria-label. */
 const btns=[...s.matchAll(/<button[\s\S]*?<\/button>/g)].map(m=>m[0]);
 ok(btns.length>=4,`${btns.length} زرّاً مفحوصاً في الملفّ`);
 const visibleText=b=>{
  const spans=[...b.matchAll(/<span([^>]*)>/g)].map(x=>x[1]);
  return spans.some(a=>!/class="(lb|ky)"/.test(a));
 };
 const bad=btns.filter(b=>!/aria-label=/.test(b)&&!visibleText(b));
 eq(bad.length,0,"وكلُّها لها اسمٌ ميسَّرٌ أو نصٌّ لا يُخفى"
  +(bad.length?" — "+bad.slice(0,2).map(x=>x.slice(0,60)).join(" · "):""));
 /* والتسميةُ تُخفى فعلاً في CSS — فالحاجةُ قائمةٌ لا نظرية */
 const t=rd("css/touch.css"), st=rd("css/status.css");
 ok(/\.lb\{display:none\}|\.lb\s*\{\s*display:none/.test(t+st)
  ||/>button \.lb\{display:none\}/.test(t+st)
  ||/\.lb\s*\{[^}]*display:\s*none/.test(t+st),
  "و`.lb` تُخفى في CSS فعلاً");
});

group("P5-010 · منطقةٌ حيّةٌ لرسائل الحالة",()=>{
 const s=rd("js/ui/statusbar.js");
 ok(/live:1/.test(s),"عنصرُ الرسالة معلَّمٌ live");
 ok(/aria-live="polite"/.test(s),"وaria-live=polite — إعلامٌ لا مقاطعة");
 ok(/role="status"/.test(s),"وrole=status");
 ok(/aria-atomic="true"/.test(s),"وaria-atomic فتُقرأ الرسالةُ كاملة");
 /* ولا assertive: ضجيجٌ لا يُحتمَل مع كل حركة مؤشّر */
 ok(!/aria-live="assertive"/.test(s),"ولا assertive");
 /* وسجلُّ الأوامر كان معلَناً أصلاً فلا يُكرَّر */
 ok(/aria-live/.test(rd("index.html")),"وسجلُّ الأوامر معلَنٌ كما كان");
});

group("P5-013 · inputmode على الحقول الرقمية",()=>{
 const files=["js/ui/props.js","js/ui/underlayPanel.js",
  "js/ui/styleManager.js","js/ui/levelManager.js"];
 let total=0, bare=[];
 files.forEach(f=>{
  const s=rd(f);
  const tags=[...s.matchAll(/<input[^>]*type="number"[^>]*>/g)].map(m=>m[0]);
  total+=tags.length;
  tags.forEach(t=>{ if(!/inputmode=/.test(t))bare.push(f) });
 });
 ok(total>=15,`${total} حقلاً رقمياً مفحوصاً`);
 eq(bare.length,0,"ولا حقلَ type=number بلا inputmode"
  +(bare.length?" — "+[...new Set(bare)].join(" · "):""));
 /* والقيمةُ decimal للقياسات (مم بكسورٍ) لا numeric */
 ok(/inputmode="decimal"/.test(rd("js/ui/props.js")),
  "والقيمةُ decimal — القياساتُ عشرية");
 /* وما كان صحيحاً أصلاً باقٍ */
 ok(/inputmode/.test(rd("js/ui/dyninput.js")),"والإدخالُ الحركيُّ كما كان");
 ok(/inputmode/.test(rd("js/ui/optbar.js")),"وشريطُ الخيارات كذلك");
});

group("P5-014 · تحريرُ الالتقاط صريحٌ في كل مسار",()=>{
 [["js/ui/canvas.js","cv"],["js/ui/view3d.js","cv"],
  ["js/guide/floater.js","head"]].forEach(([f,el])=>{
  const s=rd(f);
  ok(/setPointerCapture/.test(s),`${f}: يلتقط`);
  ok(/releasePointerCapture/.test(s),`${f}: ويحرّر صريحاً`);
  ok(/hasPointerCapture/.test(s),`${f}: ويسأل قبل التحرير`);
  ok(/lostpointercapture/.test(s),`${f}: وينظّف عند فقدان الالتقاط`);
  /* والتحريرُ محميٌّ بمصيدةٍ — رميُه لا يُسقِط إنهاءَ السحب */
  ok(/try\{[\s\S]{0,260}releasePointerCapture/.test(s),
   `${f}: والتحريرُ داخل مصيدة`);
 });
});

group("P5-007 · سحبُ نافذة الدليل منطقيٌّ لا فيزيائيّ",()=>{
 const s=rd("js/guide/floater.js");
 ok(/inset-inline-start/.test(s),"يكتب inset-inline-start");
 ok(/inset-block-start/.test(s),"وinset-block-start");
 ok(!/style\.left\s*=/.test(s),"ولا style.left");
 ok(!/style\.right\s*=/.test(s),"ولا style.right");
 ok(!/style\.top\s*=/.test(s),"ولا style.top");
 ok(!/style\.bottom\s*=/.test(s),"ولا style.bottom");
 /* والتحويلُ موجودٌ وموثَّق: في RTL تُقاس من اليمين */
 ok(/direction\s*===\s*"rtl"/.test(s),"ويسأل عن اتجاه السطر");
 ok(/hw\s*-\s*\(px\s*\+\s*root\.offsetWidth\)/.test(s),
  "والتحويلُ صريحٌ: عرضُ الحاضن ناقصَ يمينِ النافذة");
 /* وsetProperty لا سمةُ style — CSP تمنع الثانية */
 ok(/setProperty\(/.test(s),"ويكتب بـsetProperty");
 ok(!/\sstyle\s*=/.test(s),"ولا سمةَ style مضمَّنة");
});

process.exit(summary()?1:0);
