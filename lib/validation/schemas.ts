/**
 * VoterScope Demo — Zod Validation Schemas
 *
 * Server-side validation for all inputs. This module is the single source of
 * truth: every route handler parses its request body through a schema here.
 *
 * It is deliberately NOT imported by client components. Doing so would ship zod
 * to the browser, so client forms mirror these rules with react-hook-form's
 * built-in validators instead (see app/login/LoginForm.tsx). Types are shared
 * via `import type`, which is erased at build time and carries no runtime cost.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(50, "Username maksimal 50 karakter")
    .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh mengandung huruf, angka, dan underscore"),
  password: z
    .string()
    .min(1, "Password tidak boleh kosong")
    .max(128, "Password terlalu panjang"),
});

// Lowercase aliases (used by route handlers and form hooks)
export const loginSchema = LoginSchema;

export type LoginInput = z.infer<typeof LoginSchema>;


// ─────────────────────────────────────────────────────────────────────────────
// VOTER
// ─────────────────────────────────────────────────────────────────────────────

// ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
const SYNTHETIC_NIK_REGEX = /^[0-9]{16}$/;

export const VoterCreateSchema = z.object({
  nik: z
    .string()
    .regex(SYNTHETIC_NIK_REGEX, "NIK harus terdiri dari 16 digit angka (data sintetis)"),
  fullName: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter")
    .regex(/^[a-zA-Z\s'.,-]+$/, "Nama hanya boleh mengandung huruf dan karakter umum"),
  placeOfBirth: z
    .string()
    .min(2, "Tempat lahir minimal 2 karakter")
    .max(100, "Tempat lahir maksimal 100 karakter"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD")
    .refine((d) => {
      const date = new Date(d);
      const now = new Date();
      const minDate = new Date("1900-01-01");
      return !isNaN(date.getTime()) && date < now && date > minDate;
    }, "Tanggal lahir tidak valid"),
  gender: z.enum(["LAKI_LAKI", "PEREMPUAN"]),
  address: z
    .string()
    .min(5, "Alamat minimal 5 karakter")
    .max(500, "Alamat maksimal 500 karakter"),
  religion: z.enum(["ISLAM", "KRISTEN", "KATHOLIK", "HINDU", "BUDDHA", "KONGHUCU"]),
  maritalStatus: z.enum(["BELUM_KAWIN", "KAWIN", "CERAI_HIDUP", "CERAI_MATI"]),
  occupation: z
    .string()
    .min(2, "Pekerjaan minimal 2 karakter")
    .max(100, "Pekerjaan maksimal 100 karakter"),
  citizenship: z.string().default("WNI"),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD")
    .optional()
    .nullable(),
  tps: z
    .string()
    .min(1, "TPS tidak boleh kosong")
    .max(20, "TPS maksimal 20 karakter")
    .regex(/^[a-zA-Z0-9\s/-]+$/, "Format TPS tidak valid"),
  provinceId: z.string().min(1, "ID Provinsi tidak valid"),
  kabupatenId: z.string().min(1, "ID Kabupaten tidak valid"),
  kecamatanId: z.string().min(1, "ID Kecamatan tidak valid"),
  kelurahanId: z.string().min(1, "ID Kelurahan tidak valid"),
  status: z
    .enum(["ACTIVE", "INACTIVE", "NEEDS_REVIEW", "ARCHIVED"])
    .default("ACTIVE"),
});

export type VoterCreateInput = z.infer<typeof VoterCreateSchema>;

export const VoterUpdateSchema = VoterCreateSchema.partial().omit({ nik: true });
export type VoterUpdateInput = z.infer<typeof VoterUpdateSchema>;

export const VoterLookupSchema = z.object({
  nik: z
    .string()
    .regex(SYNTHETIC_NIK_REGEX, "NIK harus terdiri dari 16 digit angka (data sintetis)"),
});
export type VoterLookupInput = z.infer<typeof VoterLookupSchema>;

export const VoterSearchSchema = z.object({
  q: z.string().max(100).optional(),
  gender: z.enum(["LAKI_LAKI", "PEREMPUAN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "NEEDS_REVIEW", "ARCHIVED"]).optional(),
  provinceId: z.string().min(1).optional(),
  kabupatenId: z.string().min(1).optional(),
  kecamatanId: z.string().min(1).optional(),
  kelurahanId: z.string().min(1).optional(),
  tps: z.string().max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["fullName", "dateOfBirth", "createdAt", "updatedAt", "status"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type VoterSearchInput = z.infer<typeof VoterSearchSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────────────────────

export const UserCreateSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email("Format email tidak valid"),
  fullName: z.string().min(2).max(100),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password harus mengandung huruf kecil, huruf besar, dan angka"
    ),
  role: z.enum([
    "SUPER_ADMIN",
    "PROVINCE_ADMIN",
    "KABUPATEN_ADMIN",
    "KECAMATAN_ADMIN",
    "KELURAHAN_OPERATOR",
    "AUDITOR",
  ]),
  provinceId: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().min(1).optional().nullable()
  ),
  kabupatenId: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().min(1).optional().nullable()
  ),
  kecamatanId: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().min(1).optional().nullable()
  ),
  kelurahanId: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().min(1).optional().nullable()
  ),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = UserCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG SEARCH
// ─────────────────────────────────────────────────────────────────────────────

export const AuditSearchSchema = z.object({
  action: z.string().optional(),
  userId: z.string().optional(),
  resourceType: z.string().optional(),
  result: z.enum(["SUCCESS", "FAILURE"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AuditSearchInput = z.infer<typeof AuditSearchSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE & PASSWORD CHANGE
// ─────────────────────────────────────────────────────────────────────────────

export const ProfileUpdateSchema = z.object({
  fullName: z.string().min(3, "Nama minimal 3 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Format email tidak valid"),
});
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi"),
    newPassword: z
      .string()
      .min(8, "Kata sandi baru minimal 8 karakter")
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/,
        "Kata sandi harus mengandung huruf kecil, huruf besar, angka, dan karakter khusus"
      ),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok dengan kata sandi baru",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

