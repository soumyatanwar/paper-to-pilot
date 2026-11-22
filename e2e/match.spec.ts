import { expect, test } from "@playwright/test";

test.describe("6. Matching", () => {
  test("scores from a question match the prototype", async ({ page }) => {
    await page.goto("/match?question=q1");
    const first = page.locator("article.card").first();
    await expect(first).toContainText("Smartphone thermal imaging");
    await expect(first.locator(".score")).toContainText("84");
    await expect(first).toHaveClass(/hit/);
    const champs = page.locator(".panel", { hasText: "Likely champions" });
    await expect(champs.locator(".m").first()).toContainText("Dr. Kavya Iyer");
    await expect(champs.locator(".m").first()).toContainText("Asked this question");
  });

  test("switching to 'Start from a paper' ranks questions and lists endorsers first", async ({ page }) => {
    await page.goto("/match");
    await page.getByRole("link", { name: "Start from a paper" }).click();
    await page.getByLabel("Paper or invention").selectOption({ label: "Smartphone thermal imaging for pre-ulcer detection in the diabetic foot" });
    await expect(page).toHaveURL(/paper=i1/);
    await expect(page.locator("article.card").first()).toContainText("Most of my diabetic patients");
    const champs = page.locator(".panel", { hasText: "Likely champions" });
    await expect(champs.locator(".m").first()).toContainText("Endorsed this paper");
  });

  test("changing the question re-ranks papers", async ({ page }) => {
    await page.goto("/match?question=q1");
    await page.getByLabel("Question").selectOption("q4");
    await expect(page).toHaveURL(/question=q4/);
    await expect(page.locator("article.card").first()).toContainText("Fingertip camera estimate of haemoglobin");
  });
});
