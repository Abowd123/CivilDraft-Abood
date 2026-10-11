/* ═══ اختبار harness.eq — G9-1-01 ═══
   كانت eq تقارن String(a)===String(b) فيتساوى أيّ كائنين عاديين
   ("[object Object]") فتنجح مقارنةُ {a:1} بـ{b:2}. الآن صارمة
   (Object.is): كلُّ حالةٍ تُشغَّل في عمليّةٍ مستقلّة لأن الإخفاق
   يُسجَّل في عدّاد الملفّ نفسه، ونقرأ من الخارج: هل خرجت العمليّة
   بإخفاق؟  node js/tests/harness.test.js                              */
import {spawnSync} from "node:child_process";
import {fileURLToPath,pathToFileURL} from "node:url";
import {shim,group,ok,eq,deep,summary} from "./harness.js";
shim();
const H=pathToFileURL(fileURLToPath(new URL("./harness.js",import.meta.url))).href;
/* يُشغّل تعبيراً واحداً على eq ويعيد: هل أخفق؟ */
const fails=expr=>{
 const code=`import {eq,summary} from ${JSON.stringify(H)};`
  +`${expr}; process.exit(summary()?1:0);`;
 const r=spawnSync(process.execPath,["--input-type=module","-e",code],
  {encoding:"utf8"});
 return r.status===1;
};
const passes=expr=>{
 const code=`import {eq,summary} from ${JSON.stringify(H)};`
  +`${expr}; process.exit(summary()?1:0);`;
 return spawnSync(process.execPath,["--input-type=module","-e",code],
  {encoding:"utf8"}).status===0;
};

group("eq صارمة: ما لا يتساوى يُخفق",()=>{
 ok(fails('eq({a:1},{b:2},"x")'),"eq({a:1},{b:2}) تُخفق");
 ok(fails('eq({},{},"x")'),"كائنان فارغان مختلفا المرجع يُخفقان");
 ok(fails('eq([1],[1],"x")'),"مصفوفتان متماثلتان بمرجعين مختلفين تُخفقان (للمصفوفات deep)");
 ok(fails('eq(1,"1","x")'),"الرقم لا يساوي نصّه");
 ok(fails('eq(0,-0,"x")'),"0 و-0 مختلفان (Object.is)");
});
group("eq صارمة: ما يتساوى ينجح",()=>{
 ok(passes('eq(1,1,"x")'),"أرقام");
 ok(passes('eq("ب","ب","x")'),"نصوص");
 ok(passes('const o={a:1}; eq(o,o,"x")'),"المرجع نفسه");
 ok(passes('eq(NaN,NaN,"x")'),"NaN يساوي NaN");
 ok(passes('eq(null,null,"x"); eq(undefined,undefined,"x")'),"null وundefined");
});
group("deep يبقى للمقارنة البنيوية",()=>{
 deep({a:1},{a:1},"كائنان متماثلان");
 deep([1,[2]],[1,[2]],"مصفوفات متداخلة");
 ok(spawnSync(process.execPath,["--input-type=module","-e",
  `import {deep,summary} from ${JSON.stringify(H)};`
  +`deep({a:1},{b:2},"x"); process.exit(summary()?1:0)`],
  {encoding:"utf8"}).status===1,"deep({a:1},{b:2}) تُخفق");
});
process.exit(summary()?1:0);
