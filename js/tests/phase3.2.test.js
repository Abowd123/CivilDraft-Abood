/* ═══ دفعة 3.2 — الأنماط الديناميكية: توثيق + فحص النمطين المرجعيين ═══
   node js/tests/phase3.2.test.js

   الاختبار الساكن الأساسي (لا style= ولا <style> ولا cssText) في
   csp.test.js. هذا الملفّ يفحص ما فوقه:
     • توثيق النمطين المرجعيين في css/util.css
     • استعمال data-bg للونٍ من البيانات (لا style="background:")
     • استعمال setProperty لمتغيّر CSS (لا style="--var:...")
     • bootguard.js يستعمل CSSOM مفرداً (لا cssText، لا style=)
     • القيم المتغيّرة لحظياً تُكتَب كخصائص مفردة (لا style=)

   والغاية: أن يبقى المشروع نظيفاً بعد كل تعديل — أي نمطٍ محظور
   جديد يُسقِط هذا الملفّ فوراً. */
import {readFileSync,readdirSync,statSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const walk=(d,out)=>{readdirSync(d).forEach(n=>{const p=join(d,n);
 if(statSync(p).isDirectory()){ if(n!=="tests"&&n!=="node_modules")walk(p,out) }
 else if(/\.js$/.test(n))out.push(p)}); return out};
const JS=walk(join(ROOT,"js"),[])
 .map(p=>[p.slice(ROOT.length),readFileSync(p,"utf8")]);
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,"")
 .replace(/^\s*\/\/.*$/gm,"");

group("توثيق النمطين المرجعيين في css/util.css",()=>{
 const css=rd("css/util.css");
 ok(/نمط\s+data-bg/.test(css),"نمط data-bg موثَّق");
 ok(/نمط\s+setProperty/.test(css),"نمط setProperty موثَّق");
 ok(/CSSOM/.test(css),"CSSOM مذكور");
 ok(/bootguard/.test(css),"استثناء bootguard موثَّق");
 ok(/paintBg/.test(css),"paintBg مذكور كمثال");
 ok(/--cmdOpa/.test(css),"متغيّر --cmdOpa مذكور كمثال");
});

group("نمط data-bg: لونٌ من البيانات لا style=background",()=>{
 const src=rd("js/ui/props.js");
 ok(/export function paintBg/.test(src),"props.js يُصدِّر paintBg");
 ok(/data-bg=/.test(src),"القالب يكتب data-bg=");
 ok(/el\.style\.background=el\.getAttribute\("data-bg"\)/.test(src),
  "paintBg يقرأ السمة ويطبّقها عبر CSSOM");
});

group("نمط setProperty: قيمة متغيّرة إلى متغيّر CSS",()=>{
 const src=rd("js/ui/cmdline.js");
 ok(/\.style\.setProperty\("--cmdOpa"/.test(src),
  "cmdline.js يستعمل setProperty لمتغيّر --cmdOpa");
});

group("bootguard.js: CSSOM مفرد لا cssText ولا style=",()=>{
 const src=rd("js/bootguard.js");
 ok(/Object\.assign\(b\.style,/.test(src),
  "صندوق العطب يستعمل Object.assign(b.style, {...})");
 ok(/Object\.assign\(a\.style,/.test(src),
  "ذيل الصندوق يستعمل Object.assign(a.style, {...})");
 ok(!/\.style\.cssText\s*=/.test(src),"لا cssText في bootguard");
 ok(!/style\s*=\s*["'`]/.test(strip(src)),
  "لا style= في قالب bootguard");
});

group("القيم المتغيّرة لحظياً: خصائص مفردة مسموحة",()=>{
 const canvas=rd("js/ui/canvas.js");
 ok(/cv\.style\.width=/.test(canvas),"canvas.js: cv.style.width=");
 ok(/cv\.style\.height=/.test(canvas),"canvas.js: cv.style.height=");
 ok(/cv\.style\.cursor=/.test(canvas),"canvas.js: cv.style.cursor=");
 const dock=rd("js/ui/dock.js");
 ok(/\.style\.insetInlineStart=/.test(dock),
  "dock.js: style.insetInlineStart=");
 ok(/\.style\.inlineSize=/.test(dock),"dock.js: style.inlineSize=");
 const dyn=rd("js/ui/dyninput.js");
 ok(/\.style\.transform=/.test(dyn),"dyninput.js: style.transform=");
});

process.exit(summary());
