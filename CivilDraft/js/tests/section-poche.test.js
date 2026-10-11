/* ═══ اختبار poché المقطع ═══ يثبت أن opt.poche اختياريٌّ لا يُغيّر
   السلوك الافتراضي، وأن "solid"/"hatch" يضيفان أوّليةً واحدةً لكل
   شكل جدارٍ (لا للفتحات) فوق الخطوط لا بدلاً منها.
   التشغيل: node js/tests/section-poche.test.js */
import {shim,shimCanvas,group,eq,ok,summary} from "./harness.js";
shim(); shimCanvas();

const {S,newState,ensureShape}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addOpen}=await import("../core/opens.js");
const {section,sectPrims,buildSect}=await import("../core/section.js");

const build=()=>{
 newState();
 addWall([0,0],[6000,0],250,"ext","c");
 addWall([6000,0],[6000,4000],250,"ext","c");
 addWall([6000,4000],[0,4000],250,"ext","c");
 addWall([0,4000],[0,0],250,"ext","c");
 const w5=addWall([3000,0],[3000,4000],150,"int","c");
 addOpen(w5,2000,"door",900,2100,0);
};
const A=[-1000,2000], B=[7000,2000];

group("poche غائبٌ — السلوك القديم بلا تغيير",()=>{
 build();
 const t=section(A,B);
 const pr=sectPrims(t,0,0);
 eq(pr.length,t.shapes.length,"عددها كعدد الأشكال بلا زيادة");
 ok(pr.every(g=>g.t==="poly"),"كلُّها poly كما كانت");
});

group('poche:"none" صريحاً — نفس النتيجة',()=>{
 build();
 const t=section(A,B);
 const pr=sectPrims(t,0,0,{poche:"none"});
 eq(pr.length,t.shapes.length,"لا زيادة");
});

group('poche:"solid" — تسويدٌ خلف كل شكل جدارٍ وحده',()=>{
 build();
 const t=section(A,B);
 const wallShapes=t.shapes.filter(s=>s.role==="wall").length;
 const pr=sectPrims(t,0,0,{poche:"solid"});
 eq(pr.length,t.shapes.length+wallShapes,
  "أوّليةٌ إضافيّةٌ واحدة لكل جدارٍ فقط");
 const fills=pr.filter(g=>g.t==="fill");
 eq(fills.length,wallShapes,"عدد التسويدات كعدد الجدران");
 ok(fills.every(g=>g.style==="solid"),"نمطُها solid");
 eq(pr.filter(g=>g.t==="poly").length,t.shapes.length,
  "الخطوطُ القديمة كلُّها باقيةٌ كما هي");
});

group('poche:"hatch" — هاشورٌ بدل التسويد',()=>{
 build();
 const t=section(A,B);
 const wallShapes=t.shapes.filter(s=>s.role==="wall").length;
 const pr=sectPrims(t,0,0,{poche:"hatch"});
 const hatches=pr.filter(g=>g.t==="hatch");
 eq(hatches.length,wallShapes,"عدد الهاشورات كعدد الجدران");
 ok(hatches.every(g=>g.pat==="ANSI31"),"نمطُها ANSI31");
});

group("poche لا يمسّ الفتحات",()=>{
 build();
 const t=section(A,B);
 const openShapes=t.shapes.filter(s=>s.role!=="wall").length;
 ok(openShapes>0,"توجد فتحةٌ في هذا المقطع");
 const pr=sectPrims(t,0,0,{poche:"solid"});
 eq(pr.filter(g=>g.t==="fill").length,
  t.shapes.filter(s=>s.role==="wall").length,
  "التسويد للجدران وحدها — لا شيء منه للفتحة");
});

summary();
