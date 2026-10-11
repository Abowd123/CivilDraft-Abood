/* 5 · منع النسخة الثانية (app.requestSingleInstanceLock)
   القفل مرتبطٌ بمجلّد البيانات؛ فالنسخة الثانية تُطلَق على المجلّد نفسه. */
import { test, expect, spawnSecond } from "./helpers.js";

const windowCount = (app) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);

test("النسخة الثانية تنتهي وحدها ولا تفتح نافذةً", async ({ launch }) => {
  const { app, userData } = await launch();

  const { child, exited } = spawnSecond(userData);
  const timeout = new Promise((r) => setTimeout(() => r({ hung: true }), 30_000));
  const r = await Promise.race([exited, timeout]);
  if (r.hung) child.kill();
  expect(r.hung, "النسخة الثانية بقيت تعمل — القفل لم يُحجَب").toBeUndefined();
  expect(r.error).toBeUndefined();
  expect(r.code).toBe(0);                          /* app.quit() ← خروجٌ نظيف */

  expect(await windowCount(app)).toBe(1);          /* الأولى سليمة ونافذتها وحيدة */
});

test("إطلاق النسخة الثانية يُرجع النافذة الأولى من التصغير", async ({ launch }) => {
  test.skip(process.platform !== "win32", "التصغير/الاسترجاع يحتاج مدير نوافذ حقيقياً (ويندوز)");
  const { app, userData } = await launch();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized())).toBe(true);

  const { exited } = spawnSecond(userData);
  await exited;

  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized())).toBe(false);
});

test("بعد إغلاق الأولى يمكن تشغيل نسخةٍ جديدة على المجلّد نفسه", async ({ launch }) => {
  const a = await launch();
  await a.app.close();
  const b = await launch({ userData: a.userData });
  expect(await windowCount(b.app)).toBe(1);
});
