/**
 * VoterScope Demo — Users Page (Server Component)
 *
 * Enforces hierarchical role guard:
 * Only SUPER_ADMIN, PROVINCE_ADMIN, KABUPATEN_ADMIN, and KECAMATAN_ADMIN can access.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { isRoleAtLeast } from "@/lib/authorization";
import { UserRole } from "@/lib/types";
import { UsersClient } from "./UsersClient";

export const metadata = {
  title: "Manajemen Pengguna — VoterScope Demo",
  description: "Pengelolaan akun administrator dan operator hierarkis.",
};

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Only roles from KECAMATAN_ADMIN up to SUPER_ADMIN are permitted to manage users
  const canManage = isRoleAtLeast(user.role as UserRole, UserRole.KECAMATAN_ADMIN);

  if (!canManage) {
    return (
      <div className="card p-8 max-w-lg mx-auto text-center space-y-4 my-12 border-status-error/30 animate-in fade-in">
        <div className="w-12 h-12 rounded-full bg-status-error/15 text-status-error flex items-center justify-center mx-auto text-2xl">
          🚫
        </div>
        <h2 className="text-xl font-bold text-primary">Akses Terbatas</h2>
        <p className="text-xs text-secondary leading-relaxed">
          Modul manajemen pengguna hanya dapat diakses oleh peran Administrator (Kecamatan ke atas). Akun Anda (
          <strong>{user.role}</strong>) tidak memiliki wewenang mengelola pengguna lain.
        </p>
        <div className="pt-2">
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            ‹ Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <UsersClient currentUser={user} />;
}
