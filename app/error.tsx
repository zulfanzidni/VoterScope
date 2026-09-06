"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error]", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "hsl(222 47% 6%)",
        margin: 0,
        fontFamily: "sans-serif",
      }}
    >
      <div className="text-center p-8">
        <div
          className="text-6xl font-bold mb-4"
          style={{ color: "hsl(0 84% 60%)" }}
        >
          500
        </div>
        <h1
          className="text-xl font-semibold mb-2"
          style={{ color: "hsl(213 31% 91%)" }}
        >
          Terjadi Kesalahan
        </h1>
        <p className="mb-6" style={{ color: "hsl(215 20% 55%)" }}>
          Maaf, terjadi kesalahan pada server.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{ background: "hsl(210 100% 56%)", color: "white" }}
          >
            Coba Lagi
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "hsl(213 31% 91%)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}