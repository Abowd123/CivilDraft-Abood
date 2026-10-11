/* ═══ تغليف سطح المكتب: ما يدخل الحزمة وما يُنتَج ═══
   node js/tests/packaging.test.js
   لا electron-builder هنا: يُفحَص الإعدادُ نصّاً، وحارسُ after-pack بقوائم مدخلاتٍ مصطنَعة،
   وأيقونةُ الملفّات من ترويسة ICO، وسكربتُ release-info على مجلّدٍ مؤقّت. */
import {createRequire} from "node:module";
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {group,ok,eq,summary} from "./harness.js";

const require=createRequire(import.meta.url);
const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..","..");
const read=f=>readFileSync(join(ROOT,f),"utf8");
const {inspect}=require("../../scripts/after-pack.cjs");
const {armArgs}=await import("../../scripts/dist-win-arm.js");
const {collect,fmtSize,sha256}=await import("../../scripts/release-info.js");

group("electron-builder.yml: قائمةٌ بيضاء واستثناءاتٌ صريحة",()=>{
 const y=read("electron-builder.yml");
 ["desktop/**","dist/**","build/icon.ico","package.json"].forEach(p=>
  ok(y.includes("  - "+p+"\n"),"يُحزَم: "+p));
 ["!**/js/tests/**","!**/audit/**","!**/docs/**","!**/*.map","!desktop/e2e/**"].forEach(p=>
  ok(y.includes('"'+p+'"'),"يُستثنى: "+p));
 ok(!/^\s+-\s+(js|audit|docs|css|index\.html)/m.test(y),"لا يُحزَم المصدر ولا الجذر");
 ok(/afterPack:\s*\.\/scripts\/after-pack\.cjs/.test(y),"حارس الحزمة مربوط");
 ok(/icon:\s*build\/file-icon\.ico/.test(y),"أيقونة .cdraft منفصلة");
 ok(/arch:\s*\[x64\]/.test(y),"أهدافُ x64 كما هي");
});

group("after-pack.inspect",()=>{
 const good=["/desktop","/desktop/main.cjs","/desktop/preload.cjs","/dist","/dist/index.html",
  "\\dist\\js\\app.js","/build","/build/icon.ico","/package.json"];
 eq(inspect(good).problems.length,0,"حزمةٌ سليمة (مع مسارات ويندوز)");
 const bad=(x)=>inspect([...good,x]).problems.length>0;
 ok(bad("/dist/js/tests/all.js"),"dist/js/tests مرفوض");
 ok(bad("/audit/INDEX.md"),"audit مرفوض");
 ok(bad("/docs/tools.md"),"docs مرفوض");
 ok(bad("/js/app.js"),"جذر js مرفوض");
 ok(bad("/desktop/e2e/helpers.js"),"desktop/e2e مرفوض");
 ok(bad("/css/base.css"),"جذر css مرفوض");
 ok(bad("/dist/js/app.js.map"),"خريطة مصدر مرفوضة");
 ok(bad("/dist/README.md"),"markdown مرفوض");
 ok(bad("/build/file-icon.ico"),"داخل build غير الأيقونة مرفوض");
 ok(bad("/node_modules/x/index.js"),"node_modules بلا اعتماديات مرفوض");
 eq(inspect([...good,"/node_modules/x/index.js"],{hasDeps:true}).problems.length,0,"…ومسموحٌ إن وُجدت اعتماديات");
 ok(inspect(good.filter(e=>e!=="/dist/index.html")).problems.some(p=>p.includes("index.html")),"dist بلا index.html مرفوض");
});

group("build/file-icon.ico: 16 · 32 · 48 · 256",()=>{
 const b=readFileSync(join(ROOT,"build","file-icon.ico"));
 eq(b.readUInt16LE(0),0,"reserved");
 eq(b.readUInt16LE(2),1,"type=ICO");
 const n=b.readUInt16LE(4), sizes=[];
 for(let i=0;i<n;i++){ const w=b[6+16*i]; sizes.push(w===0?256:w);
  const len=b.readUInt32LE(6+16*i+8), off=b.readUInt32LE(6+16*i+12);
  ok(b.subarray(off,off+8).toString("hex")==="89504e470d0a1a0a"&&off+len<=b.length,"مدخلُ PNG سليم "+sizes[i]) }
 eq(sizes.sort((a,b)=>a-b).join(),"16,32,48,256","المقاسات");
});

group("dist:win:arm",()=>{
 const a=armArgs(["--publish","never"]);
 ok(a.includes("--arm64")&&a.includes("nsis")&&a.includes("portable"),"أهدافٌ صريحة + arm64");
 ok(a.some(x=>x.includes("nsis.artifactName")&&x.includes("-arm64.${ext}")),"اسم المثبّت يحمل arm64");
 ok(a.some(x=>x.includes("portable.artifactName")&&x.includes("-arm64.${ext}")),"اسم المحمول يحمل arm64");
 eq(a.slice(-2).join(),"--publish,never","الوسائط الإضافية تُمرَّر");
 const p=JSON.parse(read("package.json")).scripts;
 ok(/build-dist\.js && node scripts\/dist-win-arm\.js/.test(p["dist:win:arm"]),"السكربت يبني dist أولاً");
 ok(/--win$/.test(p["dist:win"]),"dist:win لم يتغيّر (x64 من الإعداد)");
});

group("release-info",()=>{
 const d=mkdtempSync(join(tmpdir(),"rel-"));
 try{
  writeFileSync(join(d,"a.exe"),Buffer.alloc(2500000,7));
  writeFileSync(join(d,"b.yml"),"abc");
  mkdirSync(join(d,"win-unpacked")); writeFileSync(join(d,"win-unpacked","x.dll"),"x");
  writeFileSync(join(d,"SHA256SUMS.txt"),"old");
  const r=collect(d);
  eq(r.files.map(f=>f.rel).join(),"a.exe,b.yml","الملفّات المباشرة، بلا SHA256SUMS");
  eq(r.skippedDirs.join(),"win-unpacked","المجلّد يُذكَر مُتخطًّى");
  eq(r.files[1].sha256,createHash("sha256").update("abc").digest("hex"),"SHA256 صحيحة");
  eq(r.files[0].size,2500000,"الحجم بالبايت");
  eq(collect(d,true).files.map(f=>f.rel).join(),"a.exe,b.yml,win-unpacked/x.dll","--all يشمل الفرعيّة");
  eq(sha256(join(d,"a.exe")),createHash("sha256").update(Buffer.alloc(2500000,7)).digest("hex"),"تجزئةٌ مجزّأة = كاملة");
  eq(fmtSize(3),"3 B","B"); eq(fmtSize(2048),"2.0 KB","KB"); eq(fmtSize(3145728),"3.00 MB","MB");
 }finally{ rmSync(d,{recursive:true,force:true}) }
});
summary();
