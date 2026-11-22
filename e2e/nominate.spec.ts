import { expect, test } from "@playwright/test";
import { card } from "./helpers";

test.describe("4. Patient nomination and 5. doctor profiles", () => {
  test("nominating an unlisted doctor creates an unverified profile", async ({ page }) => {
    await page.goto("/nominate");
    await page.getByLabel("Your doctor").selectOption({ label: "My doctor is not on this list" });
    await page.getByLabel("Doctor's name").fill("Neha Kulkarni");
    await page.getByLabel("What they treat").selectOption("Diabetology");
    await page.getByLabel("City", { exact: true }).fill("Nashik");
    await page.getByRole("checkbox", { name: "Open to new treatments or tools" }).check();
    await page.getByLabel(/I understand my nomination is anonymous/).check();
    await page.getByRole("button", { name: "Send nomination" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Your nomination for Dr. Neha Kulkarni has been added." })).toBeVisible();
    await expect(page.locator(".mini .m", { hasText: "Dr. Neha Kulkarni" })).toBeVisible();

    await page.goto("/champions?city=Nashik");
    await expect(page.getByText("1 patient-nominated doctor is hidden by this filter")).toBeVisible();
    await page.getByLabel("Clinic + hospital only").uncheck();
    await expect(page).toHaveURL(/dual=off/);
    const c = card(page, "Dr. Neha Kulkarni");
    await expect(c).toContainText("Added by a patient, not verified");
    await expect(c).toContainText("1 patient nomination");
  });

  test("the same browser cannot nominate the same doctor twice", async ({ page }) => {
    const send = async () => {
      await page.goto("/nominate");
      await page.getByLabel("Your doctor").selectOption({ label: "Dr. Priya Raman · Nephrology, Chennai" });
      await page.getByRole("checkbox", { name: "Honest about risks" }).check();
      await page.getByLabel(/I understand my nomination is anonymous/).check();
      await page.getByRole("button", { name: "Send nomination" }).click();
    };
    await send();
    await expect(page.getByText("Your nomination for Dr. Priya Raman has been added.")).toBeVisible();
    await send();
    await expect(page.locator(".err")).toHaveText("You have already nominated Dr. Priya Raman. Thank you.");
  });

  test("checks consent and identifiers in the note", async ({ page }) => {
    await page.goto("/nominate");
    await page.getByLabel("Your doctor").selectOption({ label: "Dr. Rahul Deshmukh · General Medicine, Pune" });
    await page.getByRole("checkbox", { name: "Follows up after visits" }).check();
    await page.getByRole("button", { name: "Send nomination" }).click();
    await expect(page.locator(".err")).toHaveText("Tick the box to confirm you understand who can see this.");
    await page.getByLabel(/I understand my nomination is anonymous/).check();
    await page.getByLabel(/Anything else researchers should know/).fill("Call me on 9876543210");
    await page.getByRole("button", { name: "Send nomination" }).click();
    await expect(page.locator(".err")).toHaveText("Please remove personal details from your note. Found: a 10-digit number (phone?).");
  });

  test("champion filters and default clinic + hospital view", async ({ page }) => {
    await page.goto("/champions");
    await expect(page.getByLabel("Clinic + hospital only")).toBeChecked();
    await expect(card(page, "Dr. Vikram Rao")).toHaveCount(0); // hospital only, no own clinic
    await page.getByLabel("Specialty").selectOption("Cardiology");
    await expect(page).toHaveURL(/specialty=Cardiology/);
    await expect(page.locator("article.card")).toHaveCount(1);
    await page.getByLabel("Clinic + hospital only").uncheck();
    await expect(card(page, "Dr. Vikram Rao")).toBeVisible();
    await expect(card(page, "Dr. Vikram Rao")).toContainText("No own practice listed");
  });
});
