import { expect, test } from "@playwright/test";
import { card, uniq } from "./helpers";

test.describe("2. Paper submission and 3. endorsement", () => {
  test("detects conditions while typing, respects manual changes, and keeps input across role switches", async ({ page }) => {
    await page.goto("/papers");
    await page.getByLabel("Your name").fill("Asha Inventor");
    await page.getByLabel("Abstract or summary").fill("A smartphone app screens for anaemia from fingertip colour.");
    const preview = page.locator("#p-preview");
    await expect(preview.locator(".chip", { hasText: "Anaemia" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Anaemia" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Point-of-care screening" })).toBeChecked();

    await page.getByRole("checkbox", { name: "Point-of-care screening" }).uncheck();
    await page.getByLabel("Abstract or summary").pressSequentially(" Used at school camps.");
    await expect(page.getByRole("checkbox", { name: "Point-of-care screening" })).not.toBeChecked();

    await page.getByRole("button", { name: "Independent researcher" }).click();
    await expect(page.getByText("Summaries from independent researchers are marked as such")).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveValue("Asha Inventor");
  });

  test("validates in order: setting, then rights", async ({ page }) => {
    await page.goto("/papers");
    await page.getByLabel("Your name").fill("X");
    await page.getByLabel("Paper or invention title").fill("Cough AI");
    await page.getByLabel("Abstract or summary").fill("Flags tuberculosis from cough sounds.");
    await page.getByRole("button", { name: "Add paper to the exchange" }).click();
    await expect(page.locator(".err")).toHaveText("Pick at least one setting where it works.");
    await page.getByRole("checkbox", { name: "Community / camps" }).check();
    await page.getByRole("button", { name: "Add paper to the exchange" }).click();
    await expect(page.locator(".err")).toHaveText("Confirm you wrote this summary or have permission to share it.");
    await expect(page.getByLabel("Paper or invention title")).toHaveValue("Cough AI");
  });

  test("a doctor's own submission counts as their endorsement", async ({ page }) => {
    const title = uniq("Offloading boot protocol for neuropathic foot ulcer");
    await page.goto("/papers");
    await page.getByRole("button", { name: "Doctor", exact: true }).click();
    await page.getByLabel("Your name").fill("Dr. Sameer Joshi");
    await page.getByLabel("Paper or invention title").fill(title);
    await page.getByLabel("Abstract or summary").fill("Total contact casting alternative for diabetic foot ulcer in OPD.");
    await page.getByRole("checkbox", { name: "Clinic / OPD" }).check();
    await page.getByLabel("I wrote this summary").check();
    await page.getByRole("button", { name: "Add paper to the exchange" }).click();
    await expect(page.getByRole("status").filter({ hasText: "It counts as your endorsement." })).toBeVisible();
    const c = card(page, title);
    await expect(c).toContainText("Endorsed by: Dr. Sameer Joshi");
    await expect(c.locator(".score")).toContainText("1");
  });

  test("a doctor can endorse a paper only once", async ({ page }) => {
    await page.goto("/papers");
    const c = card(page, "Breath sensor for early COPD exacerbation");
    await c.getByLabel("Endorse as").selectOption({ label: "Dr. Imran Shaikh · Pulmonology, Mumbai" });
    await c.getByRole("button", { name: "I would pilot this" }).click();
    await expect(page.getByText("Endorsement added.")).toBeVisible();
    const again = card(page, "Breath sensor for early COPD exacerbation");
    await expect(again).toContainText("Endorsed by: Dr. Imran Shaikh");
    await again.getByLabel("Endorse as").selectOption({ label: "Dr. Imran Shaikh · Pulmonology, Mumbai" });
    await again.getByRole("button", { name: "I would pilot this" }).click();
    await expect(page.getByText("Already endorsed by this doctor.")).toBeVisible();
  });

  test("'See matches' opens Match from that paper", async ({ page }) => {
    await page.goto("/papers");
    await card(page, "Smartphone colour card for newborn bilirubin").getByRole("link", { name: "See matches" }).click();
    await expect(page).toHaveURL(/\/match\?paper=i6/);
    await expect(page.locator("article.card").first()).toContainText("Newborns discharged at 48 hours");
  });
});
