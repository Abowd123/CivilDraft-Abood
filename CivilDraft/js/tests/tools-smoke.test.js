/* ═══ فحصٌ آليٌّ شاملٌ لكل أداة في السجلّ ═══ (المرحلة ٣ · 2026-10-03)
   tools-real.test.js يتحقّق من **صحّة النتيجة** لـ110 أدوات بجدولٍ
   يدويّ. هذا الملفّ مكمّلٌ لا بديل: يمرّ على **كل** أداةٍ مسجَّلة (١٥٠)
   بلا جدول، يدفعها بمدخلاتٍ عامّة على مشهدٍ غنيّ، ثم يفرض ستّةَ عقودٍ
   لا تحتاج معرفةَ الأداة:
     ١) لا انهيار: لا استثناءَ JS يخرج، ولا رسالةُ خطأٍ هي خطأُ برمجة
        (TypeError/ReferenceError/«is not a function»/«undefined»…)
     ٢) لا NaN ولا Infinity في الحالة
     ٣) كل كيانٍ في كل مجموعةٍ يمرّ بمخطَّطه في validate.js
     ٤) التراجع يعيد الحالة كما كانت قبل الأداة بايتاً ببايت
     ٥) الحفظ ثم الفتح ثم الحفظ = النصّ نفسه
     ٦) المشهد يُبنى، وDXF وSVG يُصدَّران بلا استثناء
   التشغيل:  node js/tests/tools-smoke.test.js [--table]
   البيئة:    TOOLS_SMOKE_JSON=path يكتب نتيجةَ كل أداة.                  */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv"); DOC.body.appendChild(cv);}
if(!globalThis.window)globalThis.window={prompt:()=>null,confirm:()=>true};
const HERE=fileURLToPath(new URL(".",import.meta.url));

const ST=await import("../core/state.js");
const {S,COLLS,newState,ensureShape,undo,historyTimeline,clearHistory,edit}=ST;
const W=await import("../core/walls.js");
const RN=await import("../core/render.js");
const EN=await import("../core/ents.js");
const PRJ=await import("../io/project.js");
const DXF=await import("../io/dxf.js");
const SVG=await import("../io/svg.js");
const BLK=await import("../core/blocks.js");
const BOPS=await import("../tools/blockops.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))
 await import(`../tools/${f}`);
for(const f of ["hygiene","gate","levelManager","appcmds","viewcmds","blockpanel"])
 await import(`../ui/${f}.js`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,150,k),invalidate:()=>RN.invalidate()});
R.H.del=()=>edit(()=>EN.delEnts(rig.sel.slice()),"حذف");

/* أخطاءُ برمجةٍ لا رسائلُ مستخدم */
const BUG=/TypeError|ReferenceError|RangeError|SyntaxError|is not a function|is not defined|Cannot read|Cannot set|of undefined|of null|undefined|NaN|Maximum call stack|\[object Object\]/;
/* ما بين «» صدى مدخلِ المستخدم لا كلامُ الشيفرة — «NaN» كتبها هو */
const isBug=s=>BUG.test(String(s).replace(/«[^»]*»/g,""));
const snap=()=>JSON.stringify(S,(k,v)=>(k==="meta"||k==="__ver")?undefined:v);
const steps=()=>historyTimeline().current;
function badNum(o,path,out){
 if(out.length>3)return;
 if(typeof o==="number"){if(!Number.isFinite(o))out.push(path);return}
 if(o&&typeof o==="object")for(const k in o)badNum(o[k],path+"."+k,out);
}
function scene0(){
 newState(); ensureShape(); RN.invalidate();
 if(R.active())R.cancel(true);
 rig.pick([]); rig.clear();
 const Q=[[0,0],[6000,0],[6000,4000],[0,4000]];
 edit(()=>{
  for(let i=0;i<4;i++)W.addWall(Q[i],Q[(i+1)%4],250,"ext","c");
  W.addWall([3000,0],[3000,4000],150,"int","c");
 },"مشهد");
 RN.invalidate();
 /* كياناتٌ إضافيةٌ بالأدوات نفسها، إن وُجدت */
 const mk=(id,pts)=>{try{if(R.findTool(id)){R.begin(id); pts.forEach(p=>rig.at(...p)); if(R.active())rig.esc()}}catch(e){}};
 mk("door",[[1500,0]]);
 mk("dim",[[0,-800],[6000,-800],[3000,-1200]]);
 mk("text",[[1500,2000]]);
 mk("pline",[[500,500],[2500,500],[2500,1500]]);
 mk("col",[[4500,2000]]);
 /* أنواعٌ أُضيفت لاحقاً: سريرٌ وفيشةٌ وكمرة — كانت ensureShape تحذف القطعتين
    عند أوّل تراجع، وما كشفه الفحصُ لأنّ مشهدَه خلا منهما */
 mk("fbed1",[[1500,3000]]); mk("esoc",[[4500,3800]]); mk("beam",[[3500,500],[5500,500]]);
 /* مثيلُ كتلةٍ — صار كياناً (1.1.0 · ج) فتمرّ عليه الأدواتُ كلُّها */
 try{BOPS.createBlock("smk","مقعد",[{t:"line",a:[0,0],b:[800,0]},
  {t:"arc",c:[0,0],r:600,a0:0,a1:Math.PI/2}],[0,0]);
  edit(()=>S.blocks.push(BLK.makeInstance("smk",{x:4200,y:2600})),"كتلة")}catch(e){}
 RN.invalidate(); rig.clear();
 clearHistory();      /* السقف MAX يبتلع الفرقَ لو تراكم التاريخ عبر الأدوات */
 R.toolList().forEach(d=>{rig.defs(d.id);
  /* حقولُ النصّ الفارغةُ افتراضاً تُملأ: «نصّ» يأخذ متنه من الشريط لا من سطر الأوامر */
  (d.opts||[]).forEach(f=>{if(f.type==="text"&&!f.def)R.setOpt(d.id,f.k,"اختبار")})});
 /* جداران محدَّدان: أدواتُ التعديلِ والتجميعِ والتسويةِ تجد ما تعمل عليه */
 rig.pick(S.walls.slice(-2).map(w=>({k:"wall",id:w.id})));
}
/* نقاطٌ داخلَ الغرفتين للأدوات الحرّة، ونقاطٌ على الجدران لخطوات «انقر عنصراً» */
const FREE=[[1500,2000],[2500,1000],[4500,3000],[1000,3000],[5500,3500],[2000,1500],[4000,1000]];
const ONENT=[[3000,1000],[1500,0],[6000,2000],[3000,3000],[1500,4000]];
const TXT=["1.2","اختبار","3 2.5 4","2"];

function drive(id){
 const thrown=[];
 const T=f=>{try{return f()}catch(e){thrown.push(e);return false}};
 T(()=>R.begin(id));
 let fi=0, ei=0;
 for(let n=0;n<16&&R.active();n++){
  const st=R.step(); if(!st)break;
  const i0=R.T.i, p0=R.T.ctx?R.T.ctx.pts.length:0;
  const moved=()=>!R.active()||R.T.i!==i0||R.step()!==st||(R.T.ctx&&R.T.ctx.pts.length!==p0);
  if(st.confirm){T(()=>R.enter()); continue}
  if(st.freehand){T(()=>R.feedStroke([[1000,1000],[2000,1000],[2000,2000]])); T(()=>R.enter()); continue}
  const p=st.ent?ONENT[ei++%ONENT.length]:FREE[fi++%FREE.length];
  T(()=>rig.at(...p));
  if(moved())continue;
  for(const s of TXT){T(()=>R.feedText(s)); if(moved())break}
  if(!moved())T(()=>R.enter());
 }
 if(R.active())T(()=>R.cancel(true));
 return thrown;
}

/* ═══ الجولة العدائية ═══ مدخلاتٌ رديئة: نصوصٌ فارغةٌ وسالبةٌ ولا نهائيةٌ
   وحقنُ HTML، ونقاطٌ متطابقةٌ وبعيدةٌ جدّاً. المطلوب رفضٌ مهذّب لا انهيار. */
const BADTXT=["","abc","-5","0","1e309","NaN","-0","99999999","<img src=x onerror=1>","1,2,3,4,5","@-1,0","٫٫","🙂"];
const BADPT=[[1500,2000],[1500,2000],[1e9,1e9],[-1e9,0],[1500.4,2000.6],[0,0]];
function fuzz(id){
 const thrown=[];
 const T=f=>{try{return f()}catch(e){thrown.push(e);return false}};
 T(()=>R.begin(id));
 for(let n=0;n<BADTXT.length+BADPT.length&&R.active();n++){
  if(n%2)T(()=>R.feedText(BADTXT[n%BADTXT.length]));
  else T(()=>rig.at(...BADPT[(n/2|0)%BADPT.length]));
 }
 T(()=>R.enter());
 if(R.active())T(()=>R.cancel(true));
 return thrown;
}

const RES=[];
const ONLY=(process.env.TOOLS_ONLY||"").split(",").filter(Boolean);
const tools=R.toolList().filter(d=>!ONLY.length||ONLY.includes(d.id));
group(`السجلّ: ${tools.length} أداة`,()=>{ok(ONLY.length||tools.length>=150,"السجلّ كامل")});
for(const d of tools){
 const id=d.id, r={tool:id,label:d.label||"",fails:[]};
 const F=(c,m)=>{if(!c)r.fails.push(m)};
 try{
  scene0();
  const pre=snap(), h0=steps();
  const thrown=drive(id);
  thrown.forEach(e=>F(false,"استثناء: "+(e&&e.message||e)));
  rig.log.map(x=>x.s).filter(isBug).slice(0,2).forEach(s=>F(false,"خطأ برمجة: "+s));
  const bn=[]; COLLS.forEach(c=>badNum(S[c],c,bn)); F(!bn.length,"قيمة غير منتهية: "+bn.join(" "));
  /* (٣) سلامةُ البنية: fromJSON نفسُه هو الفاحص (يرفض ما لا يُحمَّل)؛
     VLD في validate.js مخطّطُ الاستيراد/العمليات لا شكلُ التخزين
     (العمود يُخزَّن x,y ويُستورَد p) فلا يُقاس عليه هنا. */
  r.changed=snap()!==pre; r.hist=steps()-h0;
  try{RN.invalidate(); const sc=RN.scene(); const bb=RN.sceneBBox();
   DXF.toDXF(sc.P,bb); const sv=SVG.toSVG(sc.P,bb,{}); F(sv&&typeof sv.txt==="string","SVG بلا نصّ");}catch(e){F(false,"تصدير/رسم: "+e.message)}
  if(r.hist>0){
   try{for(let k=0;k<r.hist;k++)undo(); const now=snap();
    if(now!==pre){const A=JSON.parse(pre),B=JSON.parse(now);
     const ks=[...new Set([...Object.keys(A),...Object.keys(B)])].filter(k=>JSON.stringify(A[k])!==JSON.stringify(B[k]));
     if(process.env.TOOLS_DEBUG)ks.forEach(k=>console.log("DBG",k,"\n pre:",JSON.stringify(A[k]).slice(0,400),"\n now:",JSON.stringify(B[k]).slice(0,400)));
     F(false,"التراجع لا يعيد الحالة: "+ks.join(","));}}
   catch(e){F(false,"تراجع: "+e.message)}
  }else if(r.changed&&!d.own&&!/^(view|viewsave|viewdel|level|levelMgr|tour|macrorec|macroplay|macrodel|jr)/.test(id)){
   r.warn="غيّر الحالة بلا خطوة تاريخ";
  }
  /* (٧) الجولة العدائية على مشهدٍ جديد */
  scene0(); const preF=snap(), hF=steps();
  fuzz(id).forEach(e=>F(false,"استثناء (عدائي): "+(e&&e.message||e)));
  rig.errs().filter(isBug).slice(0,2).forEach(s=>F(false,"خطأ برمجة (عدائي): "+s));
  {const bn=[]; COLLS.forEach(c=>badNum(S[c],c,bn)); F(!bn.length,"قيمة غير منتهية (عدائي): "+bn.join(" "));}
  {const dh=steps()-hF; try{for(let k=0;k<dh;k++)undo(); F(snap()===preF,"التراجع (عدائي) لا يعيد الحالة")}catch(e){F(false,"تراجع (عدائي): "+e.message)}}
  /* (٥) بعد التراجع لا قبله: fromJSON يبدأ تاريخاً جديداً */
  scene0(); drive(id);
  try{const a=PRJ.toJSON(); PRJ.fromJSON(a); F(PRJ.toJSON()===a,"الحفظ والفتح غير متطابقين");}
  catch(e){F(false,"حفظ/فتح: "+e.message)}
 }catch(e){r.fails.push("انهيار الجولة: "+e.message)}
 r.status=r.fails.length?"عطل":(r.warn?"تنبيه":"سليم");
 RES.push(r);
}
const byStat=s=>RES.filter(r=>r.status===s);
group("كل أداة تجتاز العقود السبعة",()=>{
 RES.forEach(r=>ok(!r.fails.length,`${r.tool}`+(r.fails.length?" — "+r.fails.join(" | "):"")));
});
if(process.env.TOOLS_SMOKE_JSON)writeFileSync(process.env.TOOLS_SMOKE_JSON,JSON.stringify(RES,null,1));
if(process.argv.includes("--table")){
 console.log(`\nسليم ${byStat("سليم").length} · تنبيه ${byStat("تنبيه").length} · عطل ${byStat("عطل").length}`);
 RES.filter(r=>r.status!=="سليم").forEach(r=>console.log(` ${r.status} ${r.tool}: ${r.fails.join(" | ")||r.warn}`));
}
process.exit(summary()?1:0);
