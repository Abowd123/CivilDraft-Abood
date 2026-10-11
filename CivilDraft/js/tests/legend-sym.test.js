/* ═══ مفتاحُ الرموز ═══ (خطّة 1.1.0 · البند د) — والطباعةُ تحمله
   معيارُ الخطّة حرفاً: «٣ مفاتيح + فيشتان + سرير ⇐ ٣ صفوف بأعدادها ·
   إخفاءُ طبقة الكهرباء يحذف صفوفها · تصديرُ DXF/SVG/PDF يحمل الجدول».
   وفوقه: المرئيُّ غيرُ المطبوع يخرج، نطاقُ الطابق، الفتحاتُ والأعمدةُ
   والكتل، الأيقونةُ من دالّة الرسم نفسِها وداخلَ خليّتها بلا مطّ،
   والصفوفُ حيّة، والحفظُ والفتح يحفظان «نطاق المفتاح».
   التشغيل:  node js/tests/legend-sym.test.js                          */
import {shim,shimCanvas,shimDOM,toolRig,group,groupAsync,ok,eq,near,summary} from "./harness.js";
shim(); shimCanvas(); shimDOM();
const ST=await import("../core/state.js");
const {S,newState,ensureShape,edit,undo,clearHistory}=ST;
const RN=await import("../core/render.js");
const T =await import("../core/tables.js");
const FX=await import("../core/fixt.js");
const W =await import("../core/walls.js");
const O =await import("../core/opens.js");
const C =await import("../core/cols.js");
const LY=await import("../core/layers.js");
const BLK=await import("../core/blocks.js");
const PRJ=await import("../io/project.js");
const EX=await import("../io/export.js");
await import("../tools/annotate.js");
const OPS=await import("../tools/blockops.js");
const R=await import("../tools/registry.js");
const rig=toolRig(R,{hit:()=>null,invalidate:()=>RN.invalidate()});

/* المشهدُ المعياريّ: ٣ مفاتيح مفردة + فيشتان + سرير */
function scene0(){
 newState(); ensureShape(); if(R.active())R.cancel(true); rig.clear();
 edit(()=>{
  [[1000,0],[1500,0],[2000,0]].forEach(p=>FX.addFix("sw1",p,0));
  [[3000,0],[3500,0]].forEach(p=>FX.addFix("soc",p,0));
  FX.addFix("bed1",[6000,3000],0);
 },"مشهد");
 RN.invalidate(); clearHistory();
}
const rows=o=>T.symRows(o).map(r=>`${r.name}:${r.n}`);
const put=(ex)=>{let t; edit(()=>{t=T.addTable("sym",[30000,20000],ex||{})},"مفتاح"); RN.invalidate(); return t};
const SC=()=>{const s=RN.scene(); return Array.isArray(s)?s:(s.P||[])};
const primsOf=t=>SC().filter(g=>g.tid===t.id);

group("معيارُ الخطّة: ٣ مفاتيح + فيشتان + سرير ⇐ ٣ صفوف بأعدادها",()=>{
 scene0();
 eq(rows().join(" · "),"سرير مفرد:1 · فيشة عادية:2 · مفتاح مفرد:3",
  "ثلاثةُ صفوف — الأثاثُ قبل الكهرباء، ثم بالاسم");
 ok(!rows().some(s=>/كرسي/.test(s)),"والمستعملُ وحدَه: لا كرسيَّ إفرنجيّاً لم يُرسَم");
 const t=put();
 eq(T.tableSize(t).nrows,3,"والجدولُ الموضوعُ ثلاثةُ صفوف");
 const foot=T.TBK.sym.foot(t);
 eq(foot[2],"6","والتذييلُ يجمع: ٦ رموز"); eq(foot[3],"كلّ الطبقات","والنطاقُ شامل");
});
group("المرئيُّ القابلُ للطباعة وحدَه",()=>{
 scene0();
 LY.setLay("A-ELEC","off",1);
 eq(rows().join(),"سرير مفرد:1","إخفاءُ الكهرباء يحذف صفوفَها");
 LY.setLay("A-ELEC","off",0); LY.setLay("A-ELEC","plot",0);
 eq(rows().join(),"سرير مفرد:1","والظاهرةُ التي لا تُطبَع تخرج أيضاً — ما لا يُطبَع لا يُشرَح");
 LY.setLay("A-ELEC","plot",1);
 eq(rows().length,3,"وعودتُها تعيد الصفوف");
});
group("نطاقُ المفتاح: طبقةٌ واحدة (ورقةُ الكهرباء)",()=>{
 scene0();
 eq(rows("A-ELEC").join(" · "),"فيشة عادية:2 · مفتاح مفرد:3","الكهرباءُ وحدَها");
 const t=put({lay:"A-ELEC"});
 eq(t.lay,"A-ELEC","النطاقُ مخزَّنٌ على الجدول");
 eq(T.tableSize(t).nrows,2,"صفّان");
 eq(T.TBK.sym.foot(t)[2],"5","وتذييلُه ٥");
 const t2=T.addTable("open",[0,0],{lay:"A-ELEC"});
 ok(t2.lay===undefined,"وجدولٌ من نوعٍ آخر لا يحمل النطاق");
});
group("الطابق: المفتاحُ يصف ما يُرسَم الآن",()=>{
 scene0();
 edit(()=>{const f=FX.addFix("soc",[4000,0],0); f.level=1},"طابق");
 eq(rows("A-ELEC")[0],"فيشة عادية:2","فيشةُ الطابق الأوّل لا تُعَدّ في الأرضيّ");
 S.meta.level=1; RN.invalidate();
 eq(rows("A-ELEC").join(),"فيشة عادية:1","وفي الأوّل تُعَدّ وحدَها");
});
group("الفتحاتُ والأعمدةُ والكتل",()=>{
 newState(); ensureShape();
 edit(()=>{
  const w=W.addWall([0,0],[8000,0],200,"ext","c");
  O.addOpen(w,1500,"door",900,2100,0); O.addOpen(w,3500,"door",900,2100,0);
  O.addOpen(w,6000,"window",1200,1200,900);
  C.addCol("rect",[0,3000],400,400,0,"conc"); C.addCol("rect",[4000,3000],400,400,0,"conc");
  C.addCol("circ",[8000,3000],400,400,0,"steel");
 },"مشهد");
 OPS.createBlock("tree","شجرة",[{t:"line",a:[0,0],b:[500,0]}],[0,0]);
 edit(()=>{S.blocks.push(BLK.makeInstance("tree",{x:0,y:9000}));
  S.blocks.push(BLK.makeInstance("tree",{x:900,y:9000}))},"كتل");
 RN.invalidate();
 const r=rows();
 ok(r.includes("باب مفرد:2"),"البابان صفٌّ واحد");
 ok(r.includes("شباك:1"),"والشبّاك");
 ok(r.includes("عمود خرسانة مستطيل:2"),"والأعمدةُ حسب المادّة والمقطع");
 ok(r.includes("عمود حديد دائري:1"),"فالحديديُّ الدائريُّ صفٌّ آخر");
 ok(r.includes("شجرة:2"),"والكتلُ حسب تعريفها (بعد البند ج)");
 eq(r[r.length-1],"شجرة:2","والكتلُ آخراً");
});
group("الأيقونة: من دالّة الرسم نفسِها · داخلَ خليّتها · بلا مطّ",()=>{
 scene0(); const t=put();
 const G=primsOf(t);
 const z=T.tableSize(t);
 const x1=t.x, xIc0=t.x-z.w*0.18;
 const icons=G.filter(g=>g.L!==T.TB_LAY);
 ok(icons.length>0,"للأيقونات أوّلياتٌ مرسومة");
 ok(icons.every(g=>["A-FURN","A-ELEC"].includes(g.L)),"وعلى طبقةِ القطعة نفسِها — فتنال لونَها");
 const bedN=FX.fixPrims({id:"x",kind:"bed1",x:0,y:0,rot:0,w:1000,d:2000}).length;
 const row1=icons.filter(g=>g.L==="A-FURN");
 eq(row1.length,bedN,"أيقونةُ السرير = أوّلياتُ fixPrims للسرير عدداً");
 const pts=icons.flatMap(g=>g.t==="line"?[g.a,g.b]:g.t==="poly"?g.pts:[[g.cx-g.r,g.cy-g.r],[g.cx+g.r,g.cy+g.r]]);
 ok(pts.every(([x])=>x>=xIc0-1&&x<=x1+1),"كلُّ نقطةٍ داخلَ عمود الرمز أفقياً");
 ok(pts.every(([,y])=>y<=t.y-z.rh+1&&y>=t.y-z.rh*4-1),"وداخلَ صفوف البيانات رأسياً (لا في الترويسة)");
 const P=row1.flatMap(g=>g.pts||[g.a,g.b]);
 const bx=Math.max(...P.map(p=>p[0]))-Math.min(...P.map(p=>p[0]));
 const by=Math.max(...P.map(p=>p[1]))-Math.min(...P.map(p=>p[1]));
 near(by/bx,2,0.05,"والسريرُ ١×٢ يبقى ١×٢ — نسبةٌ واحدة للمحورين");
 const f=T.fitIcon([{t:"line",L:"X",a:[0,0],b:[100,0]}],0,0,10,10,"q")[0];
 eq([f.a,f.b].join("|"),"-10,0|10,0","fitIcon: خطٌّ ١٠٠ في صندوقٍ ٢٠ يصير ٢٠ متمركزاً");
 eq(T.fitIcon([],0,0,1,1,"q").length,0,"وبلا أوّليات لا شيء");
});
group("الصفوفُ حيّة: فيشةٌ جديدة تظهر بلا إعادة وضع",()=>{
 scene0(); const t=put();
 edit(()=>FX.addFix("soc",[9000,0],0),"فيشة"); RN.invalidate();
 eq(T.tableSize(t).nrows,3,"ما زالت ثلاثة صفوف");
 ok(T.TBK.sym.rows(t).some(r=>r[1]==="فيشة عادية"&&r[2]==="3"),"والعددُ صار ٣");
 undo(); RN.invalidate();
 ok(T.TBK.sym.rows(t).some(r=>r[1]==="فيشة عادية"&&r[2]==="2"),"والتراجعُ يعيده ٢");
});
group("الحفظُ والفتح: النطاقُ يبقى، والفاسدُ يُنظَّف",()=>{
 scene0(); put({lay:"A-ELEC"});
 const a=PRJ.toJSON(); newState(); PRJ.fromJSON(a);
 eq(S.tables[0].kind,"sym","النوعُ يبقى"); eq(S.tables[0].lay,"A-ELEC","والنطاق");
 eq(PRJ.toJSON(),a,"حفظٌ ⇐ فتحٌ ⇐ حفظ: النصُّ نفسُه");
 const j=JSON.parse(a); j.tables[0].lay=42; j.tables.push(Object.assign({},j.tables[0],{id:"TB99",kind:"open",lay:"A-ELEC"}));
 newState(); PRJ.fromJSON(JSON.stringify(j));
 ok(S.tables[0].lay===undefined,"نطاقٌ غيرُ نصّيٍّ يُحذَف");
 ok(S.tables[1].lay===undefined,"ونطاقٌ على جدولٍ غيرِ المفتاح يُحذَف");
});
group("الأداة: «جدول» بنوع «مفتاح الرموز» ونطاقه",()=>{
 scene0();
 R.toolList().forEach(d=>rig.defs(d.id));
 R.setOpt("table","kind","sym"); R.setOpt("table","lay","A-ELEC");
 R.begin("table"); rig.at(30000,20000); rig.enter();
 const t=S.tables[S.tables.length-1];
 eq(t&&t.kind,"sym","وُضع مفتاحُ الرموز"); eq(t&&t.lay,"A-ELEC","بنطاقه");
 ok(rig.said(/2 صفّاً/),"والرسالةُ تذكر عددَ صفوفه");
 R.setOpt("table","kind","open"); R.setOpt("table","lay","");
});

/* ═══ الطباعة ═══ ما يُصدَّر هو ما يُطبَع — والمفتاحُ فيه بأيقوناته */
await groupAsync("الطباعة: DXF يحمل المفتاحَ بأيقوناته على طبقاتها",async()=>{
 scene0(); put();
 const r=await EX.run("dxf",{});
 ok(r.ok===1,"التصدير نجح");
 /* DXF بترميز CP1256 (كما يقرؤه AutoCAD العربيّ) — فيُبحَث بالبايتات */
 const CP=await import("../io/cp1256.js");
 const buf=Buffer.from(r.raw||[]), txt=buf.toString("latin1").replace(/\r/g,"");
 const hasTxt=s=>buf.indexOf(Buffer.from(CP.encode(s).bytes))>=0;
 ok(hasTxt("مفتاح الرموز"),"العنوان");
 ok(hasTxt("فيشة عادية")&&hasTxt("سرير مفرد"),"والأسماء");
 const ELEC=(txt.match(/\n8\nA-ELEC\n/g)||[]).length;
 scene0(); const r0=await EX.run("dxf",{});
 const ELEC0=(Buffer.from(r0.raw||[]).toString("latin1").replace(/\r/g,"").match(/\n8\nA-ELEC\n/g)||[]).length;
 ok(ELEC>ELEC0,`وأيقوناتُ الكهرباء كياناتٌ إضافيةٌ على A-ELEC (${ELEC0} ⇐ ${ELEC})`);
});
await groupAsync("الطباعة: SVG يحمل المفتاح، وطبقةٌ أُوقِف طبعُها تخرج منه",async()=>{
 scene0(); put();
 let s=String((await EX.run("svg",{})).raw||"");
 const n1=(s.match(/مفتاح مفرد|فيشة عادية/g)||[]).length;
 ok(/مفتاح الرموز/.test(s),"العنوانُ في SVG"); ok(n1>=2,"وصفّا الكهرباء");
 LY.setLay("A-ELEC","plot",0); RN.invalidate();
 s=String((await EX.run("svg",{})).raw||"");
 ok(!/مفتاح مفرد|فيشة عادية/.test(s),"أُوقِف طبعُ الكهرباء ⇐ لا صفوفَ لها في المطبوع");
 ok(/سرير مفرد/.test(s),"ويبقى السرير");
 LY.setLay("A-ELEC","plot",1);
});
await groupAsync("الطباعة: PDF — المفتاحُ داخل حدود الصفحة ويُكتَب فيها",async()=>{
 scene0(); const r0=await EX.run("pdf",{});
 const t=put();
 const pl=EX.plan("pdf"), b=pl.box, P=T.tblPoly(t);
 ok(!!b&&P.every(([x,y])=>x>=b.x0-1&&x<=b.x1+1&&y>=b.y0-1&&y<=b.y1+1),
  "حدودُ الطباعة تحيط بالمفتاح كلِّه — لا يُقَصّ من الورقة");
 const P2=(pl.P||SC()).filter(g=>g.tid===t.id);
 ok(P2.some(g=>g.L==="A-ELEC")&&P2.some(g=>g.t==="text"),"وأوّلياتُه في ما يُرسَل للكاتب: نصٌّ وأيقونات");
 const r=await EX.run("pdf",{});
 ok(r0.ok===1&&r.ok===1,"وPDF يُبنى"+(r.ok?"":": "+((r.report||[])[0]||{}).s));
 const sz=x=>x.size||(x.raw&&(x.raw.length||x.raw.byteLength))||0;
 ok(sz(r)>sz(r0),`والملفُّ أكبر بالمفتاح (${sz(r0)} ⇐ ${sz(r)} بايت) — كُتِب فعلاً`);
});
process.exit(summary()?1:0);
