"use client";

/**
 * VoterScope Demo — DemographicCharts Component
 *
 * Interactive data visualizations powered by Recharts.
 * - Donut chart: Gender distribution
 * - Vertical bar chart: Age cohorts (Gen Z, Milenial, Gen X, Lansia)
 * - Horizontal bar chart: Geographic distribution within scope
 * - Health metrics: Data quality & verification scores
 *
 * ALL VISUALIZATIONS REFLECT SYNTHETIC DEMO DATA.
 */

import { useSyncExternalStore } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DemographicSummary } from "@/lib/analytics";

type Props = {
  demographics: DemographicSummary;
  territoryDistribution: Array<{ name: string; count: number }>;
  scopeLevel: string;
};

const MOCHA_GENDER = ["#89b4fa", "#94e2d5"]; // Mocha Blue & Teal
const LATTE_GENDER = ["#1e66f5", "#179299"]; // Latte Blue & Teal

const MOCHA_AGE = ["#89b4fa", "#74c7ec", "#94e2d5", "#fab387"]; // Mocha Blue, Sapphire, Teal, Peach
const LATTE_AGE = ["#1e66f5", "#209fb5", "#179299", "#fe640b"]; // Latte Blue, Sapphire, Teal, Peach

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("voterscope-theme-change", callback);
  return () => window.removeEventListener("voterscope-theme-change", callback);
}

function getThemeSnapshot(): "mocha" | "latte" {
  if (typeof document === "undefined") return "mocha";
  return (document.documentElement.getAttribute("data-theme") as "mocha" | "latte") || "mocha";
}

function getServerThemeSnapshot(): "mocha" | "latte" {
  return "mocha";
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  payload?: Record<string, unknown>;
}

// Custom dark tooltip for charts
function CustomChartTooltip({
  active,
  payload,
  unit = "pemilih",
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  unit?: string;
}) {
  if (active && payload && payload.length) {
    const data = payload[0];
    if (!data) return null;
    return (
      <div className="card-elevated p-2.5 text-xs shadow-lg border border-border-strong text-primary">
        <p className="font-medium text-secondary">{data.name}</p>
        <p className="font-semibold text-primary text-sm mt-0.5 font-mono tabular-nums">
          {data.value?.toLocaleString("id-ID")} <span className="text-xs font-normal text-muted">{unit}</span>
        </p>
      </div>
    );
  }
  return null;
}

export function DemographicCharts({ demographics, territoryDistribution, scopeLevel }: Props) {
  const isMounted = useIsMounted();
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  const GENDER_COLORS = theme === "latte" ? LATTE_GENDER : MOCHA_GENDER;
  const AGE_COLORS = theme === "latte" ? LATTE_AGE : MOCHA_AGE;
  const TERRITORY_BAR_COLOR = theme === "latte" ? "#1e66f5" : "#89b4fa";

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        <div className="card p-6 h-72 animate-pulse bg-surface/50" />
        <div className="card p-6 h-72 animate-pulse bg-surface/50" />
      </div>
    );
  }

  const genderData = [
    { name: "Laki-laki", value: demographics.gender.male },
    { name: "Perempuan", value: demographics.gender.female },
  ];

  const ageData = demographics.ageGroups.map((ag) => ({
    name: ag.group,
    label: ag.label,
    count: ag.count,
    percent: ag.percent,
  }));

  const territoryTitle =
    scopeLevel === "NATIONAL" || scopeLevel === "PROVINCE"
      ? "Sebaran per Kabupaten / Kota"
      : scopeLevel === "KABUPATEN"
      ? "Sebaran per Kecamatan"
      : scopeLevel === "KECAMATAN"
      ? "Sebaran per Kelurahan"
      : "Sebaran per TPS";

  return (
    <div className="space-y-6 my-6">
      {/* 2-Column Grid: Gender Donut & Age Cohorts Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Gender Distribution (Donut) */}
        <div className="card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div>
              <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                Komposisi Gender Pemilih
              </h3>
              <p className="text-xs text-muted mt-0.5">Rasio Laki-laki vs Perempuan terdaftar</p>
            </div>
            <span className="badge badge-blue text-[10px]">Demografi</span>
          </div>

          <div className="h-60 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {genderData.map((_, index) => (
                    <Cell key={`gender-cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Total Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-muted">Total</span>
              <span className="text-lg font-bold text-primary">{demographics.total.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Legend Details */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-subtle text-xs">
            <div className="flex items-center gap-2 p-2 rounded bg-surface/50 border border-border-subtle">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: GENDER_COLORS[0] }}></span>
              <div>
                <span className="text-secondary block text-[11px]">Laki-laki</span>
                <span className="font-semibold text-primary font-mono tabular-nums">
                  {demographics.gender.male.toLocaleString("id-ID")}{" "}
                  <span className="text-muted text-[11px] font-normal">({demographics.gender.malePercent}%)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded bg-surface/50 border border-border-subtle">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: GENDER_COLORS[1] }}></span>
              <div>
                <span className="text-secondary block text-[11px]">Perempuan</span>
                <span className="font-semibold text-primary font-mono tabular-nums">
                  {demographics.gender.female.toLocaleString("id-ID")}{" "}
                  <span className="text-muted text-[11px] font-normal">({demographics.gender.femalePercent}%)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Age Cohorts (Bar Chart) */}
        <div className="card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div>
              <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Segmentasi Kelompok Usia
              </h3>
              <p className="text-xs text-muted mt-0.5">Distribusi pemilih berdasarkan kohort usia</p>
            </div>
            <span className="badge badge-slate text-[10px]">Generasi</span>
          </div>

          <div className="h-60 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="count" name="Jumlah Pemilih" radius={[4, 4, 0, 0]}>
                  {ageData.map((_, index) => (
                    <Cell key={`age-cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Age Cohorts breakdown chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-border-subtle text-[11px]">
            {demographics.ageGroups.map((group) => (
              <div key={group.group} className="p-1.5 rounded bg-surface/50 border border-border-subtle text-center">
                <span className="text-muted block text-[10px] truncate">{group.label.split("(")[0]}</span>
                <span className="font-semibold text-primary font-mono tabular-nums">
                  {group.count}{" "}
                  <span className="text-muted font-normal text-[10px]">({group.percent}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Territory Distribution & Data Quality Integrity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Geographic Distribution (Horizontal Bar Chart) - 2 cols */}
        <div className="lg:col-span-2 card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div>
              <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {territoryTitle}
              </h3>
              <p className="text-xs text-muted mt-0.5">Distribusi konsentrasi pemilih dalam cakupan yurisdiksi</p>
            </div>
            <span className="badge badge-slate text-[10px]">Wilayah</span>
          </div>

          <div className="h-64 w-full my-2">
            {territoryDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted">
                Tidak ada data wilayah untuk ditampilkan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={territoryDistribution}
                  layout="vertical"
                  margin={{ top: 10, right: 25, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--text-secondary)"
                    fontSize={11}
                    width={110}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Jumlah Pemilih"
                    fill={TERRITORY_BAR_COLOR}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[11px] text-muted pt-2 border-t border-border-subtle">
            Data disaring otomatis secara hierarkis di tingkat server.
          </div>
        </div>

        {/* 4. Data Quality & Integrity Scorecard - 1 col */}
        <div className="card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div>
              <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Integritas & Kualitas Data
              </h3>
              <p className="text-xs text-muted mt-0.5">Kesiapan data administratif</p>
            </div>
            <span className="badge badge-slate text-[10px]">Audit QC</span>
          </div>

          <div className="space-y-4 my-3 text-xs">
            {/* Metric 1: Completeness */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-secondary font-medium">Kelengkapan Atribut</span>
                <span className="font-semibold text-emerald-400 font-mono tabular-nums">{demographics.dataQuality.completenessScore}%</span>
              </div>
              <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden border border-border-subtle">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${demographics.dataQuality.completenessScore}%` }}
                />
              </div>
              <span className="text-[10px] text-muted mt-0.5 block">Nama, NIK, TTL, dan Alamat terisi</span>
            </div>

            {/* Metric 2: Active Rate */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-secondary font-medium">Status Pemilih Aktif</span>
                <span className="font-semibold text-blue-400 font-mono tabular-nums">{demographics.dataQuality.activeRate}%</span>
              </div>
              <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden border border-border-subtle">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${demographics.dataQuality.activeRate}%` }}
                />
              </div>
              <span className="text-[10px] text-muted mt-0.5 block">Memenuhi syarat aktif reguler</span>
            </div>

            {/* Metric 3: Needs Review */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-secondary font-medium">Perlu Ditinjau</span>
                <span className="font-semibold text-amber-400 font-mono tabular-nums">{demographics.dataQuality.needsReviewRate}%</span>
              </div>
              <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden border border-border-subtle">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${demographics.dataQuality.needsReviewRate}%` }}
                />
              </div>
              <span className="text-[10px] text-muted mt-0.5 block">Membutuhkan verifikasi operator</span>
            </div>
          </div>

          <div className="p-2.5 rounded border border-border-subtle bg-surface/50 text-[11px] text-secondary flex items-start gap-2">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-blue-400 shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <strong className="text-primary font-medium">Keamanan Kriptografi:</strong> 100% NIK terenkripsi AES-256-GCM dengan indeks pencarian HMAC-SHA256.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
