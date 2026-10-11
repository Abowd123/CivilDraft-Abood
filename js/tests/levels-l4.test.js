/* ═══ اختبار نطاق المشهد — F4 ═══
   يثبت أن المشهد يرسم الطابق النشط وحده افتراضاً (levelScope
   وinLevelScope في core/level.js، وتطبيقهما في core/render.js)،
   وأن S.opt.levelAll يعيده مكدَّساً كل الطوابق معاً حين يُطلَب
   صراحةً — القرار «أ».
   التشغيل: node js/tests/levels-l4.test.js */
import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const LV=await import("../core/level.js");
const {addWall}=await import("../core/walls.js");
const {addCol}=await import("../core/cols.js");
const {addFix}=await import("../core/fixt.js");
const {addStair}=await import("../core/stairs.js");
const {addArea,regionAt}=await import("../core/areas.js");
const RN=await import("../core/render.js");

group("levelScope — نطاقٌ محض بلا كودٍ خارجي",()=>{
 newState();
 S.meta.level=3;
 eq(LV.levelScope(S),3,"النشط 3 ⇒ النطاق 3");
 S.opt.levelAll=1;
 eq(LV.levelScope(S),null,"levelAll=1 ⇒ بلا نطاق (null)");
 S.opt.levelAll=0;
 eq(LV.levelScope(S),3,"العودة إلى levelAll=0 تُعيد النطاق");
});

group("inLevelScope — الانتماء",()=>{
 ok(LV.inLevelScope({level:2},2),"مستوًى مطابق داخلٌ");
 ok(!LV.inLevelScope({level:5},2),"مستوًى مخالفٌ خارجٌ");
 ok(LV.inLevelScope({level:9},null),"نطاقٌ null يقبل كل شيء");
 ok(LV.inLevelScope({},0),"كيانٌ بلا level يُقرأ أرضياً (levelOf)");
});

/* ═══ الأعمدة والأدوات الصحية والدرج والمناطق — الوسوم kid/fid/sid/aid ═══ */
group("F4 — عمودٌ وأداةٌ ودرجٌ ومنطقةٌ لا تظهر إلا في مستواها",()=>{
 newState();
 S.meta.level=0;
 const c0=addCol("rect",[1000,1000],400,400,0,"rc");
 const f0=addFix("lav",[2000,1000],0,{});
 const s0=addStair([3000,100],[6000,100],1000,12);
 const a0=addArea([[0,0],[1000,0],[1000,1000],[0,1000]],"أرضي");

 S.meta.level=2;
 const c2=addCol("rect",[21000,1000],400,400,0,"rc");
 const f2=addFix("lav",[22000,1000],0,{});
 const s2=addStair([23000,100],[26000,100],1000,12);
 const a2=addArea([[20000,0],[21000,0],[21000,1000],[20000,1000]],"علوي");

 const has=(P,field,id)=>P.some(g=>g[field]===id);

 /* النشط = 0، levelAll=0 (الافتراض): الأرضي وحده يظهر */
 S.meta.level=0; S.opt.levelAll=0;
 RN.invalidate();
 let P=RN.scene().P;
 ok(has(P,"kid",c0.id),"عمود الأرضي ظاهرٌ عند النشاط 0");
 ok(!has(P,"kid",c2.id),"وعمود الطابق 2 غائبٌ");
 ok(has(P,"fid",f0.id),"أداة الأرضي ظاهرة");
 ok(!has(P,"fid",f2.id),"وأداة الطابق 2 غائبة");
 ok(has(P,"sid",s0.id),"درج الأرضي ظاهر");
 ok(!has(P,"sid",s2.id),"ودرج الطابق 2 غائب");
 ok(has(P,"aid",a0.id),"منطقة الأرضي ظاهرة");
 ok(!has(P,"aid",a2.id),"ومنطقة الطابق 2 غائبة");

 /* التبديل إلى الطابق 2: العكس تماماً */
 S.meta.level=2;
 RN.invalidate();
 P=RN.scene().P;
 ok(!has(P,"kid",c0.id),"بعد التبديل: عمود الأرضي غائبٌ");
 ok(has(P,"kid",c2.id),"وعمود الطابق 2 ظاهر");
 ok(!has(P,"fid",f0.id),"أداة الأرضي غائبة الآن");
 ok(has(P,"fid",f2.id),"وأداة الطابق 2 ظاهرة");
 ok(!has(P,"sid",s0.id),"درج الأرضي غائب الآن");
 ok(has(P,"sid",s2.id),"ودرج الطابق 2 ظاهر");
 ok(!has(P,"aid",a0.id),"منطقة الأرضي غائبة الآن");
 ok(has(P,"aid",a2.id),"ومنطقة الطابق 2 ظاهرة");

 /* levelAll=1: كلاهما معاً، مهما كان النشط */
 S.opt.levelAll=1;
 RN.invalidate();
 P=RN.scene().P;
 ok(has(P,"kid",c0.id)&&has(P,"kid",c2.id),"levelAll: كلا العمودين");
 ok(has(P,"fid",f0.id)&&has(P,"fid",f2.id),"levelAll: كلتا الأداتين");
 ok(has(P,"sid",s0.id)&&has(P,"sid",s2.id),"levelAll: كلا الدرجين");
 ok(has(P,"aid",a0.id)&&has(P,"aid",a2.id),"levelAll: كلتا المنطقتين");
});

/* ═══ الأجسام (bodies) وحلقات المناطق (regionLoops) ═══ */
group("F4 — الجدران وحلقاتها تتبعان النطاق",()=>{
 newState();
 /* غرفتان بعيدتان في المستوى نفسه من الإحداثيات، كلٌّ في طابقه */
 S.meta.level=0;
 addWall([0,0],[4000,0],200,"ext","c");
 addWall([4000,0],[4000,3000],200,"ext","c");
 addWall([4000,3000],[0,3000],200,"ext","c");
 addWall([0,3000],[0,0],200,"ext","c");

 S.meta.level=2;
 addWall([10000,10000],[14000,10000],200,"ext","c");
 addWall([14000,10000],[14000,13000],200,"ext","c");
 addWall([14000,13000],[10000,13000],200,"ext","c");
 addWall([10000,13000],[10000,10000],200,"ext","c");
 S.opt.levelAll=0;
 ensureShape();

 S.meta.level=0;
 RN.invalidate();
 let loops=RN.regionLoops();
 ok(!!regionAt(loops,2000,1500),"غرفة الأرضي مُكتشَفةٌ من نطاق الأرضي");
 ok(!regionAt(loops,12000,11500),"وغرفة الطابق 2 غائبةٌ عن نطاق الأرضي");

 S.meta.level=2;
 RN.invalidate();
 loops=RN.regionLoops();
 ok(!regionAt(loops,2000,1500),"وعند النشاط 2: غرفة الأرضي غائبة");
 ok(!!regionAt(loops,12000,11500),"وغرفة الطابق 2 مُكتشَفةٌ الآن");

 S.opt.levelAll=1;
 RN.invalidate();
 loops=RN.regionLoops();
 ok(!!regionAt(loops,2000,1500)&&!!regionAt(loops,12000,11500),
  "levelAll: الغرفتان معاً داخل الحلقات");
});

/* ═══ scene() بلا levelAll يبقى صحيحاً بمشروعٍ وحيد المستوى ═══ */
group("F4 — توافقٌ خلفيّ: مشروعٌ بطابقٍ واحد لا يفقد شيئاً",()=>{
 newState();
 S.meta.level=0;
 addWall([0,0],[3000,0],200,"int","c");
 addCol("rect",[1500,500],300,300,0,"rc");
 ensureShape();
 RN.invalidate();
 const P=RN.scene().P;
 ok(P.length>0,"المشهد ليس فارغاً");
 eq(S.opt.levelAll,0,"levelAll يطبَّع صفراً افتراضاً بعد ensureShape");
});

process.exit(summary());
