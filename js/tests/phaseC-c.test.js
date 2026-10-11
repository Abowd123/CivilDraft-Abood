/* المرحلة C-ج — PWA (41): manifest وsw.js وربطهما وعدم مسّ CSP.
   السلوكُ يُختبَر بعاملٍ مُحاكى (self وcaches وfetch مزيَّفة).
   node js/tests/phaseC-c.test.js */
import {group,groupAsync,ok,eq,summary} from "./harness.js";
import {readFileSync,existsSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const root=join(dirname(fileURLToPath(import.meta.url)),"..","..");
const rd=f=>readFileSync(join(root,f),"utf8");
/* اسم الكاش الجاري من sw.js نفسه — رفعُ الإصدار لا يُسقط الحارس */
/* صار الاسمُ مشتقّاً من الإصدار (P6-010): `civildraft-v${VERSION}`.
   فالاستخراجُ من الإصدارِ نفسِه لا من نصٍّ حرفيٍّ لم يبقَ. */
const SW_VER=(/const VERSION="([^"]+)"/.exec(rd("sw.js"))||[])[1];
const SW_CACHE=(/const CACHE="([^"]+)"/.exec(rd("sw.js"))||[])[1]
 ||(SW_VER?`civildraft-v${SW_VER}`:undefined);

group("41 · manifest",()=>{
 const m=JSON.parse(rd("manifest.json"));
 eq(m.display,"standalone","standalone");
 eq(m.start_url,"./","start_url نسبيّ"); eq(m.scope,"./","scope نسبيّ");
 ok(m.name&&m.short_name,"الاسمان");
 ok(m.icons.length>=2,"أيقونتان على الأقل");
 m.icons.forEach(i=>ok(existsSync(join(root,i.src)),`الأيقونة ${i.src} موجودة`));
});
group("41 · index.html والـCSP",()=>{
 const h=rd("index.html");
 ok(/<link rel="manifest" href="manifest.json">/.test(h),"رابط manifest");
 ok(/<meta name="theme-color" content="#0f172a">/.test(h),"theme-color");
 ok(h.indexOf('rel="manifest"')>h.indexOf("<title>"),"بعد <title>");
 const csp=(h.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)||[])[1]||"";
 ok(/default-src 'self'/.test(csp)&&!/unsafe-inline/.test(csp),"CSP (الـmeta) لم يُلمَس ولا unsafe-inline");
 ok(!/worker-src/.test(csp),"لا توجيه جديد: worker-src يرجع إلى script-src 'self'");
 const nl=rd("netlify.toml"), hd=rd("_headers");
 const hdrCsp=t=>(t.match(/Content-Security-Policy[^\n]*/)||[""])[0];
 ok(!/unsafe-inline/.test(hdrCsp(nl)+hdrCsp(hd)),"CSP في netlify/_headers بلا unsafe-inline");
 ok(/\/\*\.js/.test(nl)&&/no-cache/.test(nl),"no-cache على js يشمل sw.js");
});
group("41 · app.js: تسجيلٌ محروس",()=>{
 const a=rd("js/app.js");
 ok(/if\(!SAFE&&typeof navigator!=="undefined"&&"serviceWorker" in navigator\)/.test(a),
  "محروس بـSAFE وبوجود navigator");
 ok(a.indexOf('register("./sw.js"')<a.indexOf("autoFit();\n}\nfunction useTemplate"),
  "قبل autoFit() آخر build()");
 /* صار التسجيلُ داخل safe() من bus.js (P2-007): يبلع الرفضَ ويسجّله
    بوسمٍ مقروء — أقوى من catch فارغة، فالحارسُ يقبل الاثنين. */
 const reg0=a.indexOf('register("./sw.js"');
 ok(/\.catch\(\(\)=>\{\}\)/.test(a.slice(reg0,reg0+90))
  ||/safe\(navigator\.serviceWorker\.register/.test(a),
  "فشل التسجيل لا يكسر الإقلاع");
 ok(!/safe\(navigator\.serviceWorker\.register/.test(a)
  ||/"تسجيلُ عامل الخدمة"/.test(a),"وللفشل وسمٌ مقروء في السجلّ");
});

/* عاملٌ مُحاكى */
function boot(){
 const L={}, store=new Map(), deleted=[];
 /* العاملُ بعد P6-002 يُبلّغ الصفحاتَ عند التفعيل (SW_ACTIVATED)،
    فالمحاكاةُ تحتاج clients.matchAll لا claim وحده. والرسائلُ
    تُجمَع لتتحقّقَ منها المجموعاتُ أدناه. */
 const posted=[];
 const self={location:{origin:"https://app.test"},
  clients:{claim(){},matchAll:async()=>[{postMessage:m=>posted.push(m)}]},
  skipWaiting(){},registration:{waiting:null},
  addEventListener:(t,f)=>{L[t]=f}};
 let net=async()=>{throw new Error("offline")};
 const caches={
  open:async()=>({addAll:async u=>u.forEach(x=>store.set(x,{u:x})),
   put:async(r,res)=>{store.set(r.url,res)}}),
  keys:async()=>["civildraft-v0",SW_CACHE],
  delete:async k=>{deleted.push(k);return true},
  match:async r=>store.get(typeof r==="string"?r:r.url)};
 const ctx=vm.createContext({self,caches,URL,Promise,
  fetch:(...a)=>net(...a)});
 vm.runInContext(rd("sw.js"),ctx);
 return {L,store,deleted,setNet:f=>{net=f}};
}
const ev=(url,o={})=>{
 let p; const e={request:{url,method:o.method||"GET",mode:o.mode||"cors"},
  respondWith(x){p=x}};
 return {e,get:()=>p};
};
const resp=(ok_=true,type="basic")=>({ok:ok_,type,clone(){return this}});

await groupAsync("41 · sw: تفعيلٌ يحذف القديم فقط",async()=>{
 const w=boot(); let pr;
 w.L.activate({waitUntil:p=>{pr=p}}); await pr;
 eq(JSON.stringify(w.deleted),'["civildraft-v0"]',`حُذف v0 وبقي ${SW_CACHE}`);
});
await groupAsync("41 · sw: الشبكة أولاً (لا نسخةَ قديمةً عالقة)",async()=>{
 const w=boot(); w.store.set("https://app.test/js/app.js",{old:1});
 const fresh=resp(); w.setNet(async()=>fresh);
 const x=ev("https://app.test/js/app.js"); w.L.fetch(x.e);
 const r=await x.get();
 ok(r===fresh,"أُعيدت الجديدة لا المخزَّنة");
 await new Promise(r=>setTimeout(r));
 ok(w.store.get("https://app.test/js/app.js")===fresh,"وحُدِّث الكاش");
});
await groupAsync("41 · sw: HTML أيضاً شبكةٌ أولاً",async()=>{
 const w=boot(); w.store.set("https://app.test/",{old:1});
 const fresh=resp(); w.setNet(async()=>fresh);
 const x=ev("https://app.test/",{mode:"navigate"}); w.L.fetch(x.e);
 ok((await x.get())===fresh,"التنقّل يأخذ الجديد (الكاش أولاً كان يجمّد الصفحة)");
});
await groupAsync("41 · sw: الكاش احتياطٌ عند الانقطاع",async()=>{
 const w=boot(); const cached={cached:1};
 w.store.set("https://app.test/css/base.css",cached);
 const x=ev("https://app.test/css/base.css"); w.L.fetch(x.e);
 ok((await x.get())===cached,"عند الانقطاع يُقدَّم المخزَّن");
 const idx={idx:1}; w.store.set("./index.html",idx);
 const y=ev("https://app.test/anything",{mode:"navigate"}); w.L.fetch(y.e);
 ok((await y.get())===idx,"تنقّلٌ بلا مخزَّنٍ يرجع إلى index.html");
});
await groupAsync("41 · sw: لا يُخزَّن الخطأ",async()=>{
 const w=boot(); const bad=resp(false);
 w.setNet(async()=>bad);
 const x=ev("https://app.test/js/missing.js"); w.L.fetch(x.e);
 await x.get(); await new Promise(r=>setTimeout(r));
 ok(!w.store.has("https://app.test/js/missing.js"),"404 لا يدخل الكاش");
});
await groupAsync("41 · sw: لا يعترض الخارجيّ ولا غير GET",async()=>{
 const w=boot();
 const a=ev("https://api.provider.com/v1/models"); w.L.fetch(a.e);
 eq(a.get(),undefined,"طلب المزوّد الخارجيّ يمرّ بلا اعتراض");
 const b=ev("https://app.test/x",{method:"POST"}); w.L.fetch(b.e);
 eq(b.get(),undefined,"POST لا يُعترَض");
});
process.exit(summary());
