/* 2 · Ctrl+S و Ctrl+O
   مساران مختلفان في الشيفرة، فيُختبر كلٌّ منهما:
   · Ctrl+S: تلتقطه الواجهة (keymap.js) وتمنع الافتراضي، فلا تصل القائمةَ — حفظٌ واحد.
     أمّا داخل حقل إدخال فالواجهة تتركه فتلتقطه قائمة الغلاف (CmdOrCtrl+S).
   · Ctrl+O: لا تعالجه الواجهة؛ تلتقطه قائمة الغلاف ← "desktop:command" ← civilDesktop.openFile
     ← dialog.showOpenDialog في الغلاف (لا <input type=file>؛ Chromium يحجبه بلا إيماءة مستخدم).
     نافذة النظام لا يلمسها Playwright فتُستبدل بـstubOpenDialog، وخيارات الاستدعاء تُقرأ بـopenDialogCalls. */
import fs from "node:fs";
import path from "node:path";
import { test, expect, tmpDir, autoSaveDownloadsTo, lastDownload, downloadCount,
         readJsonSafe, drawWalls, makeProjectFile, stubOpenDialog, openDialogCalls,
         clickMenu } from "./helpers.js";

const opened = (name, walls) => new RegExp(`فُتح\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+·\\s+${walls}\\s+جدار`);
/* كل امتدادات مرشّحات الحوار المُمرَّر إلى dialog.showOpenDialog */
const filterExts = (calls) => calls.flatMap((o) => (o && o.filters || []).flatMap((f) => f.extensions || []));

test("Ctrl+S يحفظ ملف .cdraft مرّةً واحدة", async ({ launch }) => {
  const { app, page } = await launch();
  await autoSaveDownloadsTo(app, tmpDir("cd-dl-"));
  await drawWalls(page, 1);
  await page.locator("#cv").focus();
  await page.keyboard.press("Control+S");

  await expect.poll(async () => readJsonSafe(await lastDownload(app)) !== null, { timeout: 20_000 }).toBe(true);
  const file = await lastDownload(app);
  expect(file).toMatch(/\.cdraft$/);
  const j = readJsonSafe(file);
  expect(j.__app).toBe("civildraft");
  expect(j.walls.length).toBeGreaterThanOrEqual(1);

  /* لو اشتغل المساران معاً لنزل ملفّان */
  await page.waitForTimeout(1500);
  expect(await downloadCount(app)).toBe(1);
});

test("Ctrl+S يعمل والتركيز داخل حقل إدخال (مسار قائمة الغلاف)", async ({ launch }) => {
  const { app, page } = await launch();
  await autoSaveDownloadsTo(app, tmpDir("cd-dl-"));
  await drawWalls(page, 1);
  await page.locator("#clIn").focus();           /* سطر الأوامر: الواجهة تمرّر Ctrl+S أصلاً */
  await page.keyboard.press("Control+S");
  await expect.poll(() => downloadCount(app), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(1500);
  expect(await downloadCount(app)).toBe(1);
});

test("عنصر القائمة «حفظ المشروع» يعمل (بلا لوحة مفاتيح)", async ({ launch }) => {
  const { app, page } = await launch();
  await autoSaveDownloadsTo(app, tmpDir("cd-dl-"));
  await drawWalls(page, 1);
  await app.evaluate(({ Menu }) => {
    const m = Menu.getApplicationMenu();
    for (const top of m.items) for (const it of top.submenu.items)
      if (it.accelerator === "CmdOrCtrl+S") it.click();
  });
  await expect.poll(async () => readJsonSafe(await lastDownload(app)) !== null, { timeout: 20_000 }).toBe(true);
});

test("عنصر القائمة «فتح» (نقرٌ بلا لوحة مفاتيح) يفتح الملف فعلاً", async ({ launch }) => {
  const { file, walls } = await makeProjectFile(launch, 2);
  const { app, page } = await launch();                /* مجلّد بيانات فارغ: لا تأكيد استبدال */
  await stubOpenDialog(app, file);

  expect(await clickMenu(app, "CmdOrCtrl+O")).toBe(true);   /* وإلا لم يوجد العنصر أصلاً */

  await expect(page.locator("#log")).toContainText(opened(path.basename(file), walls), { timeout: 20_000 });
  expect((await openDialogCalls(app)).length).toBe(1);
});

test("Ctrl+O بلوحة المفاتيح يستدعي حوار الفتح بمرشّحٍ يشمل cdraft وjson", async ({ launch }) => {
  const { file, walls } = await makeProjectFile(launch, 2);
  const { app, page } = await launch();
  await stubOpenDialog(app, file);
  await page.locator("#cv").focus();
  await page.keyboard.press("Control+O");

  await expect.poll(async () => (await openDialogCalls(app)).length, { timeout: 15_000 }).toBe(1);
  const exts = filterExts(await openDialogCalls(app));
  expect(exts).toContain("cdraft");
  expect(exts).toContain("json");
  await expect(page.locator("#log")).toContainText(opened(path.basename(file), walls), { timeout: 20_000 });
});

test("Ctrl+N: «مشروع جديد» يصل إلى الواجهة", async ({ launch }) => {
  const { app, page } = await launch();
  /* نتحقّق من وصول الأمر لا من نتيجته: نعترض النقر على #bNew */
  await page.evaluate(() => {
    window.__newClicks = 0;
    const b = document.querySelector("#bNew");
    if (b) b.addEventListener("click", () => { window.__newClicks++; }, true);
  });
  await app.evaluate(({ Menu }) => {
    const m = Menu.getApplicationMenu();
    for (const top of m.items) for (const it of top.submenu.items)
      if (it.accelerator === "CmdOrCtrl+N") it.click();
  });
  await expect.poll(() => page.evaluate(() => window.__newClicks)).toBe(1);
});
