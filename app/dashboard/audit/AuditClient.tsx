"use client";

/**
 * VoterScope Demo — AuditClient Component
 *
 * Compliance audit viewer featuring live filtering, KPI counters,
 * metadata JSON inspection modal, and CSV export.
 *
 * ALL AUDIT LOGS ARE DERIVED FROM SYNTHETIC DEMO SIMULATION.
 */

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import { AuditAction, AuditResourceType, AuditResult } from "@/lib/types";

export type AuditLogItem = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  result: string;
  metadata: Record<string, unknown> | null;
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  } | null;
};

type Props = {
  user: SessionUser;
};

export function AuditClient({ user: _currentUser }: Props) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    successCount: 0,
    failureCount: 0,
  });

  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    result: "",
  });

  const [inspectLog, setInspectLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (filters.action) params.set("action", filters.action);
      if (filters.resourceType) params.set("resourceType", filters.resourceType);
      if (filters.result) params.set("result", filters.result);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 1);
        if (json.stats) {
          setStats(json.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  const getExportUrl = (format: "csv" | "json") => {
    const params = new URLSearchParams({ format });
    if (filters.action) params.set("action", filters.action);
    if (filters.resourceType) params.set("resourceType", filters.resourceType);
    if (filters.result) params.set("result", filters.result);
    return `/api/audit/export?${params.toString()}`;
  };

  const hasActiveFilters = Boolean(filters.action || filters.resourceType || filters.result);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setFilters({ action: "", resourceType: "", result: "" });
    setPage(1);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case AuditAction.LOGIN:
        return <span className="badge badge-blue">Login</span>;
      case AuditAction.LOGIN_FAILED:
        return <span className="badge badge-rose">Login Gagal</span>;
      case AuditAction.LOGOUT:
        return <span className="badge badge-slate">Logout</span>;
      case AuditAction.VOTER_CREATE:
        return <span className="badge badge-emerald">Tambah Pemilih</span>;
      case AuditAction.VOTER_UPDATE:
        return <span className="badge badge-amber">Edit Pemilih</span>;
      case AuditAction.VOTER_ARCHIVE:
        return <span className="badge badge-rose">Arsip Pemilih</span>;
      case AuditAction.VOTER_VIEW_DETAIL:
        return <span className="badge badge-violet">Lihat Detail</span>;
      case AuditAction.VOTER_NIK_LOOKUP:
        return <span className="badge badge-blue">Lookup NIK</span>;
      case AuditAction.ACCESS_DENIED:
        return <span className="badge badge-rose">Akses Ditolak</span>;
      default:
        return <span className="badge badge-slate">{action}</span>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <span className="badge badge-violet text-[9px]">Super Admin</span>;
      case "AUDITOR":
        return <span className="badge badge-amber text-[9px]">Auditor</span>;
      case "PROVINCE_ADMIN":
      case "KABUPATEN_ADMIN":
        return <span className="badge badge-blue text-[9px]">{role.replace("_ADMIN", "")}</span>;
      default:
        return <span className="badge badge-slate text-[9px]">{role}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Metadata Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="card-elevated max-w-lg w-full p-6 space-y-4 border border-border-strong animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="text-brand-400">🔍</span>
                <h3 className="font-semibold text-primary text-sm">Inspeksi Metadata Audit Log</h3>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="text-muted hover:text-primary transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2 rounded bg-[var(--bg-base)]/60 border border-border-subtle">
                <div>
                  <span className="text-muted block text-[10px]">Aksi:</span>
                  <span className="font-medium text-primary">{inspectLog.action}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">Target Resource:</span>
                  <span className="font-medium text-primary">
                    {inspectLog.resourceType} ({inspectLog.resourceId ?? "-"})
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">Aktor:</span>
                  <span className="font-medium text-primary">{inspectLog.user?.username ?? "SYSTEM"}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">Alamat IP:</span>
                  <span className="font-mono text-primary">{inspectLog.ipAddress}</span>
                </div>
              </div>

              <div>
                <span className="text-muted block text-[10px] uppercase font-semibold mb-1">
                  User Agent Client:
                </span>
                <p className="text-[11px] text-secondary font-mono bg-[var(--bg-base)]/40 p-2 rounded border border-border-subtle break-all">
                  {inspectLog.userAgent}
                </p>
              </div>

              <div>
                <span className="text-muted block text-[10px] uppercase font-semibold mb-1">
                  Payload Metadata (Tersanitasi):
                </span>
                <pre className="text-[11px] text-brand-300 font-mono bg-[var(--bg-base)] p-3 rounded-lg border border-border-subtle overflow-x-auto max-h-52">
                  {inspectLog.metadata
                    ? JSON.stringify(inspectLog.metadata, null, 2)
                    : "Tidak ada metadata tambahan."}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="btn btn-secondary btn-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Export action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Log Jejak Audit & Kepatuhan</h1>
          <p className="text-xs text-secondary mt-1">
            Rekam jejak forensik seluruh operasi autentikasi, mutasi data pemilih, dan deteksi pelanggaran akses.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5">
          <div className="flex items-center gap-2">
            <a
              id="export-csv-btn"
              href={getExportUrl("csv")}
              download
              className="btn btn-secondary btn-sm flex items-center gap-2"
              title="Ekspor data audit ke format CSV (maksimal 1.000 baris sesuai filter)"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Ekspor CSV
            </a>
            <a
              id="export-json-btn"
              href={getExportUrl("json")}
              download
              className="btn btn-ghost btn-sm text-xs text-secondary hover:text-primary"
              title="Ekspor data audit ke format JSON (maksimal 1.000 baris sesuai filter)"
            >
              Ekspor JSON
            </a>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Maks. 1.000 baris {hasActiveFilters ? "(mengikuti filter aktif)" : ""}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-secondary uppercase tracking-wider block">Total Event Audit</span>
            <div className="text-2xl font-semibold text-primary mt-1 font-mono tabular-nums">{stats.total.toLocaleString("id-ID")}</div>
          </div>
          <span className="w-9 h-9 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </span>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-secondary uppercase tracking-wider block">Operasi Sukses</span>
            <div className="text-2xl font-semibold text-emerald-400 mt-1 font-mono tabular-nums">
              {stats.successCount.toLocaleString("id-ID")}
            </div>
          </div>
          <span className="w-9 h-9 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-secondary uppercase tracking-wider block">Gagal / Akses Ditolak</span>
            <div className="text-2xl font-semibold text-red-400 mt-1 font-mono tabular-nums">
              {stats.failureCount.toLocaleString("id-ID")}
            </div>
          </div>
          <span className="w-9 h-9 rounded border border-red-500/20 bg-red-500/10 text-red-400 flex items-center justify-center">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Action Filter */}
          <select
            value={filters.action}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, action: e.target.value }));
              setPage(1);
            }}
            className="input-field !py-2 !px-3 text-xs w-full sm:w-auto min-w-[160px]"
          >
            <option value="">Semua Aksi</option>
            <option value={AuditAction.LOGIN}>Login Berhasil</option>
            <option value={AuditAction.LOGIN_FAILED}>Login Gagal</option>
            <option value={AuditAction.LOGOUT}>Logout</option>
            <option value={AuditAction.VOTER_CREATE}>Tambah Pemilih</option>
            <option value={AuditAction.VOTER_UPDATE}>Pembaruan Pemilih</option>
            <option value={AuditAction.VOTER_ARCHIVE}>Pengarsipan Pemilih</option>
            <option value={AuditAction.VOTER_VIEW_DETAIL}>Akses Detail NIK</option>
            <option value={AuditAction.VOTER_NIK_LOOKUP}>Lookup Hash NIK</option>
            <option value={AuditAction.ACCESS_DENIED}>Akses Ditolak (Anti-IDOR)</option>
          </select>

          {/* Resource Filter */}
          <select
            value={filters.resourceType}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, resourceType: e.target.value }));
              setPage(1);
            }}
            className="input-field !py-2 !px-3 text-xs w-full sm:w-auto min-w-[140px]"
          >
            <option value="">Semua Resource</option>
            <option value={AuditResourceType.AUTH}>AUTH (Autentikasi)</option>
            <option value={AuditResourceType.VOTER}>VOTER (Pemilih)</option>
            <option value={AuditResourceType.USER}>USER (Pengguna)</option>
            <option value={AuditResourceType.SYSTEM}>SYSTEM (Sistem)</option>
          </select>

          {/* Result Filter */}
          <select
            value={filters.result}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, result: e.target.value }));
              setPage(1);
            }}
            className="input-field !py-2 !px-3 text-xs w-full sm:w-auto min-w-[130px]"
          >
            <option value="">Semua Status</option>
            <option value={AuditResult.SUCCESS}>Sukses (SUCCESS)</option>
            <option value={AuditResult.FAILURE}>Gagal (FAILURE)</option>
          </select>

          {(filters.action || filters.resourceType || filters.result) && (
            <button
              onClick={handleResetFilters}
              className="btn btn-ghost btn-sm text-xs text-muted hover:text-primary"
            >
              ✕ Reset Filter
            </button>
          )}
        </div>

        <div className="text-secondary text-right">
          Total: <strong className="text-primary">{total}</strong> event
        </div>
      </div>

      {/* Audit Data Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-default bg-[var(--bg-elevated)]/60 text-secondary">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Waktu Event</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Aktor / User</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Aksi</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Sumber Daya</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">IP Address</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-28" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-32" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-20" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-16" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-14" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-20" /></td>
                    <td className="py-3 px-4 text-right"><div className="h-4 bg-border-default rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    Tidak ada catatan log audit yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-secondary whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-primary flex items-center gap-1.5">
                            <span>{log.user.fullName}</span>
                            <span className="text-[10px] text-muted">({log.user.username})</span>
                          </div>
                          <div className="mt-0.5">{getRoleBadge(log.user.role)}</div>
                        </div>
                      ) : (
                        <span className="text-muted font-mono">SYSTEM</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Resource */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-primary">{log.resourceType}</span>
                      {log.resourceId && (
                        <span className="text-[10px] text-muted block font-mono truncate max-w-[120px]">
                          {log.resourceId}
                        </span>
                      )}
                    </td>

                    {/* Result */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.result === "SUCCESS" ? (
                        <span className="badge badge-emerald">Sukses</span>
                      ) : (
                        <span className="badge badge-rose">Gagal</span>
                      )}
                    </td>

                    {/* IP */}
                    <td className="py-3 px-4 font-mono text-muted whitespace-nowrap">
                      {log.ipAddress}
                    </td>

                    {/* Detail Inspector Button */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setInspectLog(log)}
                        className="btn btn-secondary btn-sm !py-1 !px-2.5 text-[11px]"
                      >
                        Inspeksi
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="py-3 px-4 border-t border-border-default bg-[var(--bg-elevated)]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-base border border-border-default rounded px-2 py-1 text-xs text-primary focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>per halaman. Total: <strong>{total}</strong> log</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="btn btn-secondary btn-sm !py-1 !px-2.5 text-xs disabled:opacity-40"
            >
              ‹ Sebelumnya
            </button>
            <span className="font-medium px-2">
              {page} / {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="btn btn-secondary btn-sm !py-1 !px-2.5 text-xs disabled:opacity-40"
            >
              Selanjutnya ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
