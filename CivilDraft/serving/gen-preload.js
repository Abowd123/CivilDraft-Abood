/* يولّد وسوم modulepreload لكل الوحدات المستورَدة ساكناً من app.js ويحقنها
   في index.html بين علامتي PRELOAD. بدونها يُنزِّل المتصفّح الوحدات
   شلّالاً (كل مستوى استيراد = رحلة شبكة)، وعلى الهاتف يتجاوز ذلك المهلة.
   الاستخدام: node serving/gen-preload.js  (أعِد التشغيل بعد إضافة وحدة)
   --check يفشل إن كان index.html متقادماً. */
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
export function graph(entry="js/app.js"){
 const seen=new Set(), out=[];
 (function walk(rel){
  if(seen.has(rel))return; seen.add(rel);
  const src=fs.readFileSync(path.join(root,rel),"utf8");
  const dir=path.posix.dirname(rel);
  for(const m of src.matchAll(/(?:^|[;\s}])import\s*(?:[^"'()]*?\s*from\s*)?["'](\.[^"']+)["']/gm)){
   walk(path.posix.normalize(path.posix.join(dir,m[1])));
  }
  for(const m of src.matchAll(/(?:^|[;\s}])export\s*(?:\*|\{[^}]*\})\s*from\s*["'](\.[^"']+)["']/gm)){
   walk(path.posix.normalize(path.posix.join(dir,m[1])));
  }
  out.push(rel);
 })(entry);
 return out;
}
export const block=()=>"<!-- PRELOAD:begin (serving/gen-preload.js) -->\n"
 +graph().map(f=>`<link rel="modulepreload" href="${f}">`).join("\n")
 +"\n<!-- PRELOAD:end -->";
export function apply(html){
 const re=/<!-- PRELOAD:begin[\s\S]*?<!-- PRELOAD:end -->/;
 return re.test(html)?html.replace(re,block())
  :html.replace('<script type="module" src="js/bootguard.js">',block()+'\n<script type="module" src="js/bootguard.js">');
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const f=path.join(root,"index.html"), cur=fs.readFileSync(f,"utf8"), nxt=apply(cur);
 if(process.argv.includes("--check")){
  if(cur!==nxt){console.error("index.html متقادم: شغّل node serving/gen-preload.js");process.exit(1)}
  console.log("preload محدَّث");
 }else{fs.writeFileSync(f,nxt);console.log("حُدِّث index.html —",graph().length,"وحدة")}
}
