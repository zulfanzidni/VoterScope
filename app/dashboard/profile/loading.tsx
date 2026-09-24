/**
 * VoterScope Demo — Profile loading UI
 */

import { LoadingAnnouncement, PanelSkeleton } from "@/components/dashboard/DashboardSkeletons";

export default function ProfileLoading() {
  return (
    <div>
      <LoadingAnnouncement label="Memuat profil…" />
      <PanelSkeleton />
    </div>
  );
}
