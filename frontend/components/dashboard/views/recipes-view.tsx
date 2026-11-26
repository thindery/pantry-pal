"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChefHat,
  Globe,
  LayoutGrid,
  LayoutList,
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


const LAYOUT_KEY = "ph-recipes-layout";

type RecipeLayout = "list" | "grid";
type RecipesTab = "mine" | "ai";

function sourceHost(sourceUrl?: string | null): string | null {
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function servingsLabel(servings?: string | null): string | null {
  if (!servings) return null;
  const trimmed = servings.trim();
  if (!trimmed) return null;
  return /serv/i.test(trimmed) ? trimmed : `Serves ${trimmed}`;
}

function inPantryLabel(coverage: { haveCount: number; totalCount: number; stapleCount?: number }): string {
  const have = coverage.haveCount + (coverage.stapleCount ?? 0);
  return `${have}/${coverage.totalCount} ingredients in pantry`;
}

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
  const [tab, setTab] = useState<RecipesTab>("mine");
  const [layout, setLayout] = useState<RecipeLayout>("list");

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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAYOUT_KEY);
      if (saved === "list" || saved === "grid") setLayout(saved);
    } catch {
      // ignore unavailable storage
    }
  }, []);

  const persistLayout = (next: RecipeLayout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      // ignore unavailable storage
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-serif-heading font-bold text-[var(--foreground)]">
            Recipes
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Track ingredients against your pantry and cook with what you have.
          </p>
          <Link
            href="/recipes/"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            <Globe size={14} aria-hidden="true" />
            Browse the public recipe library
          </Link>
        </div>

        <button
          type="button"
          onClick={() => {
            setImportError(null);
            setManualError(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-[var(--accent)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-sm shrink-0"
        >
          <Plus size={18} />
          Add Recipe
        </button>
      </div>

      {!isPaid && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm min-w-0">
          <div className="min-w-0">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] self-start sm:self-auto transition-colors shrink-0"
          >
            <Sparkles size={14} />
            Upgrade to Pro
          </button>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Recipes"
        className="flex border-b border-[var(--border)] min-w-0 max-w-full"
      >
        <button
          type="button"
          role="tab"
          id="recipes-tab-mine"
          aria-controls="recipes-panel-mine"
          aria-selected={tab === "mine"}
          onClick={() => setTab("mine")}
          className={`flex-1 min-w-0 pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "mine"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          My recipes
        </button>
        <button
          type="button"
          role="tab"
          id="recipes-tab-ai"
          aria-controls="recipes-panel-ai"
          aria-selected={tab === "ai"}
          onClick={() => setTab("ai")}
          className={`flex-1 min-w-0 pb-2.5 text-sm font-medium border-b-2 -mb-px inline-flex items-center justify-center gap-1.5 transition-colors ${
            tab === "ai"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Sparkles size={14} />
          Suggest with AI
        </button>
      </div>

      <div
        id="recipes-panel-ai"
        role="tabpanel"
        aria-labelledby="recipes-tab-ai"
        hidden={tab !== "ai"}
        className="min-w-0 max-w-full"
      >
        <AiRecipeBuilder
          inventory={inventory}
          shoppingList={shoppingList}
          onAddShoppingItems={addBatchShoppingItems}
          onRecipeSaved={(created) => setRecipes((prev) => [created, ...prev])}
          onUpgrade={() => router.push("/pricing/")}
        />
      </div>

      <div
        id="recipes-panel-mine"
        role="tabpanel"
        aria-labelledby="recipes-tab-mine"
        hidden={tab !== "mine"}
        className="space-y-3 min-w-0 max-w-full"
      >
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
        <div className="space-y-2 min-w-0">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label="List view"
              aria-pressed={layout === "list"}
              onClick={() => persistLayout("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                layout === "list"
                  ? "bg-[var(--surface-muted)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <LayoutList size={16} />
            </button>
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={layout === "grid"}
              onClick={() => persistLayout("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                layout === "grid"
                  ? "bg-[var(--surface-muted)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <div
            data-testid="recipes-list"
            data-layout={layout}
            className={
              layout === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 min-w-0"
                : "flex flex-col gap-1.5 min-w-0"
            }
          >
            {recipes.map((recipe) => {
              const coverage = calculateRecipeCoverage(recipe, inventory);
              const host = sourceHost(recipe.sourceUrl);
              const servings = servingsLabel(recipe.servings);
              const pantry =
                recipe.isComplete === false
                  ? "Details not imported"
                  : inPantryLabel(coverage);
              const pantryClass =
                recipe.isComplete === false
                  ? "text-[var(--muted)]"
                  : coverage.coveragePercentage === 100
                    ? "text-emerald-700"
                    : coverage.coveragePercentage > 0
                      ? "text-amber-800"
                      : "text-[var(--muted)]";
              const meta = [servings, pantry, host].filter(Boolean).join(" · ");
              return (
                <article
                  key={recipe.id}
                  data-testid="recipe-card"
                  className="bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-all min-w-0 max-w-full rounded-xl px-2.5 py-2 flex items-center gap-2.5"
                >
                  <Link
                    href={`/dashboard/recipes/${recipe.id}/`}
                    className="min-w-0 flex-1 flex items-center gap-2.5"
                  >
                    {recipe.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={recipe.imageUrl}
                        alt=""
                        className="h-11 w-11 rounded-lg object-cover shrink-0 bg-[var(--surface-muted)]"
                      />
                    ) : (
                      <div
                        className="h-11 w-11 rounded-lg bg-[var(--surface-muted)] flex items-center justify-center shrink-0 text-[var(--muted)]"
                        aria-hidden="true"
                      >
                        <ChefHat size={18} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-sm text-[var(--foreground)] truncate">
                        {recipe.title}
                      </h2>
                      <p className={`text-[11px] leading-snug mt-0.5 truncate ${pantryClass}`}>
                        {meta}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label="Delete recipe"
                    onClick={(e) => handleDelete(recipe.id, e)}
                    className="text-[var(--muted)] hover:text-red-600 p-1 rounded transition-colors shrink-0 self-start"
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
      </div>

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
