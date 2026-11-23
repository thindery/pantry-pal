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
  PencilLine,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Recipe } from "@/types";
import { ApiError } from "@/lib/api-error";
import { usePantry } from "@/contexts/pantry-provider";
import { calculateRecipeCoverage } from "@/lib/recipe-coverage";
import { buildMissingRecipeShoppingItems } from "@/lib/recipe-shopping-list";
import { deleteRecipe, getRecipe, parseRecipe, updateRecipe } from "@/services/recipeService";

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

  const [showAddDetails, setShowAddDetails] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsingPaste, setParsingPaste] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editServings, setEditServings] = useState("");
  const [editIngredients, setEditIngredients] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

  useEffect(() => {
    if (!recipeId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    getRecipe(recipeId)
      .then((data) => {
        if (!mounted) return;
        setRecipe(data);
        setEditTitle(data.title || "");
        setEditServings(data.servings || "");
        setEditIngredients(
          (data.ingredients || []).map((ing) => ing.raw).join("\n")
        );
        setEditInstructions((data.instructions || []).join("\n"));
        setShowAddDetails(data.isComplete === false);
        setPasteText("");
        setPasteError(null);
        setDetailsError(null);
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

  const openAddDetails = () => {
    if (!recipe) return;
    setEditTitle(recipe.title || "");
    setEditServings(recipe.servings || "");
    setEditIngredients((recipe.ingredients || []).map((ing) => ing.raw).join("\n"));
    setEditInstructions((recipe.instructions || []).join("\n"));
    setPasteText("");
    setPasteError(null);
    setDetailsError(null);
    setShowAddDetails(true);
  };

  const handleParsePaste = async () => {
    if (!pasteText.trim() || !recipe) return;
    setParsingPaste(true);
    setPasteError(null);
    try {
      const draft = await parseRecipe({
        text: pasteText.trim(),
        sourceUrl: recipe.sourceUrl || undefined,
      });
      setEditTitle(draft.title || editTitle);
      setEditServings(draft.servings || editServings);
      setEditIngredients(
        (draft.ingredients || [])
          .map((ing) => (typeof ing === "string" ? ing : ing.raw))
          .join("\n")
      );
      setEditInstructions((draft.instructions || []).join("\n"));
    } catch (err: unknown) {
      setPasteError(
        err instanceof Error
          ? err.message
          : "Couldn't parse that paste. You can enter the ingredients and steps by hand."
      );
    } finally {
      setParsingPaste(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe || !editTitle.trim()) return;
    setSavingDetails(true);
    setDetailsError(null);
    try {
      const updated = await updateRecipe(recipe.id, {
        title: editTitle.trim(),
        sourceUrl: recipe.sourceUrl || null,
        servings: editServings.trim() || null,
        ingredients: editIngredients
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        instructions: editInstructions
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      });
      setRecipe(updated);
      setShowAddDetails(false);
      setPasteText("");
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't save those details. Please try again.";
      setDetailsError(message);
    } finally {
      setSavingDetails(false);
    }
  };

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

          <div className="flex flex-wrap items-center gap-2 self-start">
            {recipe.isComplete === false && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--border)]">
                Details not imported
              </span>
            )}
            {recipe.sourceUrl && /^https?:\/\//i.test(recipe.sourceUrl) && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
              >
                <ExternalLink size={14} />
                View original
              </a>
            )}
            <button
              type="button"
              onClick={openAddDetails}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              <PencilLine size={14} />
              {recipe.isComplete === false ? "Add details" : "Edit details"}
            </button>
          </div>
        </div>

        {/* Cook-from-pantry coverage card — hidden until details exist */}
        {recipe.isComplete !== false && coverage.totalCount > 0 && (
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
        )}
      </div>

      {showAddDetails && (
        <form
          onSubmit={handleSaveDetails}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4"
        >
          <div>
            <h2 className="font-serif-heading font-semibold text-lg text-[var(--foreground)]">
              Add details
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1">
              Paste the recipe from the original page, or enter the ingredients and steps by hand.
            </p>
          </div>

          <div>
            <label htmlFor="paste-recipe" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Paste recipe
            </label>
            <textarea
              id="paste-recipe"
              rows={6}
              placeholder="Paste the recipe text or HTML here..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            {pasteError && (
              <p className="mt-2 text-xs text-red-700">{pasteError}</p>
            )}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                disabled={parsingPaste || !pasteText.trim()}
                onClick={handleParsePaste}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors disabled:opacity-50"
              >
                {parsingPaste ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Reading paste...
                  </>
                ) : (
                  "Fill from paste"
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="edit-title" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Recipe title *
            </label>
            <input
              id="edit-title"
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="edit-servings" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Servings (optional)
            </label>
            <input
              id="edit-servings"
              type="text"
              value={editServings}
              onChange={(e) => setEditServings(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="edit-ingredients" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Ingredients (one per line)
            </label>
            <textarea
              id="edit-ingredients"
              rows={5}
              value={editIngredients}
              onChange={(e) => setEditIngredients(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="edit-instructions" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Instructions (one step per line)
            </label>
            <textarea
              id="edit-instructions"
              rows={5}
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {detailsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">
              {detailsError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddDetails(false)}
              disabled={savingDetails}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingDetails || !editTitle.trim()}
              className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {savingDetails ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Saving...
                </>
              ) : (
                "Save details"
              )}
            </button>
          </div>
        </form>
      )}

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

          {recipe.ingredients.length === 0 ? (
            <p className="text-sm text-[var(--muted)] italic">
              No ingredients yet. Add details to compare this recipe with your pantry.
            </p>
          ) : (
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
          )}
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
              {recipe.isComplete === false
                ? "No steps yet. Add details, or view the original recipe."
                : "No instructions listed for this recipe."}
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
