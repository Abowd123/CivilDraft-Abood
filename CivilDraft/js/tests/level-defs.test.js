/* ═══ اختبار تعريفات الطوابق (levelDefs) ومحاذاتها ═══
   يغطّي: levelDef/levelDefs/levelElev/levelHeight/levelBelow/
   addLevelDef في core/level.js، وfindMisaligned/misalignedSay في
   core/levelAlign.js. التشغيل: node js/tests/level-defs.test.js */
import {shim,group,ok,eq,deep,throws,summary} from "./harness.js";
shim();

const {S,DEF,loadState,ensureShape}=await import("../core/state.js");
const {levelDef,levelDefs,levelElev,levelHeight,levelBelow,
 addLevelDef}=await import("../core/level.js");
const {addCol}=await import("../core/cols.js");
const {addWall}=await import("../core/walls.js");
const {findMisaligned,misalignedSay}=await import("../core/levelAlign.js");

const reset=()=>loadState(DEF(),true);

group("levelDefs — الطابق 0 موجودٌ افتراضاً",()=>{
 reset();
 eq(S.levelDefs.length,1,"تعريفٌ واحد عند البدء");
 const d=levelDef(S,0);
 ok(!!d,"طابق 0 معرَّف");
 eq(d.name,"أرضي","اسمُه الافتراضي");
 eq(levelElev(S,0),0,"منسوبُه صفر");
 eq(levelHeight(S,0),3000,"ارتفاعُه المعياريّ");
});

group("addLevelDef — إضافة طابقٍ جديد",()=>{
 reset();
 const ld=addLevelDef(S,{n:1,name:"أول",elev:3000,h:2800});
 eq(ld.n,1,"رقمُه");
 eq(S.levelDefs.length,2,"دخل القائمة");
 eq(levelDefs(S).map(x=>x.n).join(","),"0,1","مرتَّبةٌ بالرقم");
 eq(levelElev(S,1),3000,"منسوبُه كما أُدخل");
 eq(levelHeight(S,1),2800,"ارتفاعُه كما أُدخل");
 throws(()=>addLevelDef(S,{n:1}),/معرَّف/,"رقمٌ مكرَّر يُرفَض");
});

group("levelElev/levelHeight — بلا تعريفٍ تقدير 3م",()=>{
 reset();
 eq(levelElev(S,5),15000,"منسوبٌ مقدَّر لطابقٍ بلا تعريف");
 eq(levelHeight(S,5),3000,"ارتفاعٌ معياريّ لطابقٍ بلا تعريف");
});

group("levelBelow — أقرب طابقٍ حيٍّ تحت النشط",()=>{
 reset();
 S.meta.level=0;
 addCol("rect",[0,0],300,300,0,"conc","C0");
 eq(levelBelow(S),null,"لا طابقَ تحت الأرضي");
 S.meta.level=1;
 addCol("rect",[2000,2000],300,300,0,"conc","C1");
 eq(levelBelow(S),0,"تحت طابق 1 هو 0");
 S.meta.level=3;
 addCol("rect",[9000,9000],300,300,0,"conc","C3");
 eq(levelBelow(S,3),1,"يتخطّى الطابق 2 الخالي إلى 1 الحيّ");
});

group("ensureShape — ملفٌّ قديمٌ بلا levelDefs يُهاجَر",()=>{
 const raw=DEF();
 delete raw.levelDefs;
 loadState(raw,true);
 eq(S.levelDefs.length,1,"طابق 0 يُنشأ");
 eq(S.levelDefs[0].n,0,"برقم صفر");
});

group("findMisaligned — عمودٌ منحرف يُكشَف",()=>{
 reset();
 S.meta.level=0;
 const c1=addCol("rect",[0,0],300,300,0,"conc","C1");
 S.meta.level=1;
 const c2=addCol("rect",[5000,5000],300,300,0,"conc","C2");
 const w=findMisaligned(S,50);
 eq(w.length,1,"انحرافٌ واحد");
 eq(w[0].id,c2.id,"العمود المنحرف");
 eq(w[0].type,"col","نوعُه عمود");
 ok(/انحرافاً/.test(misalignedSay(w)),"السطر يقوله");
});

group("findMisaligned — عمودٌ محاذٍ لا يُكشَف",()=>{
 reset();
 S.meta.level=0;
 addCol("rect",[1000,1000],300,300,0,"conc","C1");
 S.meta.level=1;
 addCol("rect",[1010,995],300,300,0,"conc","C2");
 const w=findMisaligned(S,50);
 eq(w.length,0,"داخل التفاوت — لا انحراف");
 eq(misalignedSay(w),"كل طابقٍ محاذٍ لما تحته","السطر يقوله");
});

group("findMisaligned — جدارٌ علويّ بلا جدارٍ تحته",()=>{
 reset();
 S.meta.level=0;
 addWall([0,0],[4000,0],250,"ext","c");
 S.meta.level=1;
 addWall([9000,9000],[13000,9000],250,"ext","c");
 const w=findMisaligned(S,50);
 ok(w.some(m=>m.type==="wall"),"جدارٌ منحرفٌ مسرود");
});

summary();
