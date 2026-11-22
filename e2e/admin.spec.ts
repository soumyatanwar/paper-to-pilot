import { expect, test } from "@playwright/test";
import { adminLogin, card, uniq } from "./helpers";

test.describe("Team tools", () => {
  test("rejects a wrong password", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Password").fill("nope");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator(".err")).toHaveText("That password is not right.");
    await page.goto("/admin/doctors");
    await expect(page.getByRole("heading", { name: "Exchange team" })).toBeVisible();
  });

  test("a post with a ward number waits for review, then appears once approved", async ({ page }) => {
    const text = uniq("Patients in Ward 6 keep developing pressure injuries, can we screen earlier?");
    await page.goto("/questions");
    await page.getByLabel("Your name").fill("Dr. Ward Test");
    await page.getByLabel("Your question").fill(text);
    await page.getByRole("button", { name: "Post question" }).click();
    await expect(page.getByRole("status").filter({ hasText: "It will appear once a moderator has checked it" })).toBeVisible();
    await expect(card(page, text)).toHaveCount(0);

    await adminLogin(page);
    const row = page.locator("tr", { hasText: text });
    await expect(row).toContainText("Mentions a ward, bed or room number");
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(page.locator("tr", { hasText: text }).getByRole("button", { name: "Hide" })).toBeVisible();

    await page.goto("/questions");
    await expect(card(page, text)).toBeVisible();
  });

  test("hiding a post removes it from the exchange", async ({ page }) => {
    const text = uniq("Spam-like test question about COPD camps");
    await page.goto("/questions");
    await page.getByLabel("Your name").fill("Dr. Hide Me");
    await page.getByLabel("Your question").fill(text);
    await page.getByRole("button", { name: "Post question" }).click();
    await expect(card(page, text)).toBeVisible();
    await adminLogin(page);
    await page.locator("tr", { hasText: text }).getByRole("button", { name: "Hide" }).click();
    await expect(page.locator("section", { hasText: "Hidden (" }).locator("tr", { hasText: text })).toBeVisible();
    await page.goto("/questions");
    await expect(card(page, text)).toHaveCount(0);
  });

  test("CSV import completes a patient-nominated profile and flags a likely duplicate to merge", async ({ page }) => {
    // A patient adds a doctor who is not on the list.
    await page.goto("/nominate");
    await page.getByLabel("Your doctor").selectOption({ label: "My doctor is not on this list" });
    await page.getByLabel("Doctor's name").fill("Dr. Anil Kapoor");
    await page.getByRole("checkbox", { name: "Listens and explains clearly" }).check();
    await page.getByLabel(/I understand my nomination is anonymous/).check();
    await page.getByRole("button", { name: "Send nomination" }).click();
    await expect(page.getByText("Your nomination for Dr. Anil Kapoor has been added.")).toBeVisible();

    await adminLogin(page);
    await page.getByRole("link", { name: "Doctors" }).click();
    await page.getByLabel("CSV rows").fill(
      "name,specialty,city,years,clinic,hospitals,publications,trials,teaching,reviews,interests\n" +
        "Dr. Anil Kapoor,Endocrinology,Lucknow,15,Kapoor Clinic,City Hospital,3,1,yes,200,thyroid\n" +
        "Dr. A. Kapoor,Endocrinology,Lucknow,15,,City Hospital,0,0,no,0,\n",
    );
    await page.getByRole("button", { name: "Import" }).click();
    await expect(page.getByRole("status")).toContainText("Imported 1 doctor, and completed 1 patient-nominated profile.");
    await expect(page.getByRole("status")).toContainText("likely duplicate");

    const pair = page.locator("article.card", { hasText: "Same surname, matching initials" }).filter({ hasText: "Kapoor" });
    await expect(pair).toBeVisible();
    await pair.getByRole("button", { name: "Keep Dr. Anil Kapoor" }).click();
    await expect(page.locator("article.card", { hasText: "Dr. A. Kapoor" })).toHaveCount(0);

    await page.goto("/champions?city=Lucknow");
    const c = card(page, "Dr. Anil Kapoor");
    await expect(c).toContainText("Own clinic: Kapoor Clinic");
    await expect(c).toContainText("1 patient nomination");
    await expect(c).not.toContainText("not verified");
  });
});
