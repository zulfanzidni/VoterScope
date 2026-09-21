/**
 * VoterScope Demo — New Voter Page
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { canPerformVoterAction } from "@/lib/authorization";
import { VoterForm } from "@/components/voters/VoterForm";

export const metadata = {
  title: "Tambah Pemilih — VoterScope Demo",
  description: "Formulir pendaftaran data pemilih sintetis baru.",
};

export default async function NewVoterPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (!canPerformVoterAction(user, "create")) {
    return (
      <div className="card p-8 max-w-lg mx-auto text-center space-y-4 my-12 border-status-error/30 animate-in fade-in">
        <div className="w-12 h-12 rounded-full bg-status-error/15 text-status-error flex items-center justify-center mx-auto text-2xl">
          🚫
        </div>
        <h2 className="text-xl font-bold text-primary">Akses Terbatas</h2>
        <p className="text-xs text-secondary leading-relaxed">
          Akun Anda memiliki peran <strong>{user.role}</strong> (read-only) dan tidak memiliki wewenang untuk mendaftarkan pemilih baru.
        </p>
        <div className="pt-2">
          <Link href="/dashboard/voters" className="btn btn-secondary btn-sm">
            ‹ Kembali ke Daftar Pemilih
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in">
      {/* Breadcrumb & Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Link href="/dashboard/voters" className="hover:text-primary transition-colors">
            Data Pemilih
          </Link>
          <span>/</span>
          <span className="text-primary font-medium">Tambah Pemilih Baru</span>
        </div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Tambah Data Pemilih Baru</h1>
        <p className="text-xs text-secondary">
          Pendaftaran catatan pemilih sintetis ke dalam sistem dengan enkripsi AES-256-GCM.
        </p>
      </div>

      <VoterForm user={user} />
    </div>
  );
}
