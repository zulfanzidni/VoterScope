"use client";

/**
 * VoterScope Demo — ThemeToggle Component
 *
 * Toggles between Catppuccin Mocha (Dark) and Catppuccin Latte (Light) themes.
 * Persists user preference in localStorage and synchronizes with documentElement.
 */

import { useSyncExternalStore } from "react";

function subscribeTheme(callback: () => void) {
  window.addEventListener("voterscope-theme-change", callback);
  return () => window.removeEventListener("voterscope-theme-change", callback);
}

function getThemeSnapshot(): "mocha" | "latte" {
  if (typeof document === "undefined") return "mocha";
  return (document.documentElement.getAttribute("data-theme") as "mocha" | "latte") || "mocha";
}

function getServerThemeSnapshot(): "mocha" | "latte" {
  return "mocha";
}

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle({ className = "", showLabel = false }: { className?: string; showLabel?: boolean }) {
  const isMounted = useIsMounted();
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  const toggleTheme = () => {
    const nextTheme = theme === "mocha" ? "latte" : "mocha";
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("voterscope-theme", nextTheme);
    } catch {
      // Ignore localStorage errors in private browsing
    }
    window.dispatchEvent(new CustomEvent("voterscope-theme-change", { detail: nextTheme }));
  };

  if (!isMounted) {
    return (
      <button
        type="button"
        disabled
        className={`p-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] opacity-50 ${className}`}
        aria-label="Theme toggle loading"
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  const isLight = theme === "latte";

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={toggleTheme}
      title={isLight ? "Beralih ke Catppuccin Mocha (Dark)" : "Beralih ke Catppuccin Latte (Light)"}
      aria-label={isLight ? "Beralih ke mode gelap" : "Beralih ke mode terang"}
      className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs font-medium ${className}`}
    >
      {isLight ? (
        // Sun Icon for Latte (click to turn Dark/Mocha)
        <svg
          width="15"
          height="15"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          className="text-amber-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // Moon Icon for Mocha (click to turn Light/Latte)
        <svg
          width="15"
          height="15"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          className="text-blue-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}

      {showLabel && (
        <span className="hidden sm:inline font-normal text-[11px]">
          {isLight ? "Latte (Light)" : "Mocha (Dark)"}
        </span>
      )}
    </button>
  );
}
