/**
 * VoterScope Demo — Dashboard loading skeletons
 *
 * Placeholder shapes shared by the route-level `loading.tsx` files and the
 * Suspense fallbacks inside app/dashboard/page.tsx. Kept in one module so the
 * placeholder geometry matches the real panels and the layout does not shift
 * when the content arrives.
 *
 * Marked `aria-hidden`: the blocks are decorative. Loading is announced to
 * assistive tech by `LoadingAnnouncement` instead, so a screen reader hears one
 * "Memuat…" rather than a wall of empty divs.
 *
 * ALL DATA IS SYNTHETIC DEMO DATA.
 */

export function LoadingAnnouncement({ label = "Memuat data…" }: { label?: string }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {label}
    </p>
  );
}

/** Primitive placeholder block. */
function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface/50 ${className}`} />;
}

/** The four KPI stat cards, matching the real grid's breakpoints. */
export function KpiGridSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Block className="h-3 w-24" />
              <Block className="h-8 w-8" />
            </div>
            <div className="mt-4 space-y-2">
              <Block className="h-7 w-20" />
              <Block className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Chart area. Mirrors DemographicChartsLoader's own skeleton so the two
 * placeholders are visually identical and the handoff is seamless.
 */
export function ChartsSkeleton() {
  return (
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
}

/** The two-column Quick Actions + Recent Activity grid. */
export function ActivityGridSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, col) => (
        <div key={col} className="card p-4 sm:p-5">
          <Block className="h-4 w-40 mb-4" />
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="flex items-center gap-3 p-3 rounded border border-border-subtle">
                <Block className="h-8 w-1 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Block className="h-3 w-32" />
                  <Block className="h-2.5 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Header block: the greeting and scope badge, which need no data query. */
export function HeaderSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div className="space-y-2">
        <Block className="h-6 w-56" />
        <Block className="h-3 w-72" />
      </div>
      <Block className="h-8 w-64" />
    </div>
  );
}

/** Table placeholder for the list routes (voters, audit, users). */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Block className="h-6 w-48" />
        <Block className="h-3 w-80" />
      </div>

      <div className="card p-3 sm:p-4">
        <Block className="h-9 w-full mb-4" />
        <div className="space-y-2">
          <div className="flex gap-3 pb-2 border-b border-border-subtle">
            {Array.from({ length: cols }).map((_, c) => (
              <Block key={c} className="h-3 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex gap-3 py-1.5">
              {Array.from({ length: cols }).map((_, c) => (
                <Block key={c} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Centred card placeholder, for routes that may render an access-denied panel. */
export function PanelSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Block className="h-6 w-48" />
        <Block className="h-3 w-80" />
      </div>
      <div className="card p-8 max-w-lg mx-auto space-y-4 my-12">
        <Block className="h-12 w-12 rounded-full mx-auto" />
        <Block className="h-5 w-40 mx-auto" />
        <Block className="h-3 w-64 mx-auto" />
      </div>
    </div>
  );
}
