/**
 * VoterScope Demo — Audit Log Page (Server Component)
 *
 * Enforces role authorization (SUPER_ADMIN and AUDITOR only).
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAuditLog } from "@/lib/authorization";
import { AuditClient } from "./AuditClient";

export const metadata = {
  title: "Audit Log — VoterScope Demo",
  description: "Pemeriksaan log audit keamanan, riwayat otorisasi, dan jejak forensik sistem.",
};

export default async function AuditPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Strict role boundary: only SUPER_ADMIN and AUDITOR can access audit records
  if (!canAccessAuditLog(user)) {
    return (
      <div className="card p-8 max-w-lg mx-auto text-center space-y-4 my-12 border-status-error/30 animate-in fade-in">
        <div className="w-12 h-12 rounded-full bg-status-error/15 text-status-error flex items-center justify-center mx-auto text-2xl">
          🚫
        </div>
        <h2 className="text-xl font-bold text-primary">Akses Terbatas</h2>
        <p className="text-xs text-secondary leading-relaxed">
          Halaman log audit hanya diperuntukkan bagi peran <strong>Super Administrator</strong> dan{" "}
          <strong>Auditor</strong>. Akun Anda ({user.role}) tidak memiliki izin akses ke modul ini.
        </p>
        <div className="pt-2">
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            ‹ Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <AuditClient user={user} />;
}
