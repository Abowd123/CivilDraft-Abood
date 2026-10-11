/* ═══ فيضان الشريط — الدوال الخالصة ═══
   node js/tests/ribbon-overflow.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {scrollState,planFit}=await import("../ui/ribbon/overflow.js");

group("scrollState",()=>{
 let s=scrollState(0,0);
 ok(!s.start&&!s.end,"لا فيض ⇒ لا مؤشّر");
 s=scrollState(0,500);
 ok(!s.start&&s.end,"في البداية: أدوات وراء النهاية فقط");
 s=scrollState(250,500);
 ok(s.start&&s.end,"في الوسط: الطرفان");
 s=scrollState(500,500);
 ok(s.start&&!s.end,"في النهاية: وراء البداية فقط");
 s=scrollState(-500,500);
 ok(s.start&&!s.end,"RTL: scrollLeft سالب يُقرأ بقيمته المطلقة");
 s=scrollState(-3,500);
 ok(s.start&&s.end,"RTL: قرب البداية");
 s=scrollState(900,500);
 ok(!s.end,"تجاوزٌ يُقصّ إلى الحدّ");
 s=scrollState(NaN,NaN);
 ok(!s.start&&!s.end,"مدخلٌ تالف لا يرمي");
 s=scrollState(0.5,1);
 ok(!s.start&&!s.end,"فيضٌ دون العتبة يُهمَل");
});

group("planFit",()=>{
 eq(planFit([],500,80),0,"لا ألواح");
 eq(planFit([300],100,80),1,"لوحٌ واحد يبقى دائماً");
 eq(planFit([100,100,100],400,80),3,"الكلّ يسع ⇒ لا طيّ");
 eq(planFit([100,100,100],300,80),3,"يساوي المتاح تماماً ⇒ لا طيّ");
 eq(planFit([100,100,100],250,80),1,"الطيّ يحجز عرض زرّ المزيد");
 eq(planFit([100,100,100,100],380,80),3,"يسع ثلاثة مع الزرّ تماماً");
 eq(planFit([100,100,100,100],370,80),2,"دون ذلك بقليل يبقى اثنان");
 eq(planFit([500,100],200,80),1,"لوحٌ أول أعرض من المتاح يبقى ويُمرَّر");
 eq(planFit([100,100,100],0,80),1,"عرضٌ صفريّ لا يُفني الألواح كلّها");
 const w=[210,340,120,260,180,90,300];
 for(const a of [400,700,1000,1440,1920]){
  const k=planFit(w,a,90);
  const used=w.slice(0,k).reduce((x,y)=>x+y,0);
  ok(k>=1&&k<=w.length,`عرض ${a}: العدد ضمن المدى`);
  ok(k===w.length||used+90<=a||k===1,`عرض ${a}: لا فيض بعد الطيّ`);
  ok(k===w.length||k===w.length||used+w[k]+90>a||k===1,`عرض ${a}: الأقصى الممكن`);
 }
});
summary();
