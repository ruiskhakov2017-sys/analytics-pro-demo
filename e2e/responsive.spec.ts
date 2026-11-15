import { test, expect } from "@playwright/test";
test("all concepts fit mobile and desktop viewports", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("Nord / Search", { exact: true })).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark", "editorial"]) {
      await page.getByLabel("Концепция").selectOption(theme);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `${theme} at ${width}px`).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`${theme}-${width}.png`),
        fullPage: true,
      });
    }
  }
});
