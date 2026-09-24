/**
 * VoterScope Demo — User management loading UI
 */

import { LoadingAnnouncement, TableSkeleton } from "@/components/dashboard/DashboardSkeletons";

export default function UsersLoading() {
  return (
    <div>
      <LoadingAnnouncement label="Memuat data pengguna…" />
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
