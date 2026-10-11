/* 4 · بقاء البيانات بعد إغلاق البرنامج وتشغيله من جديد
   الحفظ التلقائي في IndexedDB (احتياطيّه localStorage) داخل --user-data-dir. */
import { test, expect, makeUserData, tmpDir, drawWalls, waitStored, storedWalls, closeApp,
         autoSaveDownloadsTo, lastDownload, readJsonSafe } from "./helpers.js";

/* يحفظ المشروع القائم في الواجهة بـCtrl+S ويعيد عدد جدرانه — دليلٌ على ما حمّلته الواجهة فعلاً */
async function wallsInUi(app, page) {
  await autoSaveDownloadsTo(app, tmpDir("cd-dl-"));
  await page.locator("#cv").focus();
  await page.keyboard.press("Control+S");
  await expect.poll(async () => readJsonSafe(await lastDownload(app)) !== null, { timeout: 20_000 }).toBe(true);
  return readJsonSafe(await lastDownload(app)).walls.length;
}

test("الرسم يبقى بعد الإغلاق العاديّ وإعادة التشغيل", async ({ launch }) => {
  const userData = makeUserData();

  const a = await launch({ userData });
  await drawWalls(a.page, 2);
  await waitStored(a.page, 2);
  const n = 2;
  await closeApp(a.app);

  const b = await launch({ userData });
  expect(await wallsInUi(b.app, b.page)).toBe(n);
});

test("الرسم يبقى بعد إنهاءٍ قسريّ للعملية (بعد اكتمال الحفظ التلقائي)", async ({ launch }) => {
  const userData = makeUserData();

  const a = await launch({ userData });
  await drawWalls(a.page, 2);
  await waitStored(a.page, 2);
  const n = 2;
  a.app.process().kill("SIGKILL");                  /* ما يعادل «إنهاء المهمّة» */
  await new Promise((r) => a.app.process().once("exit", r));

  const b = await launch({ userData });
  expect(await wallsInUi(b.app, b.page)).toBe(n);
});

test("مجلّد بيانات مختلف = مشروعٌ فارغ (لا تسرّب بين الملفّات الشخصية)", async ({ launch }) => {
  const a = await launch();
  await drawWalls(a.page, 1);
  await waitStored(a.page, 1);                        /* هنا جدارٌ واحد فقط */

  const b = await launch({ userData: makeUserData() });
  expect(await storedWalls(b.page)).toBeLessThanOrEqual(0);
});

test("حجم النافذة وموضعها يُستعادان", async ({ launch }) => {
  const userData = makeUserData();
  const a = await launch({ userData });
  await a.app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w.isMaximized()) w.unmaximize();
    w.setBounds({ x: 120, y: 90, width: 1111, height: 733 });
  });
  await closeApp(a.app);

  const b = await launch({ userData });
  const bd = await b.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
  expect(Math.abs(bd.width - 1111)).toBeLessThanOrEqual(2);
  expect(Math.abs(bd.height - 733)).toBeLessThanOrEqual(2);
});
