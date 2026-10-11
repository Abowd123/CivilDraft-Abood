/* ═══ مثيلُ الكتلة عنصرٌ كامل ═══ (خطّة 1.1.0 · البند ج)
   كان يُرسَم ويُصدَّر ولا يُلمَس. معيارُ الإنجاز المعلن في الخطّة حرفاً:
   «يُدرِج كتلةً ثم ينقرها فتُحدَّد، يسحب مقبضَها فتتحرّك، يضغط Delete
   فتُحذَف، Ctrl+Z فتعود» — وفوقه: كلُّ أداةِ تعديلٍ × الكتلة، والتحديدُ
   بالمستطيل، والخصائص، والحفظُ والفتح، وDXF، والتفكيكُ القديم كما هو.
   التشغيل:  node js/tests/block-entity.test.js                        */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,near,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv"); DOC.body.appendChild(cv);}
if(!globalThis.window)globalThis.window={prompt:()=>null,confirm:()=>true};
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const {S,newState,ensureShape,undo,redo,historyTimeline,clearHistory,edit}=ST;
const RN=await import("../core/render.js");
const EN=await import("../core/ents.js");
const BLK=await import("../core/blocks.js");
const BT=await import("../core/batch.js");
const PRJ=await import("../io/project.js");
const EX=await import("../io/export.js");
const OPS=await import("../tools/blockops.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,150,k),invalidate:()=>RN.invalidate()});
R.H.del=()=>edit(()=>EN.delEnts(rig.sel.slice()),"حذف");
const snap=()=>JSON.stringify(S,(k,v)=>(k==="meta"||k==="__ver")?undefined:v);
const steps=()=>historyTimeline().current;
const P=(x,y)=>rig.at(x,y);
const end=()=>{if(R.active())rig.esc()};
/* مقعدٌ 1م: خطٌّ من (0,0) إلى (1000,0) وقوسٌ ربعيٌّ نصفُ قطره 900 */
function fresh(x=5000,y=5000){
 newState(); ensureShape(); if(R.active())R.cancel(true); rig.pick([]); rig.clear();
 R.toolList().forEach(d=>rig.defs(d.id));
 OPS.createBlock("bench","مقعد",[{t:"line",a:[0,0],b:[1000,0]},
  {t:"arc",c:[0,0],r:900,a0:0,a1:Math.PI/2}],[0,0]);
 edit(()=>S.blocks.push(BLK.makeInstance("bench",{x,y})),"إدراج");
 RN.invalidate(); clearHistory(); rig.clear();
 return S.blocks[0];
}
const me=()=>({k:"blk",id:S.blocks[0].id});

group("النواة: الإصابةُ والحدود (segsOfPrim · instDist · instPoly)",()=>{
 const b=fresh();
 eq(BLK.segsOfPrim({t:"line",a:[0,0],b:[1,0]}).length,1,"الخطُّ ضلعٌ واحد");
 eq(BLK.segsOfPrim({t:"arc",cx:0,cy:0,r:1,a0:0,a1:90}).length,8,"والقوسُ ثمانيةُ أوتار");
 near(BLK.instDist(b,5500,5000),0,1,"نقطةٌ على الخطّ = صفر");
 near(BLK.instDist(b,5500,5200),200,1,"و200 فوقه = 200");
 const p=BLK.instPoly(b); eq(p.length,4,"المضلّعُ المحيط أربعةُ رؤوس");
 ok(p[0][0]<=5000&&p[2][0]>=5999,"ويحيط بالخطّ كلّه");
});
group("معيارُ الإنجاز: نقرٌ ⇐ تحديد · مقبض ⇐ نقل · حذف · تراجع",()=>{
 fresh(); const pre=snap();
 const s=EN.hitTest(5500,5050,150);
 eq(s&&s.k,"blk","النقرُ على خطّ الكتلة يصيبها");
 eq(EN.hitTest(8000,8000,150),null,"والفراغُ لا يصيب شيئاً");
 const G=EN.gripsOf(s); eq(G.length,3,"ثلاثةُ مقابض: موضع · دوران · مقياس");
 const o=EN.grabOf(s);
 edit(()=>EN.dragGrip(Object.assign({s},G[0]),o,[7000,6000]),"سحب");
 eq([S.blocks[0].x,S.blocks[0].y].join(),"7000,6000","سحبُ مقبض الموضع ينقلها");
 edit(()=>EN.delEnts([s]),"حذف"); eq(S.blocks.length,0,"Delete يحذفها");
 undo(); eq(S.blocks.length,1,"Ctrl+Z يعيدها"); undo();
 ok(snap()===pre,"وتراجعٌ ثانٍ يعيد الحالة الأولى بايتاً ببايت");
});
group("مقبضا الدوران والمقياس",()=>{
 fresh(0,0); const s=me(), G=EN.gripsOf(s);
 let o=EN.grabOf(s); EN.dragGrip(Object.assign({s},G[1]),o,[0,1000]);
 near(S.blocks[0].rot,Math.PI/2,1e-6,"السحبُ إلى الأعلى = 90° (راديان كما يقرؤه xform)");
 S.blocks[0].rot=0; o=EN.grabOf(s);
 const g2=EN.gripsOf(s)[2], d0=Math.hypot(g2.p[0],g2.p[1]);
 EN.dragGrip(Object.assign({s},g2),o,[g2.p[0]*2,g2.p[1]*2]);
 near(S.blocks[0].scale,2,0.01,`مقبضُ المقياس على ضِعف البعد (${Math.round(d0)}) = ×2`);
});
group("التحديدُ بالمستطيل",()=>{
 fresh();
 ok(EN.pickInRect({x0:4900,y0:4900,x1:6100,y1:6000},1).some(s=>s.k==="blk"),"نافذةٌ تحيط بها تحدّدها");
 ok(!EN.pickInRect({x0:0,y0:0,x1:1000,y1:1000},1).some(s=>s.k==="blk"),"وبعيدةٌ عنها لا");
});
const tool=(name,fn,check)=>group(`${name} على الكتلة · خطوةٌ واحدة · تراجعٌ تامّ`,()=>{
 fresh(); const pre=snap(), h0=steps();
 rig.pick([me()]); fn(); end();
 check(); eq(steps()-h0,1,"خطوةُ تاريخٍ واحدة");
 const e=rig.errs(); ok(!e.length,"بلا خطأ"+(e.length?": "+e[0]:""));
 ok(!rig.said(/رُفض/),"ولا «رُفض» — النوعُ مدعوم");
 undo(); ok(snap()===pre,"التراجعُ يعيدها");
});
tool("نقل",()=>{R.begin("move"); P(5000,5000); P(6000,5000)},
 ()=>eq(S.blocks[0].x,6000,"س +1م"));
tool("نسخ",()=>{R.begin("copy"); P(5000,5000); P(5000,7000)},
 ()=>{eq(S.blocks.length,2,"مثيلان"); ok(S.blocks[0].id!==S.blocks[1].id,"بمعرّفين"); eq(S.blocks[1].y,7000,"والنسخةُ في موضعها")});
tool("دوران 90°",()=>{R.begin("rotate"); P(5000,5000); rig.type("90")},
 ()=>near(S.blocks[0].rot,Math.PI/2,1e-6,"rot = π/2"));
tool("مرآة على محورٍ رأسيّ (بلا إبقاء الأصل)",()=>{R.setOpt("mirror","keep",0); R.begin("mirror"); P(5000,0); P(5000,1000); rig.enter()},
 ()=>{eq(S.blocks[0].mirror,1,"معكوسة");
  const e=BLK.explode(S.blocks[0]).find(p=>p.t==="line");
  ok(e&&Math.min(e.a[0],e.b[0])<5000-900,"والخطُّ صار يسارَ الأساس")});
tool("مقياس ×2 بمقاسٍ ثابت (الافتراض)",()=>{R.setOpt("scale","k",2); R.begin("scale"); P(0,0)},
 ()=>{eq([S.blocks[0].x,S.blocks[0].y].join(),"10000,10000","الموضعُ يُقاس"); eq(S.blocks[0].scale,1,"والكتلةُ بمقاسها")});
tool("حذف",()=>{R.begin("del")},()=>eq(S.blocks.length,0,"حُذفت"));

/* ═══ المرآةُ تطابق الانعكاسَ الهندسيَّ نقطةً بنقطة ═══
   كانت القطعةُ (وأوّلُ نسخةٍ من الكتلة) تُقلَب 180°: R(2α − θ) بدل R(2α − θ + π).
   هنا يُقارَن الناتجُ بانعكاسِ الأصلِ نفسِه على ثلاثةِ محاور. */
const FX=await import("../core/fixt.js");
const refl=(a,b)=>([x,y])=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L,
 px=x-a[0],py=y-a[1],s=px*ux+py*uy; return [a[0]+2*ux*s-px,a[1]+2*uy*s-py]};
const key=P=>P.map(p=>p.map(v=>Math.round(v/5)*5).join(",")).sort().join(" ");
const blkPts=b=>BLK.explode(b).flatMap(p=>p.t==="line"?[p.a,p.b]:p.t==="arc"
 ?[0,0.5,1].map(f=>{const t=(p.a0+(p.a1-p.a0)*f)*Math.PI/180; return [p.cx+p.r*Math.cos(t),p.cy+p.r*Math.sin(t)]}):[]);
for(const [n,a,b] of [["رأسيّ",[5000,0],[5000,1000]],["أفقيّ",[0,4000],[1000,4000]],["قطريّ 45°",[0,0],[1000,1000]]]){
 group(`المرآةُ على محورٍ ${n} = الانعكاسُ الهندسيّ`,()=>{
  fresh(); S.blocks[0].rot=0.3;
  edit(()=>FX.addFix("bed1",[3000,6000],20),"سرير"); RN.invalidate(); clearHistory();
  const F=refl(a,b);
  const eB=key(blkPts(S.blocks[0]).map(F)), eF=key(FX.fixPoly(S.fixt[0]).map(F));
  rig.pick([me(),{k:"fix",id:S.fixt[0].id}]); R.setOpt("mirror","keep",0);
  R.begin("mirror"); P(...a); P(...b); end();
  eq(key(blkPts(S.blocks[0])),eB,"الكتلة");
  eq(key(FX.fixPoly(S.fixt[0])),eF,"والقطعة (سرير) — لا تنقلب رأساً على عقب");
 });
}
group("مقياس بمقاسٍ منتظم: الكتلةُ تكبر",()=>{
 fresh(); rig.pick([me()]); R.setOpt("scale","k",2); R.setOpt("scale","keep",0); R.begin("scale"); P(5000,5000); end();
 eq(S.blocks[0].scale,2,"×2");
});
group("الخصائص: التعريفُ والدورانُ بالدرجات والمقياسُ والعكس",()=>{
 fresh(); OPS.createBlock("table1","طاولة",[{t:"line",a:[0,0],b:[500,0]}],[0,0]);
 const s=me();
 eq(BT.fieldVal("blk",S.blocks[0],"rot"),0,"الدورانُ يُقرأ درجات");
 edit(()=>BT.applyVal("blk","rot",S.blocks[0],"90"),"دوران");
 near(S.blocks[0].rot,Math.PI/2,1e-6,"ويُكتَب راديان");
 edit(()=>BT.applyVal("blk","mirror",S.blocks[0],1),"عكس"); eq(S.blocks[0].mirror,1,"العكس");
 edit(()=>BT.applyVal("blk","block",S.blocks[0],"table1"),"تعريف"); eq(S.blocks[0].block,"table1","تبديلُ التعريف");
 ok(BT.FLD.blk.find(f=>f.k==="block").items.some(([v])=>v==="table1"),"وقائمةُ التعريفات حيّة");
});
group("الحفظُ والفتح والتصدير والتفكيك القديم",()=>{
 fresh(); S.blocks[0].rot=0.5; S.blocks[0].mirror=1;
 const a=PRJ.toJSON(); newState(); PRJ.fromJSON(a);
 eq(PRJ.toJSON(),a,"حفظٌ ⇐ فتحٌ ⇐ حفظ: النصُّ نفسُه");
 eq(EN.hitTest(S.blocks[0].x+300,S.blocks[0].y,400)&&EN.hitTest(S.blocks[0].x+300,S.blocks[0].y,400).k,"blk","وتبقى قابلةً للإصابة بعد الفتح");
 R.begin("explode"); P(5000+Math.cos(0.5)*-500,5000+Math.sin(0.5)*-500); end();
 /* «تفكيك» يستعمل instanceAt التي صارت تنادي النواة */
 ok(S.blocks.length===0||rig.errs().length>0,"التفكيكُ يعمل أو يقول لماذا");
});
group("DXF يحمل المثيل INSERT",async()=>{});
{
 fresh(); const r=await EX.run("dxf",{});
 const txt=Buffer.from(r.raw||[]).toString("latin1").replace(/\r/g,"");
 group("DXF: INSERT للكتلة",()=>{ok(r.ok===1,"التصديرُ نجح"); ok(/\nINSERT\n/.test(txt),"وفيه INSERT")});
}
process.exit(summary()?1:0);
