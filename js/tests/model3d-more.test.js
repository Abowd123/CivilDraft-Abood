/* ═══ المجسّم: البلاطةُ الإنشائية والكمرة والسقفُ المائل ═══ (فحصُ ما بعد المرحلة ٧)
   كانت «بلاطة» لا تظهر (المجسّم يقرأ المناطق وحدها)، وكلُّ سقفٍ لوحاً مسطّحاً
   ولو كان جمالوناً أو هرمياً بميل 30%. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,near,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const M=await import("../core/model3d.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
const fresh=()=>{ST.newState(); ST.ensureShape(); rig.clear()};
const ring=[[0,0],[8000,0],[8000,4000],[0,4000]];
group("«بلاطة» و«كمرة» تظهران",()=>{
 fresh(); R.begin("slab"); ring.forEach(p=>rig.at(...p)); rig.enter(); rig.esc();
 R.begin("beam"); rig.at(0,2000); rig.at(8000,2000); rig.esc();
 const m=M.build3d(ST.S,{});
 const sl=m.faces.filter(f=>f.kind==="slab");
 ok(sl.length>0,"وجوهُ البلاطة موجودة");
 const zs=sl.flatMap(f=>f.pts.map(p=>p[2]));
 eq(Math.min(...zs),-150,"بسماكتها 0.15 تحت المنسوب"); eq(Math.max(...zs),0,"وأعلاها المنسوب");
 const bz=m.faces.filter(f=>f.kind==="col").flatMap(f=>f.pts.map(p=>p[2]));
 ok(bz.length&&Math.max(...bz)===3000&&Math.min(...bz)===2500,"والكمرةُ 0.50 تحت سقف الطابق");
});
for(const [type,H,n] of [["gable",600,4],["hip",600,4],["shed",1200,4]]){
 group(`سقف «${type}» بميل 30% على 8×4 م`,()=>{
  fresh(); R.setOpt("roof","type",type); R.setOpt("roof","slope","30");
  R.begin("roof"); ring.forEach(p=>rig.at(...p)); rig.enter(); rig.esc();
  const m=M.build3d(ST.S,{}), rf=m.faces.filter(f=>f.kind==="roof");
  const z0=ST.S.roofs[0].h, zs=rf.flatMap(f=>f.pts.map(p=>p[2]));
  eq(rf.length,n,`${n} سطوح`);
  near(Math.max(...zs)-z0,H,1,`الارتفاع ${H} = 30% × ${type==="shed"?"العرض":"نصف العرض"}`);
  eq(m.roofFlat,0,"ولا يُعَدّ مسطّحاً");
  const up=rf.filter(f=>f.n[2]>0.1).length;
  ok(up>=(type==="shed"?1:2),"والسطوحُ المائلة ناظمُها للأعلى (تُرى من فوق)");
  R.setOpt("roof","type","flat"); R.setOpt("roof","slope","5");
 });
}
group("سقفٌ مائلٌ غير مستطيل يبقى مسطّحاً ويُعَدّ",()=>{
 fresh(); R.setOpt("roof","type","hip"); R.setOpt("roof","slope","30");
 R.begin("roof"); [[0,0],[8000,0],[8000,4000],[3000,6000],[0,4000]].forEach(p=>rig.at(...p)); rig.enter(); rig.esc();
 const m=M.build3d(ST.S,{}); eq(m.roofFlat,1,"roofFlat = 1");
 R.setOpt("roof","type","flat"); R.setOpt("roof","slope","5");
});
group("pitchedRoof مباشرةً",()=>{
 eq(M.pitchedRoof([[0,0],[4000,0],[3000,3000],[0,3000]],3000,"hip",30,0),null,"غيرُ المستطيل ⇒ null");
 eq(M.pitchedRoof(ring,3000,"gable",0,0),null,"وميلُ صفرٍ ⇒ null (مسطّح)");
 eq((M.pitchedRoof(ring,3000,"gable",30,0)||[]).length,4,"والجمالون أربعة سطوح");
});
process.exit(summary()?1:0);
