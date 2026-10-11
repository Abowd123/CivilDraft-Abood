#!/usr/bin/env node
/* ═══ حجمُ كلّ ملفٍّ في release/ وبصمةُ SHA256 ═══  npm run release:info
   افتراضياً: الملفّاتُ المباشرة في release/ (المثبّت والمحمول وblockmap وyml).
   --all    يشمل المجلّداتِ الفرعيّة أيضاً (win-unpacked كبيرٌ جداً)
   --sums   يكتب release/SHA256SUMS.txt بصيغة sha256sum (تُتحقَّق بـ sha256sum -c)
   RELEASE_DIR=… يغيّر المجلّد (للاختبار). الخروج 1 إن لم يوجد المجلّد أو كان بلا ملفّات. */
import {existsSync,readdirSync,statSync,openSync,readSync,closeSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const SUMS="SHA256SUMS.txt";

export function sha256(file){
 const h=createHash("sha256"), buf=Buffer.allocUnsafe(1<<20), fd=openSync(file,"r");
 try{ for(;;){ const n=readSync(fd,buf,0,buf.length,null); if(!n)break; h.update(buf.subarray(0,n)) } }
 finally{ closeSync(fd) }
 return h.digest("hex");
}
export function fmtSize(b){
 return b<1024?b+" B":b<1048576?(b/1024).toFixed(1)+" KB":(b/1048576).toFixed(2)+" MB";
}
/* يعيد {files:[{rel,size,sha256}], skippedDirs:[…]} مرتّبةً بالاسم */
export function collect(dir,all=false){
 const files=[], skippedDirs=[];
 const walk=(d,base)=>{
  for(const n of readdirSync(d).sort()){
   const p=join(d,n), rel=base?base+"/"+n:n, st=statSync(p);
   if(st.isDirectory()){ all?walk(p,rel):skippedDirs.push(n); continue }
   if(!base&&n===SUMS)continue;
   files.push({rel,size:st.size,sha256:sha256(p)});
  }
 };
 walk(dir,"");
 return {files,skippedDirs};
}
export function render(files){
 const w=Math.max(...files.map(f=>f.rel.length),4);
 const lines=[`${"الملف".padEnd(w)}  ${"الحجم".padStart(10)}  SHA256`];
 files.forEach(f=>lines.push(`${f.rel.padEnd(w)}  ${fmtSize(f.size).padStart(10)}  ${f.sha256}`));
 return lines.join("\n");
}
const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(isMain){
 const dir=process.env.RELEASE_DIR||join(ROOT,"release");
 if(!existsSync(dir)){console.error("لا يوجد مجلّد release/ — ابنِ أولاً: npm run dist:win");process.exit(1)}
 const all=process.argv.includes("--all");
 const {files,skippedDirs}=collect(dir,all);
 if(!files.length){console.error("release/ بلا ملفّات");process.exit(1)}
 console.log(render(files));
 console.log(`\n${files.length} ملفّاً — ${fmtSize(files.reduce((a,f)=>a+f.size,0))}`);
 if(skippedDirs.length)console.log(`تُخطِّي مجلّدات: ${skippedDirs.join("، ")} (أضف --all لشمولها)`);
 if(process.argv.includes("--sums")){
  writeFileSync(join(dir,SUMS),files.map(f=>`${f.sha256} *${f.rel}`).join("\n")+"\n");
  console.log(`✓ كُتب ${SUMS}`);
 }
}
