import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata: Metadata = {
  title: "Login — VoterScope Demo",
  description: "Portal Akses Sistem Manajemen Data Pemilih Administratif Hierarkis",
};

/**
 * VoterScope Demo — Minimalist Administrative Login Page
 * Clean, distraction-free authentication interface focused on utility.
 * ALL DATA IN THIS SYSTEM IS SYNTHETIC DEMO DATA.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center p-4 sm:p-6 bg-[var(--bg-base)]">
      {/* Theme Toggle in top-right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle showLabel={true} />
      </div>

      {/* Centered Institutional Card */}
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--brand-500)] text-[var(--btn-primary-text)] mb-3 shadow-sm">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            VoterScope
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Sistem Informasi Manajemen Data Pemilih Administratif
          </p>
        </div>

        {/* Form Container */}
        <div className="card p-6 sm:p-8 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-md">
          <div className="mb-5 pb-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Masuk ke Sistem
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Gunakan kredensial akun administrator sesuai tingkat wewenang wilayah.
            </p>
          </div>

          <LoginForm />
        </div>

        {/* Demo Notice Banner */}
        <div className="mt-4 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center">
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <strong className="text-amber-500">Simulasi Portofolio:</strong> Seluruh data pemilih dan akun pengguna dalam aplikasi ini merupakan data sintetis untuk keperluan demonstrasi sistem.
          </p>
        </div>
      </div>
    </div>
  );
}
