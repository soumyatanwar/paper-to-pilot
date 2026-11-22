import { expect, test } from "@playwright/test";

test("home page shows the exchange and its sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Clinician Research Exchange" })).toBeVisible();
  for (const name of ["Clinician questions", "Papers", "Champions", "Nominate a doctor", "Match"]) {
    await expect(page.getByRole("navigation", { name: "Sections" }).getByText(name)).toBeVisible();
  }
});
