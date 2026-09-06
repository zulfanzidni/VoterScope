/**
 * VoterScope Demo — User Profile & Account Settings Page (Server Component)
 *
 * Provides self-service profile updates and secure password changes.
 * Accessible by all authenticated users regardless of role.
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ProfileClient } from "./ProfileClient";

export const metadata = {
  title: "Profil & Pengaturan Akun — VoterScope Demo",
  description: "Pengaturan akun pengguna dan pembaruan kata sandi berstandar Argon2id.",
};

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      province: { select: { id: true, name: true, code: true } },
      kabupaten: { select: { id: true, name: true, code: true } },
      kecamatan: { select: { id: true, name: true, code: true } },
      kelurahan: { select: { id: true, name: true, code: true } },
    },
  });

  if (!profile) {
    redirect("/login");
  }

  const initialProfile = {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };

  return <ProfileClient initialUser={user} initialProfile={initialProfile} />;
}
