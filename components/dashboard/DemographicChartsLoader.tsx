"use client";

/**
 * VoterScope Demo — DemographicCharts loader (client boundary)
 *
 * Recharts is ~380 KB raw (~120 KB gzip) and the charts sit below the fold.
 * Importing the chart module statically pulled it into the dashboard's initial
 * JS payload; this wrapper defers it with next/dynamic so the library is
 * fetched after first paint instead.
 *
 * This must be a Client Component: `ssr: false` is not allowed in a Server
 * Component (Next rejects it at build time), and the dashboard page is a
 * Server Component.
 *
 * ssr: false is required, not cosmetic: the charts read `document`/`window`
 * for theme detection and recharts' ResponsiveContainer measures the DOM.
 * Server-rendering them would throw or produce a wrong-size first paint.
 *
 * The loading placeholder mirrors the skeleton `DemographicCharts` itself
 * renders before mount, so the layout does not shift when the charts arrive.
 * Props are unchanged — this is a drop-in for the previous static import.
 */

import dynamic from "next/dynamic";
import type { DemographicSummary } from "@/lib/analytics";

type Props = {
  demographics: DemographicSummary;
  territoryDistribution: Array<{ name: string; count: number }>;
  scopeLevel: string;
};

const ChartsSkeleton = () => (
  <div className="space-y-6 my-6" aria-hidden="true">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <div className="card p-4 sm:p-6 h-72 animate-pulse bg-surface/50" />
      <div className="card p-4 sm:p-6 h-72 animate-pulse bg-surface/50" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="lg:col-span-2 card p-4 sm:p-6 h-72 animate-pulse bg-surface/50" />
      <div className="card p-4 sm:p-6 h-72 animate-pulse bg-surface/50" />
    </div>
  </div>
);

export const DemographicCharts = dynamic<Props>(
  () => import("@/components/dashboard/DemographicCharts").then((m) => m.DemographicCharts),
  { ssr: false, loading: ChartsSkeleton }
);
