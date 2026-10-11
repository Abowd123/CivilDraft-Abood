/* ═══ «امسح المحاور» ═══ (مسحُ ما قبل المرحلة ٥: الزرُّ الوحيدُ في «تأشير» بلا اختبار)
   الدالةُ في core/dims.js، والزرُّ في ui/props.js يستعملها ويفحص فشلَ التعديل
   ولا يصمت إن لم تكن محاور. */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const DM=await import("../core/dims.js");
group("clearAxes تُفرِغ وتُعيد العدد وتُتراجَع",()=>{
 ST.newState(); ST.ensureShape(); ST.clearHistory&&ST.clearHistory();
 ST.edit(()=>{DM.addAxis("x",0); DM.addAxis("x",4000); DM.addAxis("y",0)});
 eq(ST.S.grid.xs.length+ST.S.grid.ys.length,3,"ثلاثة محاور");
 let n=-1; ST.edit(()=>{n=DM.clearAxes()});
 eq(n,3,"تُعيد 3"); eq(ST.S.grid.xs.length+ST.S.grid.ys.length,0,"ولا يبقى محور");
 ST.undo(); eq(ST.S.grid.xs.length+ST.S.grid.ys.length,3,"وCtrl+Z يعيدها");
 ST.newState(); ST.ensureShape(); eq(DM.clearAxes(),0,"ولا شيء = 0");
});
group("الزرُّ يستعملها ولا يصمت",()=>{
 const s=readFileSync(HERE+"../ui/props.js","utf8");
 const h=s.slice(s.indexOf('$("#bAxClr").onclick'),s.indexOf('$("#bRefAll")'));
 ok(/clearAxes\(\)/.test(h),"يستدعي clearAxes");
 ok(/editFailed\(\)/.test(h),"ويفحص فشلَ التعديل");
 ok(/لا محاور لتُمسح/.test(h),"ويقول إن لم تكن محاور");
});
process.exit(summary()?1:0);
