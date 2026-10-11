/* مساعدات الصفحة — بلا Electron ولا @playwright/test، فتُجرَّب أيضاً على نسخة الويب في Chromium.
   لا اختبارات هنا. */

/* على مجلّد بيانات جديد تُغطّي شاشةُ الترحيب (#welcome) اللوحةَ كلَّها، وبعد إغلاقها قد تبدأ جولةٌ
   تلقائية (#tour). نقراتُ الرسم التي تقع عليهما لا تصل اللوحة فلا يُرسَم شيء.
   تُغلَق هنا بعد اكتمال الإقلاع (يزول #bootErr عند bootOk). */
export async function settleUi(page, { timeout = 30_000 } = {}) {
  await page.waitForFunction(() => !document.getElementById("bootErr"), null, { timeout }).catch(() => {});
  for (let i = 0; i < 4; i++) {
    const ov = await page
      .waitForSelector("#welcome:not([hidden]), #tour:not([hidden])", { timeout: i === 0 ? 2_500 : 900 })
      .catch(() => null);
    if (!ov) break;
    const id = await ov.getAttribute("id");
    if (id === "welcome") await page.locator("#welcome .wc-close").click();
    else await page.locator('#tour [data-t="end"]').first().click();
    await page.waitForSelector(`#${id}`, { state: "hidden", timeout: 5_000 }).catch(() => {});
  }
}

/* يرسم count جداراً أفقياً بإدخال الإحداثيات في سطر الأوامر (wall ثم نقطتان ثم Esc).
   لا نقراتِ ماوس عمداً: بعد أول نقرة يظهر #optbar فوق اللوحة ويغطّي نقاطاً منها (يظهر في النوافذ الصغيرة،
   وجُرِّب 900×620)، فيضيع الجدار بصمت. سطر الأوامر لا يتأثّر بحجم النافذة ولا بالتراكب. */
export async function drawWallsOn(page, count = 2) {
  await settleUi(page);
  const cl = page.locator("#clIn");
  await cl.waitFor({ state: "visible" });
  const send = async (t) => { await cl.fill(t); await page.keyboard.press("Enter"); };
  for (let i = 0; i < count; i++) {
    await send("wall");
    await send(`0,${i * 3}`);
    await send(`5,${i * 3}`);
    await page.keyboard.press("Escape");                       /* ينهي السلسلة */
  }
}
