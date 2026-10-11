/* ═══ صحّةُ النتيجة للأدوات الـ٤٣ التي لم يغطّها tools-real ═══ (2026-10-03)
   tools-smoke يثبت أنّها لا تنهار؛ هذا يثبت أنّها **تُنتج الصحيح**.
   المتوقَّع مشتقٌّ من العقد المعلن: الخيارات الافتراضية والنصوص المساعدة
   وجدول المقاسات القياسية (FK في core/fixt.js) — لا من مخرجات الشيفرة.
   لكل أداة: النتيجة · وجلسةٌ واحدةٌ = خطوةُ تاريخٍ واحدة · والتراجع يعيد
   الحالةَ بايتاً ببايت.
   التشغيل:  node js/tests/tools-correct.test.js                       */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,near,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv"); DOC.body.appendChild(cv);}
if(!globalThis.window)globalThis.window={prompt:()=>null,confirm:()=>true};
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const {S,newState,ensureShape,undo,historyTimeline,clearHistory,edit}=ST;
const W=await import("../core/walls.js");
const RN=await import("../core/render.js");
const EN=await import("../core/ents.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))
 await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,150,k),invalidate:()=>RN.invalidate()});
R.H.del=()=>edit(()=>EN.delEnts(rig.sel.slice()),"حذف");

const snap=()=>JSON.stringify(S,(k,v)=>(k==="meta"||k==="__ver")?undefined:v);
const steps=()=>historyTimeline().current;
const P=(x,y)=>rig.at(x,y);
const TX=s=>rig.type(s);
const opt=(id,k,v)=>R.setOpt(id,k,v);
const fresh=()=>{newState(); ensureShape(); RN.invalidate(); if(R.active())R.cancel(true);
 rig.pick([]); rig.clear(); clearHistory(); R.toolList().forEach(d=>rig.defs(d.id))};
const end=()=>{if(R.active())rig.esc()};
const covered=new Set();
/* حالةٌ: prep يبني المشهد (خارج القياس) · go يشغّل الأداة · check يتحقّق */
function C(id,name,{prep,go,check,hist=1}){
 covered.add(id);
 group(`${id} — ${name}`,()=>{
  fresh(); if(prep)prep(); RN.invalidate(); clearHistory(); rig.clear();
  const pre=snap(), h0=steps();
  go(); end();
  check();
  const errs=rig.errs(); ok(!errs.length,"بلا رسالة خطأ"+(errs.length?": "+errs[0]:""));
  eq(steps()-h0,hist,`${hist} خطوة تاريخ`);
  for(let i=0;i<steps()-h0+0;i++);
  const n=steps()-h0; for(let i=0;i<n;i++)undo();
  ok(snap()===pre,"التراجع يعيد الحالة كما كانت");
 });
}

const STR=await import("../core/struct.js");

/* ═══ ١ · الأثاث والكهرباء (٢٧) — مصنعٌ واحد mkFix ═══
   العقد: مقاسُه القياسيّ (FK) افتراضاً · حرٌّ بعيداً عن الجدار بإحداثيّ
   النقرة ودورانِ الشريط · وقرب الجدار يُلصَق بوجهه وظهرُه إليه.
   الأرقامُ أدناه **جدولُ المقاسات المعلن** مجمَّداً: تغييرُ مقاسٍ قياسيٍّ
   قرارٌ يُكتَب هنا، لا انزلاقٌ صامت. */
const FIX={fbed1:["bed1",1000,2000],fbed2:["bed2",1600,2000],fsofa2:["sofa2",1500,850],
 fsofa3:["sofa3",2100,900],ftable:["tablr",1600,900],ftablec:["tablc",1200,1200],
 fchair:["chair",450,500],fdesk:["desk",1400,700],fwardr:["wardr",1800,600],
 fkcab:["kcab",600,600],ffridge:["fridge",700,700],fstove:["stove",600,600],
 esw1:["sw1",200,100],esw2:["sw2",260,100],eswd:["swd",220,120],esoc:["soc",200,120],
 esoc2:["soc2",300,120],esocw:["socw",220,140],elamp:["lampc",300,300],
 elampw:["lampw",260,140],espot:["spot",160,160],efan:["fan",1200,1200],
 eexfan:["exfan",300,300],edb:["db",500,150],etel:["tel",200,120],etv:["tv",200,120],
 eac:["ac",900,220]};
for(const [id,[kind,w,d]] of Object.entries(FIX)){
 C(id,`حرٌّ بمقاسه القياسيّ ${w}×${d}`,{
  go(){R.begin(id); P(20000,20000)},
  check(){
   eq(S.fixt.length,1,"قطعةٌ واحدة");
   const f=S.fixt[0]||{};
   eq(f.kind,kind,"النوع"); eq([f.x,f.y].join(),"20000,20000","في موضع النقرة");
   eq([f.w,f.d].join(),`${w},${d}`,"المقاس القياسيّ"); eq(f.rot,0,"بلا دوران");
   ok(!f.mir,"غير معكوسة");
  }});
}
C("fbed2","قرب الجدار: يُلصَق بوجهه ويأخذ دورانَه",{
 prep(){W.addWall([0,0],[6000,0],200,"int","c")},
 go(){R.begin("fbed2"); P(3000,800)},
 check(){
  const f=S.fixt[0]||{};
  eq([f.x,f.y].join(),"3000,100","على الوجه العلويّ (نصفُ السماكة 100)");
  eq(f.rot,0,"الظهرُ إلى الجدار والوجهُ نحو النقرة");
 }});
C("esoc","الشريط: دورانٌ ومقاسٌ وعكسٌ بلا لصوق",{
 go(){opt("esoc","snap",0); opt("esoc","rot",90); opt("esoc","w","0.25");
  opt("esoc","mir",1); R.begin("esoc"); P(1000,1000)},
 check(){
  const f=S.fixt[0]||{};
  eq(f.rot,90,"الدوران 90"); eq(f.w,250,"العرض من الشريط"); eq(f.mir,1,"معكوسة");
 }});
C("fchair","الوضعُ المتكرّر: أربعُ نقراتٍ = أربعُ قطعٍ في خطوةٍ واحدة",{
 go(){R.begin("fchair"); [0,1,2,3].forEach(i=>P(20000+i*1000,20000))},
 check(){eq(S.fixt.length,4,"أربعُ قطع")}});

/* ═══ ٢ · الإنشائيّ ═══ */
C("beam","كمرةٌ افتراضية 0.25×0.50 بطول 4م = 0.5 م³ · وسمٌ تلقائيّ B1",{
 go(){R.begin("beam"); P(0,0); P(4000,0)},
 check(){
  eq(S.struct.length,1,"كمرةٌ واحدة"); const e=S.struct[0]||{};
  eq([e.w,e.d].join(),"250,500","المقطع الافتراضي");
  near(STR.strLen(e),4000,1,"الطول 4م"); near(STR.strVol(e)/1e9,0.5,1e-6,"الحجم 0.5 م³");
  eq(e.tag,"B1","الوسم التلقائي");
 }});
C("beam","سلسلة: ثلاثُ نقاطٍ = كمرتان B1 B2",{
 go(){R.begin("beam"); P(0,0); P(4000,0); P(4000,3000)},
 check(){eq(S.struct.map(e=>e.tag).join(),"B1,B2","وسمان متتاليان")}});
C("footing","قاعدةٌ افتراضية 1.5×1.5×0.4 = 2.25 م² و0.9 م³",{
 go(){R.begin("footing"); P(5000,5000)},
 check(){
  const e=S.struct[0]||{};
  near(STR.strArea(e)/1e6,2.25,1e-6,"المساحة"); near(STR.strVol(e)/1e9,0.9,1e-6,"الحجم");
  eq(e.tag,"F1","الوسم");
 }});
C("footing","«الطول فارغ = مربّعة» · وطولٌ صريحٌ يكسر التربيع",{
 go(){opt("footing","h","2"); R.begin("footing"); P(0,0)},
 check(){near(STR.strArea(S.struct[0]||{})/1e6,3,1e-6,"1.5×2 = 3 م²")}});
C("slab","بلاطة 4×3 سماكتها 0.15 = 12 م² و1.8 م³",{
 go(){R.begin("slab"); P(0,0); P(4000,0); P(4000,3000); P(0,3000); rig.enter()},
 check(){
  const e=S.struct[0]||{};
  near(STR.strArea(e)/1e6,12,1e-6,"المساحة"); near(STR.strVol(e)/1e9,1.8,1e-6,"الحجم");
  eq(e.tag,"S1","الوسم");
 }});
group("slab — رأسان فقط يُرفَضان بلا نصفِ تنفيذ",()=>{
 fresh(); const pre=snap(), h0=steps();
 R.begin("slab"); P(0,0); P(4000,0); rig.enter(); end();
 eq(S.struct.length,0,"لا بلاطة"); eq(steps(),h0,"ولا خطوة تاريخ"); ok(snap()===pre,"والحالة كما هي");
 ok(rig.said(/ثلاثةَ رؤوسٍ/),"والرسالة تقول السبب");
});

/* ═══ ٣ · التأشير ═══ */
C("mtext","فقرةٌ: النصُّ من الشريط والعرضُ من السحب",{
 go(){opt("mtext","s","ملاحظة عامة"); R.begin("mtext"); P(1000,5000); P(5000,5000)},
 check(){
  const a=S.anno.find(a=>a.kind==="mtext")||{};
  eq(a.s,"ملاحظة عامة","النصّ"); eq(a.wid,4000,"العرض = مسافة السحب");
  eq([a.x,a.y].join(),"1000,5000","الزاوية العليا"); eq(a.al,"ar","محاذاةٌ عربيةٌ افتراضاً");
 }});
C("mtext","السحبُ يساراً: الأصلُ أصغرُ السينين لا النقرةُ الأولى",{
 go(){opt("mtext","s","س"); R.begin("mtext"); P(5000,0); P(2000,0)},
 check(){const a=S.anno[0]||{}; eq([a.x,a.wid].join(),"2000,3000","x=2000 · عرض 3م")}});
C("slope","سهمُ ميلٍ افتراضيّ 1٪ من الأعلى إلى المنحدَر",{
 go(){R.begin("slope"); P(0,0); P(3000,0)},
 check(){
  const a=S.anno.find(a=>a.kind==="slope")||{};
  eq(a.slope,1,"1٪"); eq(a.fmt,"pct","مئوية");
  eq(JSON.stringify(a.pts),"[[0,0],[3000,0]]","الاتجاه من النقرة الأولى إلى الثانية");
 }});
C("slope","صيغةُ النسبة: 2٪ تُقرَأ 1:50",{
 go(){opt("slope","v",2); opt("slope","fmt","ratio"); R.begin("slope"); P(0,0); P(3000,0)},
 check(){ok(rig.said(/1:50/),"يقول 1:50")}});
group("slope — ميلٌ خارج 0.1–25٪ يُرفَض ولا يُرسَم",()=>{
 fresh(); opt("slope","v",30); const h0=steps();
 R.begin("slope"); P(0,0); P(3000,0); end();
 eq(S.anno.length,0,"لا سهم"); eq(steps(),h0,"ولا تاريخ"); ok(rig.errs().length>0,"ورسالةُ رفض");
});
C("griddim","أبعادُ المحاور: سلسلةٌ لكل جهة بقيَم التباعد نفسها",{
 prep(){S.grid.xs=[0,4000,9000]; S.grid.ys=[0,5000]},
 go(){R.begin("griddim")},
 check(){
  eq(S.chains.length,4,"أربعُ جهات ⇒ أربعُ سلاسل");
  const h=S.chains.filter(c=>c.axis==="h"), v=S.chains.filter(c=>c.axis==="v");
  ok(h.every(c=>c.vals.join()==="4000,5000"),"الأفقيةُ = تباعُدُ المحاور الرأسية");
  ok(v.every(c=>c.vals.join()==="5000"),"الرأسيةُ = تباعُدُ الأفقية");
  ok(S.chains.every(c=>c.total===1),"بخطّ المجموع");
 }});
group("griddim — الخلوصُ يُزيح السلسلةَ بقدره تماماً",()=>{
 const pos=g=>{fresh(); S.grid.xs=[0,4000]; S.grid.ys=[0,3000]; opt("griddim","gap",g);
  R.begin("griddim"); end(); return (S.chains.find(c=>c.axis==="h"&&!c.flip)||{}).pos};
 eq(pos("2.2")-pos("1.2"),1000,"+1م خلوص ⇒ +1م موضع");
});
C("griddim","جهةٌ واحدةٌ مختارة ⇒ سلسلةٌ واحدة",{
 prep(){S.grid.xs=[0,4000]; S.grid.ys=[0,3000]},
 go(){["bot","xmin","xmax"].forEach(k=>opt("griddim",k,0)); R.begin("griddim")},
 check(){eq(S.chains.length,1,"سلسلةٌ واحدة")}});
/* الافتراضُ ورقيّ: 140 × 7 مم بمقياس الرسم (كان 20 م × 3 م ثابتاً) */
C("table","جدولٌ بالمقاس الورقيّ الافتراضي 140×7 مم بمقياس الرسم في موضع النقرة",{
 go(){R.begin("table"); P(30000,30000)},
 check(){
  const t=S.tables[0]||{}, k=S.meta.scale||100;
  eq(t.kind,"open","جدولُ الفتحات افتراضاً"); eq([t.x,t.y].join(),"30000,30000","الأصل");
  eq([t.w,t.rh].join(),[140*k,7*k].join(),"المقاس");
 }});
C("table","والمقاسُ يتبع المقياس: 1:50 نصفُه",{
 go(){S.meta.scale=50; R.begin("table"); P(30000,30000)},
 check(){
  const t=S.tables[0]||{};
  eq([t.w,t.rh].join(),"7000,350","140×7 مم على 1:50");
 }});
const AR=await import("../core/areas.js");
const room=()=>AR.addArea([[0,0],[4000,0],[4000,3000],[0,3000]],"غرفة");
C("hatch","تهشيرُ منطقةٍ بالنقر: ANSI31 افتراضاً",{
 prep(){room()},
 go(){R.begin("hatch"); P(2000,1500)},
 check(){const a=S.areas[0]||{}; eq(a.fill,"hatch","تعبئة هاشور"); eq(a.pat,"ANSI31","النمط")}});
C("hatch","المحدَّدُ يُهشَّر فوراً بلا نقر",{
 prep(){room()},
 go(){rig.pick([{k:"area",id:S.areas[0].id}]); R.begin("hatch")},
 check(){eq((S.areas[0]||{}).fill,"hatch","هُشِّرت")}});
C("marea","قياسُ مساحةٍ: يقرأ ولا يكتب · المجموعُ عبر حلقتين",{
 prep(){
  const Q=[[0,0],[8000,0],[8000,3000],[0,3000]];
  for(let i=0;i<4;i++)W.addWall(Q[i],Q[(i+1)%4],200,"int","c");
  W.addWall([4000,0],[4000,3000],200,"int","c");
 },
 hist:0,
 go(){R.begin("marea"); P(2000,1500); P(6000,1500)},
 check(){
  eq(S.areas.length,0,"لا منطقةَ تُكتَب");
  /* الحلقةُ الصافية بين وجوه الجدران: (4000−200)×(3000−200) = 10.64 م² */
  ok(rig.said(/10\.64 م²/),"كلُّ غرفةٍ 10.64 م² (الصافي بين الوجوه)");
  ok(rig.said(/المجموع 21\.28 م²/),"والمجموع 21.28 م²");
 }});

/* ═══ ٤ · التعديل ═══ */
const PL=await import("../core/plines.js");
const CL=await import("../core/cols.js");
const BLK=await import("../core/blocks.js");
const BOPS=await import("../tools/blockops.js");
const corner=()=>{W.addWall([0,0],[4000,0],200,"int","c"); W.addWall([0,0],[0,3000],200,"int","c")};
C("fillet","استدارةٌ افتراضية 0.5م بين جدارين متعامدين بعد التأكيد",{
 prep:corner,
 go(){R.begin("fillet"); P(3000,0); P(0,2000); rig.enter()},
 check(){
  eq(S.walls.length,3,"الجداران + قوس");
  const arc=S.walls.find(w=>w.bulge)||{};
  near(W.arcParams(arc).R,500,1,"نصف القطر 0.5م");
  eq(JSON.stringify(S.walls[0].a),"[500,0]","الأول قُصَّ عند المماسّ");
  eq(JSON.stringify(S.walls[1].a),"[0,500]","والثاني كذلك");
 }});
group("fillet — Esc عند الخطّة لا يغيّر شيئاً",()=>{
 fresh(); corner(); RN.invalidate(); clearHistory(); const pre=snap();
 R.begin("fillet"); P(3000,0); P(0,2000); rig.esc();
 ok(snap()===pre,"الحالة كما هي"); eq(steps(),0,"ولا تاريخ");
});
C("scale","معاملٌ مكتوب ×2 حول الأساس: ما على الأساس لا يتحرّك",{
 prep(){W.addWall([1000,1000],[3000,1000],200,"int","c")},
 go(){rig.pick([{k:"wall",id:S.walls[0].id}]); opt("scale","k",2); R.begin("scale"); P(1000,1000)},
 check(){
  const w=S.walls[0];
  eq(JSON.stringify([w.a,w.b]),"[[1000,1000],[5000,1000]]","الطرفُ على الأساس ثابت والآخر ضِعفُ بعده");
  ok(!rig.said(/\[object Object\]/),"ولا «[object Object]» في السطر (عيبٌ أُصلح)");
 }});
C("scale","بالنقرتين: مرجع 1م ثم جديد 3م ⇒ ×3",{
 prep(){W.addWall([0,0],[2000,0],200,"int","c")},
 go(){rig.pick([{k:"wall",id:S.walls[0].id}]); R.begin("scale"); P(0,0); P(1000,0); P(3000,0)},
 check(){eq(S.walls[0].b[0],6000,"2م ⇒ 6م")}});
C("align","تسويةٌ رأسية إلى الوسط: الثلاثة على ص الوسيط",{
 prep(){CL.addCol("rect",[0,0],300,300,0,"conc","");
  CL.addCol("rect",[2000,500],300,300,0,"conc",""); CL.addCol("rect",[5000,1000],300,300,0,"conc","")},
 go(){rig.pick(S.cols.map(c=>({k:"col",id:c.id}))); opt("align","ax","y"); R.begin("align"); rig.enter()},
 check(){eq(S.cols.map(c=>c.y).join(),"500,500,500","ص = 500 للكلّ"); eq(S.cols.map(c=>c.x).join(),"0,2000,5000","والسينات لم تتحرّك")}});
C("align","«وزّع»: تباعدٌ متساوٍ بين الطرفين الثابتين",{
 prep(){[0,1000,6000].forEach(x=>CL.addCol("rect",[x,0],300,300,0,"conc",""))},
 go(){rig.pick(S.cols.map(c=>({k:"col",id:c.id}))); opt("align","md","dist"); R.begin("align"); rig.enter()},
 check(){eq(S.cols.map(c=>c.x).sort((a,b)=>a-b).join(),"0,3000,6000","0 · 3 · 6")}});
C("arraypath","خمسةٌ على مسارٍ 8م: الخطوة 2م",{
 prep(){CL.addCol("rect",[0,0],300,300,0,"conc",""); PL.addPline([[0,0],[8000,0]],{})},
 go(){rig.pick([{k:"col",id:S.cols[0].id}]); R.begin("arraypath"); P(4000,0)},
 check(){eq(S.cols.map(c=>c.x).sort((a,b)=>a-b).join(),"0,2000,4000,6000,8000","المواضع")}});
C("arraypath","عنصران: الإزاحةُ بينهما محفوظةٌ في كلّ نسخة (كانا يتكدّسان — عيبٌ أُصلح)",{
 prep(){CL.addCol("rect",[0,0],300,300,0,"conc","");
  CL.addCol("rect",[0,1000],300,300,0,"conc",""); PL.addPline([[0,0],[4000,0]],{})},
 go(){rig.pick(S.cols.map(c=>({k:"col",id:c.id}))); opt("arraypath","n",3); R.begin("arraypath"); P(2000,0)},
 check(){
  eq(S.cols.length,6,"3 نسخ × 2");
  const key=new Set(S.cols.map(c=>c.x+","+c.y));
  eq(key.size,6,"لا عمودان في موضعٍ واحد");
  ["2000,0","2000,1000","4000,0","4000,1000"].forEach(k=>ok(key.has(k),`عمودٌ عند ${k}`));
 }});
C("pedit","إدراجُ رأسٍ في الضلع المنقور",{
 prep(){PL.addPline([[0,0],[4000,0],[4000,3000]],{})},
 go(){R.begin("pedit"); P(2000,0); P(2000,0); rig.enter()},
 check(){eq(JSON.stringify(S.plines[0].pts),"[[0,0],[2000,0],[4000,0],[4000,3000]]","رأسٌ عند النقرة")}});
C("pedit","ضلعٌ يصير قوساً بانحناء الشريط 0.5",{
 prep(){PL.addPline([[0,0],[4000,0],[4000,3000]],{})},
 go(){opt("pedit","op","arc"); R.begin("pedit"); P(2000,0); P(2000,0); rig.enter()},
 check(){eq(JSON.stringify(S.plines[0].bulge),"[0.5,0]","الضلع الأول 0.5 والثاني مستقيم")}});
C("explode","تفكيكُ كتلةٍ: خطٌّ وقوسٌ يبقى قوساً · والمثيلُ يزول",{
 prep(){BOPS.createBlock("bench","مقعد",[{t:"line",a:[0,0],b:[1000,0]},
  {t:"arc",c:[0,0],r:900,a0:0,a1:Math.PI/2}],[0,0]);
  S.blocks.push(BLK.makeInstance("bench",{x:5000,y:5000}))},
 go(){R.begin("explode"); P(5500,5000)},
 check(){
  eq(S.blocks.length,0,"المثيلُ زال"); eq(S.plines.length,2,"خطّان متعدّدان");
  ok(S.plines.some(p=>p.bulge&&Math.abs(p.bulge[0]-Math.tan(Math.PI/8))<1e-6),"القوس 90° انحناؤه tan(22.5°)");
  ok(S.plines.some(p=>JSON.stringify(p.pts)==="[[5000,5000],[6000,5000]]"),"والخطُّ في موضعه المطلق");
 }});


/* ═══ خطّة 1.1.0 · البند أ: «ثبّت المقاسات» مفعّلٌ افتراضاً ═══ */
const OP=await import("../core/opens.js");
C("scale","افتراضاً: الطولُ يُقاس والسماكةُ والبابُ ثابتان",{
 prep(){const w=W.addWall([0,0],[4000,0],200,"int","c"); OP.addOpen(w,1500,"door",900,2100,0,{})},
 go(){rig.pick([{k:"wall",id:S.walls[0].id}]); opt("scale","k",2); R.begin("scale"); P(0,0)},
 check(){
  const w=S.walls[0], o=S.opens[0];
  eq(w.b[0],8000,"الطول 4م ⇒ 8م"); eq(w.t,200,"السماكة 0.20 ثابتة");
  eq(o.w,900,"عرضُ الباب 0.90 ثابت"); eq(o.s,3000,"وموضعُه على الجدار يُقاس (1.5 ⇒ 3)");
  ok(rig.said(/بمقاساتها/),"والرسالة تقول إنّ المقاسات ثابتة");
 }});
C("scale","«ثبّت المقاسات» مطفأ: المقياسُ المنتظم كما كان",{
 prep(){const w=W.addWall([0,0],[4000,0],200,"int","c"); OP.addOpen(w,1500,"door",900,2100,0,{})},
 go(){rig.pick([{k:"wall",id:S.walls[0].id}]); opt("scale","k",2); opt("scale","keep",0); R.begin("scale"); P(0,0)},
 check(){eq(S.walls[0].t,400,"السماكة تتضاعف"); eq(S.opens[0].w,1800,"والباب كذلك"); ok(rig.said(/منتظم/),"ويُقال")}});
C("scale","العمودُ والقطعةُ: الموضعُ يُقاس والمقاسُ ثابت",{
 prep(){CL.addCol("rect",[1000,1000],300,300,0,"conc",""); R.begin("fbed1"); P(20000,20000); end()},
 go(){rig.pick([{k:"col",id:S.cols[0].id},{k:"fix",id:S.fixt[0].id}]); opt("scale","k",0.5); R.begin("scale"); P(0,0)},
 check(){
  const c=S.cols[0], f=S.fixt[0];
  eq([c.x,c.y,c.w,c.h].join(),"500,500,300,300","العمود: نصفُ البعد عن الأساس بمقطعه");
  eq([f.x,f.y,f.w,f.d].join(),"10000,10000,1000,2000","السرير: نصفُ البعد بمقاسه القياسيّ");
 }});
group("scale — تصغيرٌ لا تتّسع فيه الفتحة يُرفَض كلُّه بالسبب",()=>{
 fresh(); const w=W.addWall([0,0],[2000,0],200,"int","c"); OP.addOpen(w,1000,"door",900,2100,0,{});
 RN.invalidate(); clearHistory(); rig.clear(); const pre=snap();
 rig.pick([{k:"wall",id:w.id}]); opt("scale","k",0.4); R.begin("scale"); P(0,0); end();
 ok(snap()===pre,"لا تغيير — ولا نصفُ تنفيذ"); eq(steps(),0,"ولا تاريخ");
 ok(rig.said(/لا تتّسع/),"والرسالة تسمّي الفتحة والسبب");
});

/* ═══ ٥ · الأوراق ═══ */
C("vpclip","قصُّ المنفذ بخطٍّ مغلق: حدٌّ نسبيٌّ داخل نطاقه",{
 prep(){R.begin("vport"); P(-1000,-1000); P(8000,5000); end();
  PL.addPline([[0,0],[5000,0],[5000,3000],[0,3000]],{closed:1})},
 go(){R.begin("vpclip"); P(2500,0)},
 check(){
  const vp=S.sheets[0].viewports[0];
  ok(Array.isArray(vp.clip)&&vp.clip.length===4,"حدٌّ بأربعة رؤوس");
  /* (0+1000)/9000 = 0.11111 · (5000+1000)/9000 = 0.66667 */
  near(vp.clip[0][0],1/9,1e-4,"س الأولى 1/9"); near(vp.clip[1][0],6/9,1e-4,"والثانية 6/9");
 }});
group("vport — المقياسُ المعلَن 1/k لا 1000/k (عيبٌ أُصلح)",()=>{
 fresh(); R.begin("vport"); P(-1000,-1000); P(8000,5000); end();
 /* 9م نموذجاً في 396 مم ورقاً ⇒ 9000/396 ≈ 22.7 ⇒ «1:25» مقرّباً لخمسة */
 ok(rig.said(/قريب من 1:25\b/),"يقول 1:25");
 ok(!rig.said(/1:22750/),"لا 1:22750");
});
group("vpclip — خطٌّ مفتوحٌ يُرفَض بالسبب",()=>{
 fresh(); R.begin("vport"); P(-1000,-1000); P(8000,5000); end();
 PL.addPline([[0,0],[5000,0],[5000,3000]],{}); RN.invalidate(); rig.clear(); clearHistory();
 const pre=snap(); R.begin("vpclip"); P(2500,0); end();
 ok(snap()===pre,"لا تغيير"); ok(rig.said(/مغلقاً/),"ويقول: يجب أن يكون مغلقاً");
});

/* ═══ التغطية: الثلاثةُ والأربعون كلُّها ═══ */
const GAP=["mtext","slope","griddim","table","hatch","marea","pedit","align","arraypath",
 "fillet","scale","explode","beam","footing","slab","vpclip",...Object.keys(FIX)];
group("الفجوةُ المعلنة في المرحلة ٣ مغطّاةٌ كلُّها",()=>{
 eq(GAP.length,43,"٤٣ أداة"); GAP.forEach(id=>ok(covered.has(id),`${id} له حالةُ صحّة`));
});

process.exit(summary()?1:0);
