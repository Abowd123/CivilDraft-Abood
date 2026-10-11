/* أ — الدرج يحمل مستوىً ويُقرأ، والغائب يكتسب النشط بالتحميل.
   التشغيل: node js/tests/stairs-level.test.js */
import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const LV=await import("../core/level.js");
const {addStair}=await import("../core/stairs.js");
const {addWall}=await import("../core/walls.js");
const {stairRows,boqLevel,levelGroups}=await import("../core/boq.js");

group("الدرج يكتسب المستوى النشط عند التحميل",()=>{
 newState(); S.meta.level=2;
 S.stairs.push({id:"ST1",a:[0,0],b:[3000,0],w:1000,n:12,up:"up",cut:0});
 ensureShape();
 eq(S.stairs[0].level,2,"سطرُ level أُسنِد كالجدران");
});
group("مُخبِر الدرج يقرؤه ويُسمّي الخارج عن النشط",()=>{
 newState(); S.meta.level=0;
 S.stairs.push({id:"ST1",a:[0,0],b:[3000,0],w:1000,n:12,up:"up",cut:0,level:0});
 S.stairs.push({id:"ST2",a:[0,0],b:[3000,0],w:1000,n:12,up:"up",cut:0,level:1});
 ensureShape();
 ok(LV.stairLevels(S).stairs.length===2,"يقرأ القلاعتين");
 eq(LV.stairsOutsideActive(S).length,1,"واحدة خارج النشط");
});
group("addStair يأخذ المستوى النشط",()=>{
 newState(); S.meta.level=4;
 const st=addStair([0,0],[3000,0],1000,12);
 eq(st.level,4,"قِلعةُ الطابق الرابع");
});
group("F1 — الدرج مقسومٌ بالمستوى في BOQ",()=>{
 newState(); S.meta.wallH=3000;
 S.meta.level=0;
 addWall([0,0],[3000,0],200,"int","c");
 const s0=addStair([1000,100],[4000,100],1000,12);
 S.meta.level=2;
 addWall([0,0],[3000,0],200,"int","c");
 const s2=addStair([1000,100],[4000,100],1000,12);
 S.meta.level=0;
 ensureShape();

 /* على الأقل الدرج يعرفه*/
 ok(Number.isFinite(LV.levelOf(s0)),"درج الأرضي منسوب");
 ok(Number.isFinite(LV.levelOf(s2)),"درج الطابق 2 منسوب");

 /* levelsOf صار يرى الطابق 2 ولو لم يكن إلا بجدار ودرج */
 const ls=LV.levelsOf(S);
 ok(ls.includes(0)&&ls.includes(2),"مستويان حيّان بينهما الدرج");

 const q0=boqLevel(0);
 const q2=boqLevel(2);
 eq(q0.stairs.n,1,"درجُ الأرضي وحده في BOQ الأرضي");
 eq(q0.stairs.rows[0].id,s0.id,"وقلعته أرضيةٌ بعينها");
 eq(q2.stairs.n,1,"درجُ الطابق 2 وحده في BOQ العلوي");
 eq(q2.stairs.rows[0].id,s2.id,"وقلعته علويةٌ بعينها");

 const g=levelGroups();
 const g0=g.groups.find(x=>x.level===0);
 const g2=g.groups.find(x=>x.level===2);
 eq(g0.stairs.n,1,"مجموعة الأرضي تحمل درجاً واحداً");
 eq(g2.stairs.n,1,"ومجموعة الطابق 2 تحمل درجها");
 ok(!g.common.stairs,"لا درجَ في الحصة المشتركة بعد F1");
});
process.exit(summary());
