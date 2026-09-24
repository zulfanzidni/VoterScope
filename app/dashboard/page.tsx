/**
 * VoterScope Demo — Dashboard Home Page (Server Component)
 *
 * Scoped administrative dashboard featuring demographic analytics,
 * Recharts visual breakdown, status metrics, and audit activity feed.
 *
 * ALL DATA IS SYNTHETIC DEMO DATA.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getUserScope, buildAuthorizedVoterFilter } from "@/lib/authorization";
import { summarizeDashboardDemographics } from "@/lib/analytics";
import { DemographicCharts } from "@/components/dashboard/DemographicChartsLoader";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Dashboard — VoterScope Demo",
  description: "Dashboard analitik demografi data pemilih berbasis cakupan hierarki wilayah.",
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  PROVINCE_ADMIN: "Administrator Provinsi",
  KABUPATEN_ADMIN: "Administrator Kabupaten",
  KECAMATAN_ADMIN: "Administrator Kecamatan",
  KELURAHAN_OPERATOR: "Operator Kelurahan",
  AUDITOR: "Auditor Kepatuhan",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = getUserScope(user);
  const voterFilter = buildAuthorizedVoterFilter(user);

  // All aggregates run in SQL, in parallel, and return only summary rows —
  // never the voter table itself. Cost is O(1) in voter rows: the gender
  // split, the distinct-birth-date buckets (age cohorts are computed from
  // those), and the territory distribution are all `groupBy` result sets of a
  // handful of rows each. The completeness score is a filtered count
  // (non-null address + placeOfBirth), matching `calculateDemographics`'s
  // per-record completeness rule.
  //
  // Note: Prisma's transaction-pooler mode (Supavisor, pgbouncer=true) does
  // not support named prepared statements — `_count` inside `groupBy`'s
  // `select` would emit one, so the buckets use `_count: { _all: true }` at
  // the top level instead (see conn-prepared-statements in
  // supabase-postgres-best-practices).
  const notArchived = { ...voterFilter, status: { not: "ARCHIVED" } };

  // Data completeness mirrors `calculateDemographics`' per-record rule: a
  // record is complete when address AND placeOfBirth are truthy. Both are
  // required (non-null) Prisma fields, so "present" means non-empty string —
  // `not: null` is rejected by Prisma on required fields.
  const completeFilter = {
    ...notArchived,
    address: { not: "" },
    placeOfBirth: { not: "" },
  };

  // Adapter: groupBy cannot take the narrower VoterWhereInput in this Prisma
  // version's typings, so the runtime-identical filter objects are widened.
  // Both spread only `voterFilter` (string IDs / undefined) plus Prisma
  // operators — no raw user input reaches the query.
  type FilterRecord = Record<string, unknown>;
  const whereAll = notArchived as FilterRecord;
  const whereScope = voterFilter as FilterRecord;
  const whereComplete = completeFilter as FilterRecord;

  const [
    statusRows,
    completeCount,
    genderRows,
    dobRows,
    tpsRows,
    subTerritoryRows,
    totalUsers,
    recentAudit,
  ] = await Promise.all([
    // One GROUP BY over the scope filter replaces all four status counts
    // (total/active/needs-review/archived are derived below).
    prisma.voter.groupBy({
      by: ["status"],
      where: whereScope,
      _count: { _all: true },
    }),
    prisma.voter.count({ where: whereComplete }),
    prisma.voter.groupBy({
      by: ["gender"],
      where: whereAll,
      _count: { _all: true },
    }),
    prisma.voter.groupBy({
      by: ["dateOfBirth"],
      where: whereAll,
      _count: { _all: true },
    }),
    prisma.voter.groupBy({
      by: ["tps"],
      where: whereAll,
      _count: { _all: true },
    }),
    // Sub-territory distribution, bucketed at the viewer's scope level:
    // kabupaten (NATIONAL/PROVINCE) → kecamatan (KABUPATEN) → kelurahan
    // (KECAMATAN) → tps (KELURAHAN, already fetched above).
    scope.level === "NATIONAL" || scope.level === "PROVINCE"
      ? prisma.voter.groupBy({
          by: ["kabupatenId"],
          where: whereAll,
          _count: { _all: true },
        })
      : scope.level === "KABUPATEN"
        ? prisma.voter.groupBy({
            by: ["kecamatanId"],
            where: whereAll,
            _count: { _all: true },
          })
        : scope.level === "KECAMATAN"
          ? prisma.voter.groupBy({
              by: ["kelurahanId"],
              where: whereAll,
              _count: { _all: true },
            })
          : Promise.resolve(null as null),
    user.role === "SUPER_ADMIN" || user.role === "PROVINCE_ADMIN"
      ? prisma.user.count({ where: { isActive: true } })
      : Promise.resolve(null),
    prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 5,
      where:
        user.role === "AUDITOR" || user.role === "SUPER_ADMIN"
          ? {}
          : { userId: user.id },
      select: {
        id: true,
        action: true,
        result: true,
        timestamp: true,
        resourceType: true,
        user: { select: { username: true } },
      },
    }),
  ]);

  // Demographics from the aggregate rows — identical shape to the old
  // per-record path (see `summarizeDashboardDemographics` + its tests).
  // Status counts come from the single status GROUP BY.
  const countByStatus = new Map(statusRows.map((r) => [r.status, r._count._all]));
  const activeVoters = countByStatus.get("ACTIVE") ?? 0;
  const needsReview = countByStatus.get("NEEDS_REVIEW") ?? 0;
  const archivedVoters = countByStatus.get("ARCHIVED") ?? 0;
  // Total = all non-archived (matches old `status: { not: "ARCHIVED" }`).
  const totalVoters = statusRows.reduce(
    (sum, r) => (r.status === "ARCHIVED" ? sum : sum + r._count._all),
    0
  );
  const demographics = summarizeDashboardDemographics({
    total: totalVoters,
    activeCount: activeVoters,
    needsReviewCount: needsReview,
    completeCount,
    genderRows: genderRows.map((r) => ({
      gender: r.gender,
      count: r._count._all,
    })),
    dobRows: dobRows.map((r) => ({
      dateOfBirth: r.dateOfBirth,
      count: r._count._all,
    })),
  });

  // Territory distribution from the aggregate rows: sort desc, top 8, resolve
  // territory IDs → names with one typed read (TPS needs no lookup).
  const tpsList = tpsRows.map((r) => r.tps);
  let territoryDistribution: { name: string; count: number }[];

  if (subTerritoryRows === null) {
    // KELURAHAN scope — TPS is the leaf level.
    territoryDistribution = tpsRows
      .map((r) => ({ name: `TPS ${r.tps}`, count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  } else {
    const idKey =
      scope.level === "NATIONAL" || scope.level === "PROVINCE"
        ? "kabupatenId"
        : scope.level === "KABUPATEN"
          ? "kecamatanId"
          : "kelurahanId";
    const ids = subTerritoryRows
      .map((r) => {
        const row = r as unknown as Record<string, string | null>;
        return row[idKey];
      })
      .filter((id): id is string => id !== null);

    let nameById = new Map<string, string>();
    if (ids.length > 0) {
      const names =
        idKey === "kabupatenId"
          ? await prisma.kabupaten.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
            })
          : idKey === "kecamatanId"
            ? await prisma.kecamatan.findMany({
                where: { id: { in: ids } },
                select: { id: true, name: true },
              })
            : await prisma.kelurahan.findMany({
                where: { id: { in: ids } },
                select: { id: true, name: true },
              });
      nameById = new Map(names.map((n) => [n.id, n.name]));
    }

    territoryDistribution = subTerritoryRows
      .map((r) => {
        const row = r as unknown as Record<string, string | null | { _all: number }>;
        const count = (row._count as { _all: number })._all;
        const id = row[idKey] as string | null;
        return { name: nameById.get(id ?? "") ?? "Lainnya", count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  const scopeDescription =
    scope.level === "NATIONAL"
      ? "Semua Wilayah (Nasional)"
      : scope.level === "PROVINCE"
      ? `Tingkat Provinsi`
      : scope.level === "KABUPATEN"
      ? `Tingkat Kabupaten`
      : scope.level === "KECAMATAN"
      ? `Tingkat Kecamatan`
      : `Tingkat Kelurahan`;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-primary tracking-tight">
            Selamat Datang, {user.fullName.split(" ")[0]}
          </h1>
          <p className="text-xs text-secondary mt-1">
            {ROLE_LABEL[user.role] ?? user.role} · Cakupan Wewenang:{" "}
            <span className="text-primary font-medium">{scopeDescription}</span>
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded border border-amber-500/30 bg-amber-500/5 text-[11px] sm:text-xs text-amber-400 self-start sm:self-auto">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="leading-snug">Simulasi Portofolio — Data pemilih berstatus sintetis terenkripsi</span>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Voters */}
        <div id="stat-total-voters" className="card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">Total Pemilih</span>
            <span className="w-8 h-8 rounded border border-border-subtle bg-surface-elevated text-secondary flex items-center justify-center">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-primary font-mono tabular-nums">{totalVoters.toLocaleString("id-ID")}</div>
            <div className="text-[11px] text-muted mt-1.5 font-mono tabular-nums">
              {activeVoters} aktif · {archivedVoters} diarsipkan
            </div>
          </div>
        </div>

        {/* Active Voters */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">Pemilih Aktif</span>
            <span className="w-8 h-8 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-primary font-mono tabular-nums">{activeVoters.toLocaleString("id-ID")}</div>
            <div className="text-[11px] text-emerald-400/90 mt-1.5 font-medium">
              {totalVoters > 0 ? Math.round((activeVoters / totalVoters) * 100) : 0}% dari total terdaftar
            </div>
          </div>
        </div>

        {/* Needs Review */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">Perlu Ditinjau</span>
            <span className="w-8 h-8 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-primary font-mono tabular-nums">{needsReview.toLocaleString("id-ID")}</div>
            <div className="text-[11px] text-amber-400/90 mt-1.5 font-medium">
              Memerlukan verifikasi lanjutan
            </div>
          </div>
        </div>

        {/* Total TPS or Total Users */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              {totalUsers !== null ? "TPS & Operator" : "Total TPS"}
            </span>
            <span className="w-8 h-8 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-primary font-mono tabular-nums">{tpsList.length} TPS</div>
            <div className="text-[11px] text-muted mt-1.5 font-mono tabular-nums">
              {totalUsers !== null
                ? `${totalUsers} akun admin aktif`
                : `Rata-rata ${tpsList.length > 0 ? Math.round(totalVoters / tpsList.length) : 0} pemilih / TPS`}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Recharts Visualizations */}
      <DemographicCharts
        demographics={demographics}
        territoryDistribution={territoryDistribution}
        scopeLevel={scope.level}
      />

      {/* Two Column Grid: Quick Actions & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-medium text-sm text-primary flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Menu Aksi Cepat
            </h3>

            <div className="space-y-2.5">
              <Link
                href="/dashboard/voters"
                className="flex items-center gap-3 p-3 rounded border border-border-subtle bg-surface/50 hover:bg-surface-elevated hover:border-border transition-colors text-decoration-none group"
              >
                <div className="w-1 h-8 rounded-full bg-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-primary group-hover:text-blue-400 transition-colors">
                    Lihat Data Pemilih
                  </div>
                  <div className="text-[11px] text-muted truncate mt-0.5">
                    Kelola {totalVoters.toLocaleString("id-ID")} rekord pemilih dalam cakupan wilayah Anda
                  </div>
                </div>
                <span className="text-muted group-hover:text-primary text-sm transition-colors">›</span>
              </Link>

              {user.role !== "AUDITOR" && (
                <Link
                  href="/dashboard/voters/new"
                  className="flex items-center gap-3 p-3 rounded border border-border-subtle bg-surface/50 hover:bg-surface-elevated hover:border-border transition-colors text-decoration-none group"
                >
                  <div className="w-1 h-8 rounded-full bg-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-primary group-hover:text-emerald-400 transition-colors">
                      Pendaftaran Pemilih Baru
                    </div>
                    <div className="text-[11px] text-muted truncate mt-0.5">
                      Daftarkan pemilih sintetis baru dengan enkripsi AES-256 otomatis
                    </div>
                  </div>
                  <span className="text-muted group-hover:text-primary text-sm transition-colors">›</span>
                </Link>
              )}

              {(user.role === "SUPER_ADMIN" || user.role === "AUDITOR") && (
                <Link
                  href="/dashboard/audit"
                  className="flex items-center gap-3 p-3 rounded border border-border-subtle bg-surface/50 hover:bg-surface-elevated hover:border-border transition-colors text-decoration-none group"
                >
                  <div className="w-1 h-8 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-primary group-hover:text-amber-400 transition-colors">
                      Log Audit Keamanan
                    </div>
                    <div className="text-[11px] text-muted truncate mt-0.5">
                      Pemeriksaan riwayat autentikasi dan mutasi data administratif
                    </div>
                  </div>
                  <span className="text-muted group-hover:text-primary text-sm transition-colors">›</span>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-muted">
            Navigasi disesuaikan dengan matriks wewenang RBAC.
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-medium text-sm text-primary flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Aktivitas Sistem Terbaru
            </h3>

            {recentAudit.length === 0 ? (
              <p className="text-xs text-muted text-center py-8">Belum ada aktivitas tercatat.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {recentAudit.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          log.result === "SUCCESS" ? "bg-emerald-400" : "bg-red-400"
                        }`}
                      />
                      <div className="truncate">
                        <div className="font-medium text-primary truncate">
                          {formatActionName(log.action)} ·{" "}
                          <span className="text-secondary font-mono text-[11px]">{log.user?.username ?? "System"}</span>
                        </div>
                        <div className="text-[10px] text-muted font-mono">{formatDate(log.timestamp)}</div>
                      </div>
                    </div>

                    <span
                      className={`badge text-[10px] shrink-0 font-normal ${
                        log.result === "SUCCESS" ? "badge-emerald" : "badge-rose"
                      }`}
                    >
                      {log.result === "SUCCESS" ? "Sukses" : "Gagal"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-muted flex justify-between items-center">
            <span>5 aktivitas log terakhir</span>
            {(user.role === "SUPER_ADMIN" || user.role === "AUDITOR") && (
              <Link href="/dashboard/audit" className="text-blue-400 hover:text-blue-300 transition-colors">
                Lihat Semua ›
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatActionName(action: string): string {
  const map: Record<string, string> = {
    LOGIN: "Login Berhasil",
    LOGIN_FAILED: "Percobaan Login Gagal",
    LOGOUT: "Logout",
    SESSION_EXPIRED: "Sesi Kedaluwarsa",
    VOTER_CREATE: "Pendaftaran Pemilih",
    VOTER_UPDATE: "Pembaruan Pemilih",
    VOTER_ARCHIVE: "Pengarsipan Pemilih",
    VOTER_VIEW: "Akses Daftar Pemilih",
    VOTER_VIEW_DETAIL: "Buka Detail Pemilih",
    VOTER_NIK_LOOKUP: "Pencarian Hash NIK",
    USER_CREATE: "Pembuatan Akun User",
    ACCESS_DENIED: "Akses Ditolak (Anti-IDOR)",
  };
  return map[action] ?? action;
}
