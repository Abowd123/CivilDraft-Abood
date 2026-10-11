/* ═══ التصدير الدفعي — D2: الواجهة ═══
   node js/tests/export-all-ui.test.js
   ١) planForSheet لورقتين: أوّليات غير فارغة وأسماء مختلفة.
   ٢) رصفُ الواجهة: عناصر «كل الأوراق» في props.js وربطها في inspector.js.
   ٣) عقدُ نتيجة runAll الذي يعتمد عليه معالج الزرّ (zip / files / singlePdf). */
import {shim,shimCanvas,group,groupAsync,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
shim(); shimCanvas();
const {newState,ensureShape,edit}=await import("../core/state.js");
const W=await import("../core/walls.js");
const RN=await import("../core/render.js");
const SH=await import("../core/sheet.js");
const EX=await import("../io/export.js");
const here=dirname(fileURLToPath(import.meta.url));
const src=f=>readFileSync(join(here,"..",f),"utf8");

const reset=()=>{newState(); ensureShape(); RN.invalidate()};
const mk=(name,size)=>edit(()=>{
 const sh=SH.addSheet({name,size,orient:"l"});
 SH.addViewport(sh.id,{modelRect:{x0:-500,y0:-500,x1:1500,y1:1500},
  paperRect:{x0:0,y0:0,x1:100,y1:100}});
 return sh;
},"ورقة");

group("كل ورقة لها أوّلياتها وأسماؤها مختلفة",()=>{
 reset();
 W.addWall([0,0],[1000,0],200,"ext","c"); RN.invalidate();
 const a=mk("A-101","A3"), b=mk("A-102","A3");
 const p1=EX.planForSheet(a,"pdf"), p2=EX.planForSheet(b,"pdf");
 ok(p1.P.length>0&&p2.P.length>0,"كل ورقة لها prims");
 ok(p1.name!==p2.name,"أسماء مختلفة");
});

group("الواجهة: العناصر في props.js",()=>{
 const p=src("ui/props.js");
 ok(/id="xAllSheets"/.test(p),"خانة xAllSheets");
 ok(/id="xAllOpts"/.test(p),"حاوية الخيارات");
 ok(/name="allMode" value="zip" checked/.test(p),"zip افتراضيّ");
 ok(/name="allMode" value="singlePdf"/.test(p),"singlePdf");
 ok(p.indexOf('id="xAllSheets"')>p.indexOf('data-sec="export"')
  &&p.indexOf('id="xAllSheets"')<p.indexOf('id="xInfo"'),
  "داخل قسم التصدير قبل xInfo");
});

group("الواجهة: الربط في inspector.js",()=>{
 const s=src("ui/inspector.js");
 ok(/visibleViewportCount/.test(s.split("\n").slice(0,40).join("\n")),
  "visibleViewportCount مستورَد");
 ok(/import \{createZip\} from "\.\.\/io\/zip\.js"/.test(s),"createZip مستورَد");
 ok(/EX\.preflightAll\(fmt\)/.test(s)&&/EX\.runAll\(fmt/.test(s),
  "مسار الدفعة يستعمل preflightAll/runAll");
 ok(/allSheets:true/.test(s)&&/allMode:mode/.test(s),"يمرّر allSheets وallMode");
 ok(/xAll\.onchange/.test(s),"onchange للخانة");
 ok(s.indexOf("const syncExport")<s.indexOf("xAll.onchange"),
  "syncExport معرَّفٌ قبل استعماله في onchange");
 ok(/EX\.run\(fmt,\{dark/.test(s),"مسار الورقة الواحدة باقٍ");
});

await groupAsync("عقد runAll الذي يعتمد عليه الزرّ",async()=>{
 reset();
 W.addWall([0,0],[1000,0],200,"ext","c"); RN.invalidate();
 mk("A-101","A3"); mk("A-102","A3");
 const z=await EX.runAll("svg",{allSheets:true,allMode:"zip"});
 ok(z.ok&&z.files.length===2&&z.zip&&z.zip.raw.length>100,"zip: files+zip");
 const f=await EX.runAll("svg",{allSheets:true,allMode:"files"});
 ok(f.ok&&f.files.length===2&&!f.zip&&f.files.every(x=>x.raw&&x.raw.length),
  "files: raw متاح لبناء ZIP في الواجهة");
 const s=await EX.runAll("pdf",{allSheets:true,allMode:"singlePdf"});
 ok(s.ok&&!s.files&&(s.blob||s.raw)&&/كل_الأوراق\.pdf$/.test(s.name),
  "singlePdf: ملفٌّ مفرد بلا files");
 const n=await EX.runAll("svg",{allSheets:false});
 ok(n.ok&&!n.files,"بلا allSheets: السلوك القديم");
});

process.exit(summary()?1:0);
