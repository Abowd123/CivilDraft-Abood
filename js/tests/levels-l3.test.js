/* ═══ اختبار دورة الطوابق — L3 ═══
   يثبت أن nextLevelFrom يدور بين المستويات الحيّة تصاعدياً
   وتنازلياً بلا قفزةٍ فوق مستوٍ خالٍ، وأن levelLabel يقرأ الوسم
   العربيّ الصحيح للمستوى النشط.
   التشغيل: node js/tests/levels-l3.test.js */
import {shim,group,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const LV=await import("../core/level.js");

group("nextLevelFrom يدور بين المستويات الحيّة",()=>{
 newState();
 /* بلا جدران: يبقى أرضياً */
 eq(LV.nextLevelFrom(S,1),0,"بلا جدران: يبقى أرضياً");

 /* عناصر في المستويين 0 و 2 — المستوى 0 نشط */
 S.meta.level=0;
 addWall([0,0],[3000,0],200,"int","c");
 S.meta.level=2;
 addWall([0,0],[3000,0],200,"int","c");
 ensureShape();

 S.meta.level=0;
 eq(LV.nextLevelFrom(S,1),2,"الأمام من 0 إلى 2");
 eq(LV.nextLevelFrom(S,-1),2,"والسابق من 0 يلتفّ إلى 2");

 S.meta.level=2;
 eq(LV.nextLevelFrom(S,1),0,"من 2 يلتفّ إلى 0");
 eq(LV.nextLevelFrom(S,-1),0,"ومن 2 إلى السابق 0");
});

group("nextLevelFrom يبقى على المستوى نفسه عند وحدانيّته",()=>{
 newState();
 S.meta.level=1;
 addWall([0,0],[3000,0],200,"int","c");
 ensureShape();
 eq(LV.nextLevelFrom(S,1),1,"مستوًى واحدٌ فقط: يعيد النشط نفسه");
 eq(LV.nextLevelFrom(S,-1),1,"وكذلك تنازلياً");
});

group("levelLabel يقرأ النشط",()=>{
 newState();
 eq(LV.levelLabel(S),"أرضي","0 ⇒ أرضي");
 S.meta.level=1;
 eq(LV.levelLabel(S),"طابق 1","1 ⇒ طابق 1");
 S.meta.level=3;
 eq(LV.levelLabel(S),"طابق 3","3 ⇒ طابق 3");
});

process.exit(summary());
