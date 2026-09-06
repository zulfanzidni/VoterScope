/**
 * VoterScope Demo — Authorization Utilities
 *
 * Central authorization logic. ALL protected endpoints must use these functions.
 * The frontend is NEVER the final authority — server-side checks are mandatory.
 *
 * This application is a portfolio/demo system using synthetic data.
 */

import type { SessionUser, UserScope } from "@/lib/types";
import { UserRole, getRoleLevel } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the administrative scope for a given user based on their role.
 * Returns the scope level and associated IDs.
 */
export function getUserScope(user: SessionUser): UserScope {
  switch (user.role) {
    case UserRole.SUPER_ADMIN:
      return { level: "NATIONAL" };

    case UserRole.PROVINCE_ADMIN:
      return {
        level: "PROVINCE",
        provinceId: user.provinceId ?? undefined,
      };

    case UserRole.KABUPATEN_ADMIN:
      return {
        level: "KABUPATEN",
        provinceId: user.provinceId ?? undefined,
        kabupatenId: user.kabupatenId ?? undefined,
      };

    case UserRole.KECAMATAN_ADMIN:
      return {
        level: "KECAMATAN",
        provinceId: user.provinceId ?? undefined,
        kabupatenId: user.kabupatenId ?? undefined,
        kecamatanId: user.kecamatanId ?? undefined,
      };

    case UserRole.KELURAHAN_OPERATOR:
      return {
        level: "KELURAHAN",
        provinceId: user.provinceId ?? undefined,
        kabupatenId: user.kabupatenId ?? undefined,
        kecamatanId: user.kecamatanId ?? undefined,
        kelurahanId: user.kelurahanId ?? undefined,
      };

    case UserRole.AUDITOR:
      // Auditor sees aggregate data at their assigned scope (or national if unscoped)
      if (user.kelurahanId)
        return { level: "KELURAHAN", kelurahanId: user.kelurahanId };
      if (user.kecamatanId)
        return { level: "KECAMATAN", kecamatanId: user.kecamatanId };
      if (user.kabupatenId)
        return { level: "KABUPATEN", kabupatenId: user.kabupatenId };
      if (user.provinceId)
        return { level: "PROVINCE", provinceId: user.provinceId };
      return { level: "NATIONAL" };

    default:
      return { level: "KELURAHAN" }; // Least privilege fallback
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VOTER FILTER BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Prisma WHERE filter to restrict voter queries to the user's scope.
 * Every voter query MUST use this filter.
 */
export function buildAuthorizedVoterFilter(user: SessionUser): Record<string, string | undefined> {
  const scope = getUserScope(user);

  switch (scope.level) {
    case "NATIONAL":
      return {}; // No restriction — sees all

    case "PROVINCE":
      return { provinceId: scope.provinceId };

    case "KABUPATEN":
      return { kabupatenId: scope.kabupatenId };

    case "KECAMATAN":
      return { kecamatanId: scope.kecamatanId };

    case "KELURAHAN":
      return { kelurahanId: scope.kelurahanId };

    default:
      // Fallback: deny all by using an impossible condition
      return { kelurahanId: "__DENIED__" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE ACCESS CHECK
// ─────────────────────────────────────────────────────────────────────────────

type VoterResource = {
  provinceId: string;
  kabupatenId: string;
  kecamatanId: string;
  kelurahanId: string;
};

/**
 * Checks whether a user can access a specific voter resource.
 * IDOR prevention: the server validates scope on every voter access.
 */
export function canAccessVoter(
  user: SessionUser,
  voter: VoterResource
): boolean {
  const scope = getUserScope(user);

  switch (scope.level) {
    case "NATIONAL":
      return true;
    case "PROVINCE":
      return voter.provinceId === scope.provinceId;
    case "KABUPATEN":
      return voter.kabupatenId === scope.kabupatenId;
    case "KECAMATAN":
      return voter.kecamatanId === scope.kecamatanId;
    case "KELURAHAN":
      return voter.kelurahanId === scope.kelurahanId;
    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export type VoterAction =
  | "create"
  | "read"
  | "update"
  | "archive"
  | "nik_lookup";

/**
 * Returns whether a user is permitted to perform an action on voters.
 * Auditors are read-only. KELURAHAN_OPERATOR can create/update/archive within scope.
 */
export function canPerformVoterAction(
  user: SessionUser,
  action: VoterAction
): boolean {
  const role = user.role as UserRole;

  if (role === UserRole.AUDITOR) {
    return action === "read";
  }

  switch (action) {
    case "read":
      return true; // All non-auditor roles can read within scope

    case "create":
    case "update":
    case "archive":
      return ([
        UserRole.SUPER_ADMIN,
        UserRole.PROVINCE_ADMIN,
        UserRole.KABUPATEN_ADMIN,
        UserRole.KECAMATAN_ADMIN,
        UserRole.KELURAHAN_OPERATOR,
      ] as UserRole[]).includes(role);

    case "nik_lookup":
      return ([
        UserRole.SUPER_ADMIN,
        UserRole.PROVINCE_ADMIN,
        UserRole.KABUPATEN_ADMIN,
        UserRole.KECAMATAN_ADMIN,
        UserRole.KELURAHAN_OPERATOR,
      ] as UserRole[]).includes(role);

    default:
      return false;
  }
}

export type UserAction = "create" | "read" | "update" | "deactivate";

/**
 * Returns whether a user is permitted to manage other users.
 */
export function canPerformUserAction(
  actor: SessionUser,
  action: UserAction,
  targetRole?: UserRole
): boolean {
  const actorRole = actor.role as UserRole;

  if (actorRole === UserRole.AUDITOR) return false;

  // Only SUPER_ADMIN and higher-level admins can manage users
  if (!isRoleAtLeast(actorRole, UserRole.KECAMATAN_ADMIN)) return false;

  // Role escalation check: cannot assign a role higher than your own
  if (
    action === "create" &&
    targetRole &&
    getRoleLevel(targetRole) >= getRoleLevel(actorRole)
  ) {
    return false;
  }

  return true;
}

/**
 * Role-level comparison helper.
 */
export function isRoleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return getRoleLevel(role) >= getRoleLevel(minimum);
}

/**
 * Checks whether a user can access the audit log.
 */
export function canAccessAuditLog(user: SessionUser): boolean {
  return ([UserRole.SUPER_ADMIN, UserRole.AUDITOR] as UserRole[]).includes(
    user.role as UserRole
  );
}

/**
 * Normalizes territory fields according to the user's role hierarchy:
 * - SUPER_ADMIN / AUDITOR: All territory fields must be null
 * - PROVINCE_ADMIN: Only provinceId is preserved; others set to null
 * - KABUPATEN_ADMIN: provinceId and kabupatenId are preserved; others set to null
 * - KECAMATAN_ADMIN: provinceId, kabupatenId, and kecamatanId preserved; kelurahanId set to null
 * - KELURAHAN_OPERATOR: All 4 territory levels preserved
 */
export function normalizeUserTerritoryByRole(
  role: UserRole | string,
  territory: {
    provinceId?: string | null;
    kabupatenId?: string | null;
    kecamatanId?: string | null;
    kelurahanId?: string | null;
  }
): {
  provinceId: string | null;
  kabupatenId: string | null;
  kecamatanId: string | null;
  kelurahanId: string | null;
} {
  const pId = territory.provinceId?.trim() || null;
  const kbId = territory.kabupatenId?.trim() || null;
  const kcId = territory.kecamatanId?.trim() || null;
  const klId = territory.kelurahanId?.trim() || null;

  switch (role) {
    case UserRole.SUPER_ADMIN:
    case UserRole.AUDITOR:
      return {
        provinceId: null,
        kabupatenId: null,
        kecamatanId: null,
        kelurahanId: null,
      };

    case UserRole.PROVINCE_ADMIN:
      return {
        provinceId: pId,
        kabupatenId: null,
        kecamatanId: null,
        kelurahanId: null,
      };

    case UserRole.KABUPATEN_ADMIN:
      return {
        provinceId: pId,
        kabupatenId: kbId,
        kecamatanId: null,
        kelurahanId: null,
      };

    case UserRole.KECAMATAN_ADMIN:
      return {
        provinceId: pId,
        kabupatenId: kbId,
        kecamatanId: kcId,
        kelurahanId: null,
      };

    case UserRole.KELURAHAN_OPERATOR:
      return {
        provinceId: pId,
        kabupatenId: kbId,
        kecamatanId: kcId,
        kelurahanId: klId,
      };

    default:
      return {
        provinceId: pId,
        kabupatenId: kbId,
        kecamatanId: kcId,
        kelurahanId: klId,
      };
  }
}
