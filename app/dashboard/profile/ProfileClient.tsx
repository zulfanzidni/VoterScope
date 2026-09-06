"use client";

/**
 * VoterScope Demo — Profile Client Component
 * Provides self-service profile management, password change with Argon2id,
 * and security status overview.
 *
 * ALL USER DATA REPRESENTS SYNTHETIC DEMO CREDENTIALS.
 */

import { useState } from "react";
import type { SessionUser } from "@/lib/types";

interface ProfileData {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  province?: { id: string; name: string; code: string } | null;
  kabupaten?: { id: string; name: string; code: string } | null;
  kecamatan?: { id: string; name: string; code: string } | null;
  kelurahan?: { id: string; name: string; code: string } | null;
}

interface Props {
  initialUser: SessionUser;
  initialProfile: ProfileData;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin (Nasional)",
  PROVINCE_ADMIN: "Admin Provinsi",
  KABUPATEN_ADMIN: "Admin Kabupaten/Kota",
  KECAMATAN_ADMIN: "Admin Kecamatan",
  KELURAHAN_OPERATOR: "Operator Kelurahan/Desa",
  AUDITOR: "Auditor Kepatuhan",
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "badge-blue",
  PROVINCE_ADMIN: "badge-blue",
  KABUPATEN_ADMIN: "badge-blue",
  KECAMATAN_ADMIN: "badge-emerald",
  KELURAHAN_OPERATOR: "badge-emerald",
  AUDITOR: "badge-amber",
};

export function ProfileClient({ initialProfile }: Props) {
  // Profile form state
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [email, setEmail] = useState(initialProfile.email);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Initials
  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Territory scope string
  const territoryScope = profile.kelurahan
    ? `Kel. ${profile.kelurahan.name}, Kec. ${profile.kecamatan?.name}, ${profile.kabupaten?.name}, ${profile.province?.name}`
    : profile.kecamatan
    ? `Kec. ${profile.kecamatan.name}, ${profile.kabupaten?.name}, ${profile.province?.name}`
    : profile.kabupaten
    ? `${profile.kabupaten.name}, ${profile.province?.name}`
    : profile.province
    ? `Provinsi ${profile.province.name}`
    : "Tingkat Nasional (Seluruh Wilayah)";

  // Password requirements calculation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isNewPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });

      const json = await res.json();
      if (!res.ok) {
        setProfileError(json.error?.message || "Gagal memperbarui profil.");
      } else {
        setProfile((prev) => ({ ...prev, fullName: json.data.fullName, email: json.data.email }));
        setProfileSuccess("Profil berhasil diperbarui.");
        setTimeout(() => setProfileSuccess(null), 5000);
      }
    } catch {
      setProfileError("Terjadi kesalahan koneksi server.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!isNewPasswordValid) {
      setPasswordError("Kata sandi baru belum memenuhi kriteria keamanan.");
      setPasswordSaving(false);
      return;
    }

    if (!passwordsMatch) {
      setPasswordError("Konfirmasi kata sandi tidak cocok.");
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const json = await res.json();
      if (!res.ok) {
        setPasswordError(json.error?.message || "Gagal mengganti kata sandi.");
      } else {
        setPasswordSuccess("Kata sandi berhasil diperbarui dengan hashing Argon2id.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(null), 6000);
      }
    } catch {
      setPasswordError("Terjadi kesalahan koneksi server.");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Profile Hero Card */}
      <div
        className="card"
        style={{
          padding: "24px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px" }}>
          {/* Avatar */}
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "8px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          {/* User Details */}
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {profile.fullName}
              </h1>
              <span className={`badge ${ROLE_BADGE[profile.role] ?? "badge-slate"}`}>
                {ROLE_LABEL[profile.role] ?? profile.role}
              </span>
              <span className="badge badge-emerald">Aktif</span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>@{profile.username}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{profile.email}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span style={{ color: "hsl(217 91% 65%)" }}>{territoryScope}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form 1 & Form 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px" }}>
        {/* Form 1: Edit Profile */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.12)",
                color: "hsl(217 91% 65%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Informasi Akun
              </h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                Perbarui nama tampilan dan alamat email operasional Anda.
              </p>
            </div>
          </div>

          {profileSuccess && (
            <div
              className="alert alert-success"
              style={{
                padding: "10px 14px",
                marginBottom: "16px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "hsl(160 84% 45%)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div
              className="alert alert-danger"
              style={{
                padding: "10px 14px",
                marginBottom: "16px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "hsl(0 84% 65%)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Nama Pengguna (Username)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={profile.username}
                  disabled
                  className="input"
                  style={{
                    width: "100%",
                    opacity: 0.6,
                    cursor: "not-allowed",
                    fontFamily: "monospace",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    background: "rgba(148, 163, 184, 0.1)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  Terkunci
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Peran Akses (Role)
              </label>
              <input
                type="text"
                value={ROLE_LABEL[profile.role] ?? profile.role}
                disabled
                className="input"
                style={{
                  width: "100%",
                  opacity: 0.6,
                  cursor: "not-allowed",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="profile-fullName"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
              >
                Nama Lengkap *
              </label>
              <input
                id="profile-fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="input"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
              >
                Alamat Email *
              </label>
              <input
                id="profile-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@voterscope.demo"
                className="input"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                id="btn-save-profile"
                type="submit"
                disabled={profileSaving}
                className="btn btn-primary"
                style={{ minWidth: "140px" }}
              >
                {profileSaving ? (
                  <>
                    <div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Form 2: Change Password */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(139, 92, 246, 0.12)",
                color: "hsl(258 90% 66%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Ubah Kata Sandi
              </h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                Dihash menggunakan algoritma Argon2id berstandar OWASP.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div
              className="alert alert-success"
              style={{
                padding: "10px 14px",
                marginBottom: "16px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "hsl(160 84% 45%)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div
              className="alert alert-danger"
              style={{
                padding: "10px 14px",
                marginBottom: "16px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "hsl(0 84% 65%)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label
                htmlFor="current-password"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
              >
                Kata Sandi Saat Ini *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  className="input"
                  style={{ width: "100%", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "4px",
                  }}
                  title={showCurrentPassword ? "Sembunyikan" : "Tampilkan"}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-password"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
              >
                Kata Sandi Baru *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter (huruf besar, kecil, angka, simbol)"
                  className="input"
                  style={{ width: "100%", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "4px",
                  }}
                  title={showNewPassword ? "Sembunyikan" : "Tampilkan"}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>

              {/* Requirement Checklist */}
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "rgba(15, 23, 42, 0.4)",
                  border: "1px solid var(--border-subtle)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4px 12px",
                  fontSize: "11px",
                }}
              >
                <span style={{ color: hasMinLength ? "hsl(160 84% 45%)" : "var(--text-muted)" }}>
                  {hasMinLength ? "✓" : "○"} Min. 8 karakter
                </span>
                <span style={{ color: hasUpper ? "hsl(160 84% 45%)" : "var(--text-muted)" }}>
                  {hasUpper ? "✓" : "○"} Huruf besar (A-Z)
                </span>
                <span style={{ color: hasLower ? "hsl(160 84% 45%)" : "var(--text-muted)" }}>
                  {hasLower ? "✓" : "○"} Huruf kecil (a-z)
                </span>
                <span style={{ color: hasNumber ? "hsl(160 84% 45%)" : "var(--text-muted)" }}>
                  {hasNumber ? "✓" : "○"} Angka (0-9)
                </span>
                <span style={{ color: hasSpecial ? "hsl(160 84% 45%)" : "var(--text-muted)", gridColumn: "span 2" }}>
                  {hasSpecial ? "✓" : "○"} Karakter khusus (@$!%*?&#)
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
              >
                Konfirmasi Kata Sandi Baru *
              </label>
              <input
                id="confirm-password"
                type={showNewPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="input"
                style={{
                  width: "100%",
                  borderColor:
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? "rgba(16, 185, 129, 0.5)"
                        : "rgba(239, 68, 68, 0.5)"
                      : undefined,
                }}
              />
              {confirmPassword.length > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    marginTop: "4px",
                    display: "block",
                    color: passwordsMatch ? "hsl(160 84% 45%)" : "hsl(0 84% 65%)",
                  }}
                >
                  {passwordsMatch ? "✓ Konfirmasi kata sandi sesuai" : "✕ Konfirmasi tidak sesuai"}
                </span>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                id="btn-change-password"
                type="submit"
                disabled={passwordSaving || !isNewPasswordValid || !passwordsMatch}
                className="btn btn-primary"
                style={{ minWidth: "150px" }}
              >
                {passwordSaving ? (
                  <>
                    <div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Perbarui Kata Sandi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Security & System Architecture Info Card */}
      <div
        className="card"
        style={{
          padding: "24px",
          background: "rgba(15, 23, 42, 0.4)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.12)",
              color: "hsl(160 84% 45%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Status Keamanan & Arsitektur Sesi
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
              Spesifikasi teknis perlindungan data dan sesi terenkripsi yang sedang aktif.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(30, 41, 59, 0.3)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Enkripsi Kata Sandi</div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(160 84% 45%)" }}>Argon2id (m=65536, t=3, p=4)</div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "4px" }}>OWASP Password Hashing Standard</div>
          </div>

          <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(30, 41, 59, 0.3)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Mekanisme Sesi</div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(217 91% 65%)" }}>iron-session (8 Jam TTL)</div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "4px" }}>HttpOnly, SameSite=Lax, AES-256</div>
          </div>

          <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(30, 41, 59, 0.3)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Proteksi Otorisasi</div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(217 91% 65%)" }}>RBAC & Scope Boundary</div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "4px" }}>Anti-IDOR & Server-Authoritative</div>
          </div>

          <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(30, 41, 59, 0.3)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Kepatuhan & Jejak Audit</div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(38 92% 58%)" }}>Immutable Audit Trail</div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "4px" }}>Seluruh perubahan tercatat permanen</div>
          </div>
        </div>
      </div>
    </div>
  );
}
