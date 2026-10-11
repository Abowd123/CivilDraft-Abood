/* 3 · حفظ ملفّ .cdraft وفتحه
   الملفّ يُصنع بالبرنامج نفسه (رسمٌ ثم Ctrl+S) فلا نفترض بنية الجدار. */
import fs from "node:fs";
import path from "node:path";
import { test, expect, tmpDir, makeUserData, makeProjectFile, drawWalls,
         logText, readJsonSafe, spawnSecond, stubOpenDialog } from "./helpers.js";

const opened = (name, walls) => new RegExp(`فُتح\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+·\\s+${walls}\\s+جدار`);

test("ملفّ المشروع المحفوظ نصّ JSON سليم بامتداد .cdraft", async ({ launch }) => {
  const { file, walls } = await makeProjectFile(launch, 2);
  expect(path.extname(file)).toBe(".cdraft");
  const j = readJsonSafe(file);
  expect(j).not.toBeNull();
  expect(j.__app).toBe("civildraft");
  expect(typeof j.__ver).toBe("number");
  expect(walls).toBeGreaterThanOrEqual(1);
});

test("حفظٌ ثم فتح في نسخةٍ جديدة (Ctrl+O + اختيار الملف)", async ({ launch }) => {
  const { file, walls } = await makeProjectFile(launch, 2);

  /* برنامجٌ جديد بمجلّد بيانات فارغ: لا شيء مرسوماً فيه */
  const { app, page } = await launch();
  await stubOpenDialog(app, file);
  await page.locator("#cv").focus();
  await page.keyboard.press("Control+O");

  await expect(page.locator("#log")).toContainText(opened(path.basename(file), walls), { timeout: 20_000 });
});

test("فتح ملفّ فوق مشروعٍ غير فارغ يطلب تأكيداً أولاً", async ({ launch }) => {
  const { file } = await makeProjectFile(launch, 1);
  const { app, page, dialogs } = await launch();
  await drawWalls(page, 1);

  await stubOpenDialog(app, file);
  await page.locator("#cv").focus();
  await page.keyboard.press("Control+O");

  await expect.poll(() => dialogs.some((d) => d.type === "confirm" && /سيُفقد/.test(d.message))).toBe(true);
});

test("النقر المزدوج على ملفّ (يُمرَّر وسيطاً عند الإطلاق) يفتحه", async ({ launch }) => {
  const { file, walls } = await makeProjectFile(launch, 2);
  const { page } = await launch({ userData: makeUserData(), extraArgs: [file] });
  await expect(page.locator("#log")).toContainText(opened(path.basename(file), walls), { timeout: 20_000 });
});

test("ملفٌّ يُرسَل لنسخةٍ تعمل أصلاً يُفتح في نافذتها (second-instance)", async ({ launch }) => {
  const { file, walls } = await makeProjectFile(launch, 2);
  const { app, page, userData } = await launch();

  const { exited } = spawnSecond(userData, [file]);
  const r = await exited;
  expect(r.error).toBeUndefined();

  await expect(page.locator("#log")).toContainText(opened(path.basename(file), walls), { timeout: 20_000 });
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
});

test("ملفٌّ تالف لا يُسقط البرنامج ويُبلَّغ بالخطأ", async ({ launch }) => {
  const bad = path.join(tmpDir("cd-bad-"), "broken.cdraft");
  fs.writeFileSync(bad, "{ هذا ليس JSON ");
  const { app, page } = await launch();

  await stubOpenDialog(app, bad);
  await page.locator("#cv").focus();
  await page.keyboard.press("Control+O");

  await expect(page.locator("#log .ln.er").first()).toBeVisible({ timeout: 15_000 });
  /* الواجهة ما زالت حيّة */
  await expect(page.locator("#cv")).toBeVisible();
  expect(await logText(page)).not.toMatch(/فُتح\s+broken\.cdraft/);
});
