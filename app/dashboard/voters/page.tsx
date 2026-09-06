/**
 * VoterScope Demo — Voters Page (Server Component)
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { VotersClient } from "./VotersClient";

export const metadata = {
  title: "Data Pemilih — VoterScope Demo",
  description: "Manajemen data pemilih dengan otorisasi berbasis hierarki wilayah administratif.",
};

export default async function VotersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return <VotersClient user={user} />;
}
