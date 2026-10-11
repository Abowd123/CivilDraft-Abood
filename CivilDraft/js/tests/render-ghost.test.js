/* ═══ اختبار شبح الطابق السفلي ═══ يثبت أن opt.ghost=0 (الافتراض)
   لا يضيف شيئاً، وأن تفعيله يضيف أوّلياتٍ مُعلَّمةً ghost:1 لجدران
   وأعمدة الطابق الذي تحت النشط وحدها، وأنها لا تدخل bodies()/BOQ
   (فلا تُحرِّف الجسمَ المصمَت الحقيقيّ)، وأن غياب طابقٍ تحت النشط
   لا يضيف شيئاً أيضاً. التشغيل: node js/tests/render-ghost.test.js */
import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addCol}=await import("../core/cols.js");
const RN=await import("../core/render.js");

const setup=()=>{
 newState();
 S.meta.level=0;
 addWall([0,0],[4000,0],250,"ext","c");
 addCol("rect",[1000,1000],400,400,0,"rc");
 S.meta.level=1;
 addWall([0,3000],[4000,3000],250,"ext","c");
 addCol("rect",[1000,4000],400,400,0,"rc");
};

group("opt.ghost=0 (الافتراضي) — لا شبح",()=>{
 setup();
 S.meta.level=1;
 eq(S.opt.ghost,0,"مُطفأٌ افتراضاً بعد ensureShape");
 RN.invalidate();
 const P=RN.scene().P;
 ok(!P.some(g=>g.ghost),"لا أوّليةٌ مُعلَّمةٌ ghost");
});

group("opt.ghost=1 — يضيف جدران وأعمدة الطابق السفلي معتمةً",()=>{
 setup();
 S.meta.level=1;
 S.opt.ghost=1;
 RN.invalidate();
 const P=RN.scene().P;
 const ghosts=P.filter(g=>g.ghost);
 ok(ghosts.length>0,"أضاف أوّلياتٍ شبحيّة");
 ok(ghosts.every(g=>g.alpha<1&&Array.isArray(g.dash)),
  "كلُّها معتمةٌ ومتقطّعة");
 ok(ghosts.some(g=>g.t==="poly"),"فيها جدارُ الطابق السفلي");
 ok(ghosts.some(g=>g.kid),"فيها عمود الطابق السفلي (kid)");
});

group("الشبح لا يدخل bodies()/BOQ",()=>{
 setup();
 S.meta.level=1;
 S.opt.ghost=1;
 RN.invalidate();
 const c=RN.scene();
 /* solid محسوبةٌ من bodies() المستقلّة عن sceneGhost تماماً —
    تفعيل الشبح لا يزيد مساحتها */
 RN.invalidate();
 S.opt.ghost=0;
 const solidOff=RN.scene().solid;
 RN.invalidate();
 S.opt.ghost=1;
 const solidOn=RN.scene().solid;
 eq(JSON.stringify(solidOn),JSON.stringify(solidOff),
  "bodies() الحقيقية لا تتأثّر بالشبح");
});

group("لا طابقَ تحت الأرضي — لا شبح ولو فُعِّل",()=>{
 setup();
 S.meta.level=0;
 S.opt.ghost=1;
 RN.invalidate();
 const P=RN.scene().P;
 ok(!P.some(g=>g.ghost),"لا طابقَ تحته فلا شيء يُشبَح");
});

summary();
