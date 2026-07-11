import Link from "next/link";

export const metadata = {
  title: "Sign In Error — Pantry Hub",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-100 p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Sign in failed</h1>
        <p className="text-slate-500 mt-2 text-sm">
          {error ? `Error: ${error}` : "Something went wrong during sign in."}
        </p>
        <Link
          href="/auth/signin/"
          className="inline-block mt-6 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition"
        >
          Try again
        </Link>
      </div>
    </div>
  );
}