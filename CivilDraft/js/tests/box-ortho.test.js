/* ═══ الإطارُ لا يُقيَّد بالتعامد ═══ (عيبٌ كشفه تسجيلُ فيديو «شدّ»)
   التعامدُ مفعَّلٌ افتراضاً (S.rb.ortho=1)، والركنُ المقابلُ لإطار «مستطيل» و«شدّ»
   و«منفذ» كان يُلتقَط من الركن الأول مقيَّداً — فيُسقَط على محورٍ ويصير الإطارُ خطّاً.
   الآن الخطوةُ box:1 وsnapBase() يعيد null لها، وbaseOf يبقى للإدخال النسبيّ.
   التشغيل:  node js/tests/box-ortho.test.js                               */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const CO=await import("../core/coords.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
/* نسخةٌ من مسار ui/canvas.js#snap: التعامدُ من الأساس إن وُجد */
const snapLike=(p,from)=>{const c=from&&ST.S.rb.ortho?CO.constrain(from,p,"ortho",15,[]):null; return c?c.p:p};
const clickLike=p=>R.feedPoint(snapLike(p,R.snapBase()),p);

group("كلُّ خطوةِ «ركنٍ مقابل» معلَّمةٌ box",()=>{
 const bad=[];
 R.toolList().forEach(d=>(d.steps||[]).forEach((s,i)=>{if(/(الزاوية|الركن) المقابل|ركن الخليّة|نقطة على القوس|على الضلع/.test(s.p||"")&&!s.box&&!/^dim(rad|dia)$/.test(d.id))bad.push(d.id+"#"+i)}));
 eq(bad.length,0,"لا خطوةَ إطارٍ بلا box"+(bad.length?": "+bad.join(" · "):""));
});
group("المستطيلُ بنقرتين قطريّتين والتعامدُ مفعَّل",()=>{
 ST.newState(); ST.ensureShape(); ST.S.rb.ortho=1; R.toolList().forEach(d=>rig.defs(d.id)); rig.clear();
 R.begin("rect"); clickLike([0,0]);
 eq(R.snapBase(),null,"snapBase لا يقيّد الركنَ المقابل");
 ok(R.baseOf()!=null,"وbaseOf باقٍ للإدخال النسبيّ (@)");
 clickLike([4000,3000]); R.cancel(true);
 eq(ST.S.walls.length,4,"أربعةُ جدران — قبل الإصلاح: «أصغر من 0.5 م» ولا شيء");
 ok(!rig.errs().length,"بلا خطأ");
 /* البرهانُ على العيب القديم: الأساسُ نفسُه يُسقط النقطة على محور */
 const old=snapLike([4000,3000],[0,0]);
 ok(old[1]===0||old[0]===0,"والالتقاطُ من baseOf كان يُسقطها على محور ("+old+")");
});
group("الشدُّ بإطارٍ قطريٍّ والتعامدُ مفعَّل",()=>{
 ST.newState(); ST.ensureShape(); ST.S.rb.ortho=1; rig.clear();
 R.begin("rect"); clickLike([0,0]); clickLike([6000,4000]); R.cancel(true);
 R.begin("stretch"); clickLike([5500,-500]); clickLike([6500,4500]);
 ok(!rig.errs().length,"الإطارُ يلتقط الأطراف"+(rig.errs().length?": "+rig.errs()[0]:""));
 eq(R.snapBase(),null,"ونقطةُ الأساس بعده بلا قيد (base:none)");
 clickLike([6000,0]); clickLike([7500,0]); R.cancel(true);
 ok(ST.S.walls.some(w=>w.a[0]===7500||w.b[0]===7500),"والجدارُ الشرقيّ انتقل إلى 7.5 م");
});
group("المصفوفةُ بركن خليّةٍ قطريّ والتعامدُ مفعَّل",()=>{
 ST.newState(); ST.ensureShape(); ST.S.rb.ortho=1; rig.clear();
 R.begin("col"); clickLike([0,0]); R.cancel(true);
 rig.pick([{k:"col",id:ST.S.cols[0].id}]); R.setOpt("array","nx","4"); R.setOpt("array","ny","3");
 R.begin("array"); clickLike([0,0]); clickLike([3000,2500]); R.cancel(true);
 ok(!rig.errs().length,"بلا «تباعد Y صفر»"+(rig.errs().length?": "+rig.errs()[0]:""));
 eq(ST.S.cols.length,12,"4×3 = 12 عموداً");
 R.setOpt("array","nx","3"); R.setOpt("array","ny","1");
});
group("الجدارُ القوسيُّ بثلاث نقاط والتعامدُ مفعَّل (كشفته حلقة «الجدران»)",()=>{
 ST.newState(); ST.ensureShape(); ST.S.rb.ortho=1; rig.clear();
 R.begin("arcwall"); clickLike([0,0]); clickLike([4000,0]); clickLike([2000,1600]); R.cancel(true);
 ok(!rig.errs().length,"بلا «النقاط الثلاث على استقامة»"+(rig.errs().length?": "+rig.errs()[0]:""));
 eq(ST.S.walls.length,1,"جدارٌ قوسيٌّ واحد"); ok(ST.S.walls[0]&&ST.S.walls[0].bulge,"بانحناء");
});
group("البُعدُ الزاويُّ بضلعين مائلين والتعامدُ مفعَّل",()=>{
 ST.newState(); ST.ensureShape(); ST.S.rb.ortho=1; rig.clear();
 R.begin("dimang"); clickLike([0,0]); clickLike([3000,1000]); clickLike([1000,3000]);
 ok(!rig.errs().length,"بلا خطأ"+(rig.errs().length?": "+rig.errs()[0]:""));
 R.cancel(true);
});
group("البُعدُ بين نقطتين متباعدتين قطرياً والتعامدُ مفعَّل (مسحُ ما قبل المرحلة ٥)",()=>{
 for(const [kind,want] of [["h",2200],["v",2700],["al",Math.round(Math.hypot(2200,2700))]]){
  ST.newState(); ST.ensureShape(); ST.S.rb.ortho=1; rig.clear(); R.setOpt("dim","kind",kind);
  R.begin("dim"); clickLike([0,1300]); clickLike([2200,4000]); R.feedPoint([3000,5000],[3000,5000]); R.cancel(true);
  ok(!rig.errs().length,`${kind}: بلا خطأ`+(rig.errs().length?": "+rig.errs()[0]:""));
  const d=ST.S.dims[0]; const v=d?Math.round(kind==="h"?Math.abs(d.b[0]-d.a[0]):kind==="v"?Math.abs(d.b[1]-d.a[1]):Math.hypot(d.b[0]-d.a[0],d.b[1]-d.a[1])):-1;
  eq(v,want,`${kind}: المقيسُ ${want}`);
 }
 R.setOpt("dim","kind","h");
});
process.exit(summary()?1:0);
