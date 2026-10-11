/* ═══ اختبار الأدوات الحقيقي — كل أداة مسجَّلة في registry ═══
   جدولٌ واحد: أداة ← مدخلات (R.begin ثم feedText/feedPoint/enter) ←
   نتيجة متوقَّعة (عدد الكيانات ونوعها وأبعادها). لكل أداة على مشروعٍ جديد:
     أ) الحالة تتغيّر كما يجب، وجلسة الأداة = خطوة تاريخ واحدة
     ب) undo() يُعيد الحالة بايتاً ببايت
     ج) المدخل الخاطئ يُرفَض بلا نصف تنفيذ (اللقطة والتاريخ كما كانا)
   والأدوات التي تحتاج DOM (تصدير/استيراد/نوافذ) تُختبر على مستوى استدعاء
   الفعل فقط وتُوسَم «مؤجَّل للمتصفّح».

   المتوقَّع مشتقٌّ من العقد المعلن (الخيارات الافتراضية · النصوص المساعدة ·
   docs/tools.md) لا من مخرجات الشيفرة. وما كان افتراضاً غير مؤكَّد فحقلُه
   assume يظهر في الملاحظات.

   التشغيل:   node js/tests/tools-real.test.js [--table]
   البيئة:    TOOLS_REAL_JSON=path  يكتب نتائج كل أداة JSON.                */
import {shim,shimCanvas,shimDOM,toolRig,group,groupAsync,ok,eq,near,deep,
        stats,summary} from "./harness.js";
import {writeFileSync} from "node:fs";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv");
 DOC.body.appendChild(cv);}
if(!globalThis.window)
 globalThis.window={prompt:()=>null,confirm:()=>true};

const {S,COLLS,newState,ensureShape,undo,historyTimeline,clearHistory,
       edit,touchGeom}=await import("../core/state.js");
const W =await import("../core/walls.js");
const O =await import("../core/opens.js");
const D =await import("../core/dims.js");
const RN=await import("../core/render.js");
const EN=await import("../core/ents.js");
const RF=await import("../core/ref.js");
const MC=await import("../core/macros.js");
for(const f of ["draw","sketch","openings","parts","roof","areas","modify",
 "annotate","ref","boq","boqreport","elev","section","sheet","clouds",
 "groups","macros"])await import(`../tools/${f}.js`);
for(const f of ["hygiene","gate","levelManager","appcmds","viewcmds",
 "blockpanel"])await import(`../ui/${f}.js`);
const R=await import("../tools/registry.js");

const rig=toolRig(R,{hit:(x,y)=>EN.hitTest(x,y,150),
 invalidate:()=>RN.invalidate()});
R.H.del=()=>edit(()=>EN.delEnts(rig.sel.slice()),"حذف");

/* ═══ أدوات مساعدة ═══ */
const steps=()=>historyTimeline().current;
const snap=()=>JSON.stringify(S,(k,v)=>
 (k==="meta"||k==="__ver")?undefined:v);
const fresh=()=>{
 newState(); ensureShape(); RN.invalidate();
 rig.pick([]); rig.clear();
 if(R.active())R.cancel(true);
 R.toolList().forEach(d=>rig.defs(d.id));
};
const end=()=>{if(R.active())rig.esc()};
const P=(x,y)=>rig.at(x,y);
const TX=s=>rig.type(s);
const opt=(id,k,v)=>R.setOpt(id,k,v);
const hw=(x1,y1,x2,y2,t,ty)=>
 W.addWall([x1,y1],[x2,y2],t||200,ty||"int","c");
const room=(w,h,t)=>{
 const Q=[[0,0],[w,0],[w,h],[0,h]];
 for(let i=0;i<4;i++)W.addWall(Q[i],Q[(i+1)%4],t||250,"ext","c");
 RN.invalidate();
};
const selW=(...ws)=>rig.pick(ws.map(w=>({k:"wall",id:w.id})));
const len=w=>Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);
const xy=e=>e.p||e.pos||[e.x,e.y];
const dflt=(id,k)=>{
 const f=R.findTool(id).opts.find(o=>o.k===k);
 return Math.round(parseFloat(f.def)*1000);
};
const shoelace=r=>Math.abs(r.reduce((s,p,i)=>{
 const q=r[(i+1)%r.length]; return s+p[0]*q[1]-q[0]*p[1]},0))/2;
const has=(w,x,y,t)=>[w.a,w.b].some(p=>
 Math.hypot(p[0]-x,p[1]-y)<=(t||2));
const sayAny=(re)=>rig.log.some(x=>re.test(x.s));
const bad=()=>rig.log.some(x=>x.c==="er"||x.c==="wr");
const axesPrep=()=>{
 opt("axis","dir","x"); R.begin("axis"); P(0,0); P(4000,0); end();
 opt("axis","dir","y"); R.begin("axis"); P(0,0); P(0,3000); end();
};
const sketchRect=()=>{
 const o=[]; const Q=[[0,0],[5000,0],[5000,4000],[0,4000],[0,0]];
 for(let i=0;i<4;i++){
  const a=Q[i], b=Q[i+1], n=50;
  for(let k=0;k<n;k++)
   o.push([a[0]+(b[0]-a[0])*k/n, a[1]+(b[1]-a[1])*k/n]);
 }
 o.push([0,0]); return o;
};
const refPrep=()=>{RF.setRef({ents:[{t:"l",a:[0,0],b:[1000,0]},
 {t:"l",a:[1000,0],b:[1000,1000]}]},"test"); ensureShape()};

/* ═══ الجدول ═══
   in  : المدخلات · exp: المتوقَّع · prep: تهيئة المشروع الجديد
   go  : تنفيذ الأداة · check: التحقق (أ) · bad/badPrep/badSay: (ج)
   readonly: لا تغيّر الحالة ولا تدفع تاريخاً · defer: يحتاج DOM      */
const CASES=[];
const C=(id,o)=>CASES.push(Object.assign({id},o));

/* ── الرسم ── */
C("wall",{
 in:"begin wall · (0,0) · (4000,0) · Esc",
 exp:"1 جدار a=(0,0) b=(4000,0) t=0.15م type=int align=c",
 go(){R.begin("wall"); P(0,0); P(4000,0)},
 check(){
  eq(S.walls.length,1,"جدارٌ واحد");
  const w=S.walls[0];
  deep([w.a,w.b],[[0,0],[4000,0]],"النهايتان");
  eq(w.t,dflt("wall","t"),"السماكة الافتراضية");
  eq(w.type,"int","النوع"); eq(w.align,"c","المحاذاة");
 },
 bad(){R.begin("wall"); P(0,0); P(0,0); TX("abc"); TX("c")},
});
C("arcwall",{
 in:"(0,0) · (4000,0) · (2000,1000)",
 exp:"1 جدار قوسيّ نصف قطره 2.5م (وتر 4م وسهم 1م)",
 go(){R.begin("arcwall"); P(0,0); P(4000,0); P(2000,1000)},
 check(){
  eq(S.walls.length,1,"جدارٌ واحد");
  const w=S.walls[0];
  ok(!!w.bulge,"له انحناء");
  const A=W.arcParams(w);
  near(A&&A.R,2500,5,"نصف القطر 2.5م");
 },
 bad(){R.begin("arcwall"); P(0,0); P(4000,0); P(2000,0)},
});
C("rect",{
 in:"(0,0) · (4000,3000)",
 exp:"4 جدران t=0.25 ext، محيط 14م",
 go(){R.begin("rect"); P(0,0); P(4000,3000)},
 check(){
  eq(S.walls.length,4,"أربعة جدران");
  ok(S.walls.every(w=>w.t===250&&w.type==="ext"),"سماكة ونوع");
  near(S.walls.reduce((s,w)=>s+len(w),0),14000,2,"المحيط 14م");
 },
 bad(){R.begin("rect"); P(0,0); P(0,0)},
});
C("measure",{
 in:"(0,0) · (3000,4000) · Enter",
 exp:"لا كيان ولا تاريخ؛ تقرير يذكر 5.00م",
 readonly:1,
 go(){R.begin("measure"); P(0,0); P(3000,4000); rig.enter()},
 check(){ok(sayAny(/5\.0/),"المسافة 5م في التقرير")},
 bad(){R.begin("measure"); TX("zzz")},
});
C("pline",{
 in:"(0,0) · (3000,0) · (3000,2000) · Enter",
 exp:"1 خطّ متعدّد 3 نقاط مفتوح",
 go(){R.begin("pline"); P(0,0); P(3000,0); P(3000,2000); rig.enter()},
 check(){
  eq(S.plines.length,1,"خطٌّ واحد");
  const p=S.plines[0], q=p.pts||p.p||p.points;
  eq(q.length,3,"ثلاث نقاط");
 },
 bad(){R.begin("pline"); rig.enter(); TX("zzz")},
});
C("sketch",{
 in:"ضربة مستطيل 5×4م ثم Enter مرّتين",
 exp:"4–8 جدران، إطارها ≈ 5×4م",
 go(){R.begin("sketch"); rig.stroke(sketchRect()); rig.enter(); rig.enter()},
 check(){
  const n=S.walls.length;
  ok(n>=4&&n<=8,`جدران الرسم (${n})`);
  const xs=S.walls.flatMap(w=>[w.a[0],w.b[0]]);
  const ys=S.walls.flatMap(w=>[w.a[1],w.b[1]]);
  near(Math.max(...xs)-Math.min(...xs),5000,300,"العرض");
  near(Math.max(...ys)-Math.min(...ys),4000,300,"الارتفاع");
 },
 bad(){R.begin("sketch"); rig.enter()},
});

/* ── الفتحات ── */
[["door","door"],["win","window"],["fixed","fixed"],["opening","opening"],
 ["arch","arch"],["niche","niche"]].forEach(([id,kind])=>{
 C(id,{
  in:`جدار 5م · نقرة (2500,0) · Esc`,
  exp:`1 فتحة ${kind} بمقاس الخيارات الافتراضية عند 2.5م`,
  prep(){hw(0,0,5000,0); RN.invalidate()},
  go(){R.begin(id); P(2500,0)},
  check(){
   eq(S.opens.length,1,"فتحةٌ واحدة");
   const o=S.opens[0];
   eq(o.kind,kind,"النوع");
   eq(o.w,dflt(id,"w"),"العرض"); eq(o.h,dflt(id,"h"),"الارتفاع");
   eq(o.sill,dflt(id,"sill"),"الجلسة");
   near(o.s,2500,2,"الموضع");
   eq(o.wall,S.walls[0].id,"على الجدار");
   if(id==="niche")eq(o.dep,dflt(id,"dep"),"العمق");
  },
  bad(){
   R.begin(id); P(2500,3000);
   opt(id,"w","6"); P(2500,0);
  },
 });
});

/* ── الأعمدة والأدوات الصحية ── */
C("col",{
 in:"(1000,1000) · Enter",
 exp:"1 عمود rect 0.3×0.3 conc مركزه (1000,1000)",
 go(){R.begin("col"); P(1000,1000); rig.enter()},
 check(){
  eq(S.cols.length,1,"عمودٌ واحد");
  const c=S.cols[0];
  eq(c.kind,"rect","الشكل"); eq(c.type,"conc","المادة");
  eq(c.w,300,"العرض"); eq(c.h,300,"العمق");
  deep([c.x,c.y],[1000,1000],"المركز");
 },
 bad(){R.begin("col"); TX("zz"); TX("w=abc")},
});
C("col-dup",{
 tool:"col",
 in:"عمود قائم ثم نقرة على مركزه نفسه",
 exp:"الثاني مرفوض، يبقى عمودٌ واحد",
 skipA:1,
 badPrep(){R.begin("col"); P(1000,1000); rig.enter()},
 bad(){R.begin("col"); P(1000,1000); rig.enter()},
});
Object.entries({wc:"wc",lav:"lav",shower:"shower",tub:"tub",sink:"sink",
 bidet:"bidet",ur:"ur",wm:"wm",fd:"fd"}).forEach(([id])=>{
 C(id,{
  in:"(2000,2000) بلا جدار قريب · Enter",
  exp:"1 أداة صحية بمقاس الخيارات الافتراضية في (2000,2000)",
  go(){R.begin(id); P(2000,2000); rig.enter()},
  check(){
   eq(S.fixt.length,1,"أداةٌ واحدة");
   const f=S.fixt[0];
   eq(f.w,dflt(id,"w"),"العرض"); eq(f.d,dflt(id,"d"),"العمق");
   deep(xy(f).map(Math.round),[2000,2000],"الموضع");
  },
  bad(){R.begin(id); TX("zz"); TX("w=abc")},
 });
});
C("gridcols",{
 in:"محوران رأسيان (0,4000) وأفقيان (0,3000) ثم gridcols",
 exp:"4 أعمدة 0.4×0.4 على التقاطعات",
 prep:axesPrep,
 go(){R.begin("gridcols")},
 check(){
  eq(S.cols.length,4,"أربعة أعمدة");
  const at=new Set(S.cols.map(c=>c.x+","+c.y));
  ["0,0","4000,0","0,3000","4000,3000"].forEach(k=>
   ok(at.has(k),`عمود عند ${k}`));
  ok(S.cols.every(c=>c.w===400&&c.h===400),"0.4×0.4");
 },
 badPrep(){},
 bad(){R.begin("gridcols")},
 badSay:/تحتاج محوراً/,
});
C("stair",{
 in:"(0,0) · (0,4000)",
 exp:"1 درج مستقيم عرض 1.1م و16 قائمة",
 go(){R.begin("stair"); P(0,0); P(0,4000)},
 check(){
  eq(S.stairs.length,1,"درجٌ واحد");
  near(S.stairs[0].w,1100,1,"العرض");
  ok(/"n":16\b/.test(JSON.stringify(S.stairs[0])),"16 درجة");
 },
 bad(){R.begin("stair"); P(0,0); P(0,10)},
});
C("stairl",{
 in:"(0,0) · (0,2000) · (1500,2000)",
 exp:"1 درج بشكل L",
 go(){R.begin("stairl"); P(0,0); P(0,2000); P(1500,2000)},
 check(){eq(S.stairs.length,1,"درجٌ واحد");
  near(S.stairs[0].w,1100,1,"العرض")},
 bad(){R.begin("stairl"); P(0,0); P(0,10); P(10,10)},
});
C("stairu",{
 in:"(0,0) · (0,2000) · (1500,2000) · (1500,0)",
 exp:"1 درج بشكل U",
 go(){R.begin("stairu"); P(0,0); P(0,2000); P(1500,2000); P(1500,0)},
 check(){eq(S.stairs.length,1,"درجٌ واحد");
  near(S.stairs[0].w,1100,1,"العرض")},
 bad(){R.begin("stairu"); P(0,0); P(0,10); P(10,10); P(10,0)},
});
C("roof",{
 in:"4 نقاط 6×4م · Enter",
 exp:"1 سقف flat ميل 5٪ حلقته 4 نقاط",
 go(){R.begin("roof"); P(0,0); P(6000,0); P(6000,4000); P(0,4000);
  rig.enter()},
 check(){
  eq(S.roofs.length,1,"سقفٌ واحد");
  const r=S.roofs[0];
  eq(r.type,"flat","النوع"); eq(r.slope,5,"الميل");
  near(shoelace(r.ring||r.pts),24e6,10,"المساحة 24م²");
 },
 bad(){R.begin("roof"); P(0,0); P(1000,0); rig.enter()},
});
C("area",{
 in:"غرفة 4×3م (t=0.25) · نقرة داخلها (2000,1500) · Enter",
 exp:"1 منطقة مساحتها الصافية 10.3125م² (3.75×2.75)",
 prep(){room(4000,3000,250)},
 go(){R.begin("area"); P(2000,1500); rig.enter()},
 check(){
  eq(S.areas.length,1,"منطقةٌ واحدة");
  near(shoelace(S.areas[0].ring),10312500,20000,"10.3125م²");
 },
 bad(){R.begin("area"); P(9000,9000)},
});
C("arearef",{
 in:"غرفة + منطقة، ثم تكبير سماكة جدار، ثم arearef",
 exp:"المنطقة القديمة تُعاد ≈ 10.03م² في خطوة واحدة",
 assume:"touchGeom تجعل المنطقة قديمة",
 prep(){
  room(4000,3000,250);
  R.begin("area"); P(2000,1500); rig.enter(); end();
  S.walls[0].t=400; touchGeom(); RN.invalidate();
 },
 go(){R.begin("arearef")},
 check(){
  near(shoelace(S.areas[0].ring),10031250,20000,"أُعيد الخبز");
 },
 badPrep(){room(4000,3000,250)},
 bad(){R.begin("arearef")},
 badSay:/لا منطقة/,
});

/* ── التعديل ── */
C("move",{
 in:"جدار محدَّد · (0,0) · (0,1000)",
 exp:"الجدار a=(0,1000) b=(5000,1000)",
 prep(){selW(hw(0,0,5000,0))},
 go(){R.begin("move"); P(0,0); P(0,1000)},
 check(){deep([S.walls[0].a,S.walls[0].b],[[0,1000],[5000,1000]],
  "الإزاحة")},
 badPrep(){hw(0,0,5000,0)},
 bad(){R.begin("move"); P(0,0); P(0,1000)},
});
C("copy",{
 in:"جدار وبابه محدَّدان · (0,0) · (0,1000) · Esc",
 exp:"جداران وبابان، الثاني عند y=1000",
 prep(){const w=hw(0,0,5000,0); O.addOpen(w,2500,"door",900,2100,0);
  RN.invalidate(); selW(w)},
 go(){R.begin("copy"); P(0,0); P(0,1000)},
 check(){
  eq(S.walls.length,2,"جداران"); eq(S.opens.length,2,"بابان");
  ok(S.walls.some(w=>w.a[1]===1000&&w.b[1]===1000),"نسخة y=1000");
 },
 badPrep(){hw(0,0,5000,0)},
 bad(){R.begin("copy"); P(0,0); P(0,1000)},
});
C("rotate",{
 in:"جدار (1000,0)-(5000,0) · مركز (0,0) · زاوية 90",
 exp:"الطول 4م محفوظ والاتجاه عموديّ على الأصل",
 prep(){selW(hw(1000,0,5000,0))},
 go(){R.begin("rotate"); P(0,0); TX("90")},
 check(){
  const w=S.walls[0];
  near(len(w),4000,1,"الطول");
  near(w.b[0]-w.a[0],0,2,"عموديّ");
  near(Math.hypot(w.a[0],w.a[1]),1000,2,"بُعد البداية عن المركز");
 },
 badPrep(){selW(hw(1000,0,5000,0))},
 bad(){R.begin("rotate"); P(0,0); TX("abc")},
});
C("mirror",{
 in:"جدار (1000,500)-(4000,500) · محور (0,0)-(1000,0)",
 exp:"جداران، النسخة المرآتية عند y=-500",
 prep(){selW(hw(1000,500,4000,500))},
 go(){R.begin("mirror"); P(0,0); P(1000,0)},
 check(){
  eq(S.walls.length,2,"جداران");
  ok(S.walls.some(w=>w.a[1]===-500&&w.b[1]===-500),"y=-500");
 },
 badPrep(){selW(hw(1000,500,4000,500))},
 bad(){R.begin("mirror"); P(0,0); P(0,0)},
});
C("offset",{
 in:"جدار 5م · نقرة عليه · نقرة الجهة (2500,1000) بمسافة 1م",
 exp:"جداران، الجديد عند y=1000 وطوله 5م",
 prep(){hw(0,0,5000,0); RN.invalidate()},
 go(){R.begin("offset"); P(2500,0); P(2500,1000)},
 check(){
  eq(S.walls.length,2,"جداران");
  ok(S.walls.some(w=>Math.abs(w.a[1]-1000)<2&&Math.abs(w.b[1]-1000)<2
   &&Math.abs(len(w)-5000)<2),"الإزاحة 1م");
 },
 bad(){R.begin("offset"); P(2500,3000)},
});
C("break",{
 in:"جدار 5م · نقرة عليه · نقطة القطع (2000,0)",
 exp:"جداران بطولَي 2م و3م",
 prep(){hw(0,0,5000,0); RN.invalidate()},
 go(){R.begin("break"); P(2500,0); P(2000,0)},
 check(){
  eq(S.walls.length,2,"جداران");
  deep(S.walls.map(len).map(Math.round).sort((a,b)=>a-b),[2000,3000],
   "الطولان");
 },
 bad(){R.begin("break"); P(2500,3000)},
});
C("trim",{
 in:"حدّ أفقيّ A، جدار عموديّ B يعبره · حدّ ثم Enter ثم الجزء السفليّ",
 exp:"B يُقصّ عند A: طوله 1م ونهايته (2000,0)",
 prep(){hw(0,0,4000,0); hw(2000,-1000,2000,1000); RN.invalidate()},
 go(){R.begin("trim"); P(500,0); rig.enter(); P(2000,-500)},
 check(){
  eq(S.walls.length,2,"جداران");
  ok(S.walls.some(w=>Math.abs(len(w)-1000)<2&&has(w,2000,0)),
   "B مقصوص");
 },
 bad(){R.begin("trim"); rig.enter()},
});
C("extend",{
 in:"حدّ أفقيّ A، جدار قصير B (2000,500)-(2000,2000) · حدّ ثم Enter ثم طرف B",
 exp:"B يمتدّ إلى A: طوله 2م وله طرف (2000,0)",
 prep(){hw(0,0,4000,0); hw(2000,500,2000,2000); RN.invalidate()},
 go(){R.begin("extend"); P(500,0); rig.enter(); P(2000,600)},
 check(){
  ok(S.walls.some(w=>Math.abs(len(w)-2000)<2&&has(w,2000,0)),
   "B ممدَّد");
 },
 badPrep(){hw(0,0,4000,0); hw(0,1000,4000,1000); RN.invalidate()},
 bad(){R.begin("extend"); P(500,0); rig.enter(); P(3900,1000)},
});
C("stretch",{
 in:"جدار 4م · إطار حول b · أساس (4000,0) · وجهة (5000,0)",
 exp:"b=(5000,0) وa كما هو",
 prep(){hw(0,0,4000,0); RN.invalidate()},
 go(){R.begin("stretch"); P(3500,-500); P(4500,500); P(4000,0); P(5000,0)},
 check(){deep([S.walls[0].a,S.walls[0].b],[[0,0],[5000,0]],"الشدّ")},
 bad(){R.begin("stretch"); P(8000,8000); P(9000,9000); P(4000,0);
  P(5000,0)},
});
C("weld",{
 in:"جداران على استقامة بينهما 10مم محدَّدان · Enter",
 exp:"نهايتاهما تتطابقان (فجوة ≤1مم)",
 prep(){const a=hw(0,0,3000,0), b=hw(3010,0,6000,0); RN.invalidate();
  selW(a,b)},
 go(){R.begin("weld"); rig.enter()},
 check(){
  const [a,b]=S.walls;
  ok(Math.hypot(a.b[0]-b.a[0],a.b[1]-b.a[1])<=1,"الفجوة انطبقت");
 },
 badPrep(){const a=hw(0,0,3000,0), b=hw(9000,0,12000,0); RN.invalidate();
  selW(a,b)},
 bad(){R.begin("weld"); rig.enter()},
 badSay:/لا طرف يحتاج لحماً/,
});
C("chamfer",{
 in:"جداران متعامدان من (0,0) · نقرة على كلٍّ · Enter · d=0.5م",
 exp:"3 جدران: قطريّ طوله ≈707مم، والأصليان يبدآن عند 500",
 assume:"النقر على جهة الجدار المُبقاة",
 prep(){hw(0,0,4000,0); hw(0,0,0,4000); RN.invalidate()},
 go(){R.begin("chamfer"); P(2000,0); P(0,2000); rig.enter()},
 check(){
  eq(S.walls.length,3,"ثلاثة جدران");
  ok(S.walls.some(w=>Math.abs(len(w)-707.1)<3),"قطريّ 707");
 },
 badPrep(){hw(0,0,4000,0); hw(0,3000,4000,3000); RN.invalidate()},
 bad(){R.begin("chamfer"); P(2000,0); P(2000,3000); rig.enter()},
});
C("array",{
 in:"جدار محدَّد · أساس (0,0) · ركن الخلية (6000,1000) · nx=3 ny=1",
 exp:"3 جدران عند x=0/6000/12000",
 prep(){selW(hw(0,0,4000,0))},
 go(){R.begin("array"); P(0,0); P(6000,1000)},
 check(){
  eq(S.walls.length,3,"ثلاثة جدران");
  deep(S.walls.map(w=>w.a[0]).sort((a,b)=>a-b),[0,6000,12000],
   "الإزاحات");
 },
 badPrep(){selW(hw(0,0,4000,0))},
 bad(){R.begin("array"); P(0,0); P(0,0)},
});
C("arraypolar",{
 in:"جدار محدَّد · مركز (0,0) · n=6 · 360°",
 exp:"6 جدران (الأصل + 5 نسخ)",
 assume:"n = مجموع العناصر شاملاً الأصل (عُرف AutoCAD)",
 prep(){selW(hw(2000,0,3000,0))},
 go(){R.begin("arraypolar"); P(0,0)},
 check(){eq(S.walls.length,6,"ستة جدران")},
 badPrep(){hw(2000,0,3000,0)},
 bad(){R.begin("arraypolar"); P(0,0)},
});
C("match",{
 in:"مصدر t=0.25 · هدف t=0.15 · Enter",
 exp:"سماكة الهدف تصير 250",
 prep(){hw(0,0,4000,0,250,"ext"); hw(0,2000,4000,2000,150,"int");
  RN.invalidate()},
 go(){R.begin("match"); P(2000,0); P(2000,2000); rig.enter()},
 check(){eq(S.walls[1].t,250,"سماكة الهدف")},
 bad(){R.begin("match"); P(9000,9000)},
});
C("divide",{
 in:"جدار 6م · نقرة عليه · n=2",
 exp:"جداران بطول 3م",
 prep(){hw(0,0,6000,0); RN.invalidate()},
 go(){R.begin("divide"); P(3000,0)},
 check(){
  eq(S.walls.length,2,"جداران");
  ok(S.walls.every(w=>Math.abs(len(w)-3000)<2),"3م لكلٍّ");
 },
 bad(){R.begin("divide"); P(9000,9000)},
});
C("sel",{
 in:"معرّف الجدار W · Enter",
 exp:"التحديد = [{wall,W}] بلا تغيير حالة",
 readonly:1,
 prep(){hw(0,0,4000,0); RN.invalidate()},
 go(){R.begin("sel"); TX(S.walls[0].id); rig.enter()},
 check(){deep(rig.sel,[{k:"wall",id:S.walls[0].id}],"التحديد")},
 bad(){R.begin("sel"); TX("ZZ99")},
});
C("del",{
 in:"جدار محدَّد · del",
 exp:"لا جدران",
 prep(){selW(hw(0,0,4000,0))},
 go(){R.begin("del")},
 check(){eq(S.walls.length,0,"حُذف")},
 badPrep(){hw(0,0,4000,0)},
 bad(){R.begin("del")},
});

/* ── التأشير ── */
C("dim",{
 in:"(0,0) · (4000,0) · موضع (2000,500)",
 exp:"1 بُعد أفقي قيمته 4000",
 go(){R.begin("dim"); P(0,0); P(4000,0); P(2000,500)},
 check(){
  eq(S.dims.length,1,"بُعدٌ واحد");
  eq(S.dims[0].kind,"h","أفقي");
  near(D.dimValue(S.dims[0]),4000,1,"القيمة");
 },
 bad(){R.begin("dim"); P(0,0); P(0,0); P(0,500)},
});
C("chain",{
 in:"vals=«3 2.5 4» · (0,0) · (0,1000)",
 exp:"1 سلسلة مجموعها 9.5م",
 go(){opt("chain","vals","3 2.5 4"); R.begin("chain"); P(0,0); P(0,1000)},
 check(){
  eq(S.chains.length,1,"سلسلةٌ واحدة");
  const c=S.chains[0];
  near(D.chainSum?D.chainSum(c):c.vals.reduce((s,v)=>s+v,0),9500,1,
   "المجموع");
 },
 bad(){opt("chain","vals","abc"); R.begin("chain")},
});
C("roomdim",{
 in:"غرفة 4×3م (t=0.25) · نقرة داخلها · Enter",
 exp:"بُعدان صافيان 3750 و2750 ونصّ الوسم",
 prep(){room(4000,3000,250)},
 go(){R.begin("roomdim"); P(2000,1500); rig.enter()},
 check(){
  const v=S.dims.map(d=>Math.round(D.dimValue(d)));
  ok(v.some(x=>Math.abs(x-3750)<=2),"3750");
  ok(v.some(x=>Math.abs(x-2750)<=2),"2750");
  ok(S.anno.length>=1,"وسم الغرفة");
 },
 bad(){R.begin("roomdim"); P(9000,9000)},
});
C("text",{
 in:"s=«مرحبا» · (1000,1000) · Enter",
 exp:"1 نصّ «مرحبا» عند (1000,1000)",
 go(){opt("text","s","مرحبا"); R.begin("text"); P(1000,1000); rig.enter()},
 check(){
  eq(S.anno.length,1,"نصٌّ واحد");
  eq(S.anno[0].s,"مرحبا","المحتوى");
  deep(xy(S.anno[0]).map(Math.round),[1000,1000],"الموضع");
 },
 bad(){R.begin("text"); P(1000,1000)},
 assume:"نصّ فارغ (الافتراضي) لا يُنشأ",
});
C("lead",{
 in:"s=«ملاحظة» · (0,0) · (1000,1000) · (2000,1000) · Enter",
 exp:"1 قائد بثلاث نقاط",
 go(){opt("lead","s","ملاحظة"); R.begin("lead"); P(0,0); P(1000,1000);
  P(2000,1000); rig.enter()},
 check(){
  eq(S.anno.length,1,"قائدٌ واحد");
  eq(S.anno[0].s,"ملاحظة","النصّ");
  eq((S.anno[0].pts||S.anno[0].p).length,3,"ثلاث نقاط");
 },
 bad(){R.begin("lead"); P(0,0); rig.enter()},
});
C("level",{
 in:"z=3.2 · (500,500) · Enter",
 exp:"1 منسوب z=3200مم",
 go(){opt("level","z","3.2"); R.begin("level"); P(500,500); rig.enter()},
 check(){
  eq(S.anno.length,1,"منسوبٌ واحد");
  near(S.anno[0].z,3200,1,"القيمة");
 },
 bad(){opt("level","z","abc"); R.begin("level"); P(500,500)},
});
C("livetext",{
 in:"src=meta:scale · (0,0) · Enter",
 exp:"1 حقل حيّ",
 go(){R.begin("livetext"); P(0,0); rig.enter()},
 check(){eq(S.livefields.length,1,"حقلٌ واحد")},
 bad(){R.begin("livetext"); TX("zz")},
});
C("axis",{
 in:"dir=x · (500,0) · Enter",
 exp:"محور رأسيّ واحد عند x=500",
 go(){R.begin("axis"); P(500,0); rig.enter()},
 check(){deep(S.grid.xs,[500],"المحور الرأسي")},
 bad(){R.begin("axis"); TX("zz")},
});
C("dimrad",{
 in:"مركز (0,0) · نقطة القوس (1000,0) · نصّ (1500,800)",
 exp:"1 بُعد نصف قطر = 1000",
 go(){R.begin("dimrad"); P(0,0); P(1000,0); P(1500,800)},
 check(){eq(S.dims.length,1,"بُعدٌ واحد");
  near(D.dimValue(S.dims[0]),1000,1,"نصف القطر")},
 bad(){R.begin("dimrad"); P(0,0); P(0,0)},
});
C("dimdia",{
 in:"مركز (0,0) · نقطة المحيط (1000,0) · نصّ (1500,800)",
 exp:"1 بُعد قطر = 2000",
 go(){R.begin("dimdia"); P(0,0); P(1000,0); P(1500,800)},
 check(){eq(S.dims.length,1,"بُعدٌ واحد");
  near(D.dimValue(S.dims[0]),2000,1,"القطر")},
 bad(){R.begin("dimdia"); P(0,0); P(0,0)},
});
C("dimang",{
 in:"رأس (0,0) · (1000,0) · (0,1000)",
 exp:"1 بُعد زاوي = 90°",
 assume:"القيمة بالدرجات أو الراديان",
 go(){R.begin("dimang"); P(0,0); P(1000,0); P(0,1000)},
 check(){
  eq(S.dims.length,1,"بُعدٌ واحد");
  const v=D.dimValue(S.dims[0]);
  ok(Math.abs(v-90)<0.5||Math.abs(v-Math.PI/2)<0.01,`90° (${v})`);
 },
 bad(){R.begin("dimang"); P(0,0); P(1000,0); P(2000,0)},
});

C("chaincmp",{
 in:"جداران عقدهما 0/3000/5000 · سلسلة «3 2» · تحديدها · chaincmp",
 exp:"تقرير «كل الحدود مطابقة» بلا تغيير حالة",
 readonly:1,
 prep(){
  hw(0,0,3000,0); hw(3000,0,5000,0); RN.invalidate();
  opt("chain","vals","3 2"); R.begin("chain"); P(0,0); P(0,1000); end();
  rig.pick([{k:"chain",id:S.chains[0].id}]);
 },
 go(){R.begin("chaincmp")},
 check(){ok(sayAny(/كل الحدود مطابقة/),"مطابقة")},
 badPrep(){},
 bad(){R.begin("chaincmp")},
 badSay:/حدّد سلسلة/,
});
C("liverefresh",{
 in:"حقل حيّ meta:scale أُفسد نصّه المخزَّن · liverefresh",
 exp:"يُعاد النصّ الصحيح بخطوة واحدة",
 prep(){
  R.begin("livetext"); P(0,0); rig.enter(); end();
  S.livefields[0].cached="STALE"; RN.invalidate();
 },
 go(){R.begin("liverefresh")},
 check(){ok(S.livefields[0].cached!=="STALE","النصّ أُعيد حسابه")},
 badPrep(){},
 bad(){R.begin("liverefresh")},
 badSay:/لا حقول حيّة/,
});

/* ── المرجع ── */
C("refalign",{
 in:"مرجع خطّان · (0,0)(1000,0) → (0,0)(2000,0)",
 exp:"مقياس المرجع ×2 ودوران 0",
 prep:refPrep,
 go(){R.begin("refalign"); P(0,0); P(1000,0); P(0,0); P(2000,0)},
 check(){near(S.ref.tr.k,2,1e-6,"×2"); near(S.ref.tr.rot,0,1e-6,"دوران")},
 badPrep:refPrep,
 bad(){R.begin("refalign"); P(0,0); P(1000,0); P(0,0); P(0,0)},
});
C("refcal",{
 in:"d=2م · (0,0) · (1000,0)",
 exp:"مقياس المرجع ×2",
 prep:refPrep,
 go(){opt("refcal","d","2"); R.begin("refcal"); P(0,0); P(1000,0)},
 check(){near(S.ref.tr.k,2,1e-6,"×2")},
 badPrep:refPrep,
 bad(){R.begin("refcal"); P(0,0); P(0,0)},
});
C("refmove",{
 in:"(0,0) · (500,300)",
 exp:"إزاحة المرجع dx=500 dy=300",
 prep:refPrep,
 go(){R.begin("refmove"); P(0,0); P(500,300)},
 check(){near(S.ref.tr.dx,500,1e-6,"dx"); near(S.ref.tr.dy,300,1e-6,"dy")},
 badPrep:refPrep,
 bad(){R.begin("refmove"); TX("zz")},
});
C("refnone",{
 tool:"refmove",
 in:"refmove بلا مرجع مستورد",
 exp:"رفض مع تنبيه، بلا أثر",
 skipA:1,
 bad(){R.begin("refmove"); P(0,0); P(500,300)},
 badSay:/لا مرجع/,
});

/* ── الحصر والتقارير (save=0: التنزيل مؤجَّل للمتصفّح) ── */
const boqPrep=()=>{
 const w=hw(0,0,5000,0); hw(5000,0,5000,4000); hw(5000,4000,0,4000);
 hw(0,4000,0,0); O.addOpen(w,2500,"door",900,2100,0); RN.invalidate();
};
C("boq",{
 in:"مشروع غرفة وباب · save=0",
 exp:"تقرير كميات بلا تغيير حالة",
 readonly:1, prep:boqPrep,
 go(){opt("boq","save","0"); R.begin("boq")},
 check(){ok(rig.log.some(x=>x.c==="ok"),"سطر الحصيلة")},
 badSay:/فارغ/,
 badPrep(){},
 bad(){opt("boq","save","0"); R.begin("boq")},
});
C("boqlvl",{
 in:"مشروع غرفة وباب · save=0",
 exp:"سطر حصيلة للمستوى بلا تغيير حالة",
 readonly:1, prep:boqPrep,
 go(){opt("boqlvl","save","0"); R.begin("boqlvl")},
 check(){ok(rig.log.some(x=>x.c==="ok"),"سطر الحصيلة")},
 badSay:/لا مستويات|فارغ/,
 badPrep(){},
 bad(){opt("boqlvl","save","0"); R.begin("boqlvl")},
});
C("report",{
 in:"مشروع غرفة وباب · html/csv/pdf=0",
 exp:"لا أثر على الحالة ولا تاريخ",
 readonly:1, prep:boqPrep,
 go(){["html","csv","pdf"].forEach(k=>opt("report",k,"0"));
  R.begin("report")},
 check(){eq(rig.errs().length,0,"بلا أخطاء")},
 badSay:/كل خيارات التنزيل معطّلة/,
 bad(){["html","csv","pdf"].forEach(k=>opt("report",k,"0"));
  R.begin("report")},
});
C("elev",{
 in:"جدران خارجية 4×3م · ELEV S · save=0",
 exp:"لا أثر على الحالة، تقرير النجاح",
 readonly:1,
 prep(){room(4000,3000,250)},
 go(){opt("elev","save","0"); R.begin("elev","S")},
 check(){ok(rig.log.some(x=>x.c==="ok"||x.c==="in"),"تقرير")},
 badPrep(){hw(0,0,4000,0)},
 badSay:/لا جدار خارجيّ/,
 bad(){opt("elev","save","0"); R.begin("elev","S")},
});
C("section",{
 in:"غرفة · خطّ قطع (2000,-500) → (2000,3500)",
 exp:"لا أثر على الحالة ولا تاريخ",
 readonly:1,
 prep(){room(4000,3000,250)},
 go(){R.begin("section"); P(2000,-500); P(2000,3500)},
 check(){ok(rig.log.some(x=>x.c==="ok"),"تقرير المقطع")},
 badPrep(){room(4000,3000,250)},
 bad(){R.begin("section"); P(20000,20000); P(21000,20000)},
});

/* ── الأوراق والمنافذ والتفصيلة ── */
C("vport",{
 in:"(0,0) · (4000,3000)",
 exp:"منفذٌ واحد على الورقة النشطة",
 go(){R.begin("vport"); P(0,0); P(4000,3000)},
 check(){
  const sh=S.sheets.find(x=>x.id===S.activeSheet);
  eq((sh.viewports||[]).length,1,"منفذٌ واحد");
 },
 bad(){R.begin("vport"); P(0,0); P(0,0)},
});
C("detail",{
 in:"منفذان · معرّف المصدر · معرّف الهدف · موضع (1000,1000)",
 exp:"1 وسم تفصيلة في S.callouts",
 prep(){
  R.begin("vport"); P(0,0); P(4000,3000); P(5000,0); P(9000,3000);
  end();
 },
 go(){
  const V=S.sheets.find(x=>x.id===S.activeSheet).viewports;
  R.begin("detail"); TX(V[0].id); TX(V[1].id); P(1000,1000);
 },
 check(){eq(S.callouts.length,1,"وسمٌ واحد")},
 badPrep(){
  R.begin("vport"); P(0,0); P(4000,3000); end();
 },
 bad(){R.begin("detail"); TX("ZZ99")},
});
C("addsheet",{
 in:"addsheet «ورقة اختبار»",
 exp:"ورقةٌ جديدة نشطة",
 go(){const n=(S.sheets||[]).length;
  ctxN=n; R.begin("addsheet","ورقة اختبار")},
 check(){
  eq(S.sheets.length,ctxN+1,"ورقةٌ زائدة");
  eq(S.sheets[S.sheets.length-1].name,"ورقة اختبار","الاسم");
  eq(S.activeSheet,S.sheets[S.sheets.length-1].id,"نشطة");
 },
 skipC:1,
});
let ctxN=0;
C("renamesheet",{
 in:"renamesheet «اسم جديد»",
 exp:"اسم الورقة النشطة يصير «اسم جديد»",
 prep(){R.begin("addsheet","أولى"); end()},
 go(){R.begin("renamesheet","اسم جديد")},
 check(){eq(S.sheets.find(x=>x.id===S.activeSheet).name,"اسم جديد",
  "الاسم")},
 badPrep(){},
 bad(){globalThis.window.prompt=()=>"x"; R.begin("renamesheet")},
});
C("delsheet",{
 in:"ورقتان · delsheet (تأكيد نعم)",
 exp:"ورقةٌ واحدة تبقى",
 prep(){R.begin("addsheet","أولى"); end();
  R.begin("addsheet","ثانية"); end()},
 go(){const n=S.sheets.length; ctxN=n; R.begin("delsheet")},
 check(){eq(S.sheets.length,ctxN-1,"حُذفت واحدة")},
 badPrep(){},
 bad(){R.begin("delsheet")},
});
C("nextsheet",{
 in:"ورقتان · nextsheet",
 exp:"الورقة النشطة تنتقل للتالية",
 prep(){R.begin("addsheet","أولى"); end();
  R.begin("addsheet","ثانية"); end();
  S.activeSheet=S.sheets[0].id},
 go(){R.begin("nextsheet")},
 check(){eq(S.activeSheet,S.sheets[1].id,"الثانية")},
 badPrep(){},
 bad(){R.begin("nextsheet")},
 badNoop:1,
});
C("prevsheet",{
 in:"ورقتان · prevsheet",
 exp:"الورقة النشطة تنتقل للسابقة",
 prep(){R.begin("addsheet","أولى"); end();
  R.begin("addsheet","ثانية"); end()},
 go(){R.begin("prevsheet")},
 check(){eq(S.activeSheet,S.sheets[0].id,"الأولى")},
 badPrep(){},
 bad(){R.begin("prevsheet")},
 badNoop:1,
});

/* ── السحابة والمجموعات ── */
C("cloud",{
 in:"(0,0) · (3000,0) · (3000,2000) · Enter",
 exp:"1 سحابة مراجعة",
 go(){R.begin("cloud"); P(0,0); P(3000,0); P(3000,2000); rig.enter()},
 check(){eq(S.clouds.length,1,"سحابةٌ واحدة");
  near(shoelace(S.clouds[0].ring),3e6,10,"مساحة الحلقة")},
 bad(){R.begin("cloud"); P(0,0); P(1000,0); rig.enter()},
});
C("cloude",{
 in:"منطقة محدَّدة · cloude",
 exp:"1 سحابة حول محيط المنطقة",
 prep(){room(4000,3000,250);
  R.begin("area"); P(2000,1500); rig.enter(); end();
  rig.pick([{k:"area",id:S.areas[0].id}])},
 go(){R.begin("cloude")},
 check(){eq(S.clouds.length,1,"سحابةٌ واحدة")},
 badPrep(){},
 bad(){R.begin("cloude")},
});
C("group",{
 in:"جداران محدَّدان · grp «مجموعة1»",
 exp:"1 مجموعة بعضوين",
 prep(){const a=hw(0,0,3000,0), b=hw(0,1000,3000,1000); selW(a,b)},
 go(){R.begin("group","مجموعة1")},
 check(){
  eq(S.groups.length,1,"مجموعةٌ واحدة");
  eq(S.groups[0].name,"مجموعة1","الاسم");
  eq((S.groups[0].members||S.groups[0].m||[]).length,2,"عضوان");
 },
 badPrep(){selW(hw(0,0,3000,0))},
 bad(){R.begin("group","مجموعة1")},
});
C("ungroup",{
 in:"مجموعة قائمة · ungroup مجموعة1",
 exp:"لا مجموعات",
 prep(){const a=hw(0,0,3000,0), b=hw(0,1000,3000,1000); selW(a,b);
  R.begin("group","مجموعة1"); end()},
 go(){R.begin("ungroup","مجموعة1")},
 check(){eq(S.groups.length,0,"فُكّت")},
 badPrep(){hw(0,0,3000,0)},
 bad(){R.begin("ungroup","لا-وجود")},
});
C("gselect",{
 in:"مجموعة قائمة · gsel مجموعة1",
 exp:"التحديد = عضوا المجموعة بلا تغيير حالة",
 readonly:1,
 prep(){const a=hw(0,0,3000,0), b=hw(0,1000,3000,1000); selW(a,b);
  R.begin("group","مجموعة1"); end(); rig.pick([])},
 go(){R.begin("gselect","مجموعة1")},
 check(){eq(rig.sel.length,2,"عضوان محدَّدان")},
 badPrep(){hw(0,0,3000,0)},
 bad(){R.begin("gselect","لا-وجود")},
});
C("gmove",{
 in:"مجموعة · gm مجموعة1 · (0,0) · (0,500)",
 exp:"الجداران ينتقلان 500 في y",
 prep(){const a=hw(0,0,3000,0), b=hw(0,1000,3000,1000); selW(a,b);
  R.begin("group","مجموعة1"); end(); rig.pick([])},
 go(){R.begin("gmove","مجموعة1"); P(0,0); P(0,500)},
 check(){deep(S.walls.map(w=>w.a[1]).sort((a,b)=>a-b),[500,1500],
  "الإزاحة")},
 badPrep(){hw(0,0,3000,0)},
 bad(){R.begin("gmove","لا-وجود"); P(0,0); P(0,500)},
});

/* ── مؤجَّلة للمتصفّح: تُختبر على مستوى استدعاء الفعل فقط ── */
["dxf","svg","png","pdf","save","open","new","areacsv","opencsv","inspect",
 "tour","jrcopy","jrreplay","jrclear","underlay","view","viewsave","viewdel",
 "cleanup","dedup","gate","levels","levelMgr","mkblock"]
 .forEach(id=>C(id,{
  in:`استدعاء begin("${id}") على مشروع جديد`,
  exp:"لا رمي غير ملتقَط، لا أداة معلّقة، لا أثر على الحالة",
  defer:1,
  go(){R.begin(id)},
 }));

/* ═══ المشغّل ═══ */
const TABLE=process.argv.includes("--table");
function runCase(c){
 const tid=c.tool||c.id;
 if(c.defer){
  group(`${c.id} · مؤجَّل (استدعاء الفعل)`,()=>{
   fresh(); clearHistory();
   const b=snap(), h=steps(); let thr=null;
   try{c.go()}catch(e){thr=e}
   end();
   ok(!thr,"الاستدعاء لا يرمي"+(thr?`: ${thr.message}`:""));
   ok(!R.active(),"لا أداة معلّقة");
   eq(snap(),b,"لا أثر على الحالة");
   eq(steps(),h,"ولا خطوة تاريخ");
   c.note=rig.errs().slice(0,1).join(" | ");
  });
  return;
 }
 if(c.go&&!c.skipA){
  group(`${c.id} · أ الحالة`,()=>{
   fresh(); if(c.prep)c.prep(); end(); clearHistory(); rig.clear();
   const b=snap(), h=steps();
   c.go(); end();
   ok(!R.active(),"الأداة انتهت");
   c.check();
   if(c.readonly){
    eq(snap(),b,"لا تغيير للحالة");
    eq(steps(),h,"ولا خطوة تاريخ");
   }else{
    ok(snap()!==b,"الحالة تغيّرت");
    eq(steps(),h+1,"جلسة الأداة = خطوة تاريخ واحدة");
   }
   if(!c.readonly){
    undo();
    eq(snap(),b,"ب · undo يعيد الحالة كما كانت");
    eq(steps(),h,"ب · والتاريخ");
   }
  });
 }
 if(c.bad&&!c.skipC){
  group(`${c.id} · ج المدخل الخاطئ`,()=>{
   fresh();
   const p=("badPrep" in c)?c.badPrep:c.prep;
   if(p)p(); end(); clearHistory(); rig.clear();
   const b=snap(), h=steps();
   c.bad(); end();
   ok(!R.active(),"لا أداة معلّقة بعد Esc");
   eq(snap(),b,"لا نصف تنفيذ: اللقطة كما كانت");
   eq(steps(),h,"ولا خطوة تاريخ");
   if(!c.badNoop){
    ok(c.badSay?sayAny(c.badSay):bad(),
     c.badSay?`تقرير يطابق ${c.badSay}`:"رُفض مع تقرير خطأ/تنبيه");
   }
  });
 }
}
CASES.forEach(runCase);

/* ═══ الماكرو: أدواتٌ نقيّة تُختبر كاملة ═══ */
await groupAsync("macrorec · تسجيل وحفظ",async()=>{
 fresh(); clearHistory();
 R.begin("macrorec");
 ok(MC.recActive(),"بدأ التسجيل"); ok(!R.active(),"الأداة انتهت");
 R.begin("wall"); P(0,0); P(3000,0); end();
 R.begin("macrorec");
 ok(!MC.recActive(),"أوقف التسجيل");
 eq(MC.macroList().length,1,"ماكرو محفوظ واحد");
});
await groupAsync("macrolist · عرض",async()=>{
 rig.clear(); R.begin("macrolist");
 ok(sayAny(/الماكروهات \(1\)/),"يعدّ الماكرو");
});
await groupAsync("macroplay · تشغيل وتراجع",async()=>{
 const nm=MC.macroList()[0].name;
 fresh(); clearHistory();
 const b=snap(), h=steps();
 R.begin("macroplay",nm);
 await Promise.resolve(); await Promise.resolve();
 eq(S.walls.length,1,"الماكرو أنشأ الجدار");
 eq(steps(),h+1,"خطوة تاريخ واحدة");
 undo();
 eq(snap(),b,"undo يعيد الحالة");
 rig.clear(); R.begin("macroplay","لا-وجود");
 await Promise.resolve(); await Promise.resolve();
 ok(rig.errs().length>0,"ج · اسم مجهول يُرفَض");
 eq(snap(),b,"ج · بلا أثر");
});
await groupAsync("macrodel · حذف",async()=>{
 rig.clear(); R.begin("macrodel","لا-وجود");
 ok(rig.errs().length>0,"ج · اسم مجهول يُرفَض");
 eq(MC.macroList().length,1,"ج · لم يُحذف شيء");
 const nm=MC.macroList()[0].name;
 R.begin("macrodel",nm);
 eq(MC.macroList().length,0,"حُذف الماكرو");
});

/* ═══ سلامة السجلّ ═══ */
group("registry · سلامة السجلّ",()=>{
 const L=R.toolList();
 const ids=L.map(d=>d.id);
 const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
 eq(dup.join(","),"","لا معرّف مكرّر في toolList()");
 eq(new Set(ids).size,150,"150 أداة فريدة كما في docs/tools.md");
 const lost=L.filter(d=>R.findTool(d.id)!==d).map(d=>d.id);
 eq(lost.join(","),"","كل تعريف يُبلَغ بمعرّفه");
 const clash=[];
 L.forEach(d=>String(d.alias||"").split(/\s+/).filter(Boolean)
  .forEach(a=>{if(R.findTool(a)!==d)clash.push(`${d.id}:${a}`)}));
 eq(clash.join(" "),"","كل لقب يُحلّ إلى أداته");
});

/* ═══ الجدول النهائي ═══ */
{
 const G=stats().groups, F=stats().fails;
 const rows=[];
 const done=new Set();
 CASES.forEach(c=>{
  const key=c.id;
  const gs=G.filter(g=>g.name.startsWith(key+" ·"));
  const bads=F.filter(f=>f.startsWith(key+" ·"));
  const st=bads.length?"فشل":(c.defer?"مؤجَّل":"نجح");
  rows.push({tool:key,status:st,
   note:(bads[0]||"").replace(/^[^:]+: /,"").slice(0,90)
    +(c.assume&&bads.length?` [افتراض: ${c.assume}]`:"")
    +(c.defer&&!bads.length?" · تُؤجَّل للمتصفح":"")
    +(c.note?` · ${c.note.slice(0,60)}`:""),
   in:c.in,exp:c.exp,groups:gs.length});
 });
 ["macrorec","macrolist","macroplay","macrodel"].forEach(id=>{
  const bads=F.filter(f=>f.startsWith(id+" ·"));
  rows.push({tool:id,status:bads.length?"فشل":"نجح",
   note:(bads[0]||"").slice(0,90),in:"سلسلة تسجيل/عرض/تشغيل/حذف",
   exp:"ماكرو واحد ينشئ جداراً بخطوة واحدة",groups:1});
 });
 console.log("\nأداة | نتيجة | ملاحظة");
 rows.forEach(r=>console.log(`${r.tool} | ${r.status} | ${r.note}`));
 if(TABLE){
  console.log("\nأداة | مدخلات | المتوقَّع");
  rows.forEach(r=>console.log(`${r.tool} | ${r.in} | ${r.exp}`));
 }
 if(process.env.TOOLS_REAL_JSON)
  writeFileSync(process.env.TOOLS_REAL_JSON,JSON.stringify(rows,null,1));
}
process.exit(summary()?1:0);
