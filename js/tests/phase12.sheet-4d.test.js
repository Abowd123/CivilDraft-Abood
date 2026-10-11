/* ═══ بوابة المرحلة 4D — ذهبية الورقة والمنفذ عبر الصيغ ═══
   لا تمسّ golden.js: نمطه model-space وحده. هنا الورق:
   ١ · composeSheet قطعيةٌ لعيّنة معلومة (حرفاً)
   ٢ · منفذان بمقياسين يقصّان ويعلّمان vp صراحةً
   ٣ · العابر كليّاً يُسقَط ويُعَدّ · sheet/diag لا يدخلان
   ٤ · مرشّح طبقات المنفذ مطبَّق فعلاً
   ٥ · اتجاه القوس بعد التحويل (موجب/سالب) محفوظ
   ٦ · export.vportScene/plan/summary/preflight: وضع vports · k=1
       · صندوق الورقة = مقاسها · لا ورقَ إن غاب المنفذ الظاهر
   ٧ · الاتجاه عبر toSVG (sweep) و toDXF (50/51) و toPDF (بلا قناع
       عربي) — PNG يستثنى: تنقيطه يحتاج قماص متصفّح */
import "./harness.js";
import {S,DEF,loadState,ensureShape} from "../core/state.js";
import * as SH from "../core/sheet.js";
import {plan,summary,preflight,vportScene} from "../io/export.js";
import {toSVG} from "../io/svg.js";
import {toDXF} from "../io/dxf.js";
import {toPDF} from "../io/pdf.js";

let PASS=0, FAIL=0;
const chk=(n,f)=>{
 try{f(); PASS++; console.log("  ✓ "+n)}
 catch(e){FAIL++; console.error("  ✗ "+n+"\n    "+((e&&e.message)||e))}
};
const ok=(c,m)=>{if(!c)throw new Error(m||"شرطٌ خاطئ")};
const eq=(a,b,m)=>{
 const A=JSON.stringify(a), B=JSON.stringify(b);
 if(A!==B)throw new Error((m||"")+"\nمتوقّع: "+B+"\nفعلي: "+A);
};
/* مفتّاح مرتَّب ليقارن سطراً بسطرٍ بلا رهانٍ على ترتيب الإدراج */
const sk=o=>{const r={}; Object.keys(o).sort().forEach(k=>r[k]=o[k]); return r};
const ser=P=>P.map(g=>JSON.stringify(sk(g))).join("\n")+"\n";

console.log("═ phase12.sheet-4d.test.js — بوابة 4D ═");

const reset=()=>{loadState(DEF(),true)};
reset();

/* ورقةٌ واحدة بمنافذها الظاهرة ثم تطبيع */
function oneSheet(vps){
 reset();
 const sh=SH.mkSheet({id:"s1",name:"لوحة 1",size:"A4",
  orient:"l",margin:10});
 sh.viewports=vps.map(p=>SH.mkViewport(p));
 S.sheets=[sh]; S.activeSheet="s1";
 ensureShape();
 return sh;
}

/* ── ١ · قطعية حرفية ── */
chk("composeSheet: خطّ بمنفذ 0.2 يُحوَّل ويعلَّم حرفاً",()=>{
 const sh=oneSheet([{id:"vv1",
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}]);
 const r=SH.composeSheet(sh,
  [{t:"line",L:"A-WALL",a:[0,0],b:[1000,1000]}],{});
 eq(ser(r.prims),
  `{"L":"A-WALL","a":[0,0],"b":[200,200],"t":"line","vp":"vv1"}\n`);
});

/* ── ٢ · منفذان بمقياسين ── */
chk("منفذان: قصّ مستقلّ وترميز vp",()=>{
 const sh=oneSheet([
  {id:"v1",modelRect:{x0:0,y0:0,x1:1000,y1:1000},
   paperRect:{x0:0,y0:0,x1:100,y1:100}},
  {id:"v2",modelRect:{x0:0,y0:0,x1:1000,y1:1000},
   paperRect:{x0:150,y0:0,x1:200,y1:100}}]);
 const r=SH.composeSheet(sh,
  [{t:"line",L:"0",a:[0,0],b:[1000,0]}],{});
 eq(r.prims.length,2);
 const [p1,p2]=r.prims;
 eq(p1,{t:"line",L:"0",a:[0,0],b:[100,0],vp:"v1"});
 /* v2 ورقةٌ 50×100 (غير مربّعة) بنموذجٍ مربّع 1000×1000: k محكومٌ
    بالعرض (0.05) فيتبقّى 50مم رأسياً فارغة تتوسّط ±25مم — بالتصميم
    الموثَّق في viewportTransform (مقياسٌ موحّد يمنع التشويه). */
 eq(p2,{t:"line",L:"0",a:[150,25],b:[200,25],vp:"v2"});
});

/* ── ٣ · القصّ والسقوط ── */
chk("عابرٌ كليّاً يُسقَط ويُعَدّ",()=>{
 const sh=oneSheet([{id:"v1",
  modelRect:{x0:0,y0:0,x1:100,y1:100},
  paperRect:{x0:0,y0:0,x1:100,y1:100}}]);
 const r=SH.composeSheet(sh,
  [{t:"line",L:"0",a:[500,0],b:[600,0]}],{});
 eq(r.prims.length,0); eq(r.dropped,1);
});
chk("sheet/diag يُقفَزان بلا عدّ كسقوط",()=>{
 const sh=oneSheet([{id:"v1",
  modelRect:{x0:0,y0:0,x1:100,y1:100},
  paperRect:{x0:0,y0:0,x1:100,y1:100}}]);
 const r=SH.composeSheet(sh,[
  {t:"line",L:"0",a:[0,0],b:[50,0]},
  {t:"line",L:"A-SHET",a:[0,0],b:[50,0],sheet:1},
  {t:"line",L:"__BAD",a:[0,0],b:[50,0],diag:1}],{});
 eq(r.prims.length,1);
 eq(r.prims[0].L,"0");
});
chk("مرشّح طبقات المنفذ مطبَّق فعلاً",()=>{
 const sh=oneSheet([{id:"v1",layers:["A-WALL"],
  modelRect:{x0:0,y0:0,x1:100,y1:100},
  paperRect:{x0:0,y0:0,x1:100,y1:100}}]);
 const r=SH.composeSheet(sh,[
  {t:"line",L:"A-WALL",a:[0,0],b:[50,0]},
  {t:"line",L:"A-COLS",a:[0,0],b:[50,0]}],{});
 eq(r.prims.length,1);
 eq(r.prims[0].L,"A-WALL");
});

/* ── ٤ · اتجاه القوس بعد التحويل ── */
chk("قوس موجب: الاجتياح يُحفَظ بعد التحويل",()=>{
 const sh=oneSheet([{id:"v1",
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:100,y1:100}}]);
 const r=SH.composeSheet(sh,
  [{t:"arc",L:"0",cx:500,cy:500,r:300,a0:0,a1:90}],{});
 eq(r.prims.length,1);
 const a=r.prims[0];
 eq(a.cx,50); eq(a.cy,50); eq(a.r,30);
 eq(a.a0,0); eq(a.a1,90);
});
chk("قوس سالب: الاجتياح السالب محفوظ",()=>{
 const sh=oneSheet([{id:"v1",
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:100,y1:100}}]);
 const r=SH.composeSheet(sh,
  [{t:"arc",L:"0",cx:500,cy:500,r:300,a0:0,a1:-90}],{});
 eq(r.prims.length,1);
 eq(r.prims[0].a1-r.prims[0].a0,-90);
});

/* ── ٥ · مسار التصدير بالورقة النشطة ── */
chk("vportScene/plan: وضع vports · k=1 · صندوق=مقاس الورقة",()=>{
 oneSheet([{id:"v1",
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}]);
 const pl=plan("svg");
 eq(pl.mode,"vports");
 eq(pl.k,1);
 ok(pl.page&&pl.page.w>0,"لا مقاس صفحة");
 eq(pl.box,{x0:0,y0:0,x1:pl.page.w,y1:pl.page.h});
 ok(summary().includes("منفذ"),"الملخّص لا يذكر المنافذ");
 const plD=plan("dxf"); eq(plD.mode,"vports"); eq(plD.k,1);
});
chk("بلا منفذٍ ظاهر: لا وضع vports",()=>{
 oneSheet([{id:"v1",visible:0,
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}]);
 eq(vportScene(),null);
 eq(plan("svg").mode!=="vports",true);
});
chk("preflight يرفض نطاقاً يفرغ داخل المنافذ",()=>{
 oneSheet([{id:"v1",
  modelRect:{x0:9000,y0:9000,x1:10000,y1:10000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}]);
 const pre=preflight("svg");
 ok(Array.isArray(pre)&&pre.some(p=>p.lv==="er"),
  "لا رفض رسومي لسقوط كامل");
});

/* ── ٦ · الاتجاه عبر الصيغ الثلاث ── */
const BOX={x0:0,y0:0,x1:100,y1:100};
chk("toSVG: موجب sweep=0 · سالب sweep=1",()=>{
 const P=toSVG([{t:"arc",L:"0",cx:50,cy:50,r:30,a0:0,a1:90}],
  BOX,{k:1,page:{w:100,h:100}});
 ok(P.txt.includes("A 30 30 0 0 0"),"موجبٌ بلا sweep=0");
 const N=toSVG([{t:"arc",L:"0",cx:50,cy:50,r:30,a0:0,a1:-90}],
  BOX,{k:1,page:{w:100,h:100}});
 ok(N.txt.includes("A 30 30 0 0 1"),"سالبٌ بلا sweep=1");
});
chk("toDXF: السالبُ يحفظ اتجاهه بـbulge لا بعكس 50/51 — P3-002",()=>{
 /* كان يُعكَس الطرفانِ فيبقى المسارُ ويضيع الاتجاه. الآن قطعةٌ
    واحدةٌ ذاتُ bulge سالب: الطرفانِ بترتيبهما والاتجاهُ محفوظ. */
 const d=toDXF([{t:"arc",L:"0",cx:50,cy:50,r:30,a0:0,a1:-90}],
  BOX,{k:1});
 ok(!/\nARC\n/.test(d),"لا كيان ARC للسالب");
 ok(d.includes("POLYLINE"),"بل قطعةُ مضلّعٍ منتفخة");
 const want=Math.tan(-90*Math.PI/180/4).toFixed(6);
 ok(d.includes("42\n"+want),`bulge = ${want}`);
 /* والموجبُ ما زال ARC بطرفيه كما هما */
 const pz=toDXF([{t:"arc",L:"0",cx:50,cy:50,r:30,a0:0,a1:90}],BOX,{k:1});
 ok(/\nARC\n/.test(pz),"والموجبُ كيانُ ARC");
 ok(pz.includes("50\n0.000")&&pz.includes("51\n90.000"),
  "بطرفيه 0 → 90");
});
chk("toPDF: قوسٌ بلا قناعٍ عربي وورقة بمقاسها",()=>{
 const r=toPDF([{t:"arc",L:"0",cx:50,cy:50,r:30,a0:0,a1:90}],
  BOX,{k:1,page:{w:100,h:100}});
 eq(r.arabic,0);
 ok(r.bytes instanceof Uint8Array&&r.bytes.length>0,"لا بايتات");
 ok(Math.abs(r.pw-100)<0.02,"مقاس الورقة غير 100 مم");
});

/* ── 7 · ملحق المرحلة 4D: قصّ الأقواس + صبغة + هاشور + دَشّ ── */

chk("composeSheet: صبغةٌ تُقصّ وتعلَّم",()=>{
 const sh=oneSheet([{id:"vf",
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}]);
 const r=SH.composeSheet(sh,[
  {t:"fill",L:"A-AREA",style:"tint",
   ring:[[-500,-500],[1500,-500],[1500,1500],[-500,1500]]}],{});
 eq(r.prims.length,1,"صبغةٌ واحدة خرجت");
 eq(r.prims[0].t,"fill","نوعها fill");
 eq(r.prims[0].L,"A-AREA","طبقتها محفوظة");
 eq(r.prims[0].style,"tint","نمطها محفوظ");
 eq(r.prims[0].vp,"vf","موسومةٌ بمنفذها");
 ok(r.prims[0].ring.length>=3,"حلقةٌ صالحة");
 ok(r.prims[0].ring.every(p=>
  p[0]>=0&&p[0]<=200&&p[1]>=0&&p[1]<=200),
  "كل رأس في الصبغة داخل الإطار");
});

chk("composeSheet: هاشورٌ بمقياسٍ محوَّل ومقصوص",()=>{
 const sh=oneSheet([{id:"vh",
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}]);
 const r=SH.composeSheet(sh,[
  {t:"hatch",L:"A-WALL-PATT",pat:"ANSI31",sc:300,
   loops:[[[0,0],[1000,0],[1000,1000],[0,1000]]]}],{});
 eq(r.prims.length,1,"هاشورٌ واحد خرج");
 eq(r.prims[0].t,"hatch","نوعه hatch");
 eq(r.prims[0].pat,"ANSI31","نمطه محفوظ");
 ok(Math.abs(r.prims[0].sc-60)<0.01,
  "تباعد الهاشور تحوّل بعامل المنفذ (٣٠٠×٠٫٢=٦٠)");
 ok(r.prims[0].loops.every(l=>l.length>=3&&l.every(p=>
  p[0]>=0&&p[0]<=200&&p[1]>=0&&p[1]<=200)),
  "الحلقات مقصوصة داخل الإطار");
});

chk("composeSheet: دَشّ يُحوَّل بعامل المنفذ",()=>{
 const sh=oneSheet([{id:"vd",
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}]);
 const r=SH.composeSheet(sh,[
  {t:"line",L:"0",a:[0,0],b:[1000,0],dash:[100,50]}],{});
 eq(r.prims.length,1,"خطٌّ واحد خرج");
 ok(Array.isArray(r.prims[0].dash),"الدَشّ يبقى على الخط");
 eq(r.prims[0].dash.map(v=>Math.round(v)),[20,10],
  "قيم الدَشّ تحوّلت بعامل المنفذ");
});

chk("clipArcToRect: داخليٌّ وموجبٌ يعود كما هو",()=>{
 const F={x0:0,y0:0,x1:100,y1:100};
 const r=SH.clipArcToRect({cx:50,cy:50,r:30,a0:0,a1:90},F);
 eq(r.length,1,"قوسٌ واحد");
 eq(r[0].a0,0,"بدايته 0");
 eq(r[0].a1,90,"نهايته 90");
});

chk("clipArcToRect: الاجتياح السالب محفوظ",()=>{
 const F={x0:0,y0:0,x1:100,y1:100};
 const r=SH.clipArcToRect({cx:50,cy:50,r:30,a0:0,a1:-90},F);
 eq(r.length,1,"قوسٌ واحد");
 eq(r[0].a1-r[0].a0,-90,"الاجتياح بقي سالباً");
});

chk("clipArcToRect: عابرُ حافةٍ واحدة يُعطي قطعة واحدة",()=>{
 const F={x0:0,y0:0,x1:100,y1:100};
 const r=SH.clipArcToRect({cx:50,cy:50,r:60,a0:0,a1:90},F);
 eq(r.length,1,"قطعةٌ واحدة");
 ok(r[0].a0>33&&r[0].a0<34,"يدخل من x=100 قرب ٣٣٫٦°");
 ok(r[0].a1>56&&r[0].a1<57,"يخرج من y=100 قرب ٥٦٫٤°");
});

chk("clipArcToRect: دائرةٌ أكبر من الإطار تنقسم أربعاً",()=>{
 const F={x0:0,y0:0,x1:100,y1:100};
 const r=SH.clipArcToRect({cx:50,cy:50,r:60,a0:0,a1:359.9},F);
 eq(r.length,4,"أربع قطع لكل ركنٍ قطعة");
});

chk("clipArcToRect: دائرةٌ خارج الإطار بالكامل تسقط",()=>{
 const F={x0:0,y0:0,x1:100,y1:100};
 const r=SH.clipArcToRect({cx:300,cy:50,r:30,a0:0,a1:359.9},F);
 eq(r.length,0,"لا شيء يخرج");
});

chk("مخرجات الورقة المكتملة تمر عبر الصيغ الثلاث",()=>{
 const P=[
  {t:"fill",L:"A-AREA",style:"tint",
   ring:[[10,10],[90,10],[90,90],[10,90]]},
  {t:"hatch",L:"A-WALL-PATT",pat:"ANSI31",sc:10,
   loops:[[[0,0],[100,0],[100,100],[0,100]]]},
  {t:"line",L:"A-DOOR",a:[0,50],b:[100,50],dash:[5,3]},
  {t:"arc",L:"A-WALL",cx:50,cy:50,r:40,a0:0,a1:360}
 ];
 const sv=toSVG(P,BOX,{k:1,page:{w:100,h:100}});
 ok(sv.txt.includes("polygon"),"SVG يحمل الصبغة");
 ok(sv.txt.includes("<pattern"),"SVG يحمل الهاشور");
 ok(sv.txt.includes("stroke-dasharray"),"SVG يحمل الدَشّ");

 const pf=toPDF(P,BOX,{k:1,page:{w:100,h:100}});
 ok(pf.bytes instanceof Uint8Array&&pf.bytes.length>0,
  "PDF يُبنى مع التعبئة والهاشور والقوس الكامل");
 ok(Number.isFinite(pf.hatchCut),"لا قطعٌ زائد لهاشورٍ داخل النطاق");

 const dx=toDXF(P,BOX,{k:1});
 ok(typeof dx==="string"&&dx.includes("ENTITIES"),
  "DXF يُبنى مع العناصر الخمسة");
 ok(dx.includes("POLYLINE"),"حد الصبغة POLYLINE");
 ok(dx.includes("LINE"),"خطوط الهاشور والدَشّ LINE");
 ok(dx.includes("ARC")||dx.includes("CIRCLE"),"القوس ARC أو CIRCLE");
});

console.log(`\n${PASS} نجح · ${FAIL} فشل —`);
if(FAIL)process.exitCode=1;
