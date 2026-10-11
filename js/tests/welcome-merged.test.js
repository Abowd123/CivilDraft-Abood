/* ═══ شاشة البداية المدمجة (أ+ب+ج) والشعار ═══
   النموذجُ خالصٌ فيُنفَّذ هنا، والعرضُ يُحرَس بنيوياً من مصدره.
   التشغيل:  node js/tests/welcome-merged.test.js                   */
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,eq,summary} from "./harness.js";
import {ORG,MAIN,LOCAL,LIMIT,rowsFor,digitPick,wrap,CAPS} from "../ui/welcome-model.js";

const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");

group("الحالةُ الفاضية هي خياراتُ البدء الأربعة",()=>{
 const r=rowsFor("",null);
 eq(r.length,4,"أربعةُ خيارات");
 eq(r.map(x=>x.n).join(","),"01,02,03,04","مرقّمةٌ ٠١…٠٤");
 eq(r.map(x=>x.k).join(""),"1234","واختصارُها رقمُها");
 eq(r[0].a,"wall","الأوّلُ يبدأ الجدار");
 eq(r[1].a,"tpl-showcase","والثاني فيلا العرض");
 eq(rowsFor("   ",null).length,4,"والمسافاتُ وحدها فراغ");
 eq(MAIN.length,4,"والقائمةُ نفسها أربعة");
});

group("الكتابةُ تقلب الصندوقَ نتائج",()=>{
 const r=rowsFor("فيلا",null);
 ok(r.some(x=>x.a==="tpl-showcase"),"«فيلا» تجد فيلا العرض");
 ok(r.every(x=>x.n===""),"والنتائجُ بلا أرقامِ البدء");
 ok(rowsFor("قالب",null).filter(x=>/^tpl-/.test(x.a)).length>=5,"«قالب» تجد القوالب");
 ok(rowsFor("استوديو",null).some(x=>x.a==="studio"),"والاستوديو");
 eq(rowsFor("zzqq",null).length,0,"وما لا يطابق شيئاً فارغ");
});

group("فهرسُ اللوحة يُحقَن ولا يُكرَّر",()=>{
 const fake=q=>[{label:"جدار",home:"الرئيسية › رسم",sc:"W",key:"wall"},{label:""},null,
  {label:"باب",sub:"door",sc:"D"}];
 const r=rowsFor("جد",fake);
 const w=r.find(x=>x.t==="جدار");
 ok(w&&w.a==="pal"&&w.k==="W"&&w.s==="الرئيسية › رسم","نتيجةُ اللوحة تحمل بيتَها واختصارَها");
 ok(w&&w.it&&w.it.key==="wall","وعنصرَها الأصليَّ للتنفيذ بمسار اللوحة");
 ok(!r.some(x=>!x.t),"والعناصرُ الفارغة تُسقَط");
 const many=()=>Array.from({length:20},(_,i)=>({label:"أداة"+i}));
 ok(rowsFor("ا",many).length<=LIMIT,`والنتائجُ ${LIMIT} على الأكثر`);
 eq(rowsFor("فيلا",()=>{throw new Error("x")}).length>0,true,"وعطبُ البحث لا يُسقِط الصندوق");
});

group("الأرقامُ ١…٤ والتنقّل",()=>{
 eq(digitPick("1",true),0,"١ لاتينيّاً ⇒ الأوّل");
 eq(digitPick("٤",true),3,"٤ هنديّاً ⇒ الرابع");
 eq(digitPick("5",true),-1,"٥ ليس خياراً");
 eq(digitPick("2",false),-1,"والصندوقُ غيرُ فارغ ⇒ الرقمُ كتابةٌ لا اختيار");
 eq(wrap(-1,4),3,"الأعلى من الأوّل يلفّ للأخير");
 eq(wrap(4,4),0,"والأسفل من الأخير يلفّ للأوّل");
 eq(wrap(3,0),0,"وقائمةٌ فارغة لا تُنتج NaN");
});

group("المخططُ الحيّ: تعليقٌ لكلّ مسار",()=>{
 const js=rd("js/ui/welcome.js");
 const paths=(js.match(/<path class="[wdm]" pathLength="1"/g)||[]).length;
 eq(CAPS.length,paths,"تعليقٌ لكلّ مسارٍ مرسوم");
 const css=rd("css/welcome.css");
 for(let i=1;i<=paths;i++)ok(css.includes(`path:nth-of-type(${i})`),`المسار ${i} له تأخيرُه`);
});

group("الشعار: ملفٌّ محلّيٌّ مخبَّأ، ثانويٌّ في خانة الجهة",()=>{
 ok(existsSync(join(ROOT,ORG.logo)),"ملفُّ الشعار موجود");
 const svg=rd(ORG.logo);
 ok(/<svg[^>]*viewBox="0 0 256 256"/.test(svg),"SVG مربّع");
 ok(!/<script|on\w+=|href="http/i.test(svg),"بلا سكربتٍ ولا رابطٍ خارجيّ");
 ok(rd("sw.js").includes(ORG.logo),"داخلَ كاش العمل بلا نت");
 const js=rd("js/ui/welcome.js");
 ok(/wc-org[\s\S]{0,120}wc-logo/.test(js),"في خانة «الجهة» بجدول العنوان");
 ok(/addEventListener\("error"/.test(js)&&/wc-ph/.test(js),"وغيابُه يترك خانةً منقّطة لا صورةً مكسورة");
 const css=rd("css/welcome.css");
 const m=/\.wc-logo\{[^}]*clamp\((\d+)px,[^,]+,(\d+)px\)/.exec(css);
 ok(m&&+m[2]<=48,"وحجمُه ٤٨ بكسل على الأكثر: ثانويٌّ لا أساسيّ");
 ok(/splash-org[\s\S]{0,80}college-logo\.svg/.test(rd("index.html")),"وفي شاشة الإقلاع سطرٌ صغير");
});

group("سياسةُ الأمان والعقودُ القائمة",()=>{
 const js=rd("js/ui/welcome.js").replace(/\/\*[\s\S]*?\*\//g,"");
 ok(!/style="/.test(js),"لا style=\"\" (style-src 'self')");
 ok(!/\son[a-z]+=/.test(js.replace(/addEventListener/g,"")),"ولا معالجَ مضمَّناً");
 for(const k of ["beginner","tour","close","q"])
  ok(js.includes(`data-wc="${k}"`),`data-wc="${k}" قائم`);
 ok(/escapeHtml as esc/.test(js),"التهريبُ من core/escape.js");
 const css=rd("css/welcome.css");
 ok(!/animation:[^;]*\d+m?s/.test(css.replace(/calc\(var\(--t\)\*[\d.]+\)/g,"")),
  "كلُّ مدّةِ حركةٍ مضاعفُ --t فتُصفَّر مع تقليل الحركة");
 ok(/--wc-vp:/.test(rd("css/theme.css").split(":root[data-theme=\"light\"]")[1]||""),
  "ولإطار العرض لونُه في السمة الفاتحة أيضاً");
 const app=rd("js/app.js");
 ok(/search:q=>paletteQuery\(/.test(app)&&/exec:it=>paletteExec\(/.test(app),
  "app.js يحقن بحثَ اللوحة وتنفيذَها");
 ok(/openStudio:\(\)=>openStudio\(\)/.test(app),"ويحقن فتحَ الاستوديو");
});

summary();
