# النشر على Cloudflare Pages — CivilDraft

الإعدادات الجاهزة في المشروع:

| الملف | الغرض |
|---|---|
| `wrangler.toml` | اسم المشروع `civildraft` ومجلّد النشر `dist` |
| `_headers` | ترويسات الأمان والكاش — يقرؤه Cloudflare Pages كما هو |
| `404.html` | صفحة الخطأ — يخدمها Cloudflare تلقائياً |
| `.node-version` | يثبّت Node 20 في بناء Cloudflare |
| `.github/workflows/cloudflare-pages.yml` | نشرٌ تلقائيّ من GitHub عند كل دفعٍ إلى `main` |
| `package.json` | سكربتات `cf:deploy` و`cf:dev` |

لا حاجة إلى `_redirects`: التطبيق صفحةٌ واحدة بلا مسارات داخلية، ولا SPA fallback عمداً (كي لا تُخفى الأخطاء).

## الطريقة ١ — الرفع المباشر (الأسرع، بلا Git)

1. محلياً: `npm run build` ← يُنتج مجلّد `dist/`.
2. لوحة Cloudflare ← **Workers & Pages** ← **Create** ← **Pages** ← **Upload assets**.
3. سمِّ المشروع `civildraft` ثم اسحب مجلّد `dist` وانشر.

## الطريقة ٢ — من سطر الأوامر (wrangler)

```bash
npx wrangler login            # مرّةً واحدة
npm run cf:deploy             # يبني dist ثم ينشره
npm run cf:dev                # معاينة محلية على http://localhost:8788
```

## الطريقة ٣ — ربط مستودع Git (نشرٌ تلقائيّ من Cloudflare)

**Workers & Pages** ← **Create** ← **Pages** ← **Connect to Git**، ثم:

| الحقل | القيمة |
|---|---|
| Framework preset | None |
| Build command | `node scripts/gen-sw-core.js --check && node scripts/build-dist.js` |
| Build output directory | `dist` |
| Root directory | (فارغ) |
| Environment variable | `NODE_VERSION` = `20` (اختياري، `.node-version` يكفي) |

## الطريقة ٤ — GitHub Actions

أضف في المستودع (Settings ← Secrets and variables ← Actions) السرّين:
`CLOUDFLARE_API_TOKEN` (صلاحية *Cloudflare Pages: Edit*) و`CLOUDFLARE_ACCOUNT_ID`.
ثم أنشئ مشروع Pages باسم `civildraft` مرّةً واحدة (الطريقة ١)، وبعدها كلُّ دفعٍ إلى `main` يُنشَر.

## نطاقٌ مخصّص

**Workers & Pages** ← `civildraft` ← **Custom domains** ← **Set up a domain**. شهادة HTTPS تلقائية.
ترويسة HSTS في `_headers` مضبوطة لسنةٍ مع النطاقات الفرعية — لا تنشر على نطاقٍ فرعيٍّ لا يدعم HTTPS.

## بعد النشر — افحص

1. افتح الرابط ← يظهر التطبيق ولا أخطاء في Console.
2. DevTools ← Application ← Service Workers: العاملُ مُفعَّل، والكاش `civildraft-v<الإصدار>`.
3. Network ← أيُّ ملف: الترويسات `Content-Security-Policy` و`Strict-Transport-Security` موجودة، و`Cache-Control: no-cache` على js/css.
4. زر «ثبّت التطبيق» في نافذة «عن CivilDraft» يفتح نافذة التثبيت (يتطلّب HTTPS).
5. مسارٌ غير موجود مثل `/xyz` يعرض `404.html` العربية.

## التراجع

**Workers & Pages** ← `civildraft` ← **Deployments** ← اختر نشراً سابقاً ← **Rollback to this deployment**.
وعند رفع إصدارٍ جديد غيّر `VERSION` في `js/core/version.js` و`sw.js` معاً ثم شغّل `node scripts/gen-sw-core.js` ليتجدّد الكاش عند المستخدمين.

## حدودٌ يجب معرفتها

- `_headers` في Pages: حدٌّ أقصى 100 قاعدة و2000 حرف للسطر — الملفُّ الحاليّ داخل الحدّين (يحرسه `js/tests/cloudflare.test.js`).
- ترويسات `_headers` تُطبَّق على الملفات الثابتة فقط (وهو كلُّ ما في المشروع).
- روابط معاينة الفروع `*.civildraft.pages.dev` تُخدَم بـHTTPS أيضاً، فلا تعارض مع HSTS.
