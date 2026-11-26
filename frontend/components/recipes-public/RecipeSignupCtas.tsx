"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { trackEvent } from "@/lib/analytics";

const SIGN_UP_HREF = "/auth/signin/";

export type SignupCtaPlacement = "mid_recipe" | "end" | "index";

const COPY: Record<SignupCtaPlacement, { title: string; body: string; action: string }> = {
  mid_recipe: {
    title: "Track what's in your pantry",
    body: "Scan a barcode and see which recipes you can make. Keep a pantry list and a shopping list in one place.",
    action: "Create a free account",
  },
  end: {
    title: "Cook from what you already have",
    body: "Keep a pantry inventory, build a shopping list from what is running low, and get AI recipe ideas from your ingredients.",
    action: "Create a free account",
  },
  index: {
    title: "Track what's in your pantry",
    body: "Scan a barcode, keep a shopping list, and get AI recipe ideas from what you have. Create a free account.",
    action: "Create a free account",
  },
};

/**
 * Tasteful signup prompts for the public recipe library. Hidden once the visitor
 * is signed in. Shown only after the session status is known, so logged-in users
 * do not see a flash of the card.
 */
export function RecipeSignupCta({
  placement,
  recipeSlug,
}: {
  placement: SignupCtaPlacement;
  recipeSlug?: string;
}) {
  const { status } = useSession();
  if (status !== "unauthenticated") return null;
  const copy = COPY[placement];
  const isIndex = placement === "index";
  return (
    <aside
      data-testid={`recipe-signup-cta-${placement}`}
      className={
        isIndex
          ? "flex h-full flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5"
          : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 print:hidden"
      }
    >
      <div>
        <p className="font-serif-heading text-lg font-bold text-slate-900">{copy.title}</p>
        <p className="mt-1 text-sm text-slate-700">{copy.body}</p>
      </div>
      <Link
        href={SIGN_UP_HREF}
        onClick={() =>
          trackEvent("recipe_cta_click", {
            location: placement,
            ...(recipeSlug ? { recipe_slug: recipeSlug } : {}),
          })
        }
        className="mt-3 inline-block self-start rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
      >
        {copy.action}
      </Link>
    </aside>
  );
}

export { SIGN_UP_HREF };
