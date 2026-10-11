/* CivilDraft — إعداد اختبارات Playwright لنسخة سطح المكتب (Electron)
   التشغيل من جذر المشروع:  npm run test:e2e
   على لينكس بلا شاشة:      xvfb-run -a npm run test:e2e */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.js$/,
  /* كل اختبار يُطلق نسخةً حقيقية بمجلّد بيانات مؤقّت خاصّ به.
     عاملٌ واحد: النوافذ تأخذ التركيز، والتوازي يُربك اختصارات لوحة المفاتيح. */
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "../../playwright-report" }]] : "list",
  outputDir: "../../test-results",
  use: { trace: "retain-on-failure" },
});
