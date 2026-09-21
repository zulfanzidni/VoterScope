"use client";

/**
 * VoterScope Demo — VoterFilterBar
 *
 * Filter controls for searching voters by query, status, and gender.
 */

import { GENDER_LABELS, Gender, VOTER_STATUS_LABELS, VoterStatus } from "@/lib/types";

export type VoterFilterState = {
  q: string;
  gender: string;
  status: string;
};

type Props = {
  filters: VoterFilterState;
  onChange: (filters: VoterFilterState) => void;
  onReset: () => void;
  totalResults: number;
};

export function VoterFilterBar({ filters, onChange, onReset, totalResults }: Props) {
  const hasActiveFilters = !!(filters.q || filters.gender || filters.status);

  return (
    <div className="card p-4 mb-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Query */}
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            id="voter-search-input"
            type="text"
            placeholder="Cari nama pemilih atau nomor TPS..."
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            className="input-field has-icon-left !pl-10 text-sm"
          />
        </div>

        {/* Gender Filter */}
        <div className="w-full sm:w-[160px]">
          <select
            value={filters.gender}
            onChange={(e) => onChange({ ...filters, gender: e.target.value })}
            className="input-field text-sm"
          >
            <option value="">Semua Gender</option>
            <option value={Gender.LAKI_LAKI}>{GENDER_LABELS[Gender.LAKI_LAKI]}</option>
            <option value={Gender.PEREMPUAN}>{GENDER_LABELS[Gender.PEREMPUAN]}</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-[170px]">
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="input-field text-sm"
          >
            <option value="">Semua Status</option>
            <option value={VoterStatus.ACTIVE}>{VOTER_STATUS_LABELS[VoterStatus.ACTIVE]}</option>
            <option value={VoterStatus.INACTIVE}>{VOTER_STATUS_LABELS[VoterStatus.INACTIVE]}</option>
            <option value={VoterStatus.NEEDS_REVIEW}>{VOTER_STATUS_LABELS[VoterStatus.NEEDS_REVIEW]}</option>
            <option value={VoterStatus.ARCHIVED}>{VOTER_STATUS_LABELS[VoterStatus.ARCHIVED]}</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            type="button"
            className="btn btn-ghost btn-sm text-xs text-muted hover:text-primary whitespace-nowrap"
          >
            ✕ Reset Filter
          </button>
        )}
      </div>

      <div className="text-xs text-secondary shrink-0 font-medium pl-1">
        Ditemukan: <span className="text-primary font-semibold">{totalResults}</span> pemilih
      </div>
    </div>
  );
}
