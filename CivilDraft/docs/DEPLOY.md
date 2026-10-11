# النشر والتراجع — CivilDraft

> المرجع: `audit/06-deploy.md` · البنود P6-002 و P6-003 و P6-010 و P6-011.
> كلُّ أمرٍ هنا يُشغَّل من جذر المستودع، وبـ`node` مباشرةً (لا اعتماديات).

## ١ — قبل النشر

```sh
node js/tests/all.js                      # السويت كلُّه — يحتاج > ٥ دقائق
node js/tests/phase0-guards.test.js       # الاستيرادات
node scripts/gen-sw-core.js --check       # قائمة CORE محدَّثة
node scripts/build-dist.js                # يبني dist/ ويتحقّق من سلامته
```

`build-dist.js` يفشل إن نقص أصلٌ أو وحدةٌ في `dist/`، أو تسرّب إليها ما لا
يُنشَر (`js/tests` · `audit` · `package.json` · السجلّات). لا تنشر إن فشل.

**رفعُ الإصدار:** الرقمُ في `js/core/version.js` و`sw.js` و`package.json`
ثلاثتها، ويحرس تطابقَها `js/tests/deploy.test.js`. ارفعها معاً في التزامٍ
واحد — فاسمُ كاش العامل مشتقٌّ من الرقم، وإصدارٌ لم يُرفَع يعني كاشاً لا
يتبدّل عند النشر.

**الأيقونات:** مُلتزَمةٌ في `icons/`. أعِد توليدها بعد تغيير الشعار وحده:
`node scripts/gen-icons.js`.

**التجميعُ اختياريّ (P6-006):** `node scripts/build-dist.js --bundle` ينتج
`js/app.bundle.js` ويُزيل 183 `modulepreload` من `dist/index.html` — إن توفّر
`esbuild`. وإن لم يتوفّر أكمل البناءُ بلا تجميعٍ وطبع التوصية. والتشغيلُ غيرُ
المجمَّع يبقى ممكناً للتطوير دائماً (`node serving/static-server.js`).

## ٢ — النشر

Netlify يقرأ `netlify.toml`: `publish = "dist"` و
`command = "node scripts/gen-sw-core.js --check && node scripts/build-dist.js"`.
فالبناءُ يفشل على المضيف إن كانت `CORE` قديمةً — لا يُنشَر عاملٌ لا يعرف
ملفّاته.

انشر على **فرعِ معاينةٍ أوّلاً** وامشِ على قائمة ما بعد النشر (§٤).

## ٣ — التراجع (rollback)

> **التراجعُ عبر Netlify وحده لا يكفي.** العاملُ القديم ما زال مسجَّلاً في
> متصفّحات المستخدمين، وكاشُه قد يخدم نسخةً لا تطابق ما نشرتَه الآن.

١. **أعِد الإصدارَ السابق في Netlify** (Deploys ← Publish deploy).
٢. **تحقّق أنّ الإصدارَ المُعاد يحمل رقماً مختلفاً** عن المعطوب. وإن لم يكن
   (نشرتَ إصلاحاً بالرقم نفسه) فارفع الرقمَ وانشر من جديد: اسمُ الكاش
   مشتقٌّ من الرقم، ونسختان بالرقم نفسه تتشاركان كاشاً واحداً — وهذا هو
   الفخُّ الأساسيُّ في rollback هذا المشروع.
٣. **نظّف العاملَ القديم.** الكاشاتُ التي لا تطابق الإصدارَ الحاليَّ تُحذَف
   تلقائياً في `activate`، لكنّ العاملَ نفسَه يحتاج تفعيلاً. للمستخدم
   العاديّ: إغلاقُ كلِّ تبويبات الموقع ثم فتحُه من جديد يكفي.
   وللحالة العالقة، من أدوات المطوّر (Application ← Service Workers ←
   Unregister) أو من الطرفية في تبويب الموقع:

   ```js
   const rs = await navigator.serviceWorker.getRegistrations();
   await Promise.all(rs.map(r => r.unregister()));
   for (const k of await caches.keys()) await caches.delete(k);
   location.reload();
   ```

٤. **لا تمسح بيانات المستخدم.** `civildraft.*` في localStorage وقاعدةُ
   `civildraft` في IndexedDB فيها مشروعُه. `caches` وحدها تُمسَح في
   التراجع. (المسحُ الكامل فعلٌ صريحٌ في الواجهة: «امسح كل ما هو محفوظ
   محلّياً».)
٥. **جرّب التراجعَ على المعاينة قبل الإنتاج** — مرّةً واحدةً على الأقلّ
   قبل أوّل إطلاق.

### عاملٌ معروفُ السلامة (kill switch)

إن كان العاملُ نفسُه هو العطب، انشر `sw.js` يُلغي نفسَه ويمسح كاشَه:

```js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  const cs = await self.clients.matchAll({ type: "window" });
  cs.forEach(c => c.navigate(c.url));
})()));
```

انشره، انتظر حتى يفتح المستخدمون الموقعَ مرّةً، ثم أعِد العاملَ السليم.

## ٤ — قائمةُ فحصٍ بعد النشر

تُنفَّذ على المضيف الحيّ (أو المعاينة)، وكلُّها يدويّة — ولا شيءَ منها
مُتحقَّقٌ منه في Node:

- [ ] الصفحةُ تُقلِع ولا رسالةَ خطأٍ في السجلّ ولا في Console.
- [ ] **شارةُ الإصدار** في شريط الحالة تطابق ما نشرتَه.
- [ ] `curl -sI https://<النطاق>/` يُظهر: `Content-Security-Policy` ·
      `Permissions-Policy` · `Cross-Origin-Opener-Policy` ·
      `Strict-Transport-Security` · `X-Frame-Options` ·
      `X-Content-Type-Options` · `Referrer-Policy`.
- [ ] `connect-src` فيه المضيفونَ الأربعة ولا `https:` مفتوحة
      (قرارُ المالك: المزوّدُ المخصّصُ غير مدعوم).
- [ ] مسارٌ خاطئ (`/لا-يوجد`) يُعطي `404.html` بالعربية لا صفحةَ التطبيق.
- [ ] `https://<النطاق>/js/tests/all.js` يُعطي 404 — السويتُ غيرُ منشور.
      وكذلك `/package.json` و`/audit/INDEX.md` و`/CHANGES.md`.
- [ ] `manifest.json` يُجلَب، والمتصفّحُ يعرض «تثبيت التطبيق».
- [ ] الأيقوناتُ الأربعُ تُجلَب بـ200: `icons/icon-192.png` و`icon-512.png`
      و`icon-maskable-192.png` و`icon-maskable-512.png`.
- [ ] **العملُ دون اتصال:** افتح الصفحة، ثم اقطع الشبكة (DevTools ←
      Network ← Offline)، ثم أعِد التحميل — يُقلِع التطبيقُ ويرسم.
- [ ] **الترقية:** انشر تغييراً صغيراً برقمِ إصدارٍ أعلى، أعِد تحميلَ
      الصفحة — يظهر سؤالُ التحديث، والموافقةُ تُعيد التحميلَ مرّةً واحدة
      (لا حلقة).
- [ ] المسارُ اليدويُّ في `audit/05-manual-checklist.md` على Android وiOS
- [ ] افتح `/404` الوهميَّ: تظهر صفحةُ ٤٠٤ العربيّة لا صفحةٌ بيضاء.
      وسطحِ المكتب (أهدافُ اللمس · تكبيرُ iOS · قارئُ الشاشة · التراكب) —
      وهو ما لا يُغني عنه فحصٌ ساكن.

## ٥ — ما لم يُتحقَّق منه في هذا المستودع

كلُّ ما في §٤ يحتاج مضيفاً حيّاً أو متصفّحاً. والمُتحقَّقُ منه في Node هو:
وجودُ الرؤوس في الملفّات، وتطابقُ `connect-src` في المواضع الأربعة،
وتطابقُ رقم الإصدار في ثلاثة مواضع، وسلامةُ `dist/` بنيوياً، وتحديثُ
`CORE`. انظر `audit/08-verification.md`.
