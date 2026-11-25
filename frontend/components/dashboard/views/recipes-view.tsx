"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChefHat,
  ExternalLink,
  Globe,
  Loader2,
  PenTool,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Recipe } from "@/types";
import { ApiError } from "@/lib/api-error";
import { usePantry } from "@/contexts/pantry-provider";
import { useConfirm } from "@/hooks/use-confirm";
import { calculateRecipeCoverage } from "@/lib/recipe-coverage";
import { FREE_MAX_SAVED_RECIPES } from "@/lib/recipe-constants";
import { AiRecipeBuilder } from "@/components/dashboard/AiRecipeBuilder";
import {
  createRecipe,
  deleteRecipe,
  getRecipes,
  importRecipe,
} from "@/services/recipeService";

export function RecipesView() {
  const router = useRouter();
  const confirm = useConfirm();
  const { inventory, isPaid, error: showErrorToast, shoppingList, addBatchShoppingItems } = usePantry();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"import" | "manual">("import");

  // Import form state
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Manual form state
  const [manualTitle, setManualTitle] = useState("");
  const [manualSourceUrl, setManualSourceUrl] = useState("");
  const [manualServings, setManualServings] = useState("");
  const [manualIngredients, setManualIngredients] = useState("");
  const [manualInstructions, setManualInstructions] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const loadRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecipes();
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;

    setImporting(true);
    setImportError(null);
    try {
      const created = await importRecipe(importUrl.trim());
      setRecipes((prev) => [created, ...prev]);
      setShowAddModal(false);
      setImportUrl("");
      router.push(`/dashboard/recipes/${created.id}/`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "TIER_LIMIT_EXCEEDED") {
        setImportError(
          `Free accounts can save ${FREE_MAX_SAVED_RECIPES} recipes. Upgrade to Pro for unlimited saved recipes.`
        );
      } else if (err instanceof ApiError && err.code === "INVALID_URL") {
        setImportError(
          "This URL can't be imported. Use a public http or https recipe page, or enter the recipe by hand."
        );
      } else {
        setImportError(err instanceof Error ? err.message : "This URL can't be imported. You can enter the recipe by hand.");
      }
    } finally {
      setImporting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    setSavingManual(true);
    setManualError(null);
    try {
      const lines = manualIngredients
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const instructionsList = manualInstructions
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const created = await createRecipe({
        title: manualTitle.trim(),
        sourceUrl: manualSourceUrl.trim() || null,
        servings: manualServings.trim() || null,
        ingredients: lines,
        instructions: instructionsList,
      });

      setRecipes((prev) => [created, ...prev]);
      setShowAddModal(false);
      setManualTitle("");
      setManualSourceUrl("");
      setManualServings("");
      setManualIngredients("");
      setManualInstructions("");
      router.push(`/dashboard/recipes/${created.id}/`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "TIER_LIMIT_EXCEEDED") {
        setManualError(
          `Free accounts can save ${FREE_MAX_SAVED_RECIPES} recipes. Upgrade to Pro for unlimited saved recipes.`
        );
      } else {
        setManualError(err instanceof Error ? err.message : "Failed to save recipe.");
      }
    } finally {
      setSavingManual(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const confirmed = await confirm({
      title: "Delete recipe",
      message: "Are you sure you want to delete this recipe?",
      confirmLabel: "Delete recipe",
      danger: true,
    });
    if (!confirmed) return;

    try {
      await deleteRecipe(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (_err) {
      showErrorToast("Failed to delete recipe");
    }
  };

  const isFreeCapReached = !isPaid && recipes.length >= FREE_MAX_SAVED_RECIPES;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif-heading font-bold text-[var(--foreground)]">
            Saved Recipes
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Track ingredients against your pantry and cook with what you have.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setImportError(null);
            setManualError(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-[var(--accent)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Recipe
        </button>
      </div>

      {!isPaid && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-medium text-[var(--foreground)]">
              {recipes.length} of {FREE_MAX_SAVED_RECIPES} free recipes saved
            </p>
            <p className="text-[var(--muted)] text-xs mt-0.5">
              {isFreeCapReached
                ? `You have reached the ${FREE_MAX_SAVED_RECIPES} recipe limit for free accounts. Upgrade to Pro for unlimited recipes.`
                : `Free accounts can save up to ${FREE_MAX_SAVED_RECIPES} recipes. Upgrade to Pro for unlimited saved recipes.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/pricing/")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] self-start sm:self-auto transition-colors"
          >
            <Sparkles size={14} />
            Upgrade to Pro
          </button>
        </div>
      )}

      <AiRecipeBuilder
        inventory={inventory}
        shoppingList={shoppingList}
        onAddShoppingItems={addBatchShoppingItems}
        onRecipeSaved={(created) => setRecipes((prev) => [created, ...prev])}
        onUpgrade={() => router.push("/pricing/")}
      />

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
          <Loader2 className="animate-spin mb-2" size={32} />
          <p className="text-sm">Loading your recipes...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {!loading && !error && recipes.length === 0 && (
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-2xl p-12 text-center">
          <ChefHat size={48} className="mx-auto text-[var(--muted)] mb-3 opacity-60" />
          <h3 className="font-serif-heading font-semibold text-lg text-[var(--foreground)]">
            No recipes saved yet
          </h3>
          <p className="text-sm text-[var(--muted)] max-w-sm mx-auto mt-1 mb-6">
            Import a recipe by URL from your favorite cooking site or enter one manually to match against your pantry.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus size={16} />
            Add Your First Recipe
          </button>
        </div>
      )}

      {!loading && !error && recipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
            const coverage = calculateRecipeCoverage(recipe, inventory);
            return (
              <div
                key={recipe.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--accent)] hover:shadow-sm transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/dashboard/recipes/${recipe.id}/`}>
                      <h2 className="font-serif-heading font-semibold text-lg text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                        {recipe.title}
                      </h2>
                    </Link>
                    <button
                      type="button"
                      aria-label="Delete recipe"
                      onClick={(e) => handleDelete(recipe.id, e)}
                      className="text-[var(--muted)] hover:text-red-600 p-1 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {recipe.servings && (
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Servings: {recipe.servings}
                    </p>
                  )}

                  {recipe.isComplete === false ? (
                    <p className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--border)]">
                        Details not imported
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {recipe.ingredients.length} ingredients · {recipe.instructions.length} steps
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {recipe.isComplete === false ? (
                      <Link
                        href={`/dashboard/recipes/${recipe.id}/`}
                        className="text-[var(--accent)] font-medium hover:underline"
                      >
                        Add details
                      </Link>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                          coverage.coveragePercentage === 100
                            ? "bg-emerald-100 text-emerald-800"
                            : coverage.coveragePercentage > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {coverage.haveCount}/{coverage.totalCount} in pantry ({coverage.coveragePercentage}%)
                      </span>
                    )}
                  </div>

                  {recipe.sourceUrl && /^https?:\/\//i.test(recipe.sourceUrl) && (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--muted)] inline-flex items-center gap-1 hover:text-[var(--foreground)]"
                    >
                      <ExternalLink size={12} />
                      View original
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Recipe Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-serif-heading font-bold text-[var(--foreground)] mb-4">
              Add Recipe
            </h2>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("import");
                  setImportError(null);
                  setManualError(null);
                }}
                className={`flex-1 pb-2.5 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${
                  activeTab === "import"
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Globe size={16} />
                Import from URL
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("manual");
                  setImportError(null);
                  setManualError(null);
                }}
                className={`flex-1 pb-2.5 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${
                  activeTab === "manual"
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <PenTool size={16} />
                Enter Manually
              </button>
            </div>

            {activeTab === "import" && (
              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div>
                  <label htmlFor="import-url" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Recipe Web Address
                  </label>
                  <input
                    id="import-url"
                    type="url"
                    required
                    placeholder="https://example.com/recipe-page"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <p className="text-xs text-[var(--muted)] mt-1.5">
                    We'll pull the ingredients and steps when the page provides them. If not, you can add the details next.
                  </p>
                </div>

                {importError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">
                    {importError}
                  </div>
                )}


                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={importing}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importing || !importUrl.trim()}
                    className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Importing...
                      </>
                    ) : (
                      "Import Recipe"
                    )}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "manual" && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label htmlFor="manual-title" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Recipe Title *
                  </label>
                  <input
                    id="manual-title"
                    type="text"
                    required
                    placeholder="e.g. Grandma's Apple Pie"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label htmlFor="manual-source-url" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Source Web Address (optional)
                  </label>
                  <input
                    id="manual-source-url"
                    type="url"
                    placeholder="https://example.com/recipe-page"
                    value={manualSourceUrl}
                    onChange={(e) => setManualSourceUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label htmlFor="manual-servings" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Servings (optional)
                  </label>
                  <input
                    id="manual-servings"
                    type="text"
                    placeholder="e.g. 4 servings"
                    value={manualServings}
                    onChange={(e) => setManualServings(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label htmlFor="manual-ingredients" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Ingredients (one per line) *
                  </label>
                  <textarea
                    id="manual-ingredients"
                    required
                    rows={4}
                    placeholder={"2 cups all-purpose flour\n1 tsp baking soda\n1/2 tsp salt\n1 cup butter"}
                    value={manualIngredients}
                    onChange={(e) => setManualIngredients(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label htmlFor="manual-instructions" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Instructions (one step per line)
                  </label>
                  <textarea
                    id="manual-instructions"
                    rows={3}
                    placeholder={"Preheat oven to 375 degrees F.\nMix dry ingredients in a bowl.\nBake for 15 minutes."}
                    value={manualInstructions}
                    onChange={(e) => setManualInstructions(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                {manualError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">
                    {manualError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={savingManual}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingManual || !manualTitle.trim()}
                    className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                  >
                    {savingManual ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Saving...
                      </>
                    ) : (
                      "Save Recipe"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
