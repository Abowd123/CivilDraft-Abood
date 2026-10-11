/* ═══ اللقطات الذهبية ═══
   تُقارن أوّليات المشهد، لا بكسلات canvas، لأن هذه هي البيانات التي
   يقرأها الرسم والتصدير معاً. */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {S,newState} from "../core/state.js";
import {scene} from "../core/render.js";
import * as R from "../tools/registry.js";
import "../tools/draw.js";
import "../tools/openings.js";
import "../tools/areas.js";
import "../tools/annotate.js";
import "../tools/modify.js";

const DIR=join(dirname(fileURLToPath(import.meta.url)),"golden");
const UP=process.argv.includes("--update");
function feed(lines){
 lines.forEach(s=>{
  if(s==="esc"){R.cancel(true);return}
  if(s==="."){R.enter();return}
  if(R.active())R.feedText(s);
  else {const d=R.findTool(s);if(d)R.begin(d);else R.feedText(s)}
 });
 R.cancel(true);
}
const rd=v=>typeof v==="number"?Math.round(v*1000)/1000+0:v;
const norm=v=>Array.isArray(v)?v.map(norm):rd(v);
function ser(P){
 return P.map(g=>{const o={};Object.keys(g).sort().forEach(k=>o[k]=norm(g[k]));
  return JSON.stringify(o)}).join("\n")+"\n";
}
const CASES=[
 {id:"room",why:"مستطيل صافٍ + منطقة مخبوزة",run(){
  feed(["rect","t=0.25","type=ext","align=l","0,0","4x3","esc",
   "area","num=1","showArea=1","2,1.5","esc"])}},
 {id:"wall-open",why:"جدار بباب وشباك — الطرح من الجسم",run(){
  feed(["wall","t=0.2","type=ext","align=c","0,0","@8,0","esc"]);
  const w=S.walls[0].id;
  feed(["door","w=0.9","h=2.1","kind=door",`${w}@2`,"esc"]);
  feed(["win","w=1.5","h=1.4","sill=0.9",`${w}@5`,"esc"])}},
 {id:"joins",why:"دمج الأركان عرضٌ لا تعديل",run(){
  feed(["wall","t=0.3","type=ext","align=c","0,0","@6,0","@0,4","@-6,0","@0,-4","esc"])}},
 {id:"dims",why:"بُعد أفقي ونصّ ومنسوب",run(){
  feed(["dim","kind=h","0,0","6,0","0,-1","esc",
   "text","s=مجلس","hm=1","3,2","esc","level","z=0.15","1,1","esc"])}}
];
let fail=0,ran=0;
if(UP&&!existsSync(DIR))mkdirSync(DIR,{recursive:true});
CASES.forEach(c=>{
 newState();R.loadOpts();
 try{c.run()}catch(e){console.error(`✗ ${c.id}: تعذّر البناء — ${e.message}`);fail++;return}
 const got=ser(scene().P),f=join(DIR,c.id+".txt");ran++;
 if(UP){writeFileSync(f,got);console.log(`⟳ ${c.id} (${c.why})`);return}
 if(!existsSync(f)){console.error(`✗ ${c.id}: لا لقطة مرجعية — شغّل --update`);fail++;return}
 const want=readFileSync(f,"utf8");
 if(want===got){console.log(`✓ ${c.id} — ${c.why}`);return}
 fail++;console.error(`✗ ${c.id} — ${c.why}`);
 const A=want.split("\n"),B=got.split("\n");
 for(let i=0,n=0;i<Math.max(A.length,B.length)&&n<4;i++){
  if(A[i]===B[i])continue;n++;
  console.error(`  سطر ${i+1}:\n    − ${A[i]||"(لا شيء)"}\n    + ${B[i]||"(لا شيء)"}`);
 }
});
if(UP){console.log(`\n⟳ حُدّثت ${CASES.length} لقطة`);process.exit(0)}
console.log(`\nاللقطات: ${ran-fail} من ${ran}`);
process.exit(fail?1:0);