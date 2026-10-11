#!/usr/bin/env node
/* ═══ حزمةُ نشرٍ نظيفة ═══ P6-003 (و P6-006 اختيارياً)
   كان `publish = "."` ينشر 400 ملفاً و3.85 م.ب: السويتُ كلُّه
   (161 ملفاً · 1.45 م.ب) وCHANGES.md (259 ك.ب) وKNOWN-DEFECTS.md
   وaudit/ وpackage.json — كلُّها قابلةٌ للجلب من المضيف.

   هنا نسخٌ صريحٌ لما يلزم التطبيقَ وحده إلى dist/:
     index.html · 404.html · manifest.json · sw.js · _headers
     favicon.* · apple-touch-icon.png · robots.txt (إن وُجد)
     css/**.css · icons/**.png · js/** عدا js/tests
   ولا شيءَ غيرها. والقائمةُ صريحةٌ لا استثناءاتٌ — فملفٌّ جديدٌ لا
   يُنشَر بالخطأ، بل يُضاف هنا بقصد.

   ═══ التجميعُ اختياريّ ═══ P6-006
   `--bundle` يحاول esbuild إن توفّر فيُنتِج dist مجمَّعاً (ملفٌّ
   واحدٌ بدل 183 modulepreload). وإن لم يتوفّر طبع التوصيةَ وأكمل
   بلا تجميع — فالتشغيلُ غيرُ المجمَّع يبقى ممكناً للتطوير دائماً.

   التشغيل:  node scripts/build-dist.js [--bundle] [--no-strip]     */
import {readdirSync,statSync,mkdirSync,copyFileSync,rmSync,existsSync,
        readFileSync,writeFileSync} from "node:fs";
import {join,dirname,relative} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {stripJS,stripCSS,stripHTML} from "./strip.js";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
/* BUILD_OUT: مجلّدٌ بديل — يستعمله dist-min.test.js فلا يمسّ dist المطوِّر */
const DIST=process.env.BUILD_OUT||join(ROOT,"dist");

export const ROOT_FILES=["index.html","404.html","manifest.json","sw.js",
 "_headers","favicon.ico","favicon.svg","apple-touch-icon.png","robots.txt"];
/* ما لا يُنشَر أبداً — مكتوبٌ صريحاً ليُقرأ لا ليُستنتَج */
export const NEVER=["js/tests","audit","scripts","serving","docs",
 "package.json","CHANGES.md","KNOWN-DEFECTS.md","README.md","LICENSE",
 "dist","node_modules",".git"];

const walk=(dir,out=[])=>{
 for(const n of readdirSync(join(ROOT,dir))){
  const rel=dir+"/"+n;
  if(NEVER.some(x=>rel===x||rel.startsWith(x+"/")))continue;
  const st=statSync(join(ROOT,rel));
  if(st.isDirectory())walk(rel,out); else out.push(rel);
 }
 return out;
};
export function plan(){
 const files=[];
 ROOT_FILES.forEach(f=>{ if(existsSync(join(ROOT,f)))files.push(f) });
 if(existsSync(join(ROOT,"css")))
  walk("css").filter(f=>f.endsWith(".css")).forEach(f=>files.push(f));
 if(existsSync(join(ROOT,"icons")))
  walk("icons").filter(f=>/\.(png|svg)$/.test(f)).forEach(f=>files.push(f));
 if(existsSync(join(ROOT,"js")))
  walk("js").filter(f=>f.endsWith(".js")).forEach(f=>files.push(f));
 return files;
}
function copyAll(files){
 rmSync(DIST,{recursive:true,force:true});
 let bytes=0;
 files.forEach(f=>{
  const dst=join(DIST,f);
  mkdirSync(dirname(dst),{recursive:true});
  copyFileSync(join(ROOT,f),dst);
  bytes+=statSync(dst).size;
 });
 return bytes;
}
/* كلُّ مسارٍ محليٍّ في index.html موجودٌ في dist فعلاً */
export function verify(){
 const html=readFileSync(join(DIST,"index.html"),"utf8");
 const refs=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1])
  .filter(u=>!/^(https?:|data:|blob:|#|mailto:)/.test(u));
 const miss=refs.filter(u=>!existsSync(join(DIST,u.replace(/^\.\//,""))));
 /* وكلُّ استيرادٍ نسبيٍّ في js/app.js */
 const bad=[];
 const seen=new Set(), todo=["js/app.js"];
 const RE=/(?:import\s+(?:[^"'`]*?\s+from\s+)?|import\s*\(\s*)["'](\.[^"']+)["']/g;
 while(todo.length){
  const f=todo.pop();
  if(seen.has(f))continue;
  seen.add(f);
  const p=join(DIST,f);
  if(!existsSync(p)){bad.push(f); continue}
  const src=readFileSync(p,"utf8");
  RE.lastIndex=0;
  let m;
  while((m=RE.exec(src))){
   const rel=relative(DIST,join(DIST,dirname(f),m[1])).split("\\").join("/");
   todo.push(rel);
  }
 }
 /* ولا تسريبَ: لا js/tests ولا audit ولا package.json */
 const leak=NEVER.filter(x=>existsSync(join(DIST,x)));
 return {missingAssets:miss,missingModules:bad,leaked:leak,
  modules:seen.size};
}
/* ═══ التصغيرُ الآمن ═══ (خطّة 1.1.0 · البند ب) — على dist وحده.
   تعليقاتٌ ومسافاتٌ بادئةٌ فقط؛ التفصيلُ والضماناتُ في scripts/strip.js،
   والبرهانُ dist-min.test.js: الأدواتُ الـ150 تُشغَّل على الناتج المصغَّر. */
export function minify(files){
 let before=0, after=0;
 files.forEach(f=>{
  const fn=f.endsWith(".js")?stripJS:f.endsWith(".css")?stripCSS
   :f.endsWith(".html")?stripHTML:null;
  if(!fn)return;
  const p=join(DIST,f), s=readFileSync(p,"utf8"), o=fn(s);
  before+=Buffer.byteLength(s); after+=Buffer.byteLength(o);
  writeFileSync(p,o,"utf8");
 });
 return {before,after};
}
function bundle(){
 try{execFileSync("sh",["-c","command -v esbuild"],{stdio:"ignore"})}
 catch(e){
  console.log("esbuild غير متوفّر — لا تجميع.");
  console.log("التوصية: ثبّته (npm i -g esbuild) ثم أعِد البناء بـ--bundle؛");
  console.log("وحتى ذلك، preload محدودٌ بالرسم الحرج في index.html.");
  return false;
 }
 execFileSync("esbuild",[join(DIST,"js/app.js"),"--bundle","--format=esm",
  "--minify",`--outfile=${join(DIST,"js/app.bundle.js")}`],{stdio:"inherit"});
 const html=join(DIST,"index.html");
 let s=readFileSync(html,"utf8");
 s=s.replace(/\s*<link rel="modulepreload"[^>]*>/g,"");
 s=s.replace(/<script type="module" src="\.\/js\/app\.js"><\/script>/,
  '<script type="module" src="./js/app.bundle.js"></script>');
 writeFileSync(html,s,"utf8");
 console.log("✓ مجمَّع: js/app.bundle.js، وpreload أُزيل من dist/index.html");
 return true;
}
const isMain=process.argv[1]
 &&fileURLToPath(import.meta.url)===process.argv[1];
if(isMain){
 const files=plan();
 const bytes=copyAll(files);
 console.log(`dist: ${files.length} ملفاً · ${bytes} بايت`);
 if(!process.argv.includes("--no-strip")){
  const m=minify(files);
  console.log(`تصغير: ${m.before} ⇐ ${m.after} بايت `
   +`(−${Math.round(100*(1-m.after/Math.max(1,m.before)))}٪) — تعليقاتٌ ومسافاتٌ فقط`);
 }
 if(process.argv.includes("--bundle"))bundle();
 const v=verify();
 if(v.missingAssets.length||v.missingModules.length||v.leaked.length){
  console.error("فحصُ dist فشل:",JSON.stringify(v,null,1));
  process.exit(1);
 }
 console.log(`✓ dist سليم — ${v.modules} وحدةً، ولا تسريب.`);
}
