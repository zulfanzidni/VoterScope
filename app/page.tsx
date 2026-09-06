import { redirect } from "next/navigation";

/**
 * Root page — redirect to login or dashboard based on session.
 * Session check is handled by middleware.
 */
export default function RootPage() {
  redirect("/login");
}
