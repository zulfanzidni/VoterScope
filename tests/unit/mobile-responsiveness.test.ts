/**
 * VoterScope Demo — Unit Tests: Mobile Responsiveness & UI Layout Integrity
 *
 * Verifies that:
 * 1. Input fields with prefix icons have proper padding-left clearance (preventing overlap).
 * 2. Mobile navigation off-canvas drawer is properly configured (overlay on mobile, hidden on desktop).
 * 3. Desktop sidebar is hidden on small screens and in-flow on md+ screens.
 * 4. Responsive grid classes are free of rigid desktop-only minmax constraints.
 * 5. Critical accessibility and test selectors (stat-total-voters, mobile-drawer) exist.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("UI Bug Fix: Prefix Icons Clearance in Input Fields", () => {
  const globalsCss = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
  const loginForm = fs.readFileSync(path.resolve(process.cwd(), "app/login/LoginForm.tsx"), "utf-8");
  const voterFilterBar = fs.readFileSync(path.resolve(process.cwd(), "components/voters/VoterFilterBar.tsx"), "utf-8");

  it("defines explicit icon padding utility classes in globals.css", () => {
    expect(globalsCss).toContain(".input-field.has-icon-left");
    expect(globalsCss).toContain("padding-left: 2.5rem !important;");
    expect(globalsCss).toContain(".input-field.has-icon-right");
    expect(globalsCss).toContain("padding-right: 2.5rem !important;");
  });

  it("applies icon clearance padding to login username and password fields", () => {
    // Username input
    expect(loginForm).toMatch(/id="login-username"[\s\S]*?has-icon-left/);
    expect(loginForm).toMatch(/id="login-username"[\s\S]*?!pl-10/);

    // Password input
    expect(loginForm).toMatch(/id="login-password"[\s\S]*?has-icon-left/);
    expect(loginForm).toMatch(/id="login-password"[\s\S]*?!pl-10/);
    expect(loginForm).toMatch(/id="login-password"[\s\S]*?!pr-10/);
  });

  it("applies icon clearance padding to VoterFilterBar search field", () => {
    expect(voterFilterBar).toContain("has-icon-left");
    expect(voterFilterBar).toContain("!pl-10");
  });
});

describe("Mobile Responsiveness: Dashboard Shell & Navigation", () => {
  const shellContent = fs.readFileSync(path.resolve(process.cwd(), "app/dashboard/DashboardShell.tsx"), "utf-8");

  it("includes an off-canvas mobile drawer that is hidden on md+ screens", () => {
    expect(shellContent).toContain('id="mobile-drawer"');
    expect(shellContent).toContain("md:hidden");
    expect(shellContent).toContain("mobileOpen ? \"translate-x-0\" : \"-translate-x-full");
  });

  it("includes a backdrop overlay for the mobile drawer", () => {
    expect(shellContent).toContain('id="mobile-drawer-backdrop"');
    expect(shellContent).toContain("bg-black/60");
    expect(shellContent).toContain("md:hidden");
  });

  it("hides the desktop in-flow sidebar on mobile viewports", () => {
    // Desktop sidebar has hidden md:flex
    expect(shellContent).toContain("hidden md:flex shrink-0 sticky top-0 h-screen");
  });

  it("automatically closes the mobile drawer on route navigation", () => {
    expect(shellContent).toContain("prevPathname !== pathname");
    expect(shellContent).toContain("setMobileOpen(false)");
  });

  it("automatically closes the mobile drawer on resize to desktop", () => {
    expect(shellContent).toContain("window.innerWidth >= 768");
    expect(shellContent).toContain("setMobileOpen(false)");
  });

  it("provides touch-friendly toggle handler for mobile and desktop", () => {
    expect(shellContent).toContain("handleToggle");
    expect(shellContent).toContain("id=\"sidebar-toggle\"");
  });

  it("prevents body scrolling when mobile drawer is open", () => {
    expect(shellContent).toContain("document.body.style.overflow = \"hidden\"");
  });
});

describe("Mobile Responsiveness: Grids and Layout Containers", () => {
  const dashboardPage = fs.readFileSync(path.resolve(process.cwd(), "app/dashboard/page.tsx"), "utf-8");
  const profileClient = fs.readFileSync(path.resolve(process.cwd(), "app/dashboard/profile/ProfileClient.tsx"), "utf-8");
  const demographicCharts = fs.readFileSync(path.resolve(process.cwd(), "components/dashboard/DemographicCharts.tsx"), "utf-8");

  it("ensures total voters stat card has proper id for telemetry and testing", () => {
    expect(dashboardPage).toContain('id="stat-total-voters"');
  });

  it("ensures dashboard KPIs use responsive grid tracks", () => {
    expect(dashboardPage).toContain("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4");
  });

  it("removes rigid desktop-only minmax(420px, 1fr) constraint in ProfileClient", () => {
    expect(profileClient).not.toContain("minmax(420px, 1fr)");
    expect(profileClient).toContain("grid grid-cols-1 lg:grid-cols-2");
  });

  it("ensures DemographicCharts cards have responsive padding and margin", () => {
    expect(demographicCharts).toContain("card p-4 sm:p-6");
    expect(demographicCharts).toContain("grid-cols-1 lg:grid-cols-2");
  });
});
