/**
 * VoterScope Demo — Voters list loading UI
 *
 * The list itself is fetched client-side by VotersClient, but the route still
 * awaits the session before it can render, so this covers that gap and gives the
 * navigation an immediate response.
 */

import { LoadingAnnouncement, TableSkeleton } from "@/components/dashboard/DashboardSkeletons";

export default function VotersLoading() {
  return (
    <div>
      <LoadingAnnouncement label="Memuat data pemilih…" />
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
