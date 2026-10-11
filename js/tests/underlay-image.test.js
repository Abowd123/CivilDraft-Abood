/* ═══ اختبار 2.5: الصورة المرجعية — data:image/ والحدّ والأبعاد ═══ */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,canUndo}=await import("../core/state.js");
const U=await import("../core/underlay.js");

const reset=()=>{newState(); ensureShape()};
let warned=[];
U.onWarn(m=>warned.push(m));

group("setImage — data:image/ صالح",()=>{
 reset(); warned=[];
 const r=U.setImage("data:image/png;base64,iVBORw0KGgo=");
 eq(r.ok,1,"نجح");
 eq(S.underlay.src,"data:image/png;base64,iVBORw0KGgo=","src مثبَّت");
 eq(warned.length,0,"لا تحذير");
});
group("setImage — ليس data:image/",()=>{
 reset(); warned=[];
 const r=U.setImage("http://example.com/img.png");
 eq(r.ok,0,"رُفض"); eq(S.underlay.src,"","src لم يتغيّر");
 ok(warned.length>=1,"تحذير"); ok(/data:image/.test(warned[0]),"يذكر الصيغة");
});
group("setImage — مسارٌ محليّ",()=>{
 reset(); warned=[];
 const r=U.setImage("/path/to/img.png");
 eq(r.ok,0,"رُفض"); eq(S.underlay.src,"","src لم يتغيّر");
});
group("setImage — javascript: مرفوضٌ كذلك",()=>{
 reset();
 const r=U.setImage("javascript:alert(1)");
 eq(r.ok,0,"رُفض"); eq(S.underlay.src,"","src لم يتغيّر");
});
group("setImage — تجاوز الحدّ",()=>{
 reset(); warned=[];
 const big="data:image/png;base64,"+"A".repeat(U.MAX_SRC);
 const r=U.setImage(big);
 eq(r.ok,0,"رُفض"); eq(S.underlay.src,"","src لم يتغيّر");
 ok(warned.length>=1,"تحذير"); ok(/كبيرة/.test(warned[0]),"يذكر الحجم");
});
group("setImage — فراغ = مسح",()=>{
 reset(); warned=[];
 const r=U.setImage("");
 eq(r.ok,1,"نجح"); eq(S.underlay.src,"","src فارغ"); eq(warned.length,0,"بلا تحذير");
});
group("setImage — يمرّ بـedit (خطوة تراجع)",()=>{
 reset();
 U.setImage("data:image/png;base64,AAAA");
 ok(canUndo(),"خطوة تراجع");
});
group("ensureShape — يطرد مصدراً لا يبدأ بـdata:image/",()=>{
 reset();
 S.underlay.src="http://example.com/img.png";
 ensureShape();
 eq(S.underlay.src,"","طُرح");
});
group("ensureShape — يُبقي data:image/",()=>{
 reset();
 S.underlay.src="data:image/png;base64,AAAA";
 ensureShape();
 eq(S.underlay.src,"data:image/png;base64,AAAA","بقي");
});
group("ensureShape — يطرد ما تجاوز حدّ الحجم",()=>{
 reset();
 S.underlay.src="data:image/png;base64,"+"A".repeat(5*1024*1024);
 ensureShape();
 eq(S.underlay.src,"","طُرح لتجاوزه الحدّ");
});
process.exit(summary()?1:0);
