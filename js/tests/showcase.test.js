/* ═══ قالب «فيلا العرض» يُبنى بالأدوات الحقيقية ═══
   القالبُ خطواتُ أدوات (tools/showcase.js) يشغّلها tplscript.js داخل
   معاملةٍ واحدة. فإن تغيّرت أداةٌ فكذب القالب سقط هنا.
   التشغيل:  node js/tests/showcase.test.js                          */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const EN=await import("../core/ents.js");
const RN=await import("../core/render.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const TP=await import("../core/templates.js");
const SC=await import("../tools/showcase.js");
const TS=await import("../tools/tplscript.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,250,k),invalidate:()=>RN.invalidate()});
const S=ST.S;
const fresh=()=>{ST.newState(); ST.ensureShape(); ST.clearHistory(); TP.installDefaults(); rig.clear()};
const n=k=>(S[k]||[]).length;

group("القالب مسجَّلٌ بين القوالب، ويُبنى بلا خطأ",()=>{
 fresh();
 ok(TP.templateList().some(t=>t.name==="showcase"),"«showcase» في القائمة");
 ok(TP.isScript("showcase")&&!TP.isScript("villa"),"قالبُ أدوات، والقديمةُ بيانات");
 R.setOpt("wall","t","0.3"); S.rb.ortho=1;
 const r=TP.apply("showcase");
 ok(r&&r.ok,"اكتمل");
 eq(rig.errs().length,0,"بلا رسالة خطأ من أيّ أداة");
 ok(!R.active(),"ولا أداةٌ معلّقة");
});
group("المحتوى: أغلب أنواع العناصر حاضرة",()=>{
 const want={walls:11,opens:16,areas:7,cols:15,fixt:43,stairs:1,roofs:1,plines:1,clouds:1,livefields:1,tables:1,groups:1,sheets:1};
 for(const k in want)eq(n(k),want[k],k);
 ok(n("dims")>=6&&n("chains")>=5&&n("anno")>=7&&n("struct")>=6,"أبعادٌ وسلاسلُ وتأشيرٌ وإنشائي");
 ok(S.walls.some(w=>w.type==="ext")&&S.walls.some(w=>w.type==="int")&&S.walls.some(w=>w.type==="low"),"جدرانٌ خارجية وداخلية ومنخفضة");
 ok(S.walls.some(w=>w.arc||w.c||w.bulge),"وجدارٌ قوسيّ");
 const kinds=new Set(S.opens.map(o=>o.kind));
 ["door","double","sliding","window","opening","arch","niche","fixed"].forEach(k=>ok(kinds.has(k),`فتحة «${k}»`));
 eq(S.areas.map(a=>a.name).join("،"),"مجلس 1،مدخل 2،صالة 3،مطبخ 4،درج 5،حمّام 6،غرفة نوم رئيسية 7","المناطقُ بأسمائها وأرقامها");
 eq(S.areas.filter(a=>a.fill==="hatch").length,2,"المطبخُ والحمّام مهشَّران");
 eq(S.grid.xs.length+S.grid.ys.length,8,"خمسةُ محاور رأسية وثلاثةٌ أفقية");
 eq(S.groups[0].name,"طقم الطعام","المجموعة باسمها");
 eq(S.groups[0].members.length,5,"طاولةٌ وأربعةُ كراسٍ (مصفوفة قطبية)");
 eq((S.levelDefs||[]).length,2,"طابقٌ أرضي وطابقٌ أول");
 ok(S.roofs.every(r=>(r.level||0)===1),"والسقفُ على الطابق الأول");
 eq(S.meta.level,0,"وينتهي على الطابق الأرضي");
 eq(S.meta.scale,100,"المقياس 1:100");
 eq(S.sheets[0].name,"مسقط أرضي","ورقةٌ باسمها");
});
group("خطوةُ تراجعٍ واحدة، وخياراتُ المستخدم وأوضاعُه كما كانت",()=>{
 eq(R.ov("wall","t"),"0.3","سماكةُ الجدار التي اختارها المستخدم باقية");
 eq(S.rb.ortho,1,"والتعامد عاد كما كان");
 ST.undo(); eq(n("walls")+n("cols")+n("fixt"),0,"تراجعٌ واحد يُرجِع المشروع فارغاً");
 ok(!ST.canUndo(),"ولا خطوةَ قبلها");
 R.setOpt("wall","t","0.15");
});
group("القالب لا يتبع خيارات المستخدم اللزجة",()=>{
 fresh();
 R.setOpt("win","h","0.6"); R.setOpt("win","sill","1.6"); R.setOpt("door","kind","sliding"); R.setOpt("level","pre","X");
 TP.apply("showcase");
 const W=S.opens.filter(o=>o.kind==="window");
 eq(W.filter(o=>o.h===1400&&o.sill===900).length,W.length-1,"كلُّ الشبابيك بارتفاعها المعلَن عدا شباك الحمّام");
 eq(W.filter(o=>o.h===600).length,1,"وشباكُ الحمّام وحده 0.6");
 eq(S.opens.filter(o=>o.kind==="sliding").length,1,"بابٌ سحّاب واحد كما في القالب");
 eq(R.ov("win","h"),"0.6","وخيارُ المستخدم عاد بعده");
 eq(R.ov("door","kind"),"sliding","وكذلك نوع الباب");
 ["h","sill"].forEach(k=>R.setOpt("win",k,k==="h"?"1.4":"0.9")); R.setOpt("door","kind","door"); R.setOpt("level","pre","");
});
group("خطوةٌ تفشل تُرجِع كلَّ شيء",()=>{
 fresh();
 TP.defineTemplate({name:"_bad",title:"معطوب",script:[{tool:"wall"},{at:[[0,0],[5000,0],[5000,4000],[0,4000]]},{type:"c"},{esc:1},
  {tool:"area"},{at:[2500,2000]},{esc:1},{opt:["hatch","pat","XX"]},{pick:"all:area"},{tool:"hatch"},{esc:1}]});
 let msg="";
 try{TP.apply("_bad")}catch(e){msg=e.message}
 ok(/XX/.test(msg),"الخطأُ يُذكَر برسالة الأداة نفسِها");
 eq(n("walls"),0,"ولا جدارَ بقي من نصف القالب");
 eq(R.ov("hatch","pat"),"ANSI31","والخيارُ الذي غيّره عاد");
 let m2=""; try{TS.runScript({name:"x",script:[{foo:1}]})}catch(e){m2=e.message}
 ok(/فعلٌ مجهول/.test(m2),"والفعلُ المجهول يُرفض");
 let m3=""; try{TS.runScript({name:"x",script:[{pick:"idx:area:9"}]})}catch(e){m3=e.message}
 ok(/لا area/.test(m3),"والتحديدُ بترتيبٍ غير موجود يُرفض");
});
group("يغطّي أغلب أدوات المشروع",()=>{
 const used=new Set(SC.SHOWCASE.filter(a=>a.tool).map(a=>a.tool));
 used.forEach(id=>ok(!!R.findTool(id),`«${id}» أداةٌ موجودة`));
 ok(used.size>=60,`${used.size} أداةً مختلفة`);
});
process.exit(summary()?1:0);
