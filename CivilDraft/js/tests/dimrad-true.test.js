/* ═══ «نصف قطر» و«قطر» على قوسٍ حقيقيّ ═══ (حلقة المرحلة ٥ «أقواس وزوايا وقياس»)
   ثلاثة عيوب تراكبت: «مركز» يخطف «نقطة على القوس» (الأساس نفسه يُلتقَط)
   فيُرفَض بـ«أقل من 10 مم»، والتعامدُ يُسقط النقطة على محورٍ فيقصر نصف القطر،
   والنقرةُ القريبة من الخطّ تُعطي نصفَ قطرٍ تقريبيّاً بصمت. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const CO=await import("../core/coords.js");
const OS=await import("../core/osnap.js");
const EN=await import("../core/ents.js");
const RN=await import("../core/render.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,150,k),invalidate:()=>RN.invalidate()});
/* كما في ui/canvas.js#snap: الالتقاط أولاً ثم التعامد من snapBase */
const click=p=>{const from=R.snapBase(); const o=OS.osnap(p[0],p[1],250,R.osBase());
 let q=o?o.p:p; if(!o&&from&&ST.S.rb.ortho){const c=CO.constrain(from,p,"ortho",15,[]); if(c)q=c.p}
 return R.feedPoint(q,p)};
const scene=()=>{ST.newState(); ST.ensureShape(); ST.S.rb.ortho=1; ST.S.rb.snap=1; rig.clear();
 R.begin("arcwall"); rig.at(0,0); rig.at(4000,0); rig.at(2000,2000); rig.esc(); rig.clear(); RN.invalidate()};

for(const [id,f] of [["dimrad",1],["dimdia",2]]){
 group(`«${id}»: المركز بالالتقاط ثم نقطةٌ مائلةٌ قربَ القوس`,()=>{
  scene(); R.begin(id);
  click([2050,80]);                        /* قربَ المركز */
  eq(JSON.stringify(R.T.ctx.pts[0]),"[2000,0]","المركزُ مُلتقَط");
  click([3400,1440]);                      /* مائلة، على بُعد ~22 مم من القوس */
  ok(!rig.errs().length,"بلا «أقل من 10 مم»"+(rig.errs().length?": "+rig.errs()[0]:""));
  click([4200,2600]); R.cancel(true);
  const d=ST.S.dims.at(-1);
  ok(d,"البُعدُ موضوع");
  eq(d&&Math.round(d.r||0),2000,"ونصفُ القطر 2.000 م بحرفه");
 });
}
group("نقطةُ الأساس لا تُلتقَط لنفسها",()=>{
 scene();
 eq(OS.osnap(2050,80,250,null).m,"cen","بلا أساس: المركز");
 const o=OS.osnap(3400,1440,250,[2000,0]);
 ok(!o||o.m!=="cen","ومن المركز أساساً: لا يُعاد المركز");
});
process.exit(summary()?1:0);
