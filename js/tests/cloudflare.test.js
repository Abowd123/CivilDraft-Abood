/* ═══ إعدادات Cloudflare Pages ═══
   حرسٌ ثابت: wrangler.toml ينشر نفس dist الذي ينشره netlify، و_headers
   داخل حدود Pages (≤100 قاعدة، ≤2000 حرف للسطر)، والمسارُ الآليّ
   (GitHub Actions) يشير إلى المجلّد نفسِه ويمرّ بحرّاس النشر أولاً.
   التشغيل:  node js/tests/cloudflare.test.js                         */
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,summary} from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");

group("Cloudflare Pages · الإعداد",()=>{
 ok(existsSync(join(ROOT,"wrangler.toml")),"wrangler.toml موجود");
 const w=rd("wrangler.toml");
 ok(/^name\s*=\s*"civildraft"/m.test(w),"اسمُ المشروع civildraft");
 ok(/^pages_build_output_dir\s*=\s*"\.\/dist"/m.test(w),"ينشر dist");
 ok(/publish = "dist"/.test(rd("netlify.toml")),"وهو نفسُ مجلّد netlify");
 ok(/^compatibility_date\s*=\s*"\d{4}-\d{2}-\d{2}"/m.test(w),"وتاريخُ التوافق معلَن");
 ok(rd(".node-version").trim()==="20","Node 20 مثبَّتٌ للبناء");
 ok(!/_redirects/.test(rd("scripts/build-dist.js")),"لا _redirects: بلا SPA fallback أعمى");
});

group("Cloudflare Pages · _headers داخل الحدود",()=>{
 const h=rd("_headers").split(/\r?\n/);
 const rules=h.filter(l=>/^\S/.test(l)&&!/^#/.test(l)&&l.trim()).length;
 ok(rules<=100,`${rules} قاعدةً ≤ 100`);
 const long=h.filter(l=>l.length>2000);
 ok(long.length===0,"لا سطرَ فوق 2000 حرف");
 ok(/Content-Security-Policy:/.test(rd("_headers")),"CSP موجودة");
 ok(/Strict-Transport-Security:/.test(rd("_headers")),"وHSTS");
});

group("Cloudflare Pages · النشر الآلي",()=>{
 const y=rd(".github/workflows/cloudflare-pages.yml");
 ok(/cloudflare\/wrangler-action@v3/.test(y),"wrangler-action");
 ok(/pages deploy dist --project-name=/.test(y),"ينشر dist");
 ok(/CLOUDFLARE_API_TOKEN/.test(y)&&/CLOUDFLARE_ACCOUNT_ID/.test(y),"الأسرارُ مُشار إليها لا مكتوبة");
 ok(y.indexOf("test:deploy")<y.indexOf("npm run build"),"حرّاسُ النشر قبل البناء");
 const pk=JSON.parse(rd("package.json"));
 ok(/wrangler pages deploy dist/.test(pk.scripts["cf:deploy"]||""),"سكربت cf:deploy");
 ok(/wrangler pages dev dist/.test(pk.scripts["cf:dev"]||""),"وسكربت cf:dev");
 ok(existsSync(join(ROOT,"docs/CLOUDFLARE.md")),"ودليلُ docs/CLOUDFLARE.md");
});
process.exit(summary()?1:0);
