"use client";

/**
 * VoterScope Demo — VoterTable Component
 *
 * Rich data table with masked synthetic NIK, demographic badges,
 * administrative hierarchy breadcrumb, and scoped actions.
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { useState } from "react";
import Link from "next/link";
import { calculateAge, formatDate } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import { UserRole, VoterStatus, VOTER_STATUS_LABELS } from "@/lib/types";

export type VoterItem = {
  id: string;
  nikMasked: string;
  fullName: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  tps: string;
  status: string;
  createdAt: string;
  province?: { id: string; name: string };
  kabupaten?: { id: string; name: string };
  kecamatan?: { id: string; name: string };
  kelurahan?: { id: string; name: string };
};

type Props = {
  voters: VoterItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  user: SessionUser;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onRefresh: () => void;
};

export function VoterTable({
  voters,
  total,
  page,
  pageSize,
  totalPages,
  loading,
  user,
  onPageChange,
  onPageSizeChange,
  onRefresh,
}: Props) {
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canEdit = user.role !== UserRole.AUDITOR;

  const handleArchive = async (id: string) => {
    setArchivingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/voters/${id}/archive`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json.error?.message ?? "Gagal mengarsipkan pemilih.");
      } else {
        setConfirmArchiveId(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      setActionError("Terjadi gangguan jaringan saat mengarsipkan pemilih.");
    } finally {
      setArchivingId(null);
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
    <div className="card overflow-hidden">
      {actionError && (
        <div className="p-3 mx-4 mt-4 alert alert-error text-xs flex justify-between items-center">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-muted hover:text-primary">✕</button>
        </div>
      )}

      {/* Confirmation Modal for Archive */}
      {confirmArchiveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card-elevated max-w-md w-full p-6 space-y-4 border border-border-strong animate-in fade-in">
            <div className="flex items-center gap-3 text-status-warning">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-semibold text-primary text-base">Konfirmasi Pengarsipan</h3>
            </div>
            <p className="text-sm text-secondary">
              Apakah Anda yakin ingin mengarsipkan catatan pemilih ini? Status data akan diubah menjadi <strong className="text-status-warning">Diarsipkan</strong> dan dicatat ke dalam log audit keamanan.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmArchiveId(null)}
                disabled={archivingId !== null}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleArchive(confirmArchiveId)}
                disabled={archivingId !== null}
                className="btn btn-danger btn-sm"
              >
                {archivingId ? "Mengarsipkan..." : "Ya, Arsipkan Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-default bg-surface-elevated/40 text-secondary">
              <th className="py-3 px-4 font-medium uppercase tracking-wider text-[11px]">NIK Sintetis</th>
              <th className="py-3 px-4 font-medium uppercase tracking-wider text-[11px]">Nama & Demografi</th>
              <th className="py-3 px-4 font-medium uppercase tracking-wider text-[11px]">Gender</th>
              <th className="py-3 px-4 font-medium uppercase tracking-wider text-[11px]">Wilayah & TPS</th>
              <th className="py-3 px-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
              <th className="py-3 px-4 font-medium uppercase tracking-wider text-[11px] text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-border-default rounded w-28" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-border-default rounded w-36 mb-1" /><div className="h-3 bg-border-default/50 rounded w-20" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-border-default rounded w-16" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-border-default rounded w-32 mb-1" /><div className="h-3 bg-border-default/50 rounded w-24" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-border-default rounded w-16" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-border-default rounded w-20 ml-auto" /></td>
                </tr>
              ))
            ) : voters.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="opacity-40">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium text-secondary">Tidak ada data pemilih ditemukan</p>
                    <p className="text-[11px] text-muted max-w-xs">
                      Tidak ada rekaman yang sesuai dengan filter atau cakupan wewenang wilayah Anda.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              voters.map((voter) => {
                const age = calculateAge(voter.dateOfBirth);
                return (
                  <tr
                    key={voter.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    {/* 1. NIK */}
                    <td className="py-3 px-4 font-mono tabular-nums font-medium text-blue-400 whitespace-nowrap">
                      {voter.nikMasked}
                    </td>

                    {/* 2. Nama & Demografi */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-primary text-sm">{voter.fullName}</div>
                      <div className="text-[11px] text-muted font-mono tabular-nums">
                        {voter.placeOfBirth}, {formatDate(voter.dateOfBirth)} ({age} th)
                      </div>
                    </td>

                    {/* 3. Gender */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`badge ${
                          voter.gender === "LAKI_LAKI" ? "badge-blue" : "badge-slate"
                        }`}
                      >
                        {voter.gender === "LAKI_LAKI" ? "L" : "P"}
                      </span>
                    </td>

                    {/* 4. Wilayah & TPS */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-primary font-mono text-[11px]">
                        TPS {voter.tps.replace(/^TPS\s*/i, "")}
                      </div>
                      <div className="text-[11px] text-secondary">
                        {voter.kelurahan?.name ?? "-"}, {voter.kecamatan?.name ?? "-"}
                      </div>
                    </td>

                    {/* 5. Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(voter.status)}
                    </td>

                    {/* 6. Aksi */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/voters/${voter.id}`}
                          className="btn btn-secondary btn-sm !py-1 !px-2.5 text-[11px]"
                          title="Lihat detail lengkap"
                        >
                          Detail
                        </Link>

                        {canEdit && voter.status !== VoterStatus.ARCHIVED && (
                          <>
                            <Link
                              href={`/dashboard/voters/${voter.id}/edit`}
                              className="btn btn-ghost btn-sm !py-1 !px-2 text-[11px] text-blue-400 hover:text-blue-300"
                              title="Edit data pemilih"
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              onClick={() => setConfirmArchiveId(voter.id)}
                              className="btn btn-ghost btn-sm !py-1 !px-2 text-[11px] text-red-400 hover:bg-red-500/10"
                              title="Arsipkan pemilih"
                            >
                              Arsipkan
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="py-3 px-4 border-t border-border-default bg-[var(--bg-elevated)]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary">
        <div className="flex items-center gap-2">
          <span>Tampilkan</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-base border border-border-default rounded px-2 py-1 text-xs text-primary focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>per halaman. Total: <strong>{total}</strong> pemilih</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="btn btn-secondary btn-sm !py-1 !px-2.5 text-xs disabled:opacity-40"
          >
            ‹ Sebelumnya
          </button>
          <span className="font-medium px-2">
            {page} / {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="btn btn-secondary btn-sm !py-1 !px-2.5 text-xs disabled:opacity-40"
          >
            Selanjutnya ›
          </button>
        </div>
      </div>
    </div>
  );
}
