import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInForm } from "@/components/auth/SignInForm";
import { isGoogleAuthConfigured } from "@/lib/auth-providers";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { BRAND_NAME } from "@/lib/site-content";

export const metadata = {
  title: `Sign In — ${BRAND_NAME}`,
  description: `Sign in to ${BRAND_NAME} with Google`,
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard/");
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--marketing-bg)] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-100 p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex justify-center mb-6">
            <BrandMark />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to {BRAND_NAME}</h1>
          <p className="text-slate-500 mt-2 text-sm">Sign in to manage your pantry</p>
          <p className="text-slate-500 mt-1 text-sm">Free to start — no credit card required.</p>
        </div>
        <SignInForm googleEnabled={isGoogleAuthConfigured()} />
        <p className="text-center text-xs text-slate-500 mt-6">
          <Link href="/" className="hover:text-slate-800 underline-offset-2 hover:underline">
            Back to home
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy/" className="hover:text-slate-800 underline-offset-2 hover:underline">
            Privacy
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/terms/" className="hover:text-slate-800 underline-offset-2 hover:underline">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}