/* مساعدات اختبارات سطح المكتب — لا اختبارات هنا */
import { _electron as electron, test as base, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settleUi, drawWallsOn } from "./ui.js";

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ELECTRON_BIN = require("electron");   /* مسار ملفّ electron التنفيذي */

const tmpDirs = [];
export function tmpDir(prefix = "cd-e2e-") {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}
export function cleanupTmp() {
  for (const d of tmpDirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ويندوز قد يُبقي قفلاً لحظياً */ }
  }
}

/* مجلّد بيانات جديد. firstRun:true يكتب first-run.json مسبقاً فلا تظهر نافذة
   «نقل بيانات من نسخة الويب» الأصلية (مشروطة بغيابه) — وهي مُغلِقةٌ للنافذة فتُعطّل
   لوحة المفاتيح. اختبارُها يدويّ (QA-DESKTOP.md). */
export function makeUserData({ firstRun = true } = {}) {
  const d = tmpDir("cd-userdata-");
  if (firstRun) fs.writeFileSync(path.join(d, "first-run.json"), JSON.stringify({ at: Date.now(), v: "e2e" }));
  return d;
}

const baseArgs = (userData) => [
  ROOT,
  `--user-data-dir=${userData}`,
  ...(process.platform === "linux" ? ["--no-sandbox"] : []),
];

/* الواجهةُ جاهزة حين يُربَط الجسر وأزرار الحفظ والفتح (تُربط قبل bindDesktop مباشرةً) */
export async function waitReady(page) {
  await page.waitForFunction(() => window.civilDesktop && window.civilDesktop.isDesktop === true, null, { timeout: 30_000 });
  await page.waitForFunction(() => {
    const s = document.querySelector("#xSave"), o = document.querySelector("#xOpen");
    return !!(s && o && typeof s.onclick === "function" && typeof o.onclick === "function");
  }, null, { timeout: 30_000 });
  await page.waitForSelector("#cv", { state: "attached" });
}

/* يُطلق البرنامج. extraArgs: مثل مسار ملفّ .cdraft (كالنقر المزدوج في ويندوز).
   حوارات confirm/alert الخاصّة بالصفحة تُقبَل وتُسجَّل في dialogs. */
export async function launchApp({ userData, extraArgs = [], env = {} } = {}) {
  const ud = userData || makeUserData();
  const app = await electron.launch({
    args: [...baseArgs(ud), ...extraArgs],
    env: { ...process.env, ...env },
    timeout: 60_000,
  });
  const page = await app.firstWindow();
  const dialogs = [];
  page.on("dialog", (d) => { dialogs.push({ type: d.type(), message: d.message() }); d.accept().catch(() => {}); });
  await waitReady(page);
  await settleUi(page);                                   /* شاشة الترحيب/الجولة تغطّيان اللوحة */
  return { app, page, userData: ud, dialogs };
}

export async function closeApp(app) {
  try { await app.close(); } catch { /* أُغلق أصلاً */ }
}

/* يجعل أي تنزيل (a.download ← will-download) يُحفَظ في savePath بلا نافذة «حفظ باسم».
   setSavePath في مستمعٍ ثانٍ يلغي النافذة التي طلبها main.cjs. */
export async function autoSaveDownloadsTo(app, dir) {
  await app.evaluate(({ session }, { d, sep }) => {
    session.defaultSession.on("will-download", (_e, item) => {
      const p = d + sep + item.getFilename();
      item.setSavePath(p);
      globalThis.__lastDownload = p;
      globalThis.__downloadCount = (globalThis.__downloadCount || 0) + 1;
    });
  }, { d: dir, sep: path.sep });
}

/* آخر مسارٍ حُفظ عبر autoSaveDownloadsTo */
export const lastDownload = (app) => app.evaluate(() => globalThis.__lastDownload || null);
/* عدد التنزيلات — يكشف حفظاً مزدوجاً إن اشتغل مساران لـCtrl+S معاً */
export const downloadCount = (app) => app.evaluate(() => globalThis.__downloadCount || 0);

/* قراءة JSON لملفٍّ قد لا يكتمل بعد: يعيد null بدل أن يرمي */
export function readJsonSafe(p) {
  try { return p ? JSON.parse(fs.readFileSync(p, "utf8")) : null; } catch { return null; }
}

/* ═══ الرسم ═══ ينقر نقطتين لكل جدار بعد التأكّد أن اللوحة هي ما تصله النقرة (ui.js) */
export const drawWalls = (page, count = 2) => drawWallsOn(page, count);

/* ينتظر أن يبلغ الحفظ التلقائي عدد الجدران المرسومة بالضبط — لا «واحداً على الأقل»،
   وإلا سبقه الإغلاق أو القتل فاختلف العددان */
export async function waitStored(page, n) {
  await expect.poll(() => storedWalls(page), { timeout: 20_000 }).toBe(n);
}

/* يستبدل نافذة «فتح» الأصلية (لا يمكن لـPlaywright لمسها) بمسارٍ يُعطى لها،
   ويسجّل خيارات كل استدعاء. الواجهة تفتح الآن عبر dialog.showOpenDialog لا عبر <input type=file>. */
export async function stubOpenDialog(app, filePath) {
  await app.evaluate(({ dialog }, p) => {
    globalThis.__openCalls = [];
    dialog.showOpenDialog = async (...args) => {
      const opts = args.length > 1 ? args[1] : args[0];
      globalThis.__openCalls.push(opts);
      return p ? { canceled: false, filePaths: [p] } : { canceled: true, filePaths: [] };
    };
  }, filePath);
}
export const openDialogCalls = (app) => app.evaluate(() => globalThis.__openCalls || []);

/* يضغط عنصر القائمة بمُسرِّعه — كنقرةٍ بالفأرة على القائمة: بلا ضغطة مفتاحٍ ولا إيماءةِ مستخدمٍ في الصفحة */
export function clickMenu(app, accelerator) {
  return app.evaluate(({ Menu }, acc) => {
    for (const top of Menu.getApplicationMenu().items)
      for (const it of top.submenu.items) if (it.accelerator === acc) { it.click(); return true; }
    return false;
  }, accelerator);
}

/* عدد الجدران المحفوظة فعلاً في التخزين الدائم (IndexedDB ثم localStorage) —
   مستقلٌّ عن بنية الواجهة الداخلية */
export function storedWalls(page) {
  return page.evaluate(async () => {
    const fromIdb = await new Promise((res) => {
      let rq;
      try { rq = indexedDB.open("civildraft"); } catch { return res(-1); }
      rq.onerror = () => res(-1);
      rq.onsuccess = () => {
        const db = rq.result;
        try {
          const g = db.transaction("state", "readonly").objectStore("state").get("doc");
          g.onsuccess = () => { db.close(); res(g.result && Array.isArray(g.result.walls) ? g.result.walls.length : -1); };
          g.onerror = () => { db.close(); res(-1); };
        } catch { db.close(); res(-1); }
      };
    });
    let fromLs = -1;
    try {
      const o = JSON.parse(localStorage.getItem("civildraft.v1") || "null");
      if (o && Array.isArray(o.walls)) fromLs = o.walls.length;
    } catch { /* تالف */ }
    return Math.max(fromIdb, fromLs);
  });
}

export const logText = (page) => page.locator("#log").innerText();

/* ينتظر خروج عمليةٍ فرعية (النسخة الثانية) ويعيد رمز الخروج */
export function spawnSecond(userData, extraArgs = []) {
  const child = spawn(ELECTRON_BIN, [...baseArgs(userData), ...extraArgs], { stdio: "ignore", windowsHide: true });
  const exited = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
    child.once("error", (error) => resolve({ error }));
  });
  return { child, exited };
}

/* ═══ fixture: يغلق كل ما أُطلق ويمسح المجلّدات المؤقّتة بعد الاختبار ═══ */
export const test = base.extend({
  launch: async ({}, use) => {
    const apps = [];
    await use(async (opts) => {
      const r = await launchApp(opts);
      apps.push(r.app);
      return r;
    });
    for (const a of apps) await closeApp(a);
    cleanupTmp();
  },
});
export { expect };

/* يصنع ملفّ .cdraft حقيقياً: يرسم جدراناً ويحفظ بـCtrl+S ثم يُغلق ذلك البرنامج.
   يعيد {file, walls} — عدد الجدران مقروءاً من الملفّ نفسه لا مفترضاً. */
export async function makeProjectFile(launch, wallCount = 2) {
  const { app, page } = await launch();
  const dir = tmpDir("cd-project-");
  await autoSaveDownloadsTo(app, dir);
  await drawWalls(page, wallCount);
  await page.locator("#cv").focus();
  await page.keyboard.press("Control+S");
  await expect.poll(async () => readJsonSafe(await lastDownload(app)) !== null, { timeout: 20_000 }).toBe(true);
  const file = await lastDownload(app);
  const data = readJsonSafe(file);
  await closeApp(app);
  return { file, walls: data.walls.length };
}
