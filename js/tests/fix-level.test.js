/* ═══ F3 — مستوى الأداة الصحية: الإنشاء والتقسيم في BOQ ═══
   node js/tests/fix-level.test.js
   F3a يثبت مسار الإنشاء (addFix يكتب المستوى النشط) وانعكاسَه
   في boqLevel/levelGroups. وتطبيعُ ملفٍّ قديمٍ بلا level هو F3b
   في ensureShape، ويُثبَت هناك لا هنا. */
import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const {addFix}=await import("../core/fixt.js");
const {addWall}=await import("../core/walls.js");
const {boqLevel,levelGroups}=await import("../core/boq.js");
const LV=await import("../core/level.js");

group("F3a — الأداة الصحية تأخذ المستوى النشط",()=>{
 newState(); S.meta.level=3;
 const f=addFix("lav",[1000,1000],0,{});
 eq(f.level,3,"أداةُ الطابق الثالث");
 eq(LV.levelOf(f),3,"levelOf يقرؤها موحّداً");
});

group("F3a — levelsOf يرى المستوى بأداته وحدها",()=>{
 newState();
 S.meta.level=5;
 addFix("wc",[0,0],0,{});
 S.meta.level=0;
 ensureShape();
 ok(LV.levelsOf(S).includes(5),"المستوى 5 حيٌّ بأداته وحدها");
});

group("F3a — BOQ يقسم الأدوات الصحية",()=>{
 newState();
 S.meta.level=0;
 addWall([0,0],[3000,0],200,"int","c");
 addFix("lav",[500,500],0,{});
 S.meta.level=2;
 addWall([0,0],[3000,0],200,"int","c");
 addFix("wc",[500,500],0,{});
 S.meta.level=0;

 const q0=boqLevel(0), q2=boqLevel(2);
 eq(q0.fixt.n,1,"أداةُ الأرضي وحده");
 eq(q0.fixt.rows[0].kind,"lav","المغسلة في أرضي");
 eq(q2.fixt.n,1,"أداةُ الطابق 2 وحده");
 eq(q2.fixt.rows[0].kind,"wc","الكرسي في علوي");

 const g=levelGroups();
 const g0=g.groups.find(x=>x.level===0);
 const g2=g.groups.find(x=>x.level===2);
 eq(g0.fixt.n,1,"مجموعة الأرضي تحمل أداتها");
 eq(g2.fixt.n,1,"ومجموعة الطابق 2 تحمل أداتها");
 ok(!g.common.fixt,"لا أدوات في الحصة المشتركة بعد F3");
});

group("F3b — الأداة القديمة بلا مستوى تُطبَّع إلى النشط",()=>{
 newState(); S.meta.level=4;
 S.fixt=[{id:"F1",kind:"lav",x:0,y:0,rot:0,w:400,d:400}];
 ensureShape();
 eq(S.fixt[0].level,4,"أخذت الطابق النشط كما الجدران والفتحات والدرج");
});

process.exit(summary()?1:0);
