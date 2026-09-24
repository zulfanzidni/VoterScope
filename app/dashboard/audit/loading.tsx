/**
 * VoterScope Demo — Audit log loading UI
 */

import { LoadingAnnouncement, TableSkeleton } from "@/components/dashboard/DashboardSkeletons";

export default function AuditLoading() {
  return (
    <div>
      <LoadingAnnouncement label="Memuat log audit…" />
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
