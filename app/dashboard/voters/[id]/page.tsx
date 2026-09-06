/**
 * VoterScope Demo — Voter Detail Page (Server Component)
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessVoter } from "@/lib/authorization";
import { decryptNik, maskNik } from "@/lib/security/nik";
import { VoterDetailClient } from "./VoterDetailClient";

export const metadata = {
  title: "Detail Pemilih — VoterScope Demo",
  description: "Dossier lengkap data pemilih administratif sintetis.",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VoterDetailPage(props: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await props.params;

  const voter = await prisma.voter.findUnique({
    where: { id },
    include: {
      province: { select: { id: true, name: true, code: true } },
      kabupaten: { select: { id: true, name: true, code: true } },
      kecamatan: { select: { id: true, name: true, code: true } },
      kelurahan: { select: { id: true, name: true, code: true } },
      createdByUser: { select: { id: true, fullName: true, username: true, role: true } },
      updatedByUser: { select: { id: true, fullName: true, username: true, role: true } },
    },
  });

  if (!voter) {
    notFound();
  }

  // IDOR Protection: Check whether voter belongs to user's administrative jurisdiction
  const isAuthorized = canAccessVoter(user, {
    provinceId: voter.provinceId,
    kabupatenId: voter.kabupatenId,
    kecamatanId: voter.kecamatanId,
    kelurahanId: voter.kelurahanId,
  });

  if (!isAuthorized) {
    return (
      <div className="card p-8 max-w-xl mx-auto text-center space-y-4 my-12 border-status-error/30">
        <div className="w-12 h-12 rounded-full bg-status-error/15 text-status-error flex items-center justify-center mx-auto text-2xl">
          🚫
        </div>
        <h2 className="text-xl font-bold text-primary">Akses Ditolak (Anti-IDOR)</h2>
        <p className="text-sm text-secondary">
          Data pemilih ini berada di luar cakupan wilayah wewenang administratif akun Anda ({user.role}).
          Percobaan akses telah dicatat ke log audit.
        </p>
        <div className="pt-2">
          <Link href="/dashboard/voters" className="btn btn-secondary btn-sm">
            ‹ Kembali ke Daftar Pemilih
          </Link>
        </div>
      </div>
    );
  }

  let nikMasked = "****************";
  try {
    const decrypted = decryptNik(voter.nikEncrypted);
    nikMasked = maskNik(decrypted);
  } catch (err) {
    console.error("NIK decryption error:", err);
  }

  const sanitizedVoter = {
    id: voter.id,
    nikMasked,
    fullName: voter.fullName,
    placeOfBirth: voter.placeOfBirth,
    dateOfBirth: voter.dateOfBirth.toISOString().split("T")[0]!,
    gender: voter.gender,
    address: voter.address,
    religion: voter.religion,
    maritalStatus: voter.maritalStatus,
    occupation: voter.occupation,
    citizenship: voter.citizenship,
    validUntil: voter.validUntil ? voter.validUntil.toISOString().split("T")[0]! : null,
    tps: voter.tps,
    status: voter.status,
    createdAt: voter.createdAt.toISOString(),
    updatedAt: voter.updatedAt.toISOString(),
    archivedAt: voter.archivedAt ? voter.archivedAt.toISOString() : null,
    province: voter.province,
    kabupaten: voter.kabupaten,
    kecamatan: voter.kecamatan,
    kelurahan: voter.kelurahan,
    createdByUser: voter.createdByUser,
    updatedByUser: voter.updatedByUser,
  };

  return <VoterDetailClient voter={sanitizedVoter} user={user} />;
}
