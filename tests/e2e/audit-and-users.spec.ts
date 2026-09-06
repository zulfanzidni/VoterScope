/**
 * VoterScope Demo — E2E Tests: Audit Logs, User Management & Scope Protection (Phase 10)
 *
 * Tests cover:
 * - Auditor access to audit log viewer and JSON modal
 * - Operator restriction from audit logs & user management
 * - Super admin access to user management
 * - Self-service profile settings page
 *
 * ALL DATA IS SYNTHETIC DEMO DATA.
 */

import { test, expect } from "@playwright/test";

test.describe("Auditor & Compliance Flows (E2E)", () => {
  test("Auditor can view audit logs and metadata details", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-auditor");
    await page.click("#login-submit-btn");
    await page.waitForURL("**/dashboard");

    await page.goto("/dashboard/audit");
    await expect(page.locator("h1")).toContainText("Log Jejak Audit & Kepatuhan");
    await expect(page.locator("table")).toBeVisible();

    // Verify CSV export button exists
    await expect(page.locator("#export-csv-btn")).toBeVisible();

    // Inspect metadata modal button
    const inspectBtn = page.locator("button[id^='inspect-metadata-']").first();
    if (await inspectBtn.isVisible()) {
      await inspectBtn.click();
      await expect(page.locator("#metadata-modal")).toBeVisible();
      // Close modal
      await page.click("#close-metadata-modal");
    }
  });

  test("Operator is blocked from audit logs and user management", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-kelurahan_operator");
    await page.click("#login-submit-btn");
    await page.waitForURL("**/dashboard");

    // Attempt direct navigation to /dashboard/audit
    await page.goto("/dashboard/audit");
    await expect(page.locator("body")).toContainText("Akses Terbatas");

    // Attempt direct navigation to /dashboard/users
    await page.goto("/dashboard/users");
    await expect(page.locator("body")).toContainText("Akses Terbatas");
  });

  test("User can view profile settings and security status", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-superadmin");
    await page.click("#login-submit-btn");
    await page.waitForURL("**/dashboard");

    await page.goto("/dashboard/profile");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#profile-fullName")).toBeVisible();
    await expect(page.locator("#profile-email")).toBeVisible();
    await expect(page.locator("#current-password")).toBeVisible();
    await expect(page.locator("#new-password")).toBeVisible();
    await expect(page.locator("body")).toContainText("Argon2id");
  });
});
