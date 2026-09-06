/**
 * VoterScope Demo — E2E Tests: Authentication Flow (Phase 3)
 *
 * Tests cover:
 * - Login page UI and branding
 * - Invalid credential rejection
 * - Valid login and redirect
 * - Session persistence
 * - Logout
 * - Protected route enforcement
 * - Role-based navigation visibility
 * - Scope isolation (kelurahan_operator cannot access audit)
 *
 * ALL DATA IS SYNTHETIC DEMO DATA.
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// Login Page — Branding & UI
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Login Page — Branding & UI", () => {
  test("should display VoterScope Demo branding", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("VoterScope");
  });

  test("should display synthetic data warning", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toContainText("DEMO");
  });

  test("root path should redirect to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.*login.*/);
  });

  test("login form fields are present", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#login-username")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator("#login-submit-btn")).toBeVisible();
  });

  test("demo accounts section is shown", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#demo-account-superadmin")).toBeVisible();
    await expect(page.locator("#demo-account-kelurahan_operator")).toBeVisible();
    await expect(page.locator("#demo-account-auditor")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Login — Credential Validation
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Login — Credential Validation", () => {
  test("should show error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#login-username", "wronguser");
    await page.fill("#login-password", "wrongpass");
    await page.click("#login-submit-btn");
    await expect(page.locator(".alert-error, [role='alert']")).toBeVisible({ timeout: 8000 });
  });

  test("should show validation error for empty username", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#login-username", "");
    await page.fill("#login-password", "Demo@12345");
    await page.click("#login-submit-btn");
    // Client-side validation triggers immediately
    await expect(page.locator(".input-error-msg, [role='alert']")).toBeVisible({ timeout: 3000 });
  });

  test("should not expose whether username exists (generic error)", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#login-username", "nonexistentuser999");
    await page.fill("#login-password", "wrongpass");
    await page.click("#login-submit-btn");
    const errorText = await page.locator(".alert-error, [role='alert']").textContent({ timeout: 8000 });
    // Should NOT say "user not found" — should be generic
    expect(errorText).not.toMatch(/tidak ditemukan|not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Login — Successful Authentication
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Login — Successful Authentication", () => {
  test("superadmin login redirects to /dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-superadmin");
    await page.click("#login-submit-btn");
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
  });

  test("dashboard shows superadmin scope: all regions", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-superadmin");
    await page.click("#login-submit-btn");
    await page.waitForURL(/.*dashboard.*/);
    // Super admin sees "Nasional" / all-scope indicator
    await expect(page.locator("#stat-total-voters")).toBeVisible({ timeout: 5000 });
  });

  test("dashboard shows demo data warning banner", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-superadmin");
    await page.click("#login-submit-btn");
    await page.waitForURL(/.*dashboard.*/);
    await expect(page.locator("body")).toContainText("DEMO");
  });

  test("demo account quick-fill button populates username and password", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-province_admin");
    const username = await page.inputValue("#login-username");
    expect(username).toBe("province_admin");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Logout", () => {
  test("logout redirects back to /login", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-superadmin");
    await page.click("#login-submit-btn");
    await page.waitForURL(/.*dashboard.*/);
    await page.click("#logout-btn");
    await expect(page).toHaveURL(/.*login.*/, { timeout: 8000 });
  });

  test("after logout, /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-superadmin");
    await page.click("#login-submit-btn");
    await page.waitForURL(/.*dashboard.*/);
    await page.click("#logout-btn");
    await page.waitForURL(/.*login.*/);
    // Try navigating to protected route again
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login.*/, { timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Protected Routes — Unauthenticated Access
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Protected Routes — Unauthenticated", () => {
  test("/dashboard without session redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login.*/, { timeout: 8000 });
  });

  test("/dashboard/voters without session redirects to /login", async ({ page }) => {
    await page.goto("/dashboard/voters");
    await expect(page).toHaveURL(/.*login.*/, { timeout: 8000 });
  });

  test("/dashboard/audit without session redirects to /login", async ({ page }) => {
    await page.goto("/dashboard/audit");
    await expect(page).toHaveURL(/.*login.*/, { timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Role-Based Navigation Visibility
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Role-Based Navigation", () => {
  test("superadmin sees all nav items including Audit Log", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-superadmin");
    await page.click("#login-submit-btn");
    await page.waitForURL(/.*dashboard.*/);
    await expect(page.locator("#nav-audit")).toBeVisible();
    await expect(page.locator("#nav-users")).toBeVisible();
    await expect(page.locator("#nav-voters")).toBeVisible();
  });

  test("kelurahan_operator does NOT see Audit Log nav item", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-kelurahan_operator");
    await page.click("#login-submit-btn");
    await page.waitForURL(/.*dashboard.*/);
    // Audit nav should not be visible for kelurahan_operator
    await expect(page.locator("#nav-audit")).not.toBeVisible();
  });

  test("kelurahan_operator does NOT see User Management nav item", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-kelurahan_operator");
    await page.click("#login-submit-btn");
    await page.waitForURL(/.*dashboard.*/);
    await expect(page.locator("#nav-users")).not.toBeVisible();
  });

  test("auditor sees Audit Log nav item", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-account-auditor");
    await page.click("#login-submit-btn");
    await page.waitForURL(/.*dashboard.*/);
    await expect(page.locator("#nav-audit")).toBeVisible();
  });
});

