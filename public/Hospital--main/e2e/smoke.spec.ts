import { test, expect, type Page } from "@playwright/test";

const ADMIN = { email: "admin@yemencare.local", password: "Admin@123" };
const RECEPTION = { email: "reception@yemencare.local", password: "Reception@123" };

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "ycm_locale", value: "en", url: baseURL }]);
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("login works with seeded admin account", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("create a patient as admin", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/patients/new");
  await page.locator("input[name='nameAr']").fill("مريض تجريبي");
  await page.locator("input[name='nameEn']").fill("Test Patient");
  await page.locator("input[name='phone']").fill("771000101");
  await page.getByRole("button", { name: "Register Patient" }).click();
  await expect(page).toHaveURL(/\/patients\/[\w-]+$/);
});

test("book an appointment from reception", async ({ page }) => {
  await login(page, RECEPTION.email, RECEPTION.password);
  await page.goto("/appointments/new");
  await page.getByPlaceholder("Search by name, phone or MRN").click();
  await page.getByText(/7710|Test Patient|مريض/).first().click();
  await page.getByRole("button", { name: "New Appointment" }).click();
  await expect(page).toHaveURL(/\/appointments\/[\w-]+$/);
});

test("reception board renders", async ({ page }) => {
  await login(page, RECEPTION.email, RECEPTION.password);
  await page.goto("/reception");
  await expect(page.getByText("Reception Desk")).toBeVisible();
});

test("encounters board renders for doctor", async ({ page }) => {
  await login(page, "doctor@yemencare.local", "Doctor@123");
  await page.goto("/encounters");
  await expect(page.getByRole("heading", { name: "Consultations" })).toBeVisible();
});

test("demo user logs in with username", async ({ page }) => {
  await login(page, "demo", "demo123");
  await expect(page).toHaveURL(/\/dashboard$/);
});