/**
 * VoterScope Demo — API Error Helpers
 *
 * Consistent error responses that never expose internal details.
 */

import { NextResponse } from "next/server";

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "RATE_LIMITED";

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHORIZED: "Anda harus login untuk mengakses halaman ini.",
  FORBIDDEN: "Anda tidak memiliki akses ke data tersebut.",
  NOT_FOUND: "Data yang diminta tidak ditemukan.",
  CONFLICT: "Data sudah ada atau terjadi konflik.",
  VALIDATION_ERROR: "Data yang dikirim tidak valid.",
  INTERNAL_ERROR: "Terjadi kesalahan pada server.",
  RATE_LIMITED: "Terlalu banyak permintaan. Coba lagi nanti.",
};

const STATUS_CODES: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  RATE_LIMITED: 429,
};

export function errorResponse(
  code: AppErrorCode,
  customMessage?: string
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message: customMessage ?? ERROR_MESSAGES[code],
      },
    },
    { status: STATUS_CODES[code] }
  );
}

export function successResponse<T>(
  data: T,
  status = 200,
  init?: ResponseInit
): NextResponse {
  return NextResponse.json(data, { status, ...init });
}
