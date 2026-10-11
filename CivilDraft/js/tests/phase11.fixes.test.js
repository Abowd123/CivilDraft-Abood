/* ═══ إصلاحات المرحلة 11 — الخادم المحلّي وجدول الترحيل ═══
   node js/tests/phase11.fixes.test.js
   ١ · serving/static-server.js: HEAD يردّ بالرؤوس بلا جسم · غير GET/HEAD يُرفَض
       بـ405 · URL فاسد الترميز يُرفَض بـ400/403 ولا يُسقط الخادم · الإيقاف نظيف.
   ٢ · io/project.js: جدول migrations صريح — الإصدار 0 يمرّ، ولا إصدار بلا ترحيل. */
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,groupAsync,ok,eq,throws,summary} from "./harness.js";
shim();

const here=dirname(fileURLToPath(import.meta.url));
const server=join(here,"..","..","serving","static-server.js");

/* منفذٌ حرّ: نفتح المنفذ 0 ونقرأ ما أعطاه النظام ثم نغلق */
const freePort=()=>new Promise((res,rej)=>{
 const s=createServer();
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});
 s.on("error",rej);
});
const start=port=>new Promise((res,rej)=>{
 const cp=spawn(process.execPath,[server],
  {env:{...process.env,PORT:String(port),HOST:"127.0.0.1"},stdio:["ignore","pipe","pipe"]});
 let buf="";
 const t=setTimeout(()=>{cp.kill();rej(new Error("الخادم لم يبدأ خلال 5 ثوانٍ"))},5000);
 cp.stdout.on("data",d=>{buf+=d;if(buf.includes("serving")){clearTimeout(t);res(cp)}});
 cp.on("error",rej);
});
const exited=cp=>new Promise(res=>{
 if(cp.exitCode!==null)return res(cp.exitCode);
 cp.on("exit",(code,sig)=>res(code===null?sig:code));
});
/* fetch يُعيد ترميز المسار، فلا يصلح لإرسال «%E0%A4%A» خاماً — نستعمل http */
import http from "node:http";
const raw=(port,method,path)=>new Promise((res,rej)=>{
 const r=http.request({host:"127.0.0.1",port,method,path},resp=>{
  let n=0;resp.on("data",c=>{n+=c.length});
  resp.on("end",()=>res({status:resp.statusCode,h:resp.headers,bytes:n}));
 });
 r.on("error",rej);r.end();
});

const port=await freePort();
const cp=await start(port);
try{
 await groupAsync("الخادم — GET سليم",async()=>{
  const r=await raw(port,"GET","/");
  eq(r.status,200,"GET / → 200");
  ok(r.bytes>0,"وله جسم");
  ok(/text\/html/.test(r.h["content-type"]),"نوع HTML");
  ok(/default-src 'self'/.test(r.h["content-security-policy"]||""),"CSP حاضر");
  const js=await raw(port,"GET","/js/app.js");
  ok(/text\/javascript/.test(js.h["content-type"]),"js بنوع javascript (وحدات ES)");
 });
 await groupAsync("الخادم — HEAD",async()=>{
  const r=await raw(port,"HEAD","/index.html");
  eq(r.status,200,"HEAD → 200");
  eq(r.bytes,0,"بلا جسم");
  ok(!!r.h["content-security-policy"],"والرؤوس الأمنية حاضرة");
  const m=await raw(port,"HEAD","/js/no-such-file.js");
  eq(m.status,404,"HEAD لملفٍّ غائب → 404");
 });
 await groupAsync("الخادم — طرقٌ غير مسموحة",async()=>{
  for(const m of ["POST","PUT","DELETE"]){
   const r=await raw(port,m,"/index.html");
   eq(r.status,405,`${m} → 405`);
   eq(r.h.allow,"GET, HEAD",`${m}: ترويسة Allow`);
  }
 });
 await groupAsync("الخادم — مسارٌ خبيث لا يُسقطه",async()=>{
  const bad=await raw(port,"GET","/%E0%A4%A");
  ok(bad.status===403||bad.status===400,"URL فاسد الترميز مرفوض ("+bad.status+")");
  const nul=await raw(port,"GET","/index.html%00.js");
  ok(nul.status===403||nul.status===400,"بايت NUL مرفوض ("+nul.status+")");
  const trav=await raw(port,"GET","/..%2f..%2fetc/passwd");
  ok(trav.status===403||trav.status===404,"اجتياز المسار لا يخرج من الجذر ("+trav.status+")");
  const after=await raw(port,"GET","/");
  eq(after.status,200,"والخادم ما زال حيّاً بعد ذلك كلّه");
 });
}finally{
 cp.kill("SIGTERM");
}
await groupAsync("الخادم — إيقاف نظيف عند SIGTERM",async()=>{
 const code=await Promise.race([exited(cp),
  new Promise(r=>setTimeout(()=>r("timeout"),5000))]);
 ok(code===0||code==="SIGTERM",`خرج بلا تعليق (${code})`);
 ok(code!=="timeout","لم يعلَّق");
});

/* ═══ جدول الترحيل ═══ */
const {newState,ensureShape}=await import("../core/state.js");
const PRJ=await import("../io/project.js");
group("project — جدول الترحيل",()=>{
 ok(typeof PRJ.migrations[0]==="function","مدخل الإصدار 0 معرَّف");
 const d0={walls:[]};
 eq(PRJ.migrate(d0),d0,"ملفٌّ بلا __ver (=0) يمرّ بلا تغيير");
 const d1={__ver:PRJ.VERSION,walls:[]};
 eq(PRJ.migrate(d1),d1,"الإصدار الحالي لا يُرحَّل");
 newState();ensureShape();
 const r=PRJ.fromJSON(JSON.stringify({walls:[]}));
 eq(r.ver,0,"fromJSON يُبلِّغ إصدار الملفّ الأصليّ (0) لا المرحَّل");
 const cur=PRJ.fromJSON(PRJ.toJSON());
 eq(cur.ver,PRJ.VERSION,"وملفٌّ حاليّ يُبلِّغ VERSION");
});
group("project — ترحيلٌ ناقص أو معطوب يُرفَض",()=>{
 const saved=PRJ.migrations[0];
 try{
  delete PRJ.migrations[0];
  throws(()=>PRJ.migrate({walls:[]}),/لا ترحيلَ معرَّف/,"لا مدخل ⇒ رفض صريح");
  PRJ.migrations[0]=()=>null;
  throws(()=>PRJ.migrate({walls:[]}),/ما ليس كائناً/,"ترحيلٌ يُعيد null ⇒ رفض");
  PRJ.migrations[0]=()=>[];
  throws(()=>PRJ.migrate({walls:[]}),/ما ليس كائناً/,"ترحيلٌ يُعيد مصفوفة ⇒ رفض");
 }finally{PRJ.migrations[0]=saved}
 throws(()=>PRJ.fromJSON(JSON.stringify({__ver:PRJ.VERSION+1,walls:[]})),
  /أحدث/,"إصدارٌ مستقبليّ ما زال مرفوضاً");
});

summary();
