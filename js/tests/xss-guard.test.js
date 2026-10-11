/* ═══ حارس XSS — الثغرات الثلاث من جرد ٣.١ ═══
   ساكنٌ كـcsp.test.js: يقرأ المصادر ولا يُنفِّذها. يثبت أن الثلاثة
   مواضع التي وثّقها PHASE3-INVENTORY كغير مُهرَّبة صارت مُهرَّبة أو
   حُوِّلت إلى textContent، وأن أيّ رجوعٍ عنها يُسقِط هذا الاختبار.

     ١. js/ui/panels.js:renderPanel  — e.message في innerHTML
     ٢. js/ui/gallery.js:card        — item.label/cat/desc في innerHTML
     ٣. js/ui/props.js:stairProps    — c.msgs.join("<br>") في innerHTML

   ويثبت أيضاً أن التهريب صار مركزياً (٣.٤): لا esc() محليّة متبقّية،
   وكل ملفٍّ كان يعرّفها يستورد escapeHtml من core/escape.js بدلاً. */
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

group("١. panels.js:renderPanel — e.message مُهرَّب الآن",()=>{
 const src=rd("js/ui/panels.js");
 /* دفعة 3.5: عُمِّم errMsgHtml (استخراج + تهريب في نداءٍ واحد)
    بدل esc(String(e.message||e)) — نفس الأمان، توحيدٌ أوسع. */
 ok(/import\s*\{errMsgHtml\}\s*from\s*"\.\.\/core\/escape\.js"/.test(src),
  "يستورد errMsgHtml من core/escape.js");
 ok(/errMsgHtml\(e\)/.test(src),
  "e.message يمرّ عبر errMsgHtml() قبل innerHTML");
 ok(!/\$\{String\(e\.message\|\|e\)\}<\/p>/.test(src),
  "لا رجوعَ إلى الإدراج غير المُهرَّب القديم");
 ok(!/esc\(String\(e\.message\|\|e\)\)/.test(src),
  "لا رجوعَ إلى نمط esc(String(e.message||e)) الوسيط");
});

group("٢. gallery.js:card — item.label/cat/desc عبر textContent لا innerHTML",()=>{
 const src=rd("js/ui/gallery.js");
 ok(!/c\.innerHTML\s*=\s*`.*item\.label/s.test(src),
  "card() لا تكتب item.label عبر innerHTML");
 ok(/title\.textContent\s*=\s*item\.label/.test(src),"title عبر textContent");
 ok(/cat\.textContent\s*=\s*item\.cat/.test(src),"cat عبر textContent");
 ok(/desc\.textContent\s*=/.test(src),"desc عبر textContent");
});

group("٣. props.js:stairProps — رسائل stCheck مُهرَّبة",()=>{
 const src=rd("js/ui/props.js");
 ok(/c\.msgs\.map\(esc\)\.join\("<br>"\)/.test(src),
  "c.msgs تمرّ عبر esc() قبل الدمج والإدراج");
});

group("التهريب مركزيّ: لا esc() محلّية متبقّية في js/ui أو js/app.js",()=>{
 const offenders=[];
 JS.forEach(([f,src])=>{
  if(/^js\/(ui\/|app\.js$)/.test(f)&&/^const esc=s=>String\(s==null/m.test(src))
   offenders.push(f);
 });
 eq(offenders.length,0,"لا تعريفَ محلّياً لـesc() بقي"+
  (offenders.length?" — "+offenders.join(" · "):""));
});

group("كل ملفّات الواجهة التي استعملت esc() تستورده من core/escape.js",()=>{
 /* دفعة 3.5 أضافت errMsg كاستيرادٍ ثانٍ في بعض الملفّات (مثل
    "escapeHtml as esc,errMsg") — فالنمط هنا يتسامح مع أي قائمة
    استيرادٍ تحوي escapeHtml as esc، لا سطراً بالحرف. */
 const missing=[];
 JS.forEach(([f,src])=>{
  if(!/^js\/(ui\/|app\.js$)/.test(f))return;
  if(/\besc\(/.test(src)&&
     !/import\s*\{[^}]*escapeHtml as esc[^}]*\}\s*from\s*["'][^"']*core\/escape\.js["']/.test(src))
   missing.push(f);
 });
 eq(missing.length,0,"كل مستعملي esc() يستوردونها من core/escape.js"+
  (missing.length?" — "+missing.join(" · "):""));
});

process.exit(summary());
