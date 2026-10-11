/* ═══ صناديق المشهد الثلاثة ═══ البنود 13-18 */
import {shim, shimCanvas} from "./harness.js";
shim(); shimCanvas();
import {group, ok, eq, summary} from "./harness.js";
const {S,newState}=await import("../core/state.js");
const W=await import("../core/walls.js");
const RN=await import("../core/render.js");
const LY=await import("../core/layers.js");
const K=await import("../core/cols.js");

group("صناديق بعد إخفاء طبقة",()=>{
 newState(); S.walls.length=0; RN.invalidate();
 W.addWall([0,0],[5000,0],200,"c","c");
 RN.invalidate();
 const all=RN.sceneBBoxAll();
 LY.setLay("A-WALL","off",1);
 const ink=RN.sceneBBoxInk();
 // المخفي لا يدخل الصندوق
 ok(!ink || ink.x1 < all.x1 || ink.x0 > all.x0 || !ink,"المخفي يصغر الصندوق");
 LY.setLay("A-WALL","off",0);
});

group("plots يمنع الطباعة",()=>{
 /* عمودٌ صغيرٌ قرب الأصل على A-COLS + جدارٌ طويل على A-WALL:
    هكذا حين يُوقَف طبعُ A-WALL يبقى للورقة محتوًى حقيقيّ (العمود)
    فتصغر فعلاً — لا أن تسقط كل الأوّليات معاً فيعود sceneBBoxPlot
    إلى صندوق الهندسة الكامل احتياطاً (سلوكٌ مقصودٌ حين لا يُطبَع
    شيء إطلاقاً، لا عطبٌ يستدعي اختباره هنا). */
 newState(); S.walls.length=0; S.cols.length=0; RN.invalidate();
 W.addWall([0,0],[5000,0],200,"c","c");
 K.addCol("rect",[100,100],300,300,0);
 RN.invalidate();
 const plot1=RN.sceneBBoxPlot();
 LY.setLay("A-WALL","plot",0);
 const plot2=RN.sceneBBoxPlot();
 ok(plot2.x1 < plot1.x1,"ما لا يطبع لا يوسع الورقة — العمود وحده يبقى");
 LY.setLay("A-WALL","plot",1);
});

process.exit(summary()?1:0);
