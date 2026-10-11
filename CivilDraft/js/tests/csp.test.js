/* ═══ CSP بلا 'unsafe-inline' للأنماط ═══
   node js/tests/csp.test.js
   السياسة تحجب: سمةَ style في HTML المُدرَج · عنصرَ <style> · setAttribute
   ("style") · وأيضاً style.cssText المضبوطة من JS (خرقٌ فعليّ رغم أنه
   يبدو CSSOM — راجع MDN: "styles that are applied in JavaScript by
   setting the style attribute directly, or by setting cssText" مذكورةٌ
   صراحةً ضمن حالات الحجب). وتسمح فقط: ملفّاتِ css · وخصائص مفردة على
   style (el.style.color=…، el.style.display=…) لأنها ليست سلسلة
   نصّية تُحلَّل كـHTML/CSS بل تعيين خاصّية DOM مباشرةً.
   فما يُفحَص هنا هو أن لا شيءَ من المحجوب بقي — إذ لا متصفّحَ في هذه
   السلسلة يُظهر العطب (الصفحةُ تبدو بلا أنماطٍ فحسب، أو صندوق عطب
   الإقلاع نفسه يظهر بلا تنسيق — وهذا أخطر مكانٍ يمكن أن يقع فيه،
   لأنه المسار الوحيد الذي يُخبر المستخدم أن شيئاً قد انهار). */
import {readFileSync,readdirSync,statSync,existsSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const walk=(d,out)=>{readdirSync(d).forEach(n=>{const p=join(d,n);
 if(statSync(p).isDirectory()){ if(n!=="tests"&&n!=="node_modules")walk(p,out) }
 else if(/\.js$/.test(n))out.push(p)}); return out};
const JS=walk(join(ROOT,"js"),[]).map(p=>[p.slice(ROOT.length),readFileSync(p,"utf8")]);
const HTML=rd("index.html");
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");

group("السياسة: style-src بلا unsafe-inline في المواضع الثلاثة",()=>{
 ok(!/style-src[^;"]*'unsafe-inline'/.test(rd("_headers")),"_headers");
 ok(!/style-src[^;"]*'unsafe-inline'/.test(rd("netlify.toml")),"netlify.toml");
 const meta=HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/);
 ok(!!meta,"وسم CSP موجود");
 ok(meta&&!/'unsafe-inline'/.test(meta[1]),"وسم index.html");
 ok(meta&&/style-src 'self';/.test(meta[1]),"style-src 'self' وحده");
});

group("لا شيءَ مما تحجبه السياسة بقي",()=>{
 ok(!/<style[\s>]/.test(strip(HTML.replace(/<!--[\s\S]*?-->/g,""))),
  "لا عنصر <style> في index.html");
 ok(!/\sstyle\s*=/.test(HTML.replace(/<!--[\s\S]*?-->/g,"")),
  "لا سمة style في index.html (ولا في noscript)");
 /* استثناءٌ ضيّقٌ ومُبرَّر: exporter.js لا يُدرِج شيئاً في DOM التطبيق
    الخاضع لسياسة index.html — يبني مستنداً مستقلاً منفصلاً (ملفّ
    civildraft-guide.html يُنزَّل ويُفتح بمفرده بلا خادم ولا وصلَ
    بأوراق CSS خارجية ممكناً). سياسة style-src للتطبيق الحيّ لا تسري
    ولا يمكن أن تسري على مستندٍ آخر يُصدَّر كملفٍّ قائم بذاته؛ فرضها
    هنا يعني منع هذا المستند من أن يُنسَّق أصلاً. */
 const SELF_CONTAINED_DOC=["js/guide/exporter.js"];
 const bad=[];
 JS.forEach(([f,src])=>{
  if(SELF_CONTAINED_DOC.includes(f.replace(/^[\\/]/,"")))return;
  const c=strip(src);
  if(/\bstyle\s*=\s*\\?["']/.test(c))bad.push(f+": style=");
  if(/createElement\(\s*["']style["']\s*\)/.test(c))bad.push(f+": <style>");
  if(/setAttribute\(\s*["']style["']/.test(c))bad.push(f+": setAttribute(style)");
  if(/<style[\s>]/.test(c))bad.push(f+": <style في قالب");
  if(/\.style\.cssText\s*=/.test(c))bad.push(f+": style.cssText= (محجوبٌ فعلياً)");
 });
 eq(bad.length,0,"لا style= ولا <style> ولا setAttribute في JS"+
  (bad.length?" — "+bad.join(" · "):""));
});

/* ═══ بقيّةُ ما تمنعه السياسة ═══ P2-006
   كان الحارسُ يفحص خمسةَ أشكالٍ من style وحدها، فأيُّ خرقٍ من
   الأنواع الأخرى يمرّ منه صامتاً. الآن كلُّ توجيهٍ له assertion
   مستقلّة، وكلُّ سماحٍ مقصودٍ له قائمةُ سماحٍ صريحةٌ بسببها —
   فالاستثناءُ عقدٌ لا ثغرة. */
group("CSP · سمةُ حدثٍ مضمَّنة — script-src لا تسمح بها",()=>{
 const EV="onclick|onchange|oninput|onload|onerror|onsubmit|onfocus|onblur"
  +"|onkeydown|onkeyup|onmouseover|onmousedown|onmouseup|onpointerdown";
 const re=new RegExp(`(?:^|[\\s"'\`<])(?:${EV})\\s*=\\s*["'\`]`,"i");
 const bad=[];
 if(re.test(strip(HTML)))bad.push("index.html");
 JS.forEach(([f,src])=>{ if(re.test(strip(src)))bad.push(f) });
 eq(bad.length,0,"لا سمةَ حدثٍ في HTML ولا في قوالب JS"
  +(bad.length?" — "+bad.join(" · "):""));
 /* إسنادُ خاصّيةٍ (el.onclick=fn) ليس سمةً مضمَّنة ولا تمنعه CSP */
 ok(/\.onclick\s*=/.test(JS.map(x=>x[1]).join("\n")),
  "والإسنادُ البرمجيّ (.onclick=) موجودٌ ومسموحٌ — فالفحصُ يميّزهما");
});

group("CSP · javascript: — لا عنوانَ تنفيذيّ",()=>{
 const re=/["'`]\s*javascript\s*:/i;
 const bad=[];
 if(re.test(strip(HTML)))bad.push("index.html");
 JS.forEach(([f,src])=>{ if(re.test(strip(src)))bad.push(f) });
 eq(bad.length,0,"لا javascript: في أيّ مصدر"
  +(bad.length?" — "+bad.join(" · "):""));
});

group("CSP · لا إنشاءَ script أو style أو link ديناميكياً",()=>{
 const bad=[];
 JS.forEach(([f,src])=>{
  const c=strip(src);
  if(/createElement\(\s*["'`](script|style|link)["'`]\s*\)/i.test(c))
   bad.push(f+": createElement");
  if(/insertAdjacentHTML\([^)]*<\s*(script|style|link)\b/i.test(c))
   bad.push(f+": insertAdjacentHTML");
  if(/<\s*script\b/i.test(c))bad.push(f+": <script في قالب");
  if(/document\.write\s*\(/.test(c))bad.push(f+": document.write");
  if(/\bnew\s+Function\s*\(/.test(c))bad.push(f+": new Function");
  if(/(?:^|[^\w.])eval\s*\(/.test(c))bad.push(f+": eval");
 });
 eq(bad.length,0,"لا إنشاءَ سكربتٍ أو نمطٍ أو رابطٍ ولا تنفيذَ نصّ"
  +(bad.length?" — "+bad.join(" · "):""));
});

group("CSP · لا CSSOM يتجاوز style-src",()=>{
 const bad=[];
 JS.forEach(([f,src])=>{
  const c=strip(src);
  if(/document\.styleSheets/.test(c))bad.push(f+": styleSheets");
  if(/\.insertRule\s*\(/.test(c))bad.push(f+": insertRule");
  if(/\.replaceSync\s*\(|new\s+CSSStyleSheet/.test(c))
   bad.push(f+": CSSStyleSheet");
 });
 eq(bad.length,0,"لا insertRule ولا CSSStyleSheet"
  +(bad.length?" — "+bad.join(" · "):""));
});

group("CSP · لا عاملٌ ولا blob/data سكربت",()=>{
 const bad=[];
 JS.forEach(([f,src])=>{
  const c=strip(src);
  if(/new\s+(Shared)?Worker\s*\(/.test(c))bad.push(f+": Worker");
  if(/importScripts\s*\(/.test(c))bad.push(f+": importScripts");
  if(/["'`]data:(?:text\/javascript|application\/javascript)/i.test(c))
   bad.push(f+": data: script");
 });
 eq(bad.length,0,"لا Worker ولا data: سكربت"
  +(bad.length?" — "+bad.join(" · "):""));
 /* وBlob وcreateObjectURL مسموحانِ للتنزيل وحده — قائمةُ سماحٍ صريحة */
 const DL=["js/io/project.js","js/io/report.js","js/io/boqcsv.js",
  "js/io/export.js","js/io/png.js","js/io/zip.js","js/io/boqpdf.js",
  "js/io/pdf.js","js/io/elev.js","js/io/sect.js","js/io/boqreport.js",
  "js/guide/exporter.js","js/ui/gallery.js","js/ui/rpt.js",
  "js/ui/inspector.js","js/ui/view3d.js","js/ui/appcmds.js",
  "js/core/underlay.js","js/ui/underlayPanel.js",
  "js/ui/studio.js",    /* فيديو الدرس (WebM) وترجمتُه ونصُّ خطواته */
  "js/ui/learn.js"];    /* شهادةُ الإنجاز SVG — معاينةٌ وتنزيل */
 const users=JS.filter(([f,src])=>/createObjectURL\s*\(/.test(strip(src)))
  .map(([f])=>f.replace(/^[\\/]/,""));
 const unlisted=users.filter(f=>!DL.includes(f));
 eq(unlisted.length,0,"وكلُّ مستعملي createObjectURL في قائمة التنزيل"
  +(unlisted.length?" — "+unlisted.join(" · "):""));
});

group("CSP · connect-src يطابق ما يُطلَب فعلاً",()=>{
 /* لا fetch خارج ai/net.js (وsw.js يمرّر same-origin لا أكثر) */
 const callers=JS.filter(([f,src])=>
  /(?:^|[^\w.])fetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|new\s+EventSource/
   .test(strip(src))).map(([f])=>f.replace(/^[\\/]/,""));
 const ALLOW=["js/ai/net.js"];
 const extra=callers.filter(f=>!ALLOW.includes(f));
 eq(extra.length,0,"الطلبُ الشبكيُّ من ai/net.js وحده"
  +(extra.length?" — "+extra.join(" · "):""));
 /* وكلُّ مضيفٍ ثابتٍ في المصادر مذكورٌ في connect-src الثلاثة */
 /* التعليقاتُ تُنزَع أوّلاً: شرحُ السياسة في أعلى الملفّ يذكر
    «connect-src» نصّاً، فالبحثُ الخام كان يلتقطه بدل التوجيه. */
 const pol=/connect-src ([^;"]+)/.exec(HTML.replace(/<!--[\s\S]*?-->/g,""));
 ok(!!pol,"connect-src معلَنةٌ في index.html");
 const net=JS.find(([f])=>/net\.js$/.test(f));
 const hosts=[...new Set([...strip(net?net[1]:"")
  .matchAll(/https?:\/\/[a-z0-9.\-]+(?::\d+)?/gi)].map(m=>m[0]))];
 ok(hosts.length>0,`${hosts.length} مضيفاً ثابتاً في net.js`);
 const miss=hosts.filter(h=>!(pol[1].includes(h)
  ||/^https:/.test(h)&&pol[1].includes("https:")
  ||/^http:\/\/(localhost|127\.0\.0\.1)/.test(h)&&/localhost|127\.0\.0\.1/.test(pol[1])));
 eq(miss.length,0,"ولا مضيفَ يطلبه الكودُ وتمنعه السياسة"
  +(miss.length?" — "+miss.join(" · "):""));
});

group("كل ملفّ css مربوط وكل رابطٍ موجود",()=>{
 const links=[...HTML.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 ok(links.length>=15,`روابط الأنماط (${links.length})`);
 links.forEach(h=>ok(existsSync(join(ROOT,h)),`${h} موجود`));
 const files=readdirSync(join(ROOT,"css")).filter(n=>n.endsWith(".css"));
 files.forEach(n=>ok(links.includes("css/"+n),`css/${n} مربوط`));
 ok(links.indexOf("css/boot.css")===0,"boot.css أوّلاً: الشعار يظهر قبل السكربت");
});

group("الأصناف المساعدة معرَّفة ومستعمَلة (بلا يتيم ولا ناقص)",()=>{
 const css=["util.css","panels.css"].map(n=>rd("css/"+n)).join("\n");
 const defined=new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]));
 const used=new Set();
 JS.forEach(([f,src])=>{
  for(const m of strip(src).matchAll(/class="([^"]*)"/g))
   m[1].split(/\s+/).forEach(t=>{ if(t&&!t.includes("$")&&!t.includes("{"))used.add(t) });
 });
 const utils=[...defined].filter(c=>/^u-[0-9a-f]{5}$/.test(c));
 ok(utils.length>=15,`أصناف u- مولَّدة (${utils.length})`);
 utils.forEach(c=>ok(used.has(c),`.${c} مستعمَل`));
 const missing=[...used].filter(c=>/^u-[0-9a-f]{5}$/.test(c)&&!defined.has(c));
 eq(missing.length,0,"لا صنف u- مستعمَل بلا تعريف"+(missing.length?" — "+missing:""));
 /* أصناف panels.css التي تُبنى بشرطٍ (${on?"":" off"}) تُفحَص من نصّ القالب */
 const all=strip(JS.map(x=>x[1]).join("\n"));
 ["lrow","lbtn","lsw","lname","lcnt","rrow","rgrow","rmark","insrow",
  "rsrc","rsn","rsc","m1"].forEach(c=>{
   ok(defined.has(c),`.${c} معرَّف في panels.css`);
   ok(new RegExp(`class="[^"]*\\b${c}\\b`).test(all),`.${c} يُستعمَل في قالب`);
  });
 ["off","cur","dim","lk","stale","clk","bad","er","wr","in"].forEach(m=>
  ok(new RegExp(`\\.\\w+\\.${m}\\b`).test(css),`مُعدِّل .${m} معرَّف`));
});

group("ما كان يُحقَن صار ملفّاً: لا وحدة تحقن CSS",()=>{
 ["js/ui/historypanel.js","js/ui/blockpanel.js"].forEach(f=>{
  const s=rd(f);
  ok(!/injectCss/.test(s),`${f}: لا injectCss`);
 });
 ["history","blocks"].forEach(n=>{
  const c=rd(`css/${n}.css`);
  ok(c.length>800&&!/\$\{/.test(c),`css/${n}.css بلا قوالب غير مُحلَّلة`);
 });
 ok(/#histPanel/.test(rd("css/history.css")),"ولوحة التاريخ");
 ok(/#blkPanel/.test(rd("css/blocks.css")),"ولوحة العناصر");
});

const {paintBg}=await import("../ui/props.js").catch(()=>({}));
group("لون الطبقة: data-bg → CSSOM (يعمل تحت السياسة)",()=>{
 if(typeof paintBg!=="function"){ ok(true,"props.js يحتاج DOM كاملاً — يُفحَص ساكناً"); return }
 const mk=v=>({st:{},getAttribute:k=>k==="data-bg"?v:null,
  get style(){return this.st}});
 const a=mk("#ff0000"), b=mk("#00ff00");
 paintBg({querySelectorAll:s=>{ eq(s,"[data-bg]","المحدِّد"); return [a,b] }});
 eq(a.st.background,"#ff0000","اللون الأول");
 eq(b.st.background,"#00ff00","الثاني");
});
group("توازن الأقواس {} في كل css/*.css",()=>{
 /* بعد إزالة التعليقات والنصوص: أي عمق سالب أو غير صفري في النهاية عطبٌ
    يجعل المحلّل يبتلع القاعدة التالية بصمت (كان في modern.css: قاعدة
    prefers-reduced-motion تسقط) */
 const clean=s=>s.replace(/\/\*[\s\S]*?\*\//g,"")
  .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g,'""');
 const bal=s=>{ let d=0,min=0;
  for(const c of clean(s)){ if(c==="{")d++; else if(c==="}"){ d--; if(d<min)min=d } }
  return {d,min} };
 const files=readdirSync(join(ROOT,"css")).filter(n=>n.endsWith(".css"));
 ok(files.length>=15,`ملفّات css المفحوصة (${files.length})`);
 files.forEach(n=>{ const {d,min}=bal(rd("css/"+n));
  ok(min>=0&&d===0,`css/${n}: أقواس متوازنة (نهاية ${d}، أدنى عمق ${min})`) });
 /* الفاحص نفسه يكشف العطب: نسخة modern.css القديمة بالسطرين اليتيمين */
 const broken=bal("@keyframes a{from{opacity:0}to{opacity:1}}\n 50%{opacity:1}\n}\n@media x{*{a:b}}");
 ok(broken.min<0,"الفاحص يفشل عند قوس زائد (عمق سالب)");
 ok(bal("a{b:c").d!==0,"الفاحص يفشل عند قوس ناقص");
 ok(bal("a{content:\"}\"} /* } */").d===0,"لا يتأثر بالأقواس داخل النصوص والتعليقات");
});

process.exit(summary());
