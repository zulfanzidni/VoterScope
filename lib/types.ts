/**
 * VoterScope Demo — Shared Types & Enums
 *
 * This application is a portfolio/demo system using synthetic data only.
 * NOT for production use with real voter personal data.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────────────────────

export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PROVINCE_ADMIN: "PROVINCE_ADMIN",
  KABUPATEN_ADMIN: "KABUPATEN_ADMIN",
  KECAMATAN_ADMIN: "KECAMATAN_ADMIN",
  KELURAHAN_OPERATOR: "KELURAHAN_OPERATOR",
  AUDITOR: "AUDITOR",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  PROVINCE_ADMIN: "Admin Provinsi",
  KABUPATEN_ADMIN: "Admin Kabupaten",
  KECAMATAN_ADMIN: "Admin Kecamatan",
  KELURAHAN_OPERATOR: "Operator Kelurahan",
  AUDITOR: "Auditor",
};

/** Role hierarchy — higher index = higher authority */
export const ROLE_HIERARCHY: UserRole[] = [
  UserRole.AUDITOR,
  UserRole.KELURAHAN_OPERATOR,
  UserRole.KECAMATAN_ADMIN,
  UserRole.KABUPATEN_ADMIN,
  UserRole.PROVINCE_ADMIN,
  UserRole.SUPER_ADMIN,
];

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

export function isRoleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return getRoleLevel(role) >= getRoleLevel(minimum);
}

// ─────────────────────────────────────────────────────────────────────────────
// VOTER ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const Gender = {
  LAKI_LAKI: "LAKI_LAKI",
  PEREMPUAN: "PEREMPUAN",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const GENDER_LABELS: Record<Gender, string> = {
  LAKI_LAKI: "Laki-laki",
  PEREMPUAN: "Perempuan",
};

export const Religion = {
  ISLAM: "ISLAM",
  KRISTEN: "KRISTEN",
  KATHOLIK: "KATHOLIK",
  HINDU: "HINDU",
  BUDDHA: "BUDDHA",
  KONGHUCU: "KONGHUCU",
} as const;
export type Religion = (typeof Religion)[keyof typeof Religion];

export const RELIGION_LABELS: Record<Religion, string> = {
  ISLAM: "Islam",
  KRISTEN: "Kristen",
  KATHOLIK: "Katholik",
  HINDU: "Hindu",
  BUDDHA: "Buddha",
  KONGHUCU: "Konghucu",
};

export const MaritalStatus = {
  BELUM_KAWIN: "BELUM_KAWIN",
  KAWIN: "KAWIN",
  CERAI_HIDUP: "CERAI_HIDUP",
  CERAI_MATI: "CERAI_MATI",
} as const;
export type MaritalStatus = (typeof MaritalStatus)[keyof typeof MaritalStatus];

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  BELUM_KAWIN: "Belum Kawin",
  KAWIN: "Kawin",
  CERAI_HIDUP: "Cerai Hidup",
  CERAI_MATI: "Cerai Mati",
};

export const VoterStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  ARCHIVED: "ARCHIVED",
} as const;
export type VoterStatus = (typeof VoterStatus)[keyof typeof VoterStatus];

export const VOTER_STATUS_LABELS: Record<VoterStatus, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Tidak Aktif",
  NEEDS_REVIEW: "Perlu Ditinjau",
  ARCHIVED: "Diarsipkan",
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const AuditAction = {
  // Auth
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  LOGIN_FAILED: "LOGIN_FAILED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  // Voter operations
  VOTER_CREATE: "VOTER_CREATE",
  VOTER_UPDATE: "VOTER_UPDATE",
  VOTER_ARCHIVE: "VOTER_ARCHIVE",
  VOTER_VIEW: "VOTER_VIEW",
  VOTER_VIEW_DETAIL: "VOTER_VIEW_DETAIL",
  VOTER_NIK_LOOKUP: "VOTER_NIK_LOOKUP",
  // User operations
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DEACTIVATE: "USER_DEACTIVATE",
  USER_ACTIVATE: "USER_ACTIVATE",
  // Authorization
  ACCESS_DENIED: "ACCESS_DENIED",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AuditResourceType = {
  AUTH: "AUTH",
  VOTER: "VOTER",
  USER: "USER",
  SYSTEM: "SYSTEM",
} as const;
export type AuditResourceType =
  (typeof AuditResourceType)[keyof typeof AuditResourceType];

export const AuditResult = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
} as const;
export type AuditResult = (typeof AuditResult)[keyof typeof AuditResult];

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type UserScope = {
  level: "NATIONAL" | "PROVINCE" | "KABUPATEN" | "KECAMATAN" | "KELURAHAN";
  provinceId?: string;
  kabupatenId?: string;
  kecamatanId?: string;
  kelurahanId?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// SESSION USER TYPE
// ─────────────────────────────────────────────────────────────────────────────

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  provinceId?: string | null;
  kabupatenId?: string | null;
  kecamatanId?: string | null;
  kelurahanId?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
