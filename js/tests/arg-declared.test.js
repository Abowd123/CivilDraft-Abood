/* ═══ كلُّ أداةٍ تقرأ وسيطاً تُعلنه ═══ (مسحُ ما قبل المرحلة ٩)
   سطرُ الإدخال (ui/sugg.js) لا يمرّر الذيلَ إلا لأداةٍ arg:1 — فـ«grp أعمدة»
   و«play X» و«shnew مسقط» كانت تُرَدّ «مافيش أداة اسمها …» وتلميحُها يقول
   اكتبها هكذا. هذا الحارس يقرأ مصدر الأدوات: من قرأ ctx.arg أعلن arg. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync,readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
const src=readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")).map(f=>readFileSync(HERE+"../tools/"+f,"utf8")).join("\n");
group("من قرأ ctx.arg أعلن arg:1",()=>{
 const bad=[];
 R.toolList().forEach(d=>{
  const i=src.indexOf(`id:"${d.id}"`); if(i<0)return;
  const n=src.indexOf("defTool(",i+5), body=src.slice(i,n>0?n:i+3000);
  if(/ctx\.arg|argOf\(ctx\)/.test(body)&&!d.arg)bad.push(d.id);
 });
 eq(bad.join(" "),"","لا أداةَ تقرأ وسيطاً بلا إعلان");
 ["grp","play","delmacro","shnew","shren","gsel","gm","ug","rec"].forEach(a=>{
  const d=R.findTool(a); ok(d&&R.tailOk(d,"اسم"),`«${a} اسم» يمرّ من سطر الإدخال`);
 });
});
group("rec أعمدة يسمّي الماكرو عند الإيقاف",()=>{
 ST.newState(); ST.ensureShape(); rig.clear();
 R.begin("macrorec"); R.begin("col"); rig.at(0,0); rig.esc(); R.begin("macrorec","أعمدة");
 ok(rig.said(/حُفظ الماكرو «أعمدة»/),"باسمه لا «ماكرو»");
 R.begin("macrodel","أعمدة");
});
process.exit(summary()?1:0);
