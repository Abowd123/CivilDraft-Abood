/* ═══ قالبا فيلا وشقة — فتحات ومناطق حقيقية ═══
   apply() الحقيقية على حالةٍ نظيفة: الأعداد ثابتة لا تقريبية، فأيُّ
   انحرافٍ في التصميم يُسقط الاختبار. كل فتحةٍ سليمة (ok) لا over/clash،
   وكل منطقةٍ خُبزت من حلقةٍ مغلقة، والتراجع خطوةٌ واحدة تُفرِغ الحالة. */
import assert from "node:assert/strict";
import {installDefaults,templateList,build,apply,defineTemplate} from "../core/templates.js";
import {newState,S,editFailed,ensureShape,undo,canUndo,clearHistory} from "../core/state.js";
import {openState,badOpens} from "../core/opens.js";
import {pArea} from "../core/geom.js";
let p=0,f=0;
const test=(n,fn)=>{try{fn();p++;console.log("✓ "+n)}catch(e){f++;console.error("✗ "+n+" → "+(e.message||e))}};
const kinds=()=>S.opens.reduce((m,o)=>(m[o.kind]=(m[o.kind]||0)+1,m),{});
const fresh=n=>{newState();ensureShape();clearHistory();installDefaults();return apply(n)};

const SPEC={
 villa:{walls:22,opens:18,areas:11,
  kinds:{double:1,door:6,opening:4,window:7},scale:100},
 apt3:{walls:19,opens:16,areas:9,
  kinds:{door:7,opening:2,window:7},scale:100},
 /* من مخطّطَي المالك (PDF) */
 grid10x9:{walls:17,opens:16,areas:8,
  kinds:{door:8,window:8},scale:100},
 twin15:{walls:27,opens:25,areas:13,
  kinds:{door:13,window:12},scale:100}};

test("القالبان مسجّلان مع الثلاثة القديمة",()=>{
 installDefaults();
 const n=templateList().map(t=>t.name);
 ["room","studio","office","villa","apt3","grid10x9","twin15"].forEach(k=>assert.ok(n.includes(k),k));
});

Object.keys(SPEC).forEach(name=>{
 const sp=SPEC[name];
 test(`${name}: الأعداد ثابتة (جدران/فتحات/مناطق)`,()=>{
  const r=fresh(name);
  assert.ok(r&&!editFailed(),"apply نجحت");
  assert.equal(S.walls.length,sp.walls);
  assert.equal(S.opens.length,sp.opens);
  assert.equal(S.areas.length,sp.areas);
  assert.deepEqual(kinds(),sp.kinds);
  assert.equal(S.meta.scale,sp.scale);
 });
 test(`${name}: كل فتحة سليمة — لا over ولا clash ولا orphan`,()=>{
  fresh(name);
  const bad=S.opens.filter(o=>openState(o)!=="ok").map(o=>o.id+":"+openState(o));
  assert.deepEqual(bad,[],"فتحاتٌ غير سليمة");
  assert.equal(badOpens().length,0);
 });
 test(`${name}: كل منطقة مسمّاة ومساحتها معقولة وأسماؤها فريدة`,()=>{
  fresh(name);
  S.areas.forEach(a=>{
   assert.ok(a.name&&a.name.length>0,"اسم");
   const m2=Math.abs(pArea(a.ring))/1e6;
   assert.ok(m2>=1.5&&m2<40,`${a.name} ${m2.toFixed(1)} م²`);
  });
  assert.equal(new Set(S.areas.map(a=>a.name)).size,S.areas.length,"أسماء فريدة");
 });
 test(`${name}: التراجع خطوةٌ واحدة تُفرِغ المشروع`,()=>{
  fresh(name);
  assert.ok(canUndo());
  undo();
  assert.equal(S.walls.length+S.opens.length+S.areas.length,0);
  assert.ok(!canUndo(),"لا خطوةَ شبحية");
 });
});

test("الفيلا: الباب الرئيسي مزدوج على الجدار الجنوبي",()=>{
 fresh("villa");
 const d=S.opens.find(o=>o.kind==="double");
 assert.equal(d.w,1200); assert.equal(d.h,2200);
 const w=S.walls.find(x=>x.id===d.wall);
 assert.equal(w.a[1],0); assert.equal(w.b[1],0,"جدارٌ جنوبيّ");
});

test("بيت المحاور: المحاور الأربعة×الخمسة من المخطّط، وغرفة نوم ١ صافيها 4.3×2.8",()=>{
 fresh("grid10x9");
 assert.deepEqual(S.grid.xs,[0,3000,4500,6000,10000]);
 assert.deepEqual(S.grid.ys,[0,3000,6000,9000]);
 const a=S.areas.find(x=>x.name==="غرفة نوم ١");
 assert.ok(Math.abs(Math.abs(pArea(a.ring))/1e6-4.3*2.8)<0.05,"12.04 م² كما في المخطّط");
});
test("بيت المحاور: تطبيقُه مرّتين لا يفشل بسبب الشبكة ولا يكرّرها",()=>{
 fresh("grid10x9"); clearHistory();
 const r=apply("grid10x9");
 assert.ok(r&&!editFailed()); assert.equal(r.axes,0,"لا محورَ جديد");
 assert.equal(S.grid.xs.length,5);
});
test("عمارة الشقّتين: متناظرةٌ حول y=7.5 — كلُّ فراغٍ له توأمٌ بالمساحة نفسها",()=>{
 fresh("twin15");
 const M=S.areas.map(a=>Math.round(Math.abs(pArea(a.ring))/1e4)).sort((a,b)=>a-b);
 const c={}; M.forEach(v=>c[v]=(c[v]||0)+1);
 const odd=Object.keys(c).filter(k=>c[k]%2);
 assert.equal(odd.length,1,"فراغٌ واحدٌ بلا توأم: الممرّ المشترك");
 const d=S.opens.filter(o=>o.kind==="door"&&o.w===1200);
 assert.equal(d.length,1,"مدخلٌ واحد 1.2");
 const w=S.walls.find(x=>x.id===d[0].wall);
 assert.equal(w.a[0],10000); assert.equal(w.b[0],10000,"في الجدار الشرقيّ");
});

test("فشل منطقةٍ بلا حلقة يُرجِع الجدران والفتحات معاً",()=>{
 newState(); ensureShape();
 defineTemplate({name:"openbox",build:()=>({
  walls:[{a:[0,0],b:[4000,0],th:250,type:"ext"},
         {a:[4000,0],b:[4000,3000],th:250,type:"ext"},
         {a:[4000,3000],b:[0,3000],th:250,type:"ext"}],   /* الضلع الرابع ناقص */
  opens:[{wallIndex:0,s:2000,kind:"door",w:900,h:2100,sill:0}],
  areas:[{at:[2000,1500],name:"مفتوحة"}]})});
 const r=apply("openbox");
 assert.equal(r,undefined); assert.ok(editFailed());
 assert.equal(S.walls.length+S.opens.length+S.areas.length,0,"لا نصف قالب");
});

test("القوالب القديمة لم تتغيّر (بلا areas في seed)",()=>{
 installDefaults(); newState();
 assert.equal(build("room").opens.length,1);
 const r=apply("room");
 assert.deepEqual(r.areas,[]);
 assert.equal(S.areas.length,0);
});
console.log(`\n${p} ناجح، ${f} فاشل`); process.exit(f?1:0);
