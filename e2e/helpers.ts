import type { Page } from "@playwright/test";

/** Unique text so tests don't collide with each other or with re-runs. */
export const uniq = (s: string) => `${s} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export async function adminLogin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Password").fill("e2e-admin-secret");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: /Waiting for review/ }).waitFor();
}

export const card = (page: Page, text: string | RegExp) => page.locator("article.card").filter({ hasText: text });
