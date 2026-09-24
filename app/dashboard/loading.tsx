/**
 * VoterScope Demo — Dashboard loading UI
 *
 * Rendered by Next while the dashboard route's server component resolves. The
 * aggregate query set takes ~180–690 ms against the live database, and before
 * this file existed the user saw a blank content area for that whole window.
 *
 * This is the dashboard home page, so the placeholder mirrors its actual layout:
 * header, four KPI cards, the chart area, then the two-column activity grid.
 */

import {
  LoadingAnnouncement,
  HeaderSkeleton,
  KpiGridSkeleton,
  ChartsSkeleton,
  ActivityGridSkeleton,
} from "@/components/dashboard/DashboardSkeletons";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <LoadingAnnouncement label="Memuat dashboard…" />
      <HeaderSkeleton />
      <KpiGridSkeleton />
      <ChartsSkeleton />
      <ActivityGridSkeleton />
    </div>
  );
}
