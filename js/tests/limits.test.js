/* ═══ اختبار 2.1: الحدود الموحَّدة ═══
   بنية LIM وقيمُه وinLim. لا يلمس الحالة ولا الواجهة.
   ويثبّت أنّ مصدر الحدّ واحد: ما يستعمله القارئ والمُثبِّت
   والوحدات هو LIM نفسه لا نسخةٌ منه.                              */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {LIM,limMin,limMax,inLim}=await import("../core/limits.js");
const W=await import("../core/walls.js");
const U=await import("../core/units.js");
const DX=await import("../io/dxfin.js");
const UL=await import("../core/underlay.js");

group("LIM — البنية",()=>{
 ok(LIM&&typeof LIM==="object","LIM موجود");
 ok(Object.isFrozen(LIM),"LIM مجمَّد");
 ["coord","length","thickness","height","vertices","elements","text",
  "imageBytes","refEnts","refPts","blockPrims","blockDefs"].forEach(k=>{
  ok(LIM[k]&&Object.isFrozen(LIM[k]),`LIM.${k} معرَّف ومجمَّد`);
  ok(limMin(LIM[k])<=limMax(LIM[k]),`LIM.${k}: الأدنى ≤ الأقصى`);
 });
});
group("LIM — القيم",()=>{
 eq(limMax(LIM.coord),1e9,"سقف الإحداثيّ ١٠⁹ مم");
 eq(limMin(LIM.coord),-1e9,"وأدناه −١٠⁹");
 eq(limMin(LIM.thickness),50,"أدنى السماكة 50");
 eq(limMax(LIM.thickness),1000,"وأقصاها 1000");
 eq(limMax(LIM.text),120,"نصّ التأشير 120");
});
group("مصدرٌ واحد — لا نسخةَ تنجرف",()=>{
 eq(W.TMIN,limMin(LIM.thickness),"TMIN في walls.js = LIM.thickness.min");
 eq(W.TMAX,limMax(LIM.thickness),"TMAX في walls.js = LIM.thickness.max");
 eq(DX.MAXCO,LIM.coord.max,"MAXCO في dxfin = LIM.coord.max");
 eq(DX.MAXENT,LIM.refEnts.max,"MAXENT في dxfin = LIM.refEnts.max");
 eq(DX.MAXPTS,LIM.refPts.max,"MAXPTS في dxfin = LIM.refPts.max");
 eq(UL.MAX_SRC,LIM.imageBytes.max,"MAX_SRC في underlay = LIM.imageBytes.max");
 /* G9-5-12: المُدخَل بالمتر (1e9 م = 1e12 مم) بينما LIM.coord.max بالمليمتر (1e9 مم) */
 eq(U.Mx(1e9),null,"Mx يرفض ما فوق سقف الإحداثيّ (متر→مم)");
 eq(U.Mx(999999),999999000,"ويقبل ما دونه");
});
group("inLim — الفحص",()=>{
 ok(inLim(0,LIM.coord),"0 داخل الإحداثيّ");
 ok(inLim(1e9,LIM.coord),"1e9 على الحدّ");
 ok(!inLim(1e9+1,LIM.coord),"فوق الحدّ");
 ok(!inLim(-1e9-1,LIM.coord),"تحت الحدّ");
 ok(inLim(200,LIM.thickness),"سماكة 200");
 ok(!inLim(0,LIM.thickness),"سماكة 0 مرفوضة");
 ok(!inLim(20000,LIM.thickness),"سماكة 20 م مرفوضة");
 ok(inLim(5,null),"بلا حدّ = مقبول");
 ok(!inLim(NaN,null),"NaN مرفوض حتى بلا حدّ");
 ok(!inLim("5",LIM.coord),"النصّ ليس رقماً");
 ok(!inLim(Infinity,null),"Infinity مرفوض");
});
process.exit(summary()?1:0);
