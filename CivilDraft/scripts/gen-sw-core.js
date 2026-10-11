#!/usr/bin/env node
/* ═══ توليدُ قائمة CORE في sw.js ═══ P6-002
   كانت CORE خمسةَ ملفّاتٍ مكتوبةً بيد، فأوّلُ زيارةٍ لا تضمن تخزين
   الرسمِ كلِّه والوحداتُ الكسولةُ لا تعمل دون اتصالٍ حتى تُستعمل مرّةً.
   هنا تُقرأ الاستيراداتُ الحقيقية من js/app.js (الساكنةُ والكسولة
   معاً) ويُضاف إليها HTML وCSS وأصولُ الجذر والأيقونات، ثم تُكتَب
   بين علامتَي CORE:BEGIN/END.

   يُشغَّل عند إضافة ملفٍّ أو إزالته، ويحرسه sw-core.test.js: قائمةٌ
   قديمةٌ تُسقِط البناء بدل أن تُكتشَف على جهاز مستخدم.
   التشغيل:  node scripts/gen-sw-core.js  [--check]                 */
import {readFileSync,writeFileSync,readdirSync,existsSync} from "node:fs";
import {join,dirname,resolve,relative} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");

/* كلُّ استيرادٍ نسبيٍّ — ساكناً كان أو حركياً */
const RE=/(?:import\s+(?:[^"'`]*?\s+from\s+)?|import\s*\(\s*)["']([^"']+)["']/g;
export function graphOf(entry){
 const seen=new Set(), todo=[entry];
 while(todo.length){
  const f=todo.pop();
  if(seen.has(f))continue;
  seen.add(f);
  let src="";
  try{src=rd(f)}catch(e){continue}
  RE.lastIndex=0;
  let m;
  while((m=RE.exec(src))){
   const spec=m[1];
   if(spec[0]!==".")continue;           /* لا وحداتَ خارجية في المشروع */
   const abs=resolve(join(ROOT,dirname(f)),spec);
   const rel=relative(ROOT,abs).split("\\").join("/");
   if(existsSync(join(ROOT,rel)))todo.push(rel);
  }
 }
 return [...seen].sort();
}
export function coreList(){
 const js=graphOf("js/app.js");
 const boot=existsSync(join(ROOT,"js/boot-splash.js"))
  ?graphOf("js/boot-splash.js"):[];
 const css=readdirSync(join(ROOT,"css")).filter(n=>/\.css$/.test(n))
  .map(n=>"css/"+n).sort();
 const root=["index.html","manifest.json","favicon.svg","favicon.ico",
  "apple-touch-icon.png"].filter(f=>existsSync(join(ROOT,f)));
 const icons=existsSync(join(ROOT,"icons"))
  ?readdirSync(join(ROOT,"icons")).filter(n=>/\.(png|svg)$/.test(n))
    .map(n=>"icons/"+n).sort():[];
 const all=["./"].concat(
  [...new Set(root.concat(css,icons,js,boot))].map(p=>"./"+p));
 return all;
}
function render(list){
 /* سطورٌ قصيرةٌ مقروءة: ستّةُ مسارات في السطر */
 const q=list.map(x=>JSON.stringify(x));
 const lines=[];
 for(let i=0;i<q.length;i+=4)lines.push(" "+q.slice(i,i+4).join(","));
 return "const CORE=[\n"+lines.join(",\n")+"\n];";
}
const isMain=process.argv[1]
 &&fileURLToPath(import.meta.url)===process.argv[1];
if(isMain){
 const check=process.argv.includes("--check");
 const sw=rd("sw.js");
 const a=sw.indexOf("/* CORE:BEGIN */"), b=sw.indexOf("/* CORE:END */");
 if(a<0||b<0){console.error("علامتا CORE مفقودتان في sw.js"); process.exit(1)}
 const want=render(coreList());
 const have=sw.slice(a+16,b).trim();
 if(have===want.trim()){console.log(`CORE محدَّثة — ${coreList().length} مورداً`); process.exit(0)}
 if(check){
  console.error("CORE قديمة. شغّل: node scripts/gen-sw-core.js");
  process.exit(1);
 }
 writeFileSync(join(ROOT,"sw.js"),
  sw.slice(0,a+16)+"\n"+want+"\n"+sw.slice(b),"utf8");
 console.log(`كُتبت CORE — ${coreList().length} مورداً`);
}
