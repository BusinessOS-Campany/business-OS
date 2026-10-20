import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    // App is mounted under basePath "/hospital". Trailing slash makes
    // relative spec paths (e.g. "login") resolve to /hospital/login.
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000/hospital/",
    trace: "retain-on-failure",
    locale: "en",
    launchOptions: { channel: "chromium" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});