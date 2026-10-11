/* CivilDraft — غلاف سطح المكتب (Electron)
   يقدّم ملفات التطبيق عبر بروتوكول app://civildraft/ بأصلٍ ثابت،
   فتعمل ES Modules والاستيراد الديناميكي، ويبقى localStorage وIndexedDB
   محفوظَين بين التشغيلات. لا Node داخل الواجهة إطلاقاً. */
"use strict";
const { app, BrowserWindow, protocol, shell, Menu, dialog, ipcMain, session } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { findProjectArg, MAX_OPEN_BYTES } = require("./argv.cjs");
const { setupUpdater } = require("./updater.cjs");

/* تجربة: واجهة ويندوز الأصلية (شريط القوائم) من اليمين لليسار.
   اتجاه القوائم الأصلية يتبع لغة النظام لا التطبيق؛ هذا المفتاح يطلب من
   Chromium لغة «ar». شغّله بـ CIVILDRAFT_RTL=1 وجرّبه قبل اعتماده. */
if (process.env.CIVILDRAFT_RTL === "1") app.commandLine.appendSwitch("lang", "ar");

const SCHEME = "app";
const HOST = "civildraft";
const ORIGIN = `${SCHEME}://${HOST}`;
const IS_DEV = !app.isPackaged;

/* مجلّد الواجهة: dist المبني إن وُجد، وإلا جذر المشروع (للتطوير بلا بناء) */
const PROJECT = path.join(__dirname, "..");
const WEB_ROOT = fs.existsSync(path.join(PROJECT, "dist", "index.html"))
  ? path.join(PROJECT, "dist") : PROJECT;

/* نفس سياسة serving/static-server.js — ما يُفرض في الويب يُفرض هنا */
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; " +
  "img-src 'self' data: blob:; connect-src 'self' " +
  "https://api.openai.com https://api.groq.com " +
  "https://generativelanguage.googleapis.com https://openrouter.ai " +
  "http://localhost:* http://127.0.0.1:*; object-src 'none'; " +
  "base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-cache",
};

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8", ".map": "application/json; charset=utf-8",
};

/* يجب تسجيله قبل ready: standard+secure ليُعامَل كأصلٍ آمن (IndexedDB، crypto…) */
protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

function safeJoin(root, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (decoded.includes("\0")) return null;
  const p = path.normalize(path.join(root, decoded));
  if (p !== root && !p.startsWith(root + path.sep)) return null;
  return p;
}

async function serve(request) {
  const url = new URL(request.url);
  if (url.host !== HOST) return new Response("Forbidden", { status: 403 });
  let target = safeJoin(WEB_ROOT, url.pathname === "/" ? "/index.html" : url.pathname);
  if (!target) return new Response("Forbidden", { status: 403, headers: SECURITY_HEADERS });
  try {
    if (fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  } catch { /* يُعالَج أدناه */ }
  try {
    const data = await fs.promises.readFile(target);
    const type = TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
    return new Response(data, { status: 200, headers: { "Content-Type": type, ...SECURITY_HEADERS } });
  } catch {
    if (!path.extname(target)) {
      const html = await fs.promises.readFile(path.join(WEB_ROOT, "index.html"));
      return new Response(html, { status: 200, headers: { "Content-Type": TYPES[".html"], ...SECURITY_HEADERS } });
    }
    return new Response("Not found", { status: 404, headers: SECURITY_HEADERS });
  }
}

/* ═══ حفظ حجم النافذة وموضعها ═══ */
const STATE_FILE = () => path.join(app.getPath("userData"), "window-state.json");
function loadWinState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE(), "utf8")); } catch { return {}; }
}
function saveWinState(win) {
  try {
    const s = { ...win.getNormalBounds(), maximized: win.isMaximized() };
    fs.writeFileSync(STATE_FILE(), JSON.stringify(s));
  } catch { /* غير حرِج */ }
}

/* هل الطلب آتٍ من واجهتنا نحن؟ */
const fromApp = e => {
  try { return new URL(e.senderFrame.url).origin === ORIGIN; } catch { return false; }
};

let mainWindow = null;

/* ═══ فتح ملفّ مشروعٍ من نظام التشغيل ═══
   الواجهة لا تُرسل مساراً أبداً: الغلاف وحده يقرأ الملفّ الذي اختاره
   المستخدم في ويندوز (نقرٌ مزدوج) ثم يسلّمه نصّاً. فلا قناة لقراءة
   مسارٍ اختياريّ من الواجهة. */
let rendererReady = false;   /* الواجهة سجّلت مستمعيها */
let pendingOpen = null;      /* ملفٌّ وصل قبل جاهزية الواجهة */

async function readProject(p) {
  const st = await fs.promises.stat(p);
  if (!st.isFile() || st.size > MAX_OPEN_BYTES) throw new Error("size");
  const txt = (await fs.promises.readFile(p, "utf8")).replace(/^\uFEFF/, "");
  return { name: path.basename(p), data: txt };
}

function deliver(file) {
  if (rendererReady && mainWindow) {
    mainWindow.webContents.send("desktop:open-file", file);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingOpen = file;
  }
}

async function queueOpen(p) {
  try {
    deliver(await readProject(p));
    app.addRecentDocument(p);
  } catch {
    dialog.showErrorBox("CivilDraft", "تعذّر فتح الملفّ:\n" + p);
  }
}

const sendCmd = cmd => { if (mainWindow) mainWindow.webContents.send("desktop:command", cmd); };

/* ═══ نافذة الترحيب: نقل بيانات نسخة الويب ═══ */
const FIRST_RUN = () => path.join(app.getPath("userData"), "first-run.json");

function showMigrationGuide() {
  if (!mainWindow) return;
  dialog.showMessageBox(mainWindow, {
    type: "info", title: "نقل مشروعك من نسخة الويب", noLink: true,
    message: "هل لديك مشروعٌ في نسخة الويب؟",
    detail:
      "بيانات المتصفّح لا تنتقل وحدها إلى البرنامج. لنقل مشروعك:\n\n" +
      "١) افتح CivilDraft في المتصفّح الذي كنت تعمل فيه.\n" +
      "٢) اضغط «احفظ المشروع» ليُنزَّل ملفّ المشروع.\n" +
      "٣) هنا اختر «فتح ملفّ المشروع» ثم الملفّ الذي نزّلته.\n\n" +
      "ملاحظة: الملفّ يحمل المشروع الحالي وتعريفات الكتل والأسعار. " +
      "تفضيلات الواجهة (اللوحات والتخطيط) لا تنتقل.\n\n" +
      "يمكنك فتح هذا الشرح لاحقاً من: ملف ◂ نقل بيانات من نسخة الويب.",
    buttons: ["لاحقاً", "فتح ملفّ المشروع الآن"], defaultId: 1, cancelId: 0,
  }).then(r => { if (r.response === 1) sendCmd("open"); }).catch(() => {});
}

function maybeWelcome() {
  if (pendingOpen) return false;           /* فُتح ملفّ — لا نقاطعه */
  try { if (fs.existsSync(FIRST_RUN())) return false; } catch { return false; }
  try { fs.writeFileSync(FIRST_RUN(), JSON.stringify({ at: Date.now(), v: app.getVersion() })); }
  catch { /* تعذّرت كتابة العلامة: يتكرّر الترحيب في المرّة القادمة — أهون من ألّا يُرى */ }
  showMigrationGuide();
  return true;
}

/* ═══ التحديث التلقائي (GitHub Releases) ═══
   يُفحَص بصمتٍ بعد ظهور النافذة بثوانٍ؛ والتنزيل لا يبدأ إلا بموافقة المستخدم.
   معطَّلٌ في النسخة المحمولة وفي أي بناءٍ بلا app-update.yml (انظر desktop/updater.cjs). */
let updater = null;
const UPDATE_DELAY_MS = 8000;
function initUpdater() {
  try {
    updater = setupUpdater({
      app, dialog, getWindow: () => mainWindow,
      log: (...a) => { if (IS_DEV) console.warn("[updater]", ...a); },
    });
  } catch (e) {
    updater = null;                         /* لا شيء هنا يكسر التشغيل */
    if (IS_DEV) console.warn("[updater] init failed", e);
  }
}
function scheduleUpdateCheck() {
  if (!updater || !updater.support.enabled) return;
  setTimeout(() => { updater.check(false).catch(() => {}); }, UPDATE_DELAY_MS);
}

function createWindow() {
  const st = loadWinState();
  mainWindow = new BrowserWindow({
    width: st.width || 1400, height: st.height || 900,
    x: st.x, y: st.y, minWidth: 900, minHeight: 600,
    title: "CivilDraft", backgroundColor: "#ffffff", show: false,
    icon: path.join(PROJECT, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      webSecurity: true, spellcheck: false,
    },
  });
  if (st.maximized) mainWindow.maximize();
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    /* لا نحشر نافذةَ تحديثٍ فوق نافذة الترحيب في أول تشغيل */
    if (!maybeWelcome()) scheduleUpdateCheck();
  });
  mainWindow.on("close", () => saveWinState(mainWindow));
  mainWindow.on("closed", () => { mainWindow = null; });

  const wc = mainWindow.webContents;
  /* إعادة التحميل تُسقط المستمعين — لا نرسل قبل أن تُسجَّل من جديد */
  wc.on("did-start-loading", () => { rendererReady = false; });
  /* الروابط الخارجية تُفتح في المتصفّح، لا داخل البرنامج */
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  wc.on("will-navigate", (e, url) => {
    if (!url.startsWith(ORIGIN + "/")) {
      e.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.loadURL(`${ORIGIN}/index.html`);
}

/* ═══ التنزيلات (a.download / blob) ⇐ نافذة «حفظ باسم» الأصلية في ويندوز ═══
   بهذا تعمل project.js وreport.js وboqcsv.js وstudio.js دون أي تعديل. */
let lastDir = null;
const dlFilters = name => {
  const ext = path.extname(name).slice(1).toLowerCase();
  if (!ext) return undefined;
  const label = ext === "cdraft" ? "مشروع CivilDraft" : "ملفّ " + ext.toUpperCase();
  return [{ name: label, extensions: [ext] }, { name: "كل الملفّات", extensions: ["*"] }];
};
function wireDownloads(ses) {
  ses.on("will-download", (_e, item) => {
    const name = item.getFilename() || "civildraft-export";
    item.setSaveDialogOptions({
      title: "حفظ الملف",
      defaultPath: path.join(lastDir || app.getPath("documents"), name),
      filters: dlFilters(name),
    });
    item.once("done", (_ev, state) => {
      if (state !== "completed") return;
      const sp = item.getSavePath();
      if (sp) lastDir = path.dirname(sp);
    });
  });
}

/* ═══ جسر الملفات (اختياري للواجهة عبر window.civilDesktop) ═══ */
ipcMain.handle("desktop:save", async (e, { name, data, filters } = {}) => {
  if (!fromApp(e)) return { ok: false, error: "forbidden" };
  const r = await dialog.showSaveDialog(mainWindow, {
    title: "حفظ",
    defaultPath: path.join(app.getPath("documents"), String(name || "untitled")),
    filters: Array.isArray(filters) ? filters : undefined,
  });
  if (r.canceled || !r.filePath) return { ok: false, canceled: true };
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
  await fs.promises.writeFile(r.filePath, buf);
  return { ok: true, path: r.filePath, name: path.basename(r.filePath) };
});

ipcMain.handle("desktop:open", async (e, { filters, binary } = {}) => {
  if (!fromApp(e)) return { ok: false, error: "forbidden" };
  const r = await dialog.showOpenDialog(mainWindow, {
    title: "فتح", properties: ["openFile"],
    filters: Array.isArray(filters) ? filters : undefined,
  });
  if (r.canceled || !r.filePaths.length) return { ok: false, canceled: true };
  const p = r.filePaths[0];
  /* نفس سقف ملفّ سطر الأوامر (readProject): لا نقرأ ما لا تحتمله الذاكرة */
  const st = await fs.promises.stat(p);
  if (!st.isFile() || st.size > MAX_OPEN_BYTES) return { ok: false, error: "size" };
  const buf = await fs.promises.readFile(p);
  return { ok: true, path: p, name: path.basename(p), data: binary ? new Uint8Array(buf) : buf.toString("utf8") };
});

ipcMain.handle("desktop:ready", e => {
  if (!fromApp(e)) return false;
  rendererReady = true;
  if (pendingOpen) {
    e.sender.send("desktop:open-file", pendingOpen);
    pendingOpen = null;
  }
  return true;
});

ipcMain.handle("desktop:info", e => fromApp(e)
  ? { version: app.getVersion(), platform: process.platform, userData: app.getPath("userData") }
  : null);

/* ═══ القائمة العربية ═══ */
function buildMenu() {
  const tpl = [
    { label: "ملف", submenu: [
      { label: "مشروع جديد", accelerator: "CmdOrCtrl+N", click: () => sendCmd("new") },
      { label: "فتح ملفّ المشروع…", accelerator: "CmdOrCtrl+O", click: () => sendCmd("open") },
      { label: "حفظ المشروع", accelerator: "CmdOrCtrl+S", click: () => sendCmd("save") },
      { type: "separator" },
      { label: "نقل بيانات من نسخة الويب…", click: showMigrationGuide },
      { label: "فتح مجلّد البيانات", click: () => shell.openPath(app.getPath("userData")) },
      { type: "separator" },
      { label: "خروج", role: "quit" },
    ] },
    { label: "تحرير", submenu: [
      { label: "تراجع", role: "undo" }, { label: "إعادة", role: "redo" },
      { type: "separator" },
      { label: "قص", role: "cut" }, { label: "نسخ", role: "copy" },
      { label: "لصق", role: "paste" }, { label: "تحديد الكل", role: "selectAll" },
    ] },
    { label: "عرض", submenu: [
      { label: "إعادة التحميل", role: "reload" },
      { label: "تكبير", role: "zoomIn" }, { label: "تصغير", role: "zoomOut" },
      { label: "الحجم الأصلي", role: "resetZoom" },
      { type: "separator" },
      { label: "ملء الشاشة", role: "togglefullscreen" },
      ...(IS_DEV ? [{ label: "أدوات المطوّر", role: "toggleDevTools" }] : []),
    ] },
    { label: "مساعدة", submenu: [
      { label: "التحقّق من التحديثات…", click: () => { if (updater) updater.check(true); } },
      { type: "separator" },
      { label: `عن CivilDraft ${app.getVersion()}`, click: () => dialog.showMessageBox(mainWindow, {
        type: "info", title: "CivilDraft",
        message: `CivilDraft ${app.getVersion()}`,
        detail: "مرسمة مخطّطات معمارية عربية — نسخة سطح المكتب.",
      }) },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

/* ═══ نسخةٌ واحدة فقط ═══ */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv, cwd) => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
    const f = findProjectArg(argv, cwd);
    if (f) queueOpen(f);
  });

  /* macOS: الفتح بالنقر المزدوج يصل حدثاً لا وسيطاً */
  app.on("open-file", (e, p) => { e.preventDefault(); queueOpen(p); });

  /* ملفٌّ مُرِّر عند الإطلاق (ويندوز): يُقرأ قبل إنشاء النافذة ويُسلَّم عند الجاهزية */
  const launchFile = findProjectArg(process.argv, process.cwd());

  app.whenReady().then(() => {
    protocol.handle(SCHEME, serve);
    const ses = session.defaultSession;
    /* لا كاميرا ولا ميكروفون ولا موقع — ما لا يحتاجه التطبيق يُرفض */
    /* fileSystem: لازمٌ للنسخة الاحتياطية الخارجية (showSaveFilePicker في backup.js)
       ويُمنَح لواجهتنا وحدها */
    const ALLOWED = new Set(["clipboard-sanitized-write", "fileSystem"]);
    ses.setPermissionRequestHandler((_wc, perm, cb, details) => {
      const from = String((details && details.requestingUrl) || "");
      cb(ALLOWED.has(perm) && from.startsWith(ORIGIN + "/"));
    });
    ses.setPermissionCheckHandler((_wc, perm, origin) =>
      ALLOWED.has(perm) && String(origin || "").startsWith(ORIGIN));
    wireDownloads(ses);
    initUpdater();
    buildMenu();
    if (launchFile) {
      readProject(launchFile).then(f => { pendingOpen = f; app.addRecentDocument(launchFile); }).catch(() => {})
        .finally(createWindow);
    } else {
      createWindow();
    }
    app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });

  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
