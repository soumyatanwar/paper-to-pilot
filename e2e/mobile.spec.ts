import { expect, test } from "@playwright/test";

for (const path of ["/questions", "/papers", "/champions", "/nominate", "/match", "/privacy"]) {
  test(`${path} fits a phone screen without sideways scrolling`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
