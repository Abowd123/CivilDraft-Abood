/* CivilDraft — التحديث التلقائي (electron-updater + GitHub Releases)
   · يُفحَص عند التشغيل بصمت؛ لا يُنزَّل شيءٌ قبل أن يوافق المستخدم.
   · معطَّلٌ في: النسخة المحمولة، وضع التطوير، غير ويندوز، البناء بلا app-update.yml
     (أي بناءٌ محلّيّ بلا إعداد publish)، أو عند CIVILDRAFT_NO_UPDATE=1.
   · الدوالّ هنا تأخذ اعتمادياتها حقناً (app/dialog/loadUpdater) فتُختبَر في Node بلا Electron
     (js/tests/updater.test.js). لا شيء يُحمَّل من electron-updater إلا عند الحاجة الفعلية. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

/* القرار الخالص: هل يُسمَح بالتحديث؟ يُعيد { enabled, reason } */
function updateSupport({ isPackaged, platform, env, resourcesPath, existsSync } = {}) {
  const e = env || {};
  const ex = existsSync || fs.existsSync;
  if (e.CIVILDRAFT_NO_UPDATE === "1") return { enabled: false, reason: "optout" };
  if (!isPackaged) return { enabled: false, reason: "dev" };
  if (platform !== "win32") return { enabled: false, reason: "platform" };
  /* electron-builder يضبط هذين المتغيّرين في النسخة المحمولة وحدها */
  if (e.PORTABLE_EXECUTABLE_FILE || e.PORTABLE_EXECUTABLE_DIR) return { enabled: false, reason: "portable" };
  if (!resourcesPath || !ex(path.join(resourcesPath, "app-update.yml"))) return { enabled: false, reason: "no-config" };
  return { enabled: true, reason: "ok" };
}

const REASON_TEXT = {
  portable: "النسخة المحمولة لا تتحدّث تلقائياً.\nلتحديثها نزّل أحدث إصدارٍ من صفحة الإصدارات (Releases) على GitHub.",
  dev: "التحديث التلقائي يعمل في النسخة المثبَّتة فقط، لا في وضع التطوير.",
  platform: "التحديث التلقائي متاحٌ على ويندوز فقط.",
  "no-config": "هذا البناء لا يحمل إعداد التحديث (بناءٌ محلّيّ). التحديث التلقائي يعمل في الإصدارات الرسمية فقط.",
  optout: "التحديث التلقائي معطَّلٌ بالمتغيّر CIVILDRAFT_NO_UPDATE.",
};

/* آخر ما يُعرَض للمستخدم: نصٌّ عربيٌّ قصير من ملاحظات الإصدار (قد تكون HTML أو مصفوفة) */
function notesText(info) {
  let n = info && info.releaseNotes;
  if (Array.isArray(n)) n = n.map(x => (x && x.note) || "").join("\n");
  if (typeof n !== "string") return "";
  return n.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
}

/* setupUpdater: يربط المستمعين ويعيد { check(manual) , support }
   deps: { app, dialog, getWindow, env, platform, loadUpdater, log } */
function setupUpdater(deps) {
  const { app, dialog, getWindow } = deps;
  const log = deps.log || (() => {});
  const support = updateSupport({
    isPackaged: app.isPackaged, platform: deps.platform || process.platform,
    env: deps.env || process.env, resourcesPath: deps.resourcesPath || process.resourcesPath,
    existsSync: deps.existsSync,
  });
  const win = () => { try { return getWindow(); } catch { return null; } };
  const box = (opts) => {
    const w = win();
    return w ? dialog.showMessageBox(w, opts) : dialog.showMessageBox(opts);
  };

  let au = null, busy = false, manual = false, offered = null, downloading = false;

  function load() {
    if (au) return au;
    au = (deps.loadUpdater || (() => require("electron-updater").autoUpdater))();
    au.autoDownload = false;          /* لا تنزيل قبل موافقة المستخدم */
    au.autoInstallOnAppQuit = true;   /* بعد موافقته: يُثبَّت عند الإغلاق إن أجّل إعادة التشغيل */
    au.allowPrerelease = false;
    au.allowDowngrade = false;
    if (au.logger !== undefined) au.logger = null;

    au.on("update-available", async (info) => {
      busy = false;
      if (downloading) return;
      const v = (info && info.version) || "";
      if (offered === v && !manual) { return; }   /* لا نكرّر السؤال عن الإصدار نفسه في الجلسة */
      offered = v;
      const notes = notesText(info);
      let r;
      try {
        r = await box({
          type: "info", title: "تحديث متاح", noLink: true,
          message: `يتوفّر إصدارٌ جديد من CivilDraft (${v})`,
          detail: `إصدارك الحالي: ${app.getVersion()}\n` + (notes ? `\n${notes}\n` : "") +
            "\nهل تريد تنزيله الآن؟ لن يُثبَّت إلا بعد موافقتك مرةً ثانية.",
          buttons: ["لاحقاً", "تنزيل الآن"], defaultId: 1, cancelId: 0,
        });
      } catch { return; }
      manual = false;
      if (r && r.response === 1) {
        downloading = true;
        try { await au.downloadUpdate(); }
        catch (e) {
          downloading = false;
          log("download failed", e);
          try { win() && win().setProgressBar(-1); } catch { /* غير حرِج */ }
          box({ type: "error", title: "CivilDraft", message: "تعذّر تنزيل التحديث.", detail: "تحقّق من اتصالك وحاول لاحقاً. مشروعك لم يتأثّر." }).catch(() => {});
        }
      }
    });

    au.on("update-not-available", () => {
      busy = false;
      if (manual) {
        manual = false;
        box({ type: "info", title: "CivilDraft", message: "أنت على أحدث إصدار.", detail: `الإصدار ${app.getVersion()}` }).catch(() => {});
      }
    });

    au.on("download-progress", (p) => {
      const w = win();
      try { if (w && p && typeof p.percent === "number") w.setProgressBar(Math.max(0, Math.min(1, p.percent / 100))); } catch { /* غير حرِج */ }
    });

    au.on("update-downloaded", async (info) => {
      downloading = false;
      try { win() && win().setProgressBar(-1); } catch { /* غير حرِج */ }
      let r;
      try {
        r = await box({
          type: "info", title: "التحديث جاهز", noLink: true,
          message: `نُزِّل الإصدار ${(info && info.version) || ""}`,
          detail: "أعد التشغيل الآن لتثبيته، أو سيُثبَّت تلقائياً عند إغلاق البرنامج في المرّة القادمة.\nاحفظ عملك أولاً.",
          buttons: ["لاحقاً", "إعادة التشغيل والتثبيت"], defaultId: 1, cancelId: 0,
        });
      } catch { return; }
      if (r && r.response === 1) { try { au.quitAndInstall(false, true); } catch (e) { log("install failed", e); } }
    });

    au.on("error", (e) => {
      busy = false; downloading = false;
      log("updater error", e);
      try { win() && win().setProgressBar(-1); } catch { /* غير حرِج */ }
      if (manual) {
        manual = false;
        box({ type: "warning", title: "CivilDraft", message: "تعذّر التحقّق من التحديثات.", detail: "تحقّق من اتصالك بالإنترنت وحاول مرةً أخرى." }).catch(() => {});
      }
    });
    return au;
  }

  /* check(true): من القائمة — يشرح سبب التعطيل ويُعلن «أحدث إصدار».
     check(false): عند التشغيل — صامت تماماً إن لم يوجد جديد أو انقطع الاتصال. */
  async function check(isManual) {
    if (!support.enabled) {
      if (isManual) {
        const t = REASON_TEXT[support.reason] || REASON_TEXT["no-config"];
        box({ type: "info", title: "CivilDraft", message: "التحديث التلقائي غير متاح", detail: t }).catch(() => {});
      }
      return false;
    }
    if (busy || downloading) {
      if (isManual) box({ type: "info", title: "CivilDraft", message: downloading ? "التحديث قيد التنزيل…" : "جارٍ التحقّق من التحديثات…" }).catch(() => {});
      return false;
    }
    busy = true; manual = !!isManual;
    try {
      load();
      await au.checkForUpdates();
      return true;
    } catch (e) {
      busy = false;
      log("check failed", e);
      if (manual) { manual = false; box({ type: "warning", title: "CivilDraft", message: "تعذّر التحقّق من التحديثات.", detail: "تحقّق من اتصالك بالإنترنت وحاول مرةً أخرى." }).catch(() => {}); }
      return false;
    }
  }

  return { support, check };
}

module.exports = { updateSupport, setupUpdater, notesText, REASON_TEXT };
