/**
 * VoterScope Demo — Voter Edit Page (Server Component)
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessVoter, canPerformVoterAction } from "@/lib/authorization";
import { decryptNik, maskNik } from "@/lib/security/nik";
import { VoterForm } from "@/components/voters/VoterForm";

export const metadata = {
  title: "Edit Pemilih — VoterScope Demo",
  description: "Pembaruan informasi data pemilih sintetis.",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VoterEditPage(props: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (!canPerformVoterAction(user, "update")) {
    return (
      <div className="card p-8 max-w-lg mx-auto text-center space-y-4 my-12 border-status-error/30 animate-in fade-in">
        <div className="w-12 h-12 rounded-full bg-status-error/15 text-status-error flex items-center justify-center mx-auto text-2xl">
          🚫
        </div>
        <h2 className="text-xl font-bold text-primary">Akses Terbatas</h2>
        <p className="text-xs text-secondary leading-relaxed">
          Akun Anda memiliki peran <strong>{user.role}</strong> (read-only) dan tidak memiliki izin untuk mengubah data pemilih.
        </p>
        <div className="pt-2">
          <Link href="/dashboard/voters" className="btn btn-secondary btn-sm">
            ‹ Kembali ke Daftar Pemilih
          </Link>
        </div>
      </div>
    );
  }

  const { id } = await props.params;

  const voter = await prisma.voter.findUnique({
    where: { id },
  });

  if (!voter) {
    notFound();
  }

  // IDOR Protection: verify access
  const isAuthorized = canAccessVoter(user, {
    provinceId: voter.provinceId,
    kabupatenId: voter.kabupatenId,
    kecamatanId: voter.kecamatanId,
    kelurahanId: voter.kelurahanId,
  });

  if (!isAuthorized) {
    return (
      <div className="card p-8 max-w-xl mx-auto text-center space-y-4 my-12 border-status-error/30">
        <h2 className="text-xl font-bold text-primary">Akses Ditolak (Anti-IDOR)</h2>
        <p className="text-sm text-secondary">
          Anda tidak memiliki wewenang administratif untuk mengedit data pemilih ini.
        </p>
        <Link href="/dashboard/voters" className="btn btn-secondary btn-sm">
          ‹ Kembali ke Daftar Pemilih
        </Link>
      </div>
    );
  }

  let nikDisplay = "****************";
  try {
    nikDisplay = maskNik(decryptNik(voter.nikEncrypted));
  } catch {
    // fallback
  }

  const initialData = {
    nik: nikDisplay,
    fullName: voter.fullName,
    placeOfBirth: voter.placeOfBirth,
    dateOfBirth: voter.dateOfBirth.toISOString().split("T")[0]!,
    gender: voter.gender,
    address: voter.address,
    religion: voter.religion,
    maritalStatus: voter.maritalStatus,
    occupation: voter.occupation,
    citizenship: voter.citizenship,
    tps: voter.tps,
    status: voter.status,
    provinceId: voter.provinceId,
    kabupatenId: voter.kabupatenId,
    kecamatanId: voter.kecamatanId,
    kelurahanId: voter.kelurahanId,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in">
      {/* Breadcrumb & Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Link href="/dashboard/voters" className="hover:text-primary transition-colors">
            Data Pemilih
          </Link>
          <span>/</span>
          <Link href={`/dashboard/voters/${voter.id}`} className="hover:text-primary transition-colors">
            {voter.fullName}
          </Link>
          <span>/</span>
          <span className="text-primary font-medium">Edit</span>
        </div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Edit Data Pemilih</h1>
        <p className="text-xs text-secondary">
          Pembaruan informasi kependudukan sintetis. NIK bersifat permanen dan tidak dapat diubah.
        </p>
      </div>

      <VoterForm user={user} initialData={initialData} isEdit={true} voterId={voter.id} />
    </div>
  );
}
