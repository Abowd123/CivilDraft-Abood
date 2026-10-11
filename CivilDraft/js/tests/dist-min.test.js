/* ═══ الناتجُ المصغَّرُ يعمل كالأصل ═══ (خطّة 1.1.0 · البند ب)
   التصغيرُ يمسّ كلَّ ملفٍّ يُنشَر، فلا يكفي أن «يبدو» صحيحاً. هنا يُبنى dist
   في مجلّدٍ مؤقّت (BUILD_OUT — لا يمسّ dist المطوِّر)، ثم:
     ١) كلُّ ملفّ JS مصغَّرٍ يجتاز node --check
     ٢) لا تعليقَ كتليّاً بقي خارج النصوص (عيّنةٌ: لا «═══» في js/)
     ٣) tools-smoke **وtools-correct** يُشغَّلان على الوحدات المصغَّرة نفسها —
        الأدواتُ الـ150 بعقودها السبعة، والـ43 بصحّة نتائجها. فإن نجح الأصلُ
        وفشل المصغَّر فالتصغيرُ كسر شيئاً، وهذا الملفُّ يقول أين.
     ٤) الحجمُ نزل فعلاً (≥ 30٪) — لا تصغيرَ صامتاً لا يُصغِّر
   التشغيل:  node js/tests/dist-min.test.js                               */
import {spawnSync} from "node:child_process";
import {mkdtempSync,rmSync,readdirSync,statSync,copyFileSync,readFileSync,mkdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,eq,summary} from "./harness.js";
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const OUT=mkdtempSync(join(tmpdir(),"cd-min-"));
const walk=(d,o=[])=>{for(const n of readdirSync(d)){const p=join(d,n);
 statSync(p).isDirectory()?walk(p,o):o.push(p)} return o};
try{
 const b=spawnSync(process.execPath,[join(ROOT,"scripts/build-dist.js")],
  {env:{...process.env,BUILD_OUT:OUT},encoding:"utf8"});
 group("البناءُ المصغَّر",()=>{
  eq(b.status,0,"build-dist ينجح"+(b.status?" — "+(b.stderr||b.stdout).slice(0,300):""));
  const m=/تصغير: (\d+) ⇐ (\d+)/.exec(b.stdout||"");
  ok(!!m,"ويعلن التصغير");
  if(m)ok(1-(+m[2])/(+m[1])>=0.30,`نقص ${Math.round(100*(1-m[2]/m[1]))}٪ (≥ 30٪)`);
 });
 const JS=walk(join(OUT,"js")).filter(f=>f.endsWith(".js"));
 group("كلُّ ملفٍّ مصغَّرٍ صالحُ الصياغة",()=>{
  const bad=JS.filter(f=>spawnSync(process.execPath,["--check",f]).status!==0);
  eq(bad.length,0,`${JS.length} ملفاً`+(bad.length?" — "+bad.slice(0,3).join(" · "):""));
 });
 group("التعليقاتُ زالت",()=>{
  const left=JS.filter(f=>/^\s*\/\*\s*═══/m.test(readFileSync(f,"utf8")));
  eq(left.length,0,"لا ترويسةَ «═══» بقيت"+(left.length?" — "+left[0]:""));
 });
 /* الأدواتُ تُشغَّل على الناتج: الاختباراتُ تُنسَخ إلى مجلّدٍ مؤقّت ثم تُحذَف */
 const T=join(OUT,"js","tests"); mkdirSync(T,{recursive:true});
 for(const f of ["harness.js","tools-smoke.test.js","tools-correct.test.js"])
  copyFileSync(join(ROOT,"js/tests",f),join(T,f));
 for(const f of ["tools-smoke.test.js","tools-correct.test.js"]){
  const r=spawnSync(process.execPath,[join(T,f)],{encoding:"utf8",maxBuffer:64<<20});
  const tail=(r.stdout||"").replace(/\x1b\[[0-9;]*m/g,"").trim().split("\n").pop();
  group(`${f} على الوحدات المصغَّرة`,()=>{
   eq(r.status,0,`ينجح — ${tail}`+(r.status?" · "+(r.stderr||"").slice(0,300):""));
  });
 }
}finally{ rmSync(OUT,{recursive:true,force:true}) }
process.exit(summary()?1:0);
