"use client";

/**
 * VoterScope Demo — VoterDetailClient
 *
 * Interactive voter dossier view with NIK reveal/hide toggle,
 * metadata visualization, and audit activity.
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, calculateAge } from "@/lib/utils";
import {
  GENDER_LABELS,
  Gender,
  RELIGION_LABELS,
  Religion,
  MARITAL_STATUS_LABELS,
  MaritalStatus,
  VOTER_STATUS_LABELS,
  VoterStatus,
  UserRole,
  type SessionUser,
} from "@/lib/types";

type VoterDetailData = {
  id: string;
  nikMasked: string;
  syntheticNik?: string;
  fullName: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  religion: string;
  maritalStatus: string;
  occupation: string;
  citizenship: string;
  validUntil: string | null;
  tps: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  province?: { id: string; name: string; code: string };
  kabupaten?: { id: string; name: string; code: string };
  kecamatan?: { id: string; name: string; code: string };
  kelurahan?: { id: string; name: string; code: string };
  createdByUser?: { id: string; fullName: string; username: string; role: string } | null;
  updatedByUser?: { id: string; fullName: string; username: string; role: string } | null;
};

type Props = {
  voter: VoterDetailData;
  user: SessionUser;
};

export function VoterDetailClient({ voter, user }: Props) {
  const router = useRouter();

  const [revealedNik, setRevealedNik] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canEdit = user.role !== UserRole.AUDITOR && voter.status !== VoterStatus.ARCHIVED;

  const handleToggleReveal = async () => {
    if (revealedNik) {
      setRevealedNik(null);
      return;
    }

    setRevealing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/voters/${voter.id}?reveal=true`);
      if (res.ok) {
        const json = await res.json();
        setRevealedNik(json.syntheticNik ?? "Gagal mendekripsi");
      } else {
        setErrorMsg("Tidak dapat membuka NIK sintetis.");
      }
    } catch {
      setErrorMsg("Gagal melakukan dekripsi.");
    } finally {
      setRevealing(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/voters/${voter.id}/archive`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error?.message ?? "Gagal mengarsipkan.");
      } else {
        router.refresh();
        setConfirmArchive(false);
      }
    } catch {
      setErrorMsg("Terjadi gangguan jaringan saat pengarsipan.");
    } finally {
      setArchiving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case VoterStatus.ACTIVE:
        return <span className="badge badge-emerald">{VOTER_STATUS_LABELS.ACTIVE}</span>;
      case VoterStatus.INACTIVE:
        return <span className="badge badge-slate">{VOTER_STATUS_LABELS.INACTIVE}</span>;
      case VoterStatus.NEEDS_REVIEW:
        return <span className="badge badge-amber">{VOTER_STATUS_LABELS.NEEDS_REVIEW}</span>;
      case VoterStatus.ARCHIVED:
        return <span className="badge badge-rose">{VOTER_STATUS_LABELS.ARCHIVED}</span>;
      default:
        return <span className="badge badge-slate">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
      {/* Confirmation Modal for Archive */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card-elevated max-w-md w-full p-6 space-y-4 border border-border-strong animate-in fade-in">
            <h3 className="font-semibold text-primary text-base">Konfirmasi Pengarsipan Data</h3>
            <p className="text-sm text-secondary">
              Anda akan mengarsipkan data pemilih <strong>{voter.fullName}</strong>. Tindakan ini dicatat ke log audit sistem.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmArchive(false)}
                disabled={archiving}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiving}
                className="btn btn-danger btn-sm"
              >
                {archiving ? "Mengarsipkan..." : "Konfirmasi Arsipkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Link href="/dashboard/voters" className="hover:text-primary transition-colors">
              Data Pemilih
            </Link>
            <span>/</span>
            <span className="text-primary font-medium">{voter.fullName}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary tracking-tight">{voter.fullName}</h1>
            {getStatusBadge(voter.status)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/voters" className="btn btn-secondary btn-sm">
            ‹ Kembali
          </Link>

          {canEdit && (
            <>
              <Link href={`/dashboard/voters/${voter.id}/edit`} className="btn btn-primary btn-sm">
                Edit Data
              </Link>
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                className="btn btn-danger btn-sm"
              >
                Arsipkan
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-error text-xs flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-muted hover:text-primary">✕</button>
        </div>
      )}

      {/* Hero Card: Masked NIK & Security Banner */}
      <div className="card p-4 sm:p-6 border-border-subtle bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="text-xs font-medium text-secondary uppercase tracking-wider flex items-center gap-2">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-blue-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>NIK Sintetis Terenkripsi (AES-256-GCM)</span>
            </div>
            <div className="text-xl sm:text-2xl font-mono tabular-nums font-semibold text-blue-400 tracking-wide break-all sm:break-normal">
              {revealedNik ? (
                <span id="revealed-nik" className="text-emerald-400 bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 rounded border border-emerald-500/20 font-mono inline-block">
                  {revealedNik}
                </span>
              ) : (
                <span id="masked-nik">{voter.nikMasked}</span>
              )}
            </div>
            <p className="text-[11px] text-muted">
              Data sintetis fiktif. Plaintext tidak pernah disimpan di database tanpa enkripsi.
            </p>
          </div>

          <button
            id="toggle-nik-btn"
            type="button"
            onClick={handleToggleReveal}
            disabled={revealing}
            className={`btn btn-sm self-start sm:self-center inline-flex items-center gap-1.5 ${
              revealedNik ? "btn-secondary text-amber-400" : "btn-primary"
            }`}
          >
            {revealing ? (
              "Mendekripsi..."
            ) : revealedNik ? (
              "Sembunyikan NIK"
            ) : (
              <>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Tampilkan NIK Sintetis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Two-Column Grid: Demographics vs Territory & Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Demographics (2 cols) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="card p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-primary text-sm border-b border-border-subtle pb-3">
              Informasi Kependudukan (Sintetis)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted block uppercase text-[10px] font-semibold">Tempat, Tanggal Lahir</span>
                <span className="text-primary font-medium text-sm">
                  {voter.placeOfBirth}, {formatDate(voter.dateOfBirth)}
                </span>
                <span className="text-secondary block">({calculateAge(voter.dateOfBirth)} tahun)</span>
              </div>

              <div className="space-y-1">
                <span className="text-muted block uppercase text-[10px] font-semibold">Jenis Kelamin</span>
                <span className="text-primary font-medium text-sm">
                  {GENDER_LABELS[voter.gender as Gender] ?? voter.gender}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted block uppercase text-[10px] font-semibold">Agama</span>
                <span className="text-primary font-medium text-sm">
                  {RELIGION_LABELS[voter.religion as Religion] ?? voter.religion}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted block uppercase text-[10px] font-semibold">Status Perkawinan</span>
                <span className="text-primary font-medium text-sm">
                  {MARITAL_STATUS_LABELS[voter.maritalStatus as MaritalStatus] ?? voter.maritalStatus}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted block uppercase text-[10px] font-semibold">Pekerjaan</span>
                <span className="text-primary font-medium text-sm">{voter.occupation}</span>
              </div>

              <div className="space-y-1">
                <span className="text-muted block uppercase text-[10px] font-semibold">Kewarganegaraan</span>
                <span className="text-primary font-medium text-sm">{voter.citizenship}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle space-y-1 text-xs">
              <span className="text-muted block uppercase text-[10px] font-semibold">Alamat Lengkap</span>
              <p className="text-primary leading-relaxed bg-[var(--bg-base)]/50 p-3 rounded-lg border border-border-subtle">
                {voter.address}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Territory & Audit Trail (1 col) */}
        <div className="space-y-4 sm:space-y-6">
          {/* Territory Hierarchy */}
          <div className="card p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-primary text-sm border-b border-border-subtle pb-3">
              Wilayah Administrasi Pemilih
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border-subtle/50">
                <span className="text-secondary">Nomor TPS</span>
                <span className="font-semibold text-blue-400 text-sm bg-blue-500/10 px-2 py-0.5 rounded font-mono border border-blue-500/20">
                  TPS {voter.tps.replace(/^TPS\s*/i, "")}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border-subtle/50">
                <span className="text-secondary">Kelurahan / Desa</span>
                <span className="font-medium text-primary text-right">{voter.kelurahan?.name ?? "-"}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border-subtle/50">
                <span className="text-secondary">Kecamatan</span>
                <span className="font-medium text-primary text-right">{voter.kecamatan?.name ?? "-"}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border-subtle/50">
                <span className="text-secondary">Kabupaten / Kota</span>
                <span className="font-medium text-primary text-right">{voter.kabupaten?.name ?? "-"}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">Provinsi</span>
                <span className="font-medium text-primary text-right">{voter.province?.name ?? "-"}</span>
              </div>
            </div>
          </div>

          {/* Audit & Security Metadata */}
          <div className="card p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-primary text-sm border-b border-border-subtle pb-3">
              Audit & Jejak Keamanan
            </h3>

            <div className="space-y-3 text-[11px] text-secondary">
              <div>
                <span className="text-muted block text-[10px]">Didaftarkan Oleh:</span>
                <span className="text-primary font-medium">
                  {voter.createdByUser ? `${voter.createdByUser.fullName} (${voter.createdByUser.username})` : "Sistem Seeder"}
                </span>
              </div>

              <div>
                <span className="text-muted block text-[10px]">Waktu Pendaftaran:</span>
                <span className="text-primary font-mono">{formatDate(voter.createdAt)}</span>
              </div>

              <div>
                <span className="text-muted block text-[10px]">Pembaruan Terakhir:</span>
                <span className="text-primary font-mono">{formatDate(voter.updatedAt)}</span>
              </div>

              {voter.archivedAt && (
                <div className="pt-2 border-t border-border-subtle text-status-error">
                  <span className="block text-[10px]">Diarsipkan pada:</span>
                  <span className="font-mono">{formatDate(voter.archivedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
