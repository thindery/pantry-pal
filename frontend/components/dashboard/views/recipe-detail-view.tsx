"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock,
  ExternalLink,
  HelpCircle,
  Loader2,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Recipe } from "@/types";
import { usePantry } from "@/contexts/pantry-provider";
import { calculateRecipeCoverage } from "@/lib/recipe-coverage";
import { buildMissingRecipeShoppingItems } from "@/lib/recipe-shopping-list";
import { deleteRecipe, getRecipe } from "@/services/recipeService";

export function RecipeDetailView({ params }: { params?: Promise<{ id: string }> }) {
  const router = useRouter();
  const routeParams = useParams();
  const [recipeId, setRecipeId] = useState<string>("");

  useEffect(() => {
    if (params) {
      params.then((p) => {
        if (p?.id) setRecipeId(p.id);
      });
    } else if (routeParams?.id) {
      setRecipeId(routeParams.id as string);
    }
  }, [params, routeParams]);

  const { inventory, shoppingList, addBatchShoppingItems } = usePantry();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!recipeId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    getRecipe(recipeId)
      .then((data) => {
        if (mounted) setRecipe(data);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load recipe");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [recipeId]);

  const handleDelete = async () => {
    if (!recipe) return;
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    try {
      await deleteRecipe(recipe.id);
      router.push("/dashboard/recipes/");
    } catch (err) {
      alert("Failed to delete recipe");
    }
  };

  const handleAddMissingToShoppingList = () => {
    if (!recipe) return;
    const coverage = calculateRecipeCoverage(recipe, inventory);
    const itemsToAdd = buildMissingRecipeShoppingItems(coverage.items, shoppingList);

    if (itemsToAdd.length === 0) {
      setAddSuccessMessage("All missing items are already on your shopping list!");
      setTimeout(() => setAddSuccessMessage(null), 4000);
      return;
    }

    addBatchShoppingItems(itemsToAdd);
    setAddSuccessMessage(`Added ${itemsToAdd.length} missing ingredient(s) to your shopping list!`);
    setTimeout(() => setAddSuccessMessage(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)]">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm">Loading recipe details...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/recipes/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={16} />
          Back to Recipes
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          {error || "Recipe not found."}
        </div>
      </div>
    );
  }

  const coverage = calculateRecipeCoverage(recipe, inventory);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Top navigation & actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/recipes/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Recipes
        </Link>

        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-red-600 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-red-200 transition-colors"
        >
          <Trash2 size={14} />
          Delete Recipe
        </button>
      </div>

      {/* Recipe Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif-heading font-bold text-[var(--foreground)]">
              {recipe.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)] mt-2">
              {recipe.servings && (
                <span className="inline-flex items-center gap-1">
                  <ChefHat size={14} />
                  {recipe.servings}
                </span>
              )}
              {recipe.createdAt && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={14} />
                  Added {new Date(recipe.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {recipe.sourceUrl && /^https?:\/\//i.test(recipe.sourceUrl) && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors self-start"
            >
              <ExternalLink size={14} />
              View original
            </a>
          )}
        </div>

        {/* Cook-from-pantry coverage card */}
        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[var(--foreground)]">
                  Pantry Coverage: {coverage.haveCount} of {coverage.totalCount} ingredients ({coverage.coveragePercentage}%)
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Exact match against your pantry items.
              </p>
            </div>

            {coverage.missingCount > 0 && (
              <button
                type="button"
                onClick={handleAddMissingToShoppingList}
                className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors self-start sm:self-auto shadow-sm"
              >
                <ShoppingCart size={15} />
                Add Missing ({coverage.missingCount}) to Shopping List
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[var(--surface-muted)] h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                coverage.coveragePercentage === 100
                  ? "bg-emerald-500"
                  : coverage.coveragePercentage > 50
                  ? "bg-amber-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${coverage.coveragePercentage}%` }}
            />
          </div>

          {addSuccessMessage && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={14} />
              {addSuccessMessage}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Ingredients & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ingredients */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h2 className="font-serif-heading font-semibold text-lg text-[var(--foreground)] mb-4 flex items-center justify-between">
            <span>Ingredients</span>
            <span className="text-xs font-normal text-[var(--muted)]">
              {recipe.ingredients.length} total
            </span>
          </h2>

          <div className="space-y-2.5">
            {coverage.items.map((item, idx) => {
              const status = item.status;
              return (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 text-sm"
                >
                  <span className="text-[var(--foreground)] flex-1">
                    {item.ingredient.raw}
                  </span>

                  {status === "have" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 size={12} />
                      Have ({item.haveQuantity})
                    </span>
                  )}

                  {status === "missing" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                      <XCircle size={12} />
                      Missing
                    </span>
                  )}

                  {status === "unsure" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                      <HelpCircle size={12} />
                      Unsure
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h2 className="font-serif-heading font-semibold text-lg text-[var(--foreground)] mb-4 flex items-center justify-between">
            <span>Instructions</span>
            <span className="text-xs font-normal text-[var(--muted)]">
              {recipe.instructions.length} steps
            </span>
          </h2>

          {recipe.instructions.length === 0 ? (
            <p className="text-sm text-[var(--muted)] italic">
              No instructions listed for this recipe.
            </p>
          ) : (
            <ol className="space-y-4">
              {recipe.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-[var(--foreground)] leading-relaxed flex-1">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
