"use client";

/**
 * VoterScope Demo — Minimalist Login Form Component
 * Handles credential submission, validation feedback, and demo account selection.
 * ALL DATA IS SYNTHETIC DEMO DATA.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import type { LoginInput } from "@/lib/validation/schemas";

type FieldName = keyof LoginInput;

// Client-side validation rules, mirroring `loginSchema` in
// lib/validation/schemas.ts — same constraints, same Indonesian messages.
//
// Deliberately hand-written rather than reusing the Zod schema through
// zodResolver. Importing the schema module here pulled zod (a large dependency)
// into the login page's client bundle purely to validate two text fields, while
// the identical validation already runs server-side in the route handler. Zod
// stays the single source of truth for the server; these rules exist only to
// give immediate feedback without a round-trip, and are never a security
// boundary — the API re-validates every request.
//
// Keep these in sync with LoginSchema when it changes.
const USERNAME_RULES = {
  // `required` is needed in addition to minLength: react-hook-form's minLength
  // rule skips empty values, so without it an empty username would pass client
  // validation and hit the network. Zod's min(3) DOES fail on the empty string,
  // so both rules carry the same message the server would return.
  required: "Username minimal 3 karakter",
  minLength: { value: 3, message: "Username minimal 3 karakter" },
  maxLength: { value: 50, message: "Username maksimal 50 karakter" },
  pattern: {
    value: /^[a-zA-Z0-9_]+$/,
    message: "Username hanya boleh mengandung huruf, angka, dan underscore",
  },
} as const;

const PASSWORD_RULES = {
  required: "Password tidak boleh kosong",
  maxLength: { value: 128, message: "Password terlalu panjang" },
} as const;

const DEMO_ACCOUNTS = [
  { label: "Super Admin", username: "superadmin", role: "SUPER_ADMIN" },
  { label: "Admin Provinsi", username: "province_admin", role: "PROVINCE_ADMIN" },
  { label: "Admin Kabupaten", username: "kabupaten_admin", role: "KABUPATEN_ADMIN" },
  { label: "Admin Kecamatan", username: "kecamatan_admin", role: "KECAMATAN_ADMIN" },
  { label: "Operator Kelurahan", username: "kelurahan_operator", role: "KELURAHAN_OPERATOR" },
  { label: "Auditor", username: "auditor", role: "AUDITOR" },
] as const;

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "badge-blue",
  PROVINCE_ADMIN: "badge-blue",
  KABUPATEN_ADMIN: "badge-blue",
  KECAMATAN_ADMIN: "badge-emerald",
  KELURAHAN_OPERATOR: "badge-emerald",
  AUDITOR: "badge-amber",
};

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        let errorMessage = "Kredensial tidak valid. Silakan coba lagi.";
        try {
          const json = (await res.json()) as { error?: { message?: string } };
          if (json?.error?.message) {
            errorMessage = json.error.message;
          }
        } catch {
          errorMessage = `Server merespons dengan status error ${res.status}. Pastikan database dan environment variables di hosting sudah terpasang.`;
        }
        setServerError(errorMessage);
      }
    } catch {
      setServerError("Gagal terhubung ke server. Periksa koneksi jaringan Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (username: string) => {
    setValue("username" as FieldName, username);
    setValue("password" as FieldName, "Demo@12345");
    setServerError(null);
  };

  return (
    <div>
      {/* Server Error Alert */}
      {serverError && (
        <div className="alert alert-error mb-4">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-xs">{serverError}</span>
        </div>
      )}

      {/* Form */}
      <form id="login-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Username */}
        <div>
          <label htmlFor="login-username" className="input-label">
            Nama Pengguna (Username)
          </label>
          <div className="relative">
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              autoFocus
              className={`input-field has-icon-left !pl-10 text-sm ${errors.username ? "error" : ""}`}
              placeholder="Contoh: superadmin"
              disabled={isLoading}
              {...register("username", USERNAME_RULES)}
            />
            <svg
              width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          {errors.username && (
            <p className="input-error-msg" role="alert">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="login-password" className="input-label">
            Kata Sandi (Password)
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={`input-field has-icon-left has-icon-right !pl-10 !pr-10 text-sm ${errors.password ? "error" : ""}`}
              placeholder="Masukkan kata sandi"
              disabled={isLoading}
              {...register("password", PASSWORD_RULES)}
            />
            <svg
              width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <button
              type="button"
              id="toggle-password-visibility"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              tabIndex={-1}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? (
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="input-error-msg" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          id="login-submit-btn"
          type="submit"
          className="btn btn-primary w-full py-2.5 font-medium text-sm mt-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <span>Memverifikasi kredensial...</span>
          ) : (
            <span>Masuk ke Dashboard</span>
          )}
        </button>
      </form>

      {/* Demo Quick Accounts */}
      <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Pilihan Akun Demo (1-Click)
          </span>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            Sandi: Demo@12345
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.username}
              id={`demo-account-${acc.username}`}
              type="button"
              onClick={() => fillCredentials(acc.username)}
              disabled={isLoading}
              className="flex flex-col items-start p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-overlay)] hover:border-[var(--border-strong)] transition-all text-left group"
            >
              <span className="text-xs font-medium text-[var(--text-primary)] font-mono">
                {acc.username}
              </span>
              <span className={`badge ${ROLE_BADGE[acc.role] ?? "badge-slate"} mt-1 text-[10px]`}>
                {acc.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
