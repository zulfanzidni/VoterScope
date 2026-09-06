/**
 * VoterScope Demo — Dashboard Layout
 * Server component — reads session and provides app shell.
 * ALL DATA IS SYNTHETIC DEMO DATA.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { DashboardShell } from "./DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard — VoterScope Demo",
  description: "Dashboard administratif VoterScope Demo",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
