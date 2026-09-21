"use client";

/**
 * VoterScope Demo — Minimalist Dashboard Shell
 * Clean, distraction-free administrative layout with crisp navigation and topbar.
 */

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { SessionUser } from "@/lib/types";
import { UserRole } from "@/lib/types";

type Props = {
  user: SessionUser;
  children: React.ReactNode;
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  PROVINCE_ADMIN: "Admin Provinsi",
  KABUPATEN_ADMIN: "Admin Kabupaten",
  KECAMATAN_ADMIN: "Admin Kecamatan",
  KELURAHAN_OPERATOR: "Operator Kelurahan",
  AUDITOR: "Auditor",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  SUPER_ADMIN: "badge-violet",
  PROVINCE_ADMIN: "badge-blue",
  KABUPATEN_ADMIN: "badge-blue",
  KECAMATAN_ADMIN: "badge-emerald",
  KELURAHAN_OPERATOR: "badge-emerald",
  AUDITOR: "badge-amber",
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
};

function ShieldIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/dashboard/voters",
    label: "Data Pemilih",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/users",
    label: "Manajemen User",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    roles: [UserRole.SUPER_ADMIN, UserRole.PROVINCE_ADMIN, UserRole.KABUPATEN_ADMIN, UserRole.KECAMATAN_ADMIN],
  },
  {
    href: "/dashboard/audit",
    label: "Audit Log",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    roles: [UserRole.SUPER_ADMIN, UserRole.AUDITOR],
  },
  {
    href: "/dashboard/profile",
    label: "Profil & Akun",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function DashboardShell({ user, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const initials = (user?.fullName || user?.username || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      {/* Sidebar */}
      <aside
        style={{ width: sidebarOpen ? "230px" : "60px" }}
        className="shrink-0 sticky top-0 h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col transition-all duration-200 z-40"
      >
        {/* Sidebar header */}
        <div className="h-14 px-3.5 flex items-center gap-3 border-b border-[var(--border-subtle)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand-500)] flex items-center justify-center text-[var(--btn-primary-text)] shrink-0 shadow-sm">
            <ShieldIcon />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)] tracking-tight truncate">
                VoterScope
              </div>
              <div className="text-[10.5px] text-[var(--text-muted)] font-medium">
                Admin Panel
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.href.split("/").pop()}`}
                className={`nav-item ${isActive ? "active" : ""} ${
                  sidebarOpen ? "justify-start" : "justify-center px-0"
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer user info */}
        <div className="p-2 border-t border-[var(--border-subtle)]">
          {sidebarOpen ? (
            <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded bg-[var(--brand-500)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">
                    {user.username}
                  </div>
                </div>
              </div>
              <div className="mb-2.5">
                <span className={`badge ${ROLE_BADGE_CLASS[user.role] ?? "badge-slate"} text-[10px]`}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
              </div>
              <button
                id="logout-btn"
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn btn-ghost btn-sm w-full justify-center text-xs text-[var(--text-muted)] hover:text-red-400 py-1"
              >
                {loggingOut ? (
                  <span>Keluar...</span>
                ) : (
                  <>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Keluar</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-8 h-8 rounded bg-[var(--brand-500)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center justify-center"
                title={user.fullName}
              >
                {initials}
              </div>
              <button
                id="logout-btn-collapsed"
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn btn-ghost p-1.5 text-[var(--text-muted)] hover:text-red-400"
                title="Keluar"
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center px-5 gap-3 sticky top-0 z-30">
          {/* Sidebar toggle */}
          <button
            id="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
          >
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={sidebarOpen ? "M4 6h16M4 12h10M4 18h16" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">VoterScope</span>
            <span className="text-[var(--text-muted)] opacity-60">/</span>
            <span className="text-[var(--text-primary)] font-semibold">
              {pathname === "/dashboard"
                ? "Dashboard"
                : pathname.startsWith("/dashboard/voters")
                ? "Data Pemilih"
                : pathname.startsWith("/dashboard/users")
                ? "Manajemen User"
                : pathname.startsWith("/dashboard/audit")
                ? "Audit Log"
                : pathname.startsWith("/dashboard/profile")
                ? "Profil & Akun"
                : ""}
            </span>
          </div>

          {/* Theme Switcher */}
          <ThemeToggle showLabel={true} />

          {/* Subtle Demo tag */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Data Simulasi</span>
          </div>

          {/* User profile pill */}
          <Link
            href="/dashboard/profile"
            id="user-profile-pill"
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-md hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-default)] transition-all text-decoration-none"
            title="Pengaturan Profil"
          >
            <div className="w-5 h-5 rounded bg-[var(--brand-500)] text-[var(--btn-primary-text)] font-bold text-[10px] flex items-center justify-center shrink-0">
              {initials}
            </div>
            <span className="text-xs text-[var(--text-primary)] font-medium hidden md:inline truncate max-w-[120px]">
              {user.username}
            </span>
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 md:p-6 overflow-auto">
          <div className="max-w-[1360px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
