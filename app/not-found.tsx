import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] px-4">
      <div className="text-center animate-fade-in max-w-md">
        <div
          className="text-8xl font-bold mb-4 gradient-text"
          aria-hidden="true"
        >
          404
        </div>
        <h1 className="text-2xl font-semibold mb-2 text-[var(--text-primary)]">Halaman Tidak Ditemukan</h1>
        <p className="mb-8 text-[var(--text-secondary)]">
          Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
        </p>
        <Link
          href="/dashboard"
          className="btn btn-primary px-6 py-2.5 inline-flex items-center gap-2"
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
