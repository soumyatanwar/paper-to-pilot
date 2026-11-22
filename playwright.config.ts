import { defineConfig, devices } from "@playwright/test";

// Each run gets its own fresh database (created, migrated and seeded by scripts/e2e-db.mjs),
// so tests always start from the sample data and never touch the dev database.
// Set once in the main process; Playwright workers inherit it.
process.env.E2E_DATABASE_URL ??= `postgresql://exchange:exchange@localhost:5432/exchange_e2e_${Date.now()}`;
const DATABASE_URL = process.env.E2E_DATABASE_URL;
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  workers: 1, // tests share one database
  fullyParallel: false,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `node scripts/e2e-db.mjs ${DATABASE_URL} && npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/questions`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DATABASE_URL, ADMIN_SECRET: "e2e-admin-secret", RATE_LIMIT_SALT: "e2e", RATE_LIMIT_MAX: "10000", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
