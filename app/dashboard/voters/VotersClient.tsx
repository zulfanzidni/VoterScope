"use client";

/**
 * VoterScope Demo — Voters Client Component
 *
 * Handles voter data fetching, live filters, pagination, and refresh triggers.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { VoterFilterBar, type VoterFilterState } from "@/components/voters/VoterFilterBar";
import { VoterTable, type VoterItem } from "@/components/voters/VoterTable";
import type { SessionUser } from "@/lib/types";
import { UserRole } from "@/lib/types";

type Props = {
  user: SessionUser;
};

export function VotersClient({ user }: Props) {
  const [voters, setVoters] = useState<VoterItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [filters, setFilters] = useState<VoterFilterState>({
    q: "",
    gender: "",
    status: "",
  });

  const canCreate = user.role !== UserRole.AUDITOR;

  const fetchVoters = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (filters.q) params.set("q", filters.q);
      if (filters.gender) params.set("gender", filters.gender);
      if (filters.status) params.set("status", filters.status);

      const res = await fetch(`/api/voters?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setVoters(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 1);
        setFetchError(null);
      } else {
        const json = await res.json().catch(() => null);
        setFetchError(json?.error?.message || json?.message || "Gagal memuat data pemilih. Terjadi kesalahan pada server.");
      }
    } catch (err) {
      console.error("Failed to fetch voters:", err);
      setFetchError("Gagal terhubung ke server untuk memuat data pemilih.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  // Debounced fetch on filter or pagination change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVoters();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchVoters]);

  const handleFilterChange = (newFilters: VoterFilterState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page
  };

  const handleResetFilters = () => {
    setFilters({ q: "", gender: "", status: "" });
    setPage(1);
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Data Pemilih (Sintetis)</h1>
          <p className="text-xs text-secondary mt-1">
            Daftar pemilih dalam cakupan wilayah wewenang akun Anda. Identitas tersimpan secara terenkripsi.
          </p>
        </div>

        {canCreate && (
          <Link href="/dashboard/voters/new" className="btn btn-primary btn-sm self-start sm:self-auto">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pemilih Baru
          </Link>
        )}
      </div>

      {/* Demo notice banner */}
      <div className="p-3 rounded border border-border-subtle bg-surface/50 text-xs flex items-center justify-between text-secondary">
        <div className="flex items-center gap-2.5">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-blue-400 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong className="text-primary font-medium">Simulasi Portofolio:</strong> Seluruh NIK dan data pemilih adalah data sintetis fiktif terenkripsi <strong>AES-256-GCM</strong>.
          </span>
        </div>
      </div>

      {/* Error alert banner */}
      {fetchError && (
        <div className="alert alert-error text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchVoters()}
            className="underline hover:no-underline font-semibold ml-4 shrink-0"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <VoterFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        totalResults={total}
      />

      {/* Voter Data Table */}
      <VoterTable
        voters={voters}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        loading={loading}
        user={user}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        onRefresh={fetchVoters}
      />
    </div>
  );
}
