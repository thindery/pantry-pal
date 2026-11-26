"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { DashboardNavbar } from "@/components/dashboard/navbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

/** Public page chrome for /recipes. No AdSense and no sign-in wall.
 *  Signed-out visitors get the marketing header. Signed-in visitors get the
 *  app nav (same dashboard header and mobile bottom tabs) plus a way back
 *  to My recipes. Session is resolved on the client so the pages stay SSG.
 */
export function RecipePageShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  return (
    <div
      className={
        signedIn
          ? "min-h-screen flex flex-col pb-20 md:pb-0 md:pt-16 print:[&_footer]:hidden print:[&_nav]:hidden print:pb-0 print:pt-0"
          : "marketing-page min-h-screen flex flex-col print:[&_footer]:hidden print:[&_nav]:hidden"
      }
    >
      {signedIn ? <DashboardNavbar /> : <MarketingNav />}
      {signedIn ? (
        <div
          className="border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6 lg:px-8 print:hidden"
          data-testid="recipe-back-to-mine"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 py-2">
            <Link
              href="/dashboard/recipes/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to my recipes
            </Link>
            <span className="text-sm text-[var(--muted)]">Recipe library</span>
          </div>
        </div>
      ) : null}
      <main className="flex-1 pb-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}
