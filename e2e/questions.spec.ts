import { expect, test } from "@playwright/test";
import { card, uniq } from "./helpers";

test.describe("1. Clinician raises a question", () => {
  test("posts a question, which shows detected conditions", async ({ page }) => {
    const text = uniq("Do home spirometry readings predict COPD exacerbation in our OPD patients?");
    await page.goto("/questions");
    await page.getByLabel("Your name").fill("Dr. Test Clinician");
    await page.getByLabel("Specialty").selectOption("Pulmonology");
    await page.getByLabel("Your question").fill(text);
    await page.getByLabel("Patient group").fill("COPD, 50–75 years, mostly ex-smokers");
    await page.getByRole("button", { name: "Post question" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Your question is posted." })).toBeVisible();
    const c = card(page, text);
    await expect(c).toBeVisible();
    await expect(c.locator(".chip", { hasText: "COPD" })).toBeVisible();
    await expect(c.locator(".score")).toContainText("0");
  });

  test("blocks patient identifiers and keeps what was typed", async ({ page }) => {
    await page.goto("/questions");
    await page.getByLabel("Your name").fill("Dr. Test");
    await page.getByLabel("City").fill("Nagpur");
    await page.getByLabel("Your question").fill("Mrs. Sharma, UHID 4432, came back with an infected foot ulcer");
    await page.getByRole("button", { name: "Post question" }).click();
    await expect(page.locator(".err")).toHaveText(
      "Remove patient identifiers before posting. Found: a record or ID number, a patient name.",
    );
    await expect(page.getByLabel("Your name")).toHaveValue("Dr. Test");
    await expect(page.getByLabel("City")).toHaveValue("Nagpur");
    await expect(page.getByLabel("Your question")).toHaveValue(/Mrs\. Sharma/);
  });

  test("requires a name and a question", async ({ page }) => {
    await page.goto("/questions");
    await page.getByLabel("Your question").fill("Something");
    // Skip the browser's own required-field check to reach the server's.
    await page.locator("form").first().evaluate((f) => f.setAttribute("novalidate", ""));
    await page.getByRole("button", { name: "Post question" }).click();
    await expect(page.locator(".err")).toHaveText("Add your name and your question before posting.");
  });

  test("'I see this too' adds one vote per browser and can be undone", async ({ page }) => {
    await page.goto("/questions");
    const c = card(page, "Newborns discharged at 48 hours");
    const before = Number((await c.locator(".score").innerText()).match(/\d+/)![0]);
    await c.getByRole("button", { name: "I see this too" }).click();
    await expect(c.getByRole("button", { name: /You see this too/ })).toHaveAttribute("aria-pressed", "true");
    await expect(c.locator(".score")).toContainText(String(before + 1));
    await c.getByRole("button", { name: /You see this too/ }).click();
    await expect(c.locator(".score")).toContainText(String(before));
  });

  test("'Find matching papers' opens Match with the question selected", async ({ page }) => {
    await page.goto("/questions");
    await card(page, "We estimate blood loss after delivery").getByRole("link", { name: "Find matching papers" }).click();
    await expect(page).toHaveURL(/\/match\?question=q3/);
    await expect(page.getByLabel("Question")).toHaveValue("q3");
    await expect(page.locator("article.card").first()).toContainText("Calibrated under-buttock drape");
  });
});
