/* MT1 — معاينة الجدار القوسي الجاري: نصف القطر والزاوية يُقرآن قبل
   النقرة، وسببُ الرفض يُقال نصّاً لا بلونٍ وحده.
   التشغيل: node js/tests/arcwall-preview.test.js */
import {shim,group,ok,summary} from "./harness.js";
shim();
const {newState}=await import("../core/state.js");
const R=await import("../tools/registry.js");
await import("../tools/draw.js");

group("معاينة القوس الجاري — MT1",()=>{
 newState(); R.loadOpts();
 R.setOpt("arcwall","t","0.15");
 R.begin("arcwall");
 R.feedPoint([0,0]);
 R.feedPoint([4000,0]);
 R.T.ghost=[2000,1000];
 const P=R.preview();
 ok(P.some(g=>g.t==="tx"&&/R /.test(g.s)&&/°/.test(g.s)),
  "الشعاعُ والزاوية مكتوبان قبل النقرة");
 R.cancel(true);
});

group("معاينة رفض القوس الضيّق — MT1",()=>{
 newState(); R.loadOpts();
 R.setOpt("arcwall","t","0.4");      /* 400مم > 2×R=200مم */
 R.begin("arcwall");
 R.feedPoint([0,0]);
 R.feedPoint([200,0]);
 R.T.ghost=[100,100];                 /* نصف دائرة: R=100 */
 const P=R.preview();
 ok(P.some(g=>g.t==="tx"&&/مرفوض/.test(g.s)),
  "سببُ الرفض نصّيٌّ قبل النقرة");
 R.cancel(true);
});

process.exit(summary());
