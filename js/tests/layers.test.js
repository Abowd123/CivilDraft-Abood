/* MT2 — الطبقة المخصصة: تُنشأ وتُعدَّل وتنجو من التطبيع وتُحذَف،
   والمصنعيةُ محميةٌ من الحذف.  node js/tests/layers.test.js */
import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const L=await import("../core/layers.js");

group("الطبقة المخصصة — إنشاء وهيئة",()=>{
 newState();
 const r=L.addLay("C-FURN","أثاث");
 ok(r&&r.n==="C-FURN","أُضيفت الطبقة");
 ok(L.hasLay("C-FURN"),"تظهر في الجدول الحيّ");
 const l=L.layOf("C-FURN");
 eq(l.d,"أثاث","الوصف العربيّ محفوظ في d");
 eq(l.plot,1,"تُطبَع افتراضاً");
 eq(L.isCustom("C-FURN"),true,"تُعرَف بأنها مخصصة");
 eq(L.isCustom("A-WALL"),false,"المصنعية ليست مخصصة");
});

group("الطبقة المخصصة — تنجو من التطبيع",()=>{
 newState();
 L.addLay("C-N1","طابق أول");
 ensureShape();
 ok(L.hasLay("C-N1"),"نجَت من ensureShape/normLays");
 eq(L.layOf("C-N1").d,"طابق أول","بقي وصفها بعد التطبيع");
});

group("الطبقة المخصصة — إخفاء وحذف وحماية المصنع",()=>{
 newState();
 L.addLay("C-D","تجربة");
 L.setLay("C-D","off",1);
 eq(L.vis("C-D"),false,"إخفاءُ المخصصة يعمل");
 L.setLay("C-D","off",0);
 ok(L.delLay("A-WALL")===false,"مصنعيةٌ لا تُحذَف");
 ok(L.delLay("C-D")===true,"حُذفت المخصصة الفارغة");
 ok(!L.hasLay("C-D"),"زالَت من الجدول");
});

group("الطبقة المخصصة — الاسم المكرر والاسم الفاسد",()=>{
 newState();
 L.addLay("C-X","واحدة");
 ok(L.addLay("C-X","ثانية")===false,"لا مكررة");
 eq(L.layNameOk("C-2"),true,"اسم لاتيني رقيم مقبول");
 eq(L.layNameOk("أثاث"),false,"اسم عربي مرفوض (الوصف هو مجال العربية)");
});

process.exit(summary());
