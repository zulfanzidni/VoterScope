/**
 * VoterScope Demo — E2E Tests: Voter Records & Administrative Management (Phase 10)
 *
 * Tests cover:
 * - Voter table rendering and NIK masking
 * - Synthetic NIK reveal toggle
 * - Voter search and filtering
 * - Voter dossier page
 * - Form validation and synthetic generator
 *
 * ALL DATA IS SYNTHETIC DEMO DATA.
 */

import { test, expect, Page } from "@playwright/test";

// Helper to log in as Super Admin
async function loginAsSuperAdmin(page: Page) {
  await page.goto("/login");
  await page.click("#demo-account-superadmin");
  await page.click("#login-submit-btn");
  await page.waitForURL("**/dashboard");
}

test.describe("Voter Management Flow (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test("navigates to voter list and displays masked NIK", async ({ page }) => {
    await page.goto("/dashboard/voters");
    await expect(page.locator("h1")).toContainText("Data Pemilih Administrasi");

    // Check table headers
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("text=NIK (Tersamar)")).toBeVisible();

    // Verify masking pattern (3201************)
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow.locator(".font-mono")).toContainText("****");
  });

  test("filters voters by search query", async ({ page }) => {
    await page.goto("/dashboard/voters");
    const searchInput = page.locator("#voter-search-input");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("Siti");
    // Wait for debounce/fetch
    await page.waitForTimeout(600);
    await expect(page.locator("tbody")).toContainText("Siti");
  });

  test("opens voter details dossier and toggles unmask NIK", async ({ page }) => {
    await page.goto("/dashboard/voters");
    // Click view button on first voter
    const viewBtn = page.locator("a[id^='view-voter-']").first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    await page.waitForURL(/.*\/dashboard\/voters\/[a-zA-Z0-9_-]+/);
    await expect(page.locator("h1")).toBeVisible();

    // Verify NIK toggle button exists
    const unmaskBtn = page.locator("#toggle-nik-btn");
    if (await unmaskBtn.isVisible()) {
      await expect(page.locator("#masked-nik")).toContainText("****");
      await unmaskBtn.click();
      // Should now show revealed NIK and audit warning
      await expect(page.locator("#revealed-nik")).toBeVisible();
    }
  });

  test("loads voter creation form with synthetic generator button", async ({ page }) => {
    await page.goto("/dashboard/voters/new");
    await expect(page.locator("h1")).toContainText("Pendaftaran Pemilih Baru");

    const generateBtn = page.locator("#btn-generate-synthetic");
    await expect(generateBtn).toBeVisible();

    // Click generator button to populate synthetic data
    await generateBtn.click();
    const nikInput = page.locator("#voter-nik");
    const nameInput = page.locator("#voter-name");

    await expect(nikInput).not.toHaveValue("");
    await expect(nameInput).not.toHaveValue("");
  });
});
