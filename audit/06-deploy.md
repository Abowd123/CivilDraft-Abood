الحالة: جاهزية مشروطة؛ لا يُنصح بالنشر قبل تنظيف حزمة النشر، إصلاح بيان PWA، وتضييق سياسة الاتصال · حرج: 0 · مهم: 8 · تحسين: 3

## قائمة جاهزية النشر

| البند | الحالة | السبب المختصر | finding |
|---|---:|---|---|
| `manifest.json` وPWA installability | ⚠️ | الاسم والمسارات والألوان موجودة، لكن لا توجد أيقونتا PNG ‏192/512 ولا `maskable` ولا `id`/`orientation`. | [P6-001](#p6-001) |
| `sw.js` والعمل دون اتصال | ⚠️ | الشبكة أولاً و`v3` صحيحان، لكن الوحدات الكسولة لا تُخزّن إلا بعد استعمالها، وأول زيارة قد تسبق تسجيل العامل. | [P6-002](#p6-002) |
| Netlify publish surface | ❌ | `publish = "."` ينشر الاختبارات والوثائق و`package.json` و`audit/`؛ الاختبارات قابلة للجلب مباشرة. | [P6-003](#p6-003) |
| CSP والرؤوس | ⚠️ | الملفات الثلاثة متفقة نصياً، لكن `connect-src https:` يسمح بكل HTTPS، ولا توجد Permissions-Policy/COOP/HSTS. | [P6-004](#p6-004)، [P6-005](#p6-005) |
| وزن أول تحميل | ⚠️ | 183 preload ووحدات JS أولية ≈1.73 MiB خاماً قبل CSS؛ يحتاج التجميع/التقسيم. | [P6-006](#p6-006) |
| 404 والروابط وبيانات الصفحة | ⚠️ | لا `404.html` ولا SPA fallback؛ الروابط المحلية الموجودة سليمة، لكن الوصف وOG/Twitter وcanonical غائبة. | [P6-007](#p6-007)، [P6-008](#p6-008) |
| الخصوصية والترخيص | ⚠️ | لا تحليلات ولا CDN، والإرسال الخارجي مقصود وموافَق عليه، لكن حامل حقوق MIT ما زال `<اسمك>`. | [P6-009](#p6-009) |
| versioning والكاش | ⚠️ | `1.0.0` لا يظهر في الواجهة ولا يرتبط بـ`civildraft-v3` أو بصمة أصول. | [P6-010](#p6-010) |
| rollback وقائمة ما بعد النشر | ⚠️ | لا توجد آلية/وثيقة rollback داخل المستودع؛ يجب تجهيز rollback خاصاً بالعامل قبل الإطلاق. | [P6-011](#p6-011) |

## جدول النتائج التفصيلي

| المعرّف | الخطورة | الملف:السطر | الوصف | الدليل/طريقة التأكد | الإصلاح المقترح |
|---|---|---|---|---|---|
| P6-001 | مهم | `manifest.json:2-14` | بيان PWA ناقص للتثبيت الكامل: أيقونة SVG `any` وPNG ‏180 فقط؛ لا PNG ‏192 و512 ولا `maskable`، ولا `id` أو `orientation`. `name`/`short_name`/`start_url`/`scope`/`display`/الألوان موجودة. | `cd /home/user/work/proj/cd && nl -ba manifest.json && python3 -c 'import json; d=json.load(open("manifest.json")); print(d)'` | أضف PNG ‏192 و512، وأيقونة `purpose: "maskable"`، و`id` و`orientation` صريحين. لا تُنشأ الأيقونات في هذه المرحلة. |
| P6-002 | مهم | `sw.js:9-35`؛ `js/app.js:256-258`؛ `index.html:191-377` | العامل الحالي `civildraft-v3` وNetwork-first، وليس الوصف القديم `v2`/cache-first. `CORE` يحوي 5 ملفات فقط. في الصفحة 183 `modulepreload` (والرسم الساكن من `app.js` = 183 وحدة)، لكن تسجيل العامل يحدث داخل `app.js` بعد بدء التحميل؛ لذلك أول زيارة غير مُتحكَّم بها لا تضمن تخزين كل preload. بعد زيارة مُتحكَّم بها تُخزّن الاستجابات الناجحة، أما الوحدات الكسولة الأربع (`guide/dockPane.js`, `guide/usage.js`, `ui/ribbon/editor.js`, `ui/viewport.js`) فلا تعمل دون اتصال حتى تُستعمل مرة. `skipWaiting`/`clients.claim` قد يضعان عاملًا جديدًا على صفحة حية بينما بعض graph قديم في الكاش؛ الاسم اليدوي نفسه الخطر عند نسيان تغييره. `cache.addAll(CORE)` يفشل تثبيت العامل كله إذا فشل أي ملف؛ لا يوجد حد حجم/إخلاء للكاش. | `cd /home/user/work/proj/cd && nl -ba sw.js; nl -ba js/app.js | sed -n '254,259p'; rg -c 'rel=\"modulepreload\"' index.html; rg -n 'import\s*\(' js/app.js js/ui js/guide` | اجعل التثبيت مرناً أو تحقّق من CORE قبل النشر، استخدم manifest/cache version مولّداً، عالج تحديث graph ذرياً (أو لا تطبق claim على صفحة حية بلا موافقة)، وخزّن/قسّم الوحدات الكسولة المقصودة مع سياسة إخلاء وحدّ حجم. |
| P6-003 | مهم | `netlify.toml:1-2`؛ `js/tests/`؛ `audit/` | القياس الفعلي لشجرة النشر (باستثناء `.git`) هو **400 ملفاً و3,851,459 بايت**. حزمة التطبيق النظيفة المقترحة 222 ملفاً و1,955,762 بايت؛ غير اللازم **178 ملفاً و1,895,697 بايت**. من ضمن السطح الحالي `js/tests/` = 161 ملفاً/1,452,412 بايت، `CHANGES.md` = 259,256، `KNOWN-DEFECTS.md` = 28,680، `package.json` = 3,728، `README.md` = 6,452، و`audit/` = 8 ملفات/115,806. هكذا يصبح `package.json` والاختبارات و`js/tests/` قابلة للجلب من المضيف. | `cd /home/user/work/proj/cd && find . -type f -not -path './.git/*' | wc -l; find . -type f -not -path './.git/*' -printf '%s\n' | awk '{s+=$1} END{print s}'`; ثم `find js/tests -type f | wc -l` و`find audit -type f | wc -l`. | انشر `dist` نظيفاً بدلاً من الجذر. الإعداد المقترح الدقيق: `publish = "dist"` و`command = "rm -rf dist && mkdir -p dist && cp index.html manifest.json sw.js favicon.ico favicon.svg apple-touch-icon.png _headers dist/ && cp -R css dist/ && find js -type f -name '*.js' ! -path 'js/tests/*' -exec cp --parents {} dist/ \\;"`. الناتج يضم كل JS التطبيق (192)، CSS (23)، وأصول الجذر السبعة، ولا يضم الاختبارات أو السجل أو التقرير. |
| P6-004 | مهم | `netlify.toml:4-10`؛ `_headers:1-5`؛ `index.html:25-34`؛ `js/ai/net.js:40-66,195-201,243-267` | الـCSP الثلاثية متفقة directive-by-directive: `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `object-src`, `base-uri`, `form-action`, `frame-ancestors` متطابقة. لكن `connect-src 'self' https: ...` يسمح بكل مضيف HTTPS. المضيفون الفعليون للـpresets هم `api.openai.com`, `api.groq.com`, `generativelanguage.googleapis.com`, `openrouter.ai`، ومحلياً `localhost:11434` و`localhost:8080` (والكود يسمح أيضاً بعنوان custom يكتبه المستخدم). و`frame-ancestors` داخل meta غير فعّال كحماية؛ الحماية هنا من الرأس فقط. | `cd /home/user/work/proj/cd && nl -ba netlify.toml | sed -n '7p'; nl -ba _headers | sed -n '2p'; nl -ba index.html | sed -n '25,34p'; nl -ba js/ai/net.js | sed -n '40,66p;190,201p;239,267p'`. | إن أُلغي custom provider، استخدم: `connect-src 'self' http://localhost:11434 http://localhost:8080 https://api.openai.com https://api.groq.com https://generativelanguage.googleapis.com https://openrouter.ai`. إن بقي custom، لا يمكن لCSP ثابتة أن تسمح فقط بعنوان يحدده المستخدم؛ يلزم proxy/allow-list أو قبول نطاق أوسع بقرار صريح. |
| P6-005 | مهم | `netlify.toml:4-10`؛ `_headers:1-5` | توجد `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`، لكن لا `Permissions-Policy` ولا `Cross-Origin-Opener-Policy` ولا HSTS. وتكرار CSP والرؤوس في `_headers` و`netlify.toml` خطر drift؛ أي تعديل في أحدهما قد يترك الآخر مختلفاً، مع أن الحالة الحالية متساوية. | `cd /home/user/work/proj/cd && diff -u <(sed -n '7p' netlify.toml) <(sed -n '2p' _headers); rg -n 'Permissions-Policy|Cross-Origin-Opener-Policy|Strict-Transport-Security' netlify.toml _headers || true`. | اجعل مصدراً واحداً للرؤوس (أو اختبر التطابق في CI)، وأضف `Permissions-Policy` بأقل صلاحيات، `Cross-Origin-Opener-Policy: same-origin`، و`Strict-Transport-Security` فقط بعد ضمان HTTPS شامل للنطاق. |
| P6-006 | مهم | `index.html:191-377`؛ `netlify.toml:22-30` | أول تحميل يطلب **183** modulepreload؛ الرسم الساكن من `app.js` = 183 وحدة، و`boot-splash.js` يضيف وحدة أولية، أي **184 ملف JS فريداً أولياً** (الوحدات الكسولة الأربع تُضاف عند الاستعمال). القياس بالضغط الفعلي للضمّ المتسلسل: JS الساكن 183 = 1,770,526 B خاماً، gzip-9 = 577,966 B، Brotli-11 = 433,908 B؛ CSS 23 = 97,205 B، gzip = 22,694 B، Brotli = 19,298 B؛ JS الأولي + CSS = 1,871,521 B خاماً، gzip = 601,396 B، Brotli = 453,036 B. نحو 190 طلباً المتزامن/شبه المتزامن على HTTP/2 ليس حداً نظرياً قاتلاً، لكنه مكلف على هاتف 3G بسبب RTT والـheaders والضغط لكل ملف؛ 0.6 MB مضغوط قبل التشغيل ثقيل. لا يوجد في config ما يعطّل ضغط Netlify الافتراضي، لكن encoding الفعلي لم يُفحص على مضيف حي. | `cd /home/user/work/proj/cd && rg -c 'rel=\"modulepreload\"' index.html; find js -path 'js/tests' -prune -o -name '*.js' -print | wc -l; find css -name '*.css' | wc -l; python3 -c 'import gzip,brotli; print(gzip.compress(b"CivilDraft",9),len(brotli.compress(b"CivilDraft",quality=11)))'` | نفّذ bundle/minify مع code-splitting حقيقي، واجعل preload للـcritical graph فقط، واترك الأدوات/الدليل lazy. لا تعتمد على ضغط concatenation وحده: قياس المضيف بعد النشر ضروري. |
| P6-007 | مهم | `netlify.toml:1-2`؛ لا يوجد `404.html` أو `_redirects` | لا صفحة `404.html` ولا SPA redirect rule في config. الروابط المحلية المستخرجة من `index.html` كلها موجودة (manifest، favicon، 23 CSS، JS، والأيقونات)، ولا روابط Markdown في `README.md` أو `docs/tools.md`؛ `http://localhost:8080` في README مجرد مثال داخل code block. لكن مساراً عميقاً خاطئاً سيأخذ 404 المضيف بدلاً من صفحة التطبيق. | `cd /home/user/work/proj/cd && test ! -e 404.html && test ! -e _redirects && ! rg -n 'redirect|rewrite|404' netlify.toml; python3 -c 'from pathlib import Path; import re; s=Path("index.html").read_text(); xs=re.findall(r"(?:href|src)=\"([^\"]+)",s); print([(x,Path(x).exists()) for x in xs if not re.match(r"^(https?:|#|data:|blob:)",x)])'` | أضف `404.html` مفيدة، أو redirect واعياً إن كان التطبيق سيُستخدم بمسارات SPA؛ لا تضف fallback أعمى قبل التأكد أنه لا يخفي أخطاء الأصول. |
| P6-008 | تحسين | `index.html:2,35-38` | موجود: `lang="ar"`, `dir="rtl"`, viewport، `title`، و`theme-color`. مفقود: `meta name="description"`، Open Graph، Twitter card، وcanonical. | `cd /home/user/work/proj/cd && rg -n '<title|description|og:|twitter:|canonical|viewport|theme-color|lang=|dir=' index.html`. | أضف وصفاً عربياً قصيراً، `og:title/description/type/url/image` و`twitter:card/title/description` وcanonical الصحيح للنطاق عند معرفته. |
| P6-009 | مهم | `LICENSE:1-3`؛ `package.json:3,7`؛ `README.md:78-85`؛ `js/ai/net.js:160-221,255-289`؛ `js/ui/ai.js:192-220` | الترخيص MIT ومتسق نصاً في `package.json` وREADME، لكن صاحب حقوق النشر ما زال حرفياً `<اسمك>`. بحث المصادر عن `fetch`/XHR/beacon/WebSocket/Worker وجد نداءي `fetch` فعليين في `js/ai/net.js` (أما `sw.js:27` فهو تمرير طلبات same-origin التي بدأتها الصفحة، وليس قناة بيانات خارجية): POST عند سؤال AI (يرسل system digest، سؤال المستخدم، والمشهد PNG إن فُعّلت الرؤية، مع Bearer key)، وGET `/models` عند زر جلب النماذج (يرسل المفتاح إن وُجد). كلاهما يذهب إلى `AI.url` الذي يختاره المستخدم؛ لا تحليلات/tracking ولا خطوط/CDN خارجية، و`underlay` يقبل `data:image` فقط. المفتاح لا يذهب إلى مضيف آخر من كود التطبيق، لكنه يُرسل إلى أي custom URL يختاره المستخدم؛ سياسة CSP قد تمنع ذلك إن لم يكن مسموحاً. | `cd /home/user/work/proj/cd && rg -n --glob '!js/tests/**' 'fetch\(|XMLHttpRequest|sendBeacon|new WebSocket|new Worker' .; rg -n 'https://' index.html css || true; rg -n 'license|MIT|<اسمك>' LICENSE package.json README.md`. | استبدل `<اسمك>` بالمالك/السنة المعتمدين قبل النشر. أبقِ الموافقة الظاهرة قبل المزود الخارجي، وقرّر صراحةً هل custom provider مدعوم؛ إن كان نعم فوثّق أن المفتاح والبيانات يذهبان للعنوان الذي يحدده المستخدم. |
| P6-010 | تحسين | `package.json:3`؛ `sw.js:9`؛ `js/io/project.js:12` | `1.0.0` لا يظهر في الواجهة (النص المرئي في `index.html:95` ليس إصداراً)، ولا توجد `VERSION`/`BUILD` release constant مرتبطة به؛ `js/io/project.js:12` هو إصدار صيغة مشروع = 2، لا إصدار التطبيق. أسماء الأصول ثابتة ولا fingerprint. عند rollback/ترقية قد يرى المستخدم HTML/graph قديمَين من عامل `v3` أو مزيجاً من cache قديم وجديد، ولا توجد علامة واجهة تساعد التشخيص. | `cd /home/user/work/proj/cd && rg -n --glob '!js/tests/**' '1\.0\.0|VERSION|BUILD|civildraft-v' .`. | ولّد release ID واحداً للواجهة وSW وmanifest، أو استخدم أسماء assets مبصومة؛ اعرض الإصدار في About/diagnostics، وغيّر cache atomically عند كل release. |
| P6-011 | تحسين | `netlify.toml:1-2` | لا توجد في المستودع تعليمات rollback أو checklist نشر؛ rollback عبر Netlify وحده لا يمسح SW قديمَاً، لذلك قد يستمر عامل سيئ/كاش `v3` بعد إعادة الإصدار. | `cd /home/user/work/proj/cd && rg -n -i 'rollback|roll back|post-deploy|smoke|deploy' --glob '!audit/06-deploy.md' . || true; nl -ba netlify.toml | sed -n '1,3p'`. | اتبع الخطة الإجرائية أدناه، واحتفظ بعامل SW معروف سليم يغيّر cache name أو ينظف القديم؛ جرّب rollback على Preview قبل الإنتاج. |

## تفاصيل التحقق والقياسات

### P6-001 — manifest

`manifest.json` يعلن `name`, `short_name`, `lang`, `dir`, `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `background_color`, و`theme_color`. المساران النسبيان صالحان من subpath: إذا كان البيان عند `/cad/manifest.json` فهما يحلان إلى `/cad/`، وليس إلى جذر الموقع. ذلك لا يعالج نقص الأيقونات. يذكر `CHANGES.md:2564` صراحةً أن 192 و512 غير موجودتين بسبب عدم توفر rasteriser، وأنها ينبغي توليدها من SVG؛ تحققت من توفر ImageMagick (`command -v convert`) وPython CairoSVG (`import cairosvg`) في بيئة الفحص، لكن **لم أُنشئهما**.

### P6-002 — مسار العامل

- `CORE` هو `./`, `./index.html`, `css/theme.css`, `css/base.css`, `js/app.js` فقط.
- كل GET ناجح same-origin يُخزّن (`sw.js:21-31`)، والفشل يرجع إلى cache؛ الطلبات الخارجية وغير GET لا تُعترض.
- الرسم الساكن من `app.js` يساوي 183 وحدة ويطابق 183 preload. الوحدات الكسولة الأربع لا تدخل ذلك العدد وتحتاج زيارة feature حتى تُخزّن.
- `skipWaiting()` ثم `clients.claim()` يطبقان العامل الجديد فوراً على clients قائمة. هذا يسرّع التحديث، لكنه لا يضمن graph ذرياً: الصفحة القديمة التي حملت وحدات قد تتابع import لوحدات من cache/network الجديدة. العامل لا يعلق الصفحة حتماً لأن الاستراتيجية Network-first تعود إلى cache عند فشل الشبكة، لكن النتيجة قد تكون graph مختلطاً.
- `c.addAll(CORE)` يعيد رفض الوعد إذا فشل أي عنصر (مثلاً 404)، فيفشل `install` كله. لا يوجد `catch` حول `addAll` ولا حدّ bytes/عدد؛ cache.put يستمر بلا إخلاء.

**أمر قياس الرسم والتحقق من الوحدات:**

```sh
cd /home/user/work/proj/cd
python3 - <<'PY'
from pathlib import Path
import re
root=Path('.')
pat_static=re.compile(r'''(?:^|[;{}\n])\s*import\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']''',re.M)
pat_all=re.compile(r'''(?:import\s+(?:[^"']*?\s+from\s+)?|import\s*\()\s*["']([^"']+)["']''')
def graph(pat):
  seen=set(); todo=['js/app.js']
  while todo:
    x=todo.pop()
    if x in seen: continue
    seen.add(x); p=root/x
    for imp in pat.findall(p.read_text()):
      if imp.startswith('.'):
        todo.append(str((p.parent/imp).resolve().relative_to(root.resolve())))
  return seen
s=graph(pat_static); a=graph(pat_all)
print('modulepreload',Path('index.html').read_text().count('rel="modulepreload"'))
print('static app graph',len(s)); print('graph incl lazy',len(a)); print('lazy',sorted(a-s))
PY
nl -ba sw.js
```

### P6-003 — حزمة النشر

الأرقام محسوبة لكل الملفات تحت المشروع باستثناء `.git`: 400/3,851,459 B. حزمة `dist` المقترحة هي 192 JS application (كل `js/**/*.js` باستثناء `js/tests`)، 23 CSS، و7 ملفات جذرية (`index.html`, `manifest.json`, `sw.js`, `_headers`, `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`) = 222/1,955,762 B. ملفات التطبيق غير الضرورية في النشر الحالي هي 178/1,895,697 B.

### P6-004 — مقارنة CSP

التوجيهات الثماني متساوية في Netlify TOML و`_headers` وmeta؛ الفرق الوظيفي الوحيد أن meta لا يطبق `frame-ancestors`. قائمة المضيفين مأخوذة من `PRESETS` نفسها، لا من ملخص قديم. `custom` يجعل allow-list ثابتة غير مكتملة بطبيعتها.

### P6-006 — جدول الوزن

| المجموعة | الملفات | الخام (KB، 1024) | gzip-9 (KB) | Brotli-11 (KB) |
|---|---:|---:|---:|---:|
| الرسم الساكن لـ`app.js` | 183 | 1,729.0 | 564.4 | 423.7 |
| CSS المرتبط من `index.html` | 23 | 94.9 | 22.2 | 18.8 |
| إجمالي أولي (JS + `boot-splash.js` + CSS) | 207 | 1,827.7 | 587.3 | 442.4 |
| بعد ضم الوحدات الكسولة الأربع | 211 | 1,841.5 | 591.8 | 445.7 |

هذه أحجام concatenation كما طلب القياس؛ ضغط كل ملف منفرداً قد يختلف بسبب إعادة ضبط قاموس الضغط. لا يوجد `brotli` executable، لكن Python `brotli` 1.2.0 استُخدم فعلياً. `netlify.toml:22-30` يحدد `no-cache` لـJS/CSS ولا يعطل ضغط CDN؛ لم يُتحقق من `Content-Encoding` لمضيف حقيقي.

## خطة rollback وقائمة ما بعد النشر

### rollback على Netlify

1. أوقف الترويج للإصدار الحالي، ومن لوحة Netlify افتح **Deploys** ثم اختر آخر deploy معروف سليم واضغط **Publish deploy** (أو أعِد نشر commit المعروف).
2. لا تعتبر رجوع ملفات HTTP كافياً: clients قد تظل تحت سيطرة SW الحالي، وcache `civildraft-v3` قد يبقى بعد rollback. انشر مع الإصدار الراجع `sw.js` المعروف السليم باسم cache جديد (مثلاً `civildraft-rollback-<release>`)، وفي `activate` احذف كل cache أقدم ثم `clients.claim()`؛ اجعل `install` ينجح فقط بعد توفر CORE.
3. إذا كان العامل السيئ يمنع الإقلاع، انشر أولاً عامل طوارئ معروفاً يمرر GET إلى الشبكة، يفعّل نفسه فوراً، يحذف caches القديمة، ثم انشر العامل الراجع الكامل. اطلب من المستخدمين إعادة تحميل قسرية/مسح بيانات الموقع عند بقاء عامل قديم؛ لا تعتمد على تبديل cache name وحده من دون وصول الصفحة إلى `sw.js` الجديد.
4. راقب deploy preview قبل نشره إنتاجياً، وسجّل release ID وcache name معاً حتى يمكن ربط rollback بالنسخة الصحيحة.

### post-deploy smoke checklist

- [ ] `GET /` و`manifest.json` و`sw.js` وكل الأيقونات تعود 200 وبـMIME صحيح.
- [ ] `GET /js/tests/...`, `/CHANGES.md`, `/package.json`, و`/audit/06-deploy.md` لا تكشف ملفات داخل الحزمة النظيفة.
- [ ] افحص headers الفعلية: CSP المضبوطة، `nosniff`, `DENY`, Referrer-Policy، والرؤوس الجديدة؛ قارن `_headers` وTOML من CI.
- [ ] في متصفح حقيقي: سجّل SW، أعد التحميل حتى يصبح client controlled، افصل الشبكة، اختبر فتح التطبيق، ثم اختبر كل feature lazy مقصودة دون اتصال.
- [ ] افحص install prompt/manifest: 192/512 PNG وmaskable، الاسم، scope، وstart URL من subpath.
- [ ] اختبر AI محلياً وخارجياً: الموافقة، endpoint، models GET، key، digest، وصورة الرؤية؛ تأكد أن الطلب لا يذهب إلا للعنوان المتوقع.
- [ ] تحقق من عدم وجود `Content-Encoding` مفقود أو waterfall غير مقبول، ومن 404 للمسارات الخاطئة.
- [ ] نفّذ rollback على Preview، ثم تحقق من أن SW/cache القديم لا يعيد نسخة الإصدار السيئ.

## لم يُفحص

- لم يُتحقق أي شيء ضد مضيف حي أو CDN Netlify فعلي: لا status codes/headers/Content-Encoding/redirects الفعلية، ولا سلوك cache عند deploy حقيقي.
- لم تُستخدم متصفحات أو Lighthouse أو PWA install checks حقيقية؛ نتائج PWA وoffline مبنية على قراءة الملفات وتتبع الرسم الثابت فقط.
- لم تُجرَ مكالمة إلى أي مزود AI أو endpoint خارجي، ولم يُختبر custom provider أو CORS.
- لم تُنشأ أيقونات 192/512 ولم يُعدّل أي ملف خارج `audit/`.
