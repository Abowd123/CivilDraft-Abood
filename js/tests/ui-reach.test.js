/* ═══ كل أداة مسجَّلة لها مدخلٌ في الواجهة ═══
   الحارس يمنع أداةً تُضاف بلا زرّ ولا مدخل: كل أداة في السجلّ يجب أن تكون
   (أ) زرّاً في الشريط (cmd)، أو (ب) مربوطةً بفعلٍ هو زرّ في الشريط
   (كأوامر appcmds التي تفوّض إلى act)، أو (ج) مدخلاً معلَناً هنا بدليلٍ
   نصّيّ في ملف الواجهة المعنيّ — والدليل يُفحَص فيسقط الاختبار إن زال الزرّ.
   ومدخل «لوحة الأوامر» وحدها ليس مدخلاً.
   node js/tests/ui-reach.test.js */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv"); DOC.body.appendChild(cv);}
if(!globalThis.window)globalThis.window={prompt:()=>null,confirm:()=>true};

const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const src=f=>readFileSync(join(ROOT,f),"utf8");

for(const f of ["draw","sketch","openings","parts","roof","areas","modify",
 "annotate","ref","boq","boqreport","elev","section","sheet","clouds",
 "groups","macros"])await import(`../tools/${f}.js`);
const uiMods=["hygiene","gate","levelManager","styleManager","underlayPanel",
 "pricingPanel","view3d","appcmds","viewcmds","blockpanel"];
const failed=[];
for(const f of uiMods){
 try{await import(`../ui/${f}.js`)}catch(e){failed.push(`${f}: ${e&&e.message}`)}
}
const R=await import("../tools/registry.js");
const SC=await import("../ui/ribbon/schema.js");

const ribbonCmds=new Set(SC.ribbonCmds());
const ribbonActs=new Set(SC.ribbonActs());

/* أدواتٌ بلا cmd في الشريط: أداة ← الفعل الذي هو زرّها في الشريط */
const APP=src("js/ui/appcmds.js");
const viaAct={};
[...APP.matchAll(/^act\("(\w+)",\s*"(\w+)"/gm)].forEach(m=>{viaAct[m[1]]=m[2]});
Object.assign(viaAct,{
 levelMgr:"levelMgrDlg", styleMgr:"styleMgrDlg", underlay:"underlayDlg",
 underlayCtl:"underlayCtlDlg", pricing:"pricingDlg", view3d:"view3dDlg"});

/* مداخل غير الشريط: أداة ← [ملفّ، دليلٌ نصّيّ] */
const ELSEWHERE={
 ulcal:["js/ui/underlayPanel.js",'data-ul="cal"'],          /* زرّ «معايرة بنقطتين» */
 mkblock:["js/ui/blockpanel.js",'data-act="new"'],          /* زرّ + في لوحة العناصر */
 tour:["js/ui/welcome.js",'data-wc="tour"'],                /* «جولة سريعة» */
 view:["js/ui/navbar.js",'data-vma'],                       /* قائمة المناظر */
 viewsave:["js/ui/navbar.js",'v==="save"'],
 viewdel:["js/ui/navbar.js",'/^del:(.+)$/']
};

group("الاستيراد",()=>{
 eq(failed.join(" | "),"","كل ملفّات الواجهة المسجِّلة تُستورَد");
});

group("كل أداة لها مدخل",()=>{
 const tools=R.toolList();
 ok(tools.length>=110,`${tools.length} أداة مسجَّلة`);
 tools.forEach(d=>{
  const id=d.id;
  if(ribbonCmds.has(id)){ok(true,`«${id}»: زرّ في الشريط`); return}
  if(viaAct[id]){
   ok(ribbonActs.has(viaAct[id]),`«${id}»: زرّ الفعل «${viaAct[id]}» في الشريط`);
   return;
  }
  const w=ELSEWHERE[id];
  if(w){
   ok(src(w[0]).includes(w[1]),`«${id}»: مدخلٌ في ${w[0]}`);
   return;
  }
  ok(false,`«${id}»: لا مدخل له في الواجهة — أضف زرّاً في schema.js أو مدخلاً معلَناً هنا`);
 });
});

group("لا مدخلٌ معلَنٌ ميّت",()=>{
 const ids=new Set(R.toolList().map(d=>d.id));
 Object.keys(ELSEWHERE).forEach(k=>ok(ids.has(k),`«${k}» ما زالت مسجَّلة`));
 Object.keys(viaAct).forEach(k=>ok(ids.has(k),`«${k}» (عبر فعل) ما زالت مسجَّلة`));
 /* كل زرّ في الشريط يحلّ إلى أداة */
 ribbonCmds.forEach(c=>ok(!!R.findTool(c),`زرّ «${c}» له أداة`));
});

summary();
