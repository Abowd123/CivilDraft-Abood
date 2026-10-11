/* ═══ connect-src ≡ CSP_ORIGINS ≡ ما يقبله validateUrl ═══ (2026-10-03)
   كان «مخصّص» يقبل أيَّ مضيفٍ ثمّ تحجبه CSP بصمت. الآن validateUrl
   يرفض قبل fetch، وهذا الحارس يمنع انحرافَ القائمةِ في الشيفرة عن
   السياسةِ في المواضع الثلاثة.
   التشغيل:  node js/tests/csp-origins.test.js                        */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const N=await import("../ai/net.js");
const conn=s=>{s=s.replace(/<!--[\s\S]*?-->/g,"").split("\n")
  .filter(l=>!/^\s*#/.test(l)).join("\n");
 const m=/connect-src ((?:'self'|https?:\/\/[^\s;"]+)(?:\s+(?:'self'|https?:\/\/[^\s;"]+))*)/.exec(s);
 return m?m[1].trim().split(/\s+/).filter(x=>x!=="'self'").sort():[]};
const want=[...N.CSP_ORIGINS].sort();

group("القائمةُ نفسُها في الشيفرة والمواضعِ الثلاثة",()=>{
 for(const f of ["index.html","_headers","netlify.toml"])
  eq(conn(rd(f)).join(" "),want.join(" "),`${f} ≡ CSP_ORIGINS`);
});
group("كلُّ مزوّدٍ جاهزٍ مسموح",()=>{
 N.PRESETS.filter(p=>p.url).forEach(p=>{
  let e=null; try{N.assertReachable(p.url)}catch(x){e=x}
  ok(!e,`${p.id} يمرّ`+(e?` — ${e.message}`:""));
 });
});
group("المضيفُ خارجَ السياسةِ يُرفَض برسالةٍ تقول السبب",()=>{
 for(const u of ["https://api.deepseek.com/v1/chat/completions",
  "https://api.together.xyz/v1/chat/completions",
  "http://localhost:1234/v1/chat/completions",
  "http://localhost.evil.com:11434/v1"]){
  let e=null; try{N.assertReachable(u)}catch(x){e=x}
  ok(!!e&&/CSP/.test(e.message),`مرفوض: ${u}`);
 }
});
group("validateUrl يبقى فحصَ صياغةٍ (عقدُ phase8) وask/listModels يفحصان الوصول",()=>{
 let e=null; try{N.validateUrl("https://x.test/v1")}catch(x){e=x}
 ok(!e,"validateUrl لا يرفض مضيفاً لمجرّد أنّه خارجَ السياسة");
 const src=readFileSync(join(ROOT,"js/ai/net.js"),"utf8");
 ok((src.match(/assertReachable\((AI\.url|url)\)/g)||[]).length>=2,
  "ask وlistModels يناديان assertReachable قبل fetch");
});
process.exit(summary()?1:0);
