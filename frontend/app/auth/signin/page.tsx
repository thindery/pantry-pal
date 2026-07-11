import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInForm } from "@/components/auth/SignInForm";
import { isGoogleAuthConfigured } from "@/lib/auth-providers";
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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome to {BRAND_NAME}</h1>
          <p className="text-slate-500 mt-2 text-sm">Sign in to manage your pantry</p>
        </div>
        <SignInForm googleEnabled={isGoogleAuthConfigured()} />
      </div>
    </div>
  );
}