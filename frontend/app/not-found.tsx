import type { Metadata } from "next";
import Link from "next/link";

// PP-105: unknown routes are real 404s, never indexable.
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-slate-600">That page doesn&apos;t exist. Try the home page or pricing.</p>
      <div className="flex gap-4">
        <Link href="/" className="underline">Home</Link>
        <Link href="/pricing/" className="underline">Pricing</Link>
      </div>
    </main>
  );
}
