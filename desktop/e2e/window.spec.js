/* 1 · ظهور النافذة وسلامة الإقلاع */
import { test, expect, logText } from "./helpers.js";

test("تظهر نافذةٌ واحدة مرئيّة وتُحمَّل الواجهة بلا تعليق", async ({ launch }) => {
  const { app, page } = await launch();

  /* نافذةٌ واحدة، ظاهرة (show:false حتى ready-to-show) */
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows();
    return { n: w.length, visible: w.length === 1 && w[0].isVisible() };
  })).toEqual({ n: 1, visible: true });

  /* العنوان من <title> الصفحة (يطغى على title في BrowserWindow) */
  await expect(page).toHaveTitle(/CivilDraft/);

  /* الأصل app://civildraft — لا file:// ولا http */
  expect(page.url()).toMatch(/^app:\/\/civildraft\//);

  /* سطر «يُحمَّل CivilDraft…» يُزال حين يكتمل بناء الواجهة؛ بقاؤه = وحدةٌ لم تُحمَّل */
  await expect(page.locator("#bootMsg")).toHaveCount(0);
  await expect(page.locator("#cv")).toBeVisible();

  /* حجمٌ معقول وعلى الأقلّ الحدّ الأدنى المعرَّف (900×600) */
  const b = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
  expect(b.width).toBeGreaterThanOrEqual(900);
  expect(b.height).toBeGreaterThanOrEqual(600);
});

test("الجسر موجود والعزل الأمني قائم (لا Node داخل الواجهة)", async ({ launch }) => {
  const { page } = await launch();
  const r = await page.evaluate(() => ({
    bridge: !!(window.civilDesktop && window.civilDesktop.isDesktop),
    keys: Object.keys(window.civilDesktop || {}).sort(),
    hasRequire: typeof window.require,
    hasProcess: typeof window.process,
    frozen: Object.isFrozen(window.civilDesktop),
  }));
  expect(r.bridge).toBe(true);
  expect(r.frozen).toBe(true);
  expect(r.hasRequire).toBe("undefined");
  expect(r.hasProcess).toBe("undefined");
  expect(r.keys).toEqual(["info", "isDesktop", "onCommand", "onOpenFile", "openFile", "ready", "saveFile"]);
});

test("القائمة العربية موجودة وللأوامر الثلاثة اختصاراتها", async ({ launch }) => {
  const { app } = await launch();
  const items = await app.evaluate(({ Menu }) => {
    const m = Menu.getApplicationMenu();
    const out = {};
    for (const top of m.items) for (const it of (top.submenu ? top.submenu.items : []))
      if (it.accelerator) out[String(it.accelerator)] = it.label;
    return { tops: m.items.map((t) => t.label), acc: out };
  });
  expect(items.tops).toEqual(["ملف", "تحرير", "عرض", "مساعدة"]);
  expect(items.acc["CmdOrCtrl+N"]).toBeTruthy();
  expect(items.acc["CmdOrCtrl+O"]).toBeTruthy();
  expect(items.acc["CmdOrCtrl+S"]).toBeTruthy();
});

test("الروابط الخارجية لا تُفتح داخل النافذة", async ({ launch }) => {
  const { app, page } = await launch();
  /* نعترض shell.openExternal كي لا يُفتح متصفّحٌ فعلاً أثناء الاختبار */
  await app.evaluate(({ shell }) => {
    globalThis.__opened = [];
    shell.openExternal = async (u) => { globalThis.__opened.push(u); };
  });
  await page.evaluate(() => window.open("https://example.com/", "_blank"));
  await expect.poll(() => app.evaluate(() => globalThis.__opened)).toEqual(["https://example.com/"]);
  expect(page.url()).toMatch(/^app:\/\/civildraft\//);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  expect(await logText(page)).not.toMatch(/خطأ فادح/);
});
