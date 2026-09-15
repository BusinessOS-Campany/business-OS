import { test, expect, type Page } from "@playwright/test";

const ADMIN = { email: "admin@yemencare.local", password: "Admin@123" };

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "ycm_locale", value: "en", url: baseURL }]);
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("insurance overview renders", async ({ page }) => {
  await login(page);
  await page.goto("/insurance");
  await expect(page.getByRole("heading", { name: "Insurance" })).toBeVisible();
  await expect(page.getByText("Insurance Companies", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Recent claims/)).toBeVisible();
});

test("add an insurance company via form", async ({ page }) => {
  await login(page);
  await page.goto("/insurance/companies");
  await expect(page.getByRole("heading", { name: "Insurance Companies" })).toBeVisible();
  await page.locator("input[name='code']").fill("QA01");
  await page.locator("input[name='nameAr']").fill("شركة اختبار");
  await page.locator("input[name='nameEn']").fill("QA Test Insurance");
  await page.getByRole("button", { name: "Save company" }).click();
  await expect(page.locator("table").getByText("QA Test Insurance")).toBeVisible();
});

test("add a scheme on company detail", async ({ page }) => {
  await login(page);
  await page.goto("/insurance/companies");
  const row = page.getByRole("row", { name: /QA Test Insurance/ }).first();
  await row.getByRole("link").first().click();
  await page.waitForURL(/\/insurance\/companies\/[\w-]+$/);
  await expect(page.getByRole("heading", { name: "QA Test Insurance" })).toBeVisible();
  const schemeForm = page.locator("form").filter({ hasText: "Coverage rate" });
  await schemeForm.locator("input[name='nameAr']").fill("خطة اختبار");
  await schemeForm.locator("input[name='nameEn']").fill("QA Plan");
  await schemeForm.getByRole("button", { name: "Save scheme" }).click();
  await expect(page.locator("table").getByText("QA Plan").first()).toBeVisible();
});

test("claims list and new claim pages render", async ({ page }) => {
  await login(page);
  await page.goto("/insurance/claims");
  await expect(page.getByRole("heading", { name: "Claims" })).toBeVisible();
  await page.goto("/insurance/claims/new");
  await expect(page.getByRole("heading", { name: "Create claim" })).toBeVisible();
});