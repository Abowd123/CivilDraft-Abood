/* ═══ اختبار 2.3: المُدقِّق الموحَّد وتغطية منافذ الإدخال ═══
   (١) V: كلُّ نوع حقلٍ بقبوله ورفضه.
   (٢) تغطية: كل addX في COVER يستدعي V بنوعه — يفشل إن بقي
       منفذٌ غير محروس (فحصٌ ساكنٌ على المصدر).
   (٣) سلوك: كل addX يرفض NaN والنقطةَ الناقصة ولا يمسّ الحالة.
   (٤) مسار المزوّد (ai/ops): نقطةٌ ناقصة أو null أو خارج الحدّ تُرفَض
       ولا تصير الأصل.                                              */
import {shim,group,ok,eq,deep,throws,summary} from "./harness.js";
shim();
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..","..");

const {V,safeV,VLD,KINDS,coverage,parsePrims}=await import("../core/validate.js");
const {ParseError}=await import("../core/parse.js");
const {S,newState,ensureShape,VER}=await import("../core/state.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const A=await import("../core/areas.js");
const C=await import("../core/cols.js");
const F=await import("../core/fixt.js");
const ST=await import("../core/stairs.js");
const D=await import("../core/dims.js");
const GS=await import("../core/struct.js");
const OPS=await import("../ai/ops.js");
const reset=()=>{newState(); ensureShape()};
const code=fn=>{try{fn();return null}catch(e){return e.code||("?"+e.message)}};

group("V — الأنواع",()=>{
 deep(V("wall",{a:[0,0],b:[3000,0]}).a,[0,0],"نقطةٌ صالحة");
 deep(V("wall",{a:[1.4,2.6],b:[5,5]}).a,[1,3],"وتُقرَّب");
 eq(code(()=>V("wall",{a:[0,0]})),"MISSING","حقلٌ إلزاميّ غائب");
 eq(code(()=>V("wall",{a:[0,NaN],b:[1,1]})),"BAD_POINT","نقطةٌ فيها NaN");
 eq(code(()=>V("wall",{a:[0],b:[1,1]})),"BAD_POINT","نقطةٌ ناقصة");
 eq(code(()=>V("wall",{a:"3,4",b:[1,1]})),"BAD_POINT","نصٌّ لا مصفوفة");
 eq(code(()=>V("wall",{a:[0,0],b:[1e10,0]})),"BAD_POINT","خارج الحدّ");
 eq(code(()=>V("wall",{a:[0,0],b:[1,1],t:"abc"})),"BAD_NUMBER","سماكةٌ نصّية");
 eq(code(()=>V("wall",{a:[0,0],b:[1,1],t:NaN})),"BAD_NUMBER","سماكة NaN");
 eq(code(()=>V("wall",{a:[0,0],b:[1,1],t:Infinity})),"BAD_NUMBER","سماكة ∞");
 eq(code(()=>V("wall",null)),"NOT_OBJECT","لا كائن");
 eq(code(()=>V("zzz",{})),"BAD_SCHEMA","كيانٌ مجهول");
 eq(code(()=>V("text",{p:[0,0],s:"x".repeat(2001)})),"TOO_LONG","نصٌّ فوق الحدّ");
 eq(code(()=>V("text",{p:[0,0],s:5})),"BAD_TYPE","نصٌّ ليس نصّاً");
 eq(code(()=>V("lead",{pts:[[0,0],[1,NaN]]})),"BAD_POINT","قائدٌ برأسٍ فاسد");
 eq(code(()=>V("chain",{base:[0,0],vals:[1,2]})),"MISSING","سلسلةٌ بلا pos");
 eq(code(()=>V("chain",{base:[0,0],pos:0,vals:[1,"x"]})),"BAD_NUMBER","قيمةٌ غير رقمية");
 ok(V("chain",{base:[0,0],pos:0,vals:[1,"250"]}).vals.length===2,"وقيمةٌ رقميّةٌ نصّاً تمرّ (توافق)");
 eq(code(()=>V("area",{ring:"abc"})),"NOT_ARRAY","حلقةٌ ليست مصفوفة");
 eq(code(()=>V("area",{ring:[[0,0],null]})),"BAD_POINT","حلقةٌ برأسٍ null");
});
group("V — الأخطاء تسمّي الكيان والحقل",()=>{
 try{V("wall",{a:[0,NaN],b:[1,1]})}catch(e){
  ok(e instanceof ParseError,"ParseError");
  ok(/جدار\.a/.test(e.message),"«جدار.a» في الرسالة");
  eq(e.detail&&e.detail.kind,"wall","detail.kind");
  eq(e.detail&&e.detail.field,"a","detail.field");
 }
 try{V("lead",{pts:[[0,0],[1,NaN]]})}catch(e){
  ok(/pts\[1\]/.test(e.message),"وفهرس الرأس الفاسد");
 }
});
group("V — keep/fill وsafeV",()=>{
 const v=V("blockDef",{name:"x",extra:7,prims:[]},{keep:true});
 eq(v.extra,7,"keep يُبقي غير المذكور");
 ok(!("extra" in V("blockDef",{name:"x",extra:7,prims:[]})),"وبلا keep يُسقِطه");
 const r=safeV("wall",{a:[0,NaN],b:[1,1]});
 ok(r.ok===0&&/جدار/.test(r.why)&&r.err instanceof ParseError,"safeV لا ترمي");
 ok(safeV("wall",{a:[0,0],b:[1,1]}).ok===1,"وتقبل الصالح");
});
group("prims — قيمٌ محلّية بالمليمتر وزوايا راديان",()=>{
 ok(parsePrims([{t:"arc",c:[0,0],r:900,a0:0,a1:Math.PI/2}]).length===1,
  "قوسٌ بزاوية π/2 (راديان) صالح");
 ok(parsePrims([{t:"line",a:[0.5,0.25],b:[10.75,3]}])[0].a[0]===0.5,
  "الإحداثيّ الكسريّ لا يُقرَّب (يختلف عن PT)");
 eq(code(()=>parsePrims("x")),"NOT_ARRAY","ليست مصفوفة");
 eq(code(()=>parsePrims([{t:"zzz"}])),"BAD_PRIM","نوعٌ مجهول");
 eq(code(()=>parsePrims([null])),"BAD_PRIM","null");
 eq(code(()=>parsePrims([{t:"circle",c:[0,0],r:0}])),"BAD_PRIM","نصف قطرٍ صفر");
 eq(code(()=>parsePrims([{t:"circle",c:[0,0],r:-5}])),"BAD_PRIM","نصف قطرٍ سالب");
 eq(code(()=>parsePrims([{t:"arc",c:[0,0],r:5,a0:NaN,a1:1}])),"BAD_PRIM","زاويةٌ NaN");
 eq(code(()=>parsePrims([{t:"pline",pts:[[0,0]]}])),"BAD_PRIM","pline بنقطةٍ واحدة");
 eq(code(()=>parsePrims([{t:"pline",pts:[[0,0],[1,NaN]]}])),"BAD_PRIM","pline برأسٍ فاسد");
 eq(code(()=>parsePrims([{t:"line",a:[0,0],b:[1e10,0]}])),"BAD_PRIM","خارج الحدّ");
 eq(code(()=>parsePrims(new Array(501).fill({t:"line",a:[0,0],b:[1,1]}))),"TOO_MANY","فوق حدّ الأوّليات");
});

/* ═══ التغطية — يفشل إن بقي باب إدخالٍ غير محروس ═══ */
const COVER=[
 ["core/walls.js","addWall","wall"], ["core/opens.js","addOpen","open"],
 ["core/areas.js","addArea","area"], ["core/cols.js","addCol","col"],
 ["core/fixt.js","addFix","fix"],   ["core/stairs.js","addStair","stair"],
 ["core/stairs.js","addStairL","stair"], ["core/stairs.js","addStairU","stair"],
 ["core/roof.js","addRoof","roof"],
 ["core/plines.js","addPline","pline"],
 ["core/clouds.js","addCloud","cloud"],
 ["core/callouts.js","addCallout","callout"],
 ["core/groups.js","groupAdd","group"],
 ["core/live.js","addLive","live"],
 ["core/dims.js","addDim","dim"],   ["core/dims.js","addChain","chain"],
 ["core/dims.js","addDimRad","dimRad"], ["core/dims.js","addDimDia","dimRad"],
 ["core/dims.js","addDimAng","dimAng"],
 ["core/dims.js","addText","text"], ["core/dims.js","addLead","lead"],
 ["core/dims.js","addMText","mtext"],
 ["core/dims.js","addSlope","slope"],
 /* العناصرُ الإنشائية §٣/١٢ — ثلاثةُ منافذَ لثلاثةِ مخطَّطات */
 ["core/struct.js","addBeam","beam"],
 ["core/struct.js","addFooting","footing"],
 ["core/struct.js","addSlab","slab"],
 ["core/dims.js","addLevel","level"],
 ["core/blocks.js","checkDefs","blockDef"],
 ["core/sheet.js","addSheet","sheet"],
 ["core/sheet.js","addViewport","vpv"],
 ["core/tables.js","addTable","table"]
];
function bodyOf(src,fn){
 const i=src.indexOf(`function ${fn}(`);
 if(i<0)return null;
 const j=src.indexOf("\nexport ",i+10);
 return src.slice(i,j<0?undefined:j);
}
group("التغطية — كل منفذٍ يستدعي V بنوعه",()=>{
 COVER.forEach(([f,fn,kind])=>{
  const b=bodyOf(readFileSync(join(root,"js",f),"utf8"),fn);
  ok(b!==null,`${fn} موجودة في ${f}`);
  ok(b&&new RegExp(`\\bV\\("${kind}"`).test(b),`${fn} ⇒ V("${kind}",…)`);
 });
 /* كلُّ دالّة add* مُصدَّرة في core يجب أن تكون في COVER أو مستثناةٌ بسبب */
 const EXEMPT={addAxis:"محور: قيمةٌ واحدة تُفحَص في نفسها (isFinite) — لا نقطة"};
 const listed=new Set(COVER.map(c=>c[1]));
 ["walls","opens","areas","cols","fixt","stairs","roof","dims","plines","clouds","callouts","live"].forEach(f=>{
  const src=readFileSync(join(root,"js/core",f+".js"),"utf8");
  [...src.matchAll(/export function (add[A-Z]\w*)\(/g)].forEach(m=>{
   ok(listed.has(m[1])||EXEMPT[m[1]],
    `${f}.js: ${m[1]} ${listed.has(m[1])?"مغطّاة":"مستثناة: "+EXEMPT[m[1]]}`);
  });
 });
 /* كل كيانٍ في VLD له منفذٌ في COVER */
 const kinds=new Set(COVER.map(c=>c[2]));
 KINDS.forEach(k=>ok(kinds.has(k),`الكيان «${k}» له منفذٌ مغطّى`));
});
group("التغطية — جدول الحقول",()=>{
 const T=coverage();
 eq(T.length,KINDS.length,"صفٌّ لكل كيان");
 T.forEach(r=>ok(r.fields===r.required+r.optional&&r.fields>0,
  `${r.kind}: ${r.fields} حقلاً (${r.required} إلزاميّ)`));
});

/* ═══ السلوك — كل منفذٍ يرفض ولا يمسّ الحالة ═══ */
group("السلوك — كلُّ addX يرفض NaN ولا يكتب",()=>{
 reset();
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 const before=JSON.stringify([S.walls,S.opens,S.areas,S.cols,S.fixt,
  S.stairs,S.dims,S.chains,S.anno]);
 const g0=VER.g;
 const T=[
  ["addWall a=NaN",()=>W.addWall([NaN,0],[3000,0],200,"int","c")],
  ["addWall b ناقصة",()=>W.addWall([0,0],[3000],200,"int","c")],
  ["addWall a=null",()=>W.addWall(null,[3000,0],200,"int","c")],
  ["addWall t نصّ",()=>W.addWall([0,0],[3000,0],"abc","int","c")],
  ["addWall bulge=NaN",()=>W.addWall([0,0],[3000,0],200,"int","c",null,NaN)],
  ["addOpen s=NaN",()=>O.addOpen(w,NaN,"door",900,2100,0)],
  ["addOpen W نصّ",()=>O.addOpen(w,3000,"door","x",2100,0)],
  ["addArea رأسٌ NaN",()=>A.addArea([[0,0],[1000,0],[NaN,1000]],"x")],
  ["addArea نصّ",()=>A.addArea("abc","x")],
  ["addCol p=null",()=>C.addCol("rect",null,300,300,0,"conc")],
  ["addCol p ناقصة",()=>C.addCol("rect",[5],300,300,0,"conc")],
  ["addCol w=NaN",()=>C.addCol("rect",[9000,9000],NaN,300,0,"conc")],
  ["addFix p=NaN",()=>F.addFix("wc",[NaN,NaN],0)],
  ["addStair a=null",()=>ST.addStair(null,[0,3000],1000,12)],
  ["addStair n=NaN",()=>ST.addStair([0,0],[0,3000],1000,NaN)],
  ["addDim b ناقصة",()=>D.addDim("h",[0,0],[1000],0)],
  ["addDim pos=NaN",()=>D.addDim("h",[0,0],[1000,0],NaN)],
  ["addChain بلا pos",()=>D.addChain("h",[0,0],undefined,[1000,2000],0)],
  ["addChain base فاسدة",()=>D.addChain("h",[0,"x"],0,[1000],0)],
  ["addText p فاسدة",()=>D.addText([NaN,0],"س",1,0,"bc")],
 ["addMText p فاسدة",()=>D.addMText([NaN,0],"س",3000,1)],
 ["addSlope نقطةٌ فاسدة",()=>D.addSlope([[NaN,0],[5000,0]],1)],
 ["addBeam a فاسدة",()=>GS.addBeam([NaN,0],[6000,0],250,500)],
 ["addFooting p فاسدة",()=>GS.addFooting([NaN,0],1500,1500,0,400)],
 ["addSlab رأسٌ فاسد",()=>GS.addSlab([[0,0],[NaN,0],[6000,4000]],150)],
  ["addLead رأسٌ فاسد",()=>D.addLead([[0,0],[NaN,1]],"س",1)],
  ["addLevel p فاسدة",()=>D.addLevel(null,1000,"±")]
 ];
 T.forEach(([n,fn])=>{
  const c=code(fn);
  ok(c!==null,`${n} ⇒ يُرفَض`);
 });
 eq(JSON.stringify([S.walls,S.opens,S.areas,S.cols,S.fixt,S.stairs,S.dims,
  S.chains,S.anno]),before,"ولم يتغيّر في الحالة حرفٌ");
 eq(VER.g,g0,"ولم يُبطَل كاشٌ (لا touch)");
});
group("السلوك — المدخلات السليمة تمرّ كما كانت",()=>{
 reset();
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 ok(!!O.addOpen(w,3000,"door",900,2100,0),"addOpen");
 ok(!!C.addCol("rect",[9000,9000],300,300,0,"conc"),"addCol");
 ok(!!F.addFix("wc",[1000,1000],0),"addFix");
 ok(!!ST.addStair([0,5000],[0,8000],1000,12),"addStair");
 ok(!!D.addDim("h",[0,0],[3000,0],500),"addDim");
 ok(!!D.addChain("h",[0,0],500,[1000,2000],1),"addChain");
 ok(!!D.addText([0,0],"نصّ",1,0,"bc"),"addText");
 ok(!!D.addMText([0,0],"فقرةٌ من سطرين\nوبندٌ ثانٍ",3000,1),"addMText");
 ok(!!D.addSlope([[0,0],[5000,0]],1,"pct"),"addSlope");
 ok(!!GS.addBeam([0,0],[6000,0],250,500,"conc"),"addBeam");
 ok(!!GS.addFooting([0,0],1500,1500,0,400,"conc"),"addFooting");
 ok(!!GS.addSlab([[0,0],[6000,0],[6000,4000],[0,4000]],150,"conc"),
  "addSlab");
 ok(!!D.addLead([[0,0],[500,500]],"قائد",1),"addLead");
 ok(!!D.addLevel([0,0],1000,"±"),"addLevel");
 ok(!!A.addArea([[0,0],[4000,0],[4000,4000],[0,4000]],"غرفة"),"addArea");
 /* والرسائل الخاصّة بكل منفذٍ ما زالت تصل (لم يحجبها V) */
 throws(()=>D.addText([0,0],"  ",1,0,"bc"),/فارغ/,"نصٌّ فارغ ⇒ رسالة addText");
 throws(()=>A.addArea([[0,0],[1,1]],"x"),/ثلاثة/,"حلقةٌ قصيرة ⇒ رسالة addArea");
 throws(()=>D.addChain("h",[0,0],0,[],0),/بلا قيَم/,"سلسلةٌ فارغة ⇒ رسالتها");
});

/* ═══ مسار المزوّد ═══ */
group("ai/ops — نقطةٌ فاسدة تُرفَض ولا تصير الأصل",()=>{
 const V2=l=>OPS.validate(l);
 let r=V2([{op:"wall",a:[0,0],b:[5,0],t:0.2}]);
 eq(r.ok.length,1,"جدارٌ صالح");
 deep(r.ok[0].b,[5000,0],"والنقطة بالمليمتر");
 [
  {op:"wall",a:[0,null],b:[5,0]},
  {op:"wall",a:[0],b:[5,0]},
  {op:"wall",a:[0,0],b:[null,null]},
  {op:"wall",a:["x","y"],b:[5,0]},
  {op:"wall",a:[0,0],b:[1e9,0]},
  {op:"wall",a:[0,0],b:[NaN,0]},
  {op:"wall",a:[0,0,9],b:[5,0]},
  {op:"area",at:[null,3]},
  {op:"area",at:[1]},
  {op:"text",at:[0,"z"],s:"س"},
  {op:"text",at:[5e8,0],s:"س"}
 ].forEach((o,i)=>{
  const q=V2([o]);
  ok(q.ok.length===0&&q.bad.length===1,
   `مدخل ${i}: ${JSON.stringify(o)} ⇒ مرفوض لا (0,0)`);
 });
 r=V2([{op:"area",at:[2,3],name:"س"},{op:"text",at:[1,1],s:"نص"}]);
 eq(r.ok.length,2,"area وtext الصالحتان تمرّان");
 deep(r.ok[0].at,[2000,3000],"area: النقطة بالمليمتر");
 /* سطرٌ فاسد لا يُسقِط الخطّة كلَّها */
 r=V2([{op:"wall",a:[0,0],b:[5,0]},{op:"wall",a:[0,null],b:[5,0]},
  {op:"wall",a:[0,0],b:[0,5]}]);
 eq(r.ok.length,2,"التسعة الصحيحة تُنفَّذ والفاسد يُسجَّل");
 eq(r.bad.length,1,"وواحدٌ مرفوض");
 eq(r.bad[0].i,1,"بفهرسه");
});
process.exit(summary()?1:0);
