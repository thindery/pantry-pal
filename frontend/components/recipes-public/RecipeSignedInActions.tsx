"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Loader2 } from "lucide-react";
import type { Recipe as PublicRecipe } from "@/content/recipes/types";
import { ApiError } from "@/lib/api-error";
import { FREE_MAX_SAVED_RECIPES } from "@/lib/recipe-constants";
import {
  calculatePublicRecipeCoverage,
  isSavedPublicRecipe,
  pantryMatchLabel,
  publicRecipeIngredients,
  publicRecipeSourceUrl,
} from "@/lib/public-recipe-coverage";
import { SITE_URL } from "@/lib/site-content";
import { getItems } from "@/services/apiService";
import { createRecipe, getRecipes } from "@/services/recipeService";
import type { RecipeCoverage } from "@/types";

/**
 * Client-only pantry match and "Save to my recipes" for signed-in visitors
 * on a public recipe page. Renders nothing until the session is authenticated
 * so signed-out SSG HTML is unchanged.
 */
export function RecipeSignedInActions({ recipe }: { recipe: PublicRecipe }) {
  const { status } = useSession();
  const [coverage, setCoverage] = useState<RecipeCoverage | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void (async () => {
      try {
        const [inventory, saved] = await Promise.all([getItems(), getRecipes()]);
        if (cancelled) return;
        setCoverage(calculatePublicRecipeCoverage(recipe, inventory));
        const match = saved.find((r) => isSavedPublicRecipe(r.sourceUrl, recipe.slug));
        if (match) setSavedId(match.id);
      } catch {
        if (!cancelled) setCoverage(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, recipe]);

  if (status !== "authenticated") return null;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createRecipe({
        title: recipe.title,
        sourceUrl: publicRecipeSourceUrl(recipe.slug, SITE_URL),
        imageUrl: recipe.image || null,
        servings: String(recipe.servings),
        ingredients: publicRecipeIngredients(recipe),
        instructions: recipe.steps,
      });
      setSavedId(created.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSaveError(
          `Free accounts can save ${FREE_MAX_SAVED_RECIPES} recipes. Upgrade to Pro for unlimited saved recipes.`,
        );
      } else {
        setSaveError(err instanceof Error ? err.message : "Couldn't save that recipe. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="recipe-signed-in-actions"
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden"
    >
      <div>
        {coverage ? (
          <p className="font-medium text-slate-900" data-testid="recipe-pantry-match">
            {pantryMatchLabel(coverage)}
          </p>
        ) : ready ? (
          <p className="text-sm text-slate-700">We couldn't check your pantry just now.</p>
        ) : (
          <p className="text-sm text-slate-600">Checking your pantry…</p>
        )}
        {coverage ? (
          <p className="mt-0.5 text-sm text-slate-600">
            {coverage.missingCount === 0
              ? "You have everything this recipe needs."
              : `${coverage.missingCount} to pick up.`}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        {savedId ? (
          <Link
            href={`/dashboard/recipes/${savedId}/`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            data-testid="recipe-open-saved"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Open in my recipes
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
            data-testid="recipe-save-to-mine"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {saving ? "Saving…" : "Save to my recipes"}
          </button>
        )}
        {saveError ? (
          <p className="mt-2 max-w-xs text-sm text-rose-700" role="alert">
            {saveError}{" "}
            {saveError.includes("Upgrade") ? (
              <Link href="/pricing/" className="underline">
                Upgrade to Pro
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
