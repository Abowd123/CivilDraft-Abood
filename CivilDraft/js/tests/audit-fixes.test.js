/* ═══ مراجعةُ المشروع كلِّه (2026-10-05) — ما وُجد وأُصلح ═══
   كلُّ مجموعةٍ هنا تفشل على الشيفرة قبل الإصلاح.
   التشغيل:  node js/tests/audit-fixes.test.js                       */
import {shim,shimCanvas,shimDOM,toolRig,group,groupAsync,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const EN=await import("../core/ents.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const TP=await import("../core/templates.js");
const IN=await import("../core/inspect.js");
const DM=await import("../core/dims.js");
const CP=await import("../io/cp1256.js");
const PJ=await import("../io/project.js");
const FX=await import("../core/fixt.js");
const PNG=await import("../io/png.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,250,k)});
const S=ST.S;
const fresh=()=>{ST.newState(); ST.ensureShape(); ST.clearHistory(); TP.installDefaults(); rig.clear(); R.toolList().forEach(d=>rig.defs(d.id))};
const codes=()=>IN.inspect().list.map(x=>x.code);

group("الفاحص (F7) لا يسقط ببُعد نصف قطرٍ أو زاويةٍ معلَّق",()=>{
 fresh();
 S.dims.push({id:"D901",kind:"rad",c:[50000,50000],r:900,leader:[51000,51000]});
 S.dims.push({id:"D902",kind:"ang",vertex:[60000,60000],p1:[61000,60000],p2:[60000,61000],r:500});
 let ex=null; try{IN.inspect()}catch(e){ex=e}
 ok(!ex,"inspect يكتمل"+(ex?": "+ex.message:""));
 eq(DM.dimMid(S.dims[0]).join(","),"51000,51000","موضعُ ملاحظة نصف القطر عند نصّه");
 eq(DM.dimMid(S.dims[1]).join(","),"60000,60000","والزاويُّ عند رأسه");
 eq(DM.dimGeom(S.dims[0]),null,"وdimGeom يرفض غير الخطّيّ بدل أن يسقط");
});
group("لا «بُعد معلَّق» كاذب",()=>{
 fresh();
 R.setOpt("wall","t","0.2"); R.begin("wall"); [[0,0],[5000,0],[5000,4000],[0,4000]].forEach(p=>rig.at(...p)); rig.type("c"); rig.esc();
 R.begin("roomdim"); rig.at(2500,2000); R.enter(); rig.esc();
 ok(S.dims.length>=2,"«أبعاد الغرفة» أنشأت أبعادها");
 eq(DM.looseDims(30).length,0,"وأطرافُها على الوجوه الداخلية مربوطة (كانت كلُّها معلَّقة)");
 R.begin("arcwall"); rig.at(8000,0); rig.at(12000,0); rig.at(10000,2000); rig.esc();
 R.begin("dimrad"); rig.at(10000,0); rig.at(11414,1414); rig.at(12000,2500); rig.esc();
 const rd=S.dims.find(d=>d.kind==="rad");
 ok(rd&&!DM.dimLoose(rd,30),"نصفُ قطرٍ من مركز الجدار القوسيّ مربوط");
 R.begin("pline"); rig.at(20000,0); rig.at(22000,2000); rig.at(25000,2000); R.enter(); rig.esc();
 R.begin("dimang"); rig.at(22000,2000); rig.at(25000,2000); rig.at(20000,0); rig.esc();
 const an=S.dims.find(d=>d.kind==="ang");
 ok(an&&!DM.dimLoose(an,30),"وزاويةٌ رأسُها على رأس خطٍّ متعدّد مربوطة");
 S.dims.push({id:"D903",kind:"h",a:[90000,90000],b:[95000,90000],pos:91000});
 ok(DM.dimLoose(S.dims[S.dims.length-1],30),"وبُعدٌ في الفراغ ما زال معلَّقاً");
 R.setOpt("wall","t","0.15");
});
group("DXF: علامة الطرح والأرقام الهندية",()=>{
 const e=CP.encode("−0.150 · غرفة نوم ٢ · ۳");
 eq(e.bad,0,"لا محرفَ يُستبدل بـ «؟»");
 const t=CP.decode(e.bytes);
 ok(t.startsWith("-0.150"),"«−0.150» يُكتب «-0.150» (كان «?0.150» في الأوتوكاد)");
 ok(t.includes("غرفة نوم 2")&&t.endsWith("3"),"والأرقام الهندية لاتينية");
 eq(CP.encode("‏‎").bad,0,"وعلامتا الاتجاه كما كانتا");
});
group("سهم الميل: الحفظ ثم الفتح لا يغيّر المشروع",()=>{
 fresh();
 R.begin("slope"); rig.at(0,0); rig.at(0,-2000); rig.esc();
 const a=JSON.stringify(S.anno);
 PJ.fromJSON(PJ.toJSON());
 eq(JSON.stringify(S.anno),a,"لا s:\"\" يُضاف عند الفتح");
});
group("الأثاث الحرّ والمعلَّق بالسقف",()=>{
 ok(FX.FREE_KINDS.has("fd")&&FX.CEIL_KINDS.has("lampc")&&!FX.CEIL_KINDS.has("chair"),"FREE_KINDS وCEIL_KINDS");
 ok(FX.fixCeil({kind:"spot"})&&!FX.fixCeil({kind:"tablc"}),"fixCeil: السبوت معلَّق والطاولة لا");
 ok(FX.fixFree({kind:"fd"})&&FX.fixFree({kind:"lampc"})&&!FX.fixFree({kind:"wc"}),"الصفاية الأرضية والإنارة حرّتان، والكرسي الإفرنجي لا");
 eq(String(R.findTool("fd").opts.find(o=>o.k==="snap").def),"0","والصفايةُ لا تُلصَق بالجدار افتراضاً");
 fresh();
 R.begin("elamp"); rig.at(2000,2000); rig.esc();
 R.begin("ftablec"); rig.at(2000,2000); rig.esc();
 R.begin("fd"); rig.at(5000,5000); rig.esc();
 const c=codes();
 ok(!c.includes("ffree"),"لا «ظهرها لا يلاصق جداراً» لإنارةٍ أو طاولةٍ أو صفاية");
 ok(!c.includes("fover"),"ولا «تتراكب» لإنارة سقفٍ فوق طاولة");
 R.begin("wc"); rig.at(9000,9000); rig.esc();
 ok(codes().includes("ffree"),"والكرسي الإفرنجي بعيداً عن الجدار ما زال يُنبَّه");
});
group("الجدار المنخفض قائمٌ وحده",()=>{
 fresh();
 R.setOpt("wall","type","low"); R.begin("wall"); rig.at(0,0); rig.at(4000,0); rig.esc();
 ok(!codes().includes("end"),"سورُ حديقة بطرفين حرّين لا يُنبَّه");
 R.setOpt("wall","type","int"); R.begin("wall"); rig.at(0,5000); rig.at(4000,5000); rig.esc();
 ok(codes().includes("end"),"والقاطعُ الداخليّ الحرّ ما زال يُنبَّه");
});
group("قالب «فيلا العرض» بلا خطأٍ ولا تنبيه",()=>{
 fresh(); TP.apply("showcase");
 const L=IN.inspect().list.filter(x=>x.sev!=="in");
 eq(L.length,0,"صفرُ تنبيهات"+(L.length?": "+L[0].msg:""));
});
await groupAsync("PNG: قماشٌ أكبر من حدّ Safari يُصغَّر بدل أن يفشل",async()=>{
 const mk=document.createElement.bind(document);
 document.createElement=t=>{
  if(t!=="canvas")return mk(t);
  const c={width:0,height:0,getContext:()=>new Proxy({},{get:(o,k)=>k==="measureText"?(()=>({width:10})):(()=>{}),set:()=>true}),
   toBlob(cb){cb(this.width*this.height>PNG.SAFE_AREA?null:{size:this.width*this.height})}};
  return c;
 };
 try{
  const notes=[];
  const P=[{t:"line",L:"A-WALL",a:[0,0],b:[42000,29700]}];
  const r=await PNG.toPNGBlob(P,{x0:0,y0:0,x1:42000,y1:29700},{pad:0,dpi:600,notes});
  ok(!!r.blob,"صورةٌ خرجت");
  ok(r.info.px*r.info.py<=PNG.SAFE_AREA,"بمساحةٍ داخل الحدّ");
  ok(notes.some(n=>/صُغِّرت/.test(n)),"وقيل للمستخدم إنها صُغِّرت");
 }finally{document.createElement=mk}
});
process.exit(summary()?1:0);
