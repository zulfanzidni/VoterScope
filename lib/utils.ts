/**
 * VoterScope Demo — cn() utility
 * Merges Tailwind classes safely.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date as a localized string (Indonesian locale).
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formats a date and time.
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculates age from date of birth.
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Gets the age group label for dashboard charts.
 */
export function getAgeGroup(dateOfBirth: Date | string): string {
  const age = calculateAge(dateOfBirth);
  if (age < 18) return "<18";
  if (age <= 25) return "18–25";
  if (age <= 35) return "26–35";
  if (age <= 45) return "36–45";
  if (age <= 55) return "46–55";
  if (age <= 65) return "56–65";
  return "66+";
}

/**
 * Truncates a string to a max length with ellipsis.
 */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}
