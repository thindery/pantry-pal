"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2, Plus, ShoppingCart, Sparkles, X } from "lucide-react";
import type { PantryItem, Recipe, ShoppingListItem } from "@/types";
import { ApiError } from "@/lib/api-error";
import { trackEvent } from "@/lib/analytics";
import { calculateRecipeCoverage } from "@/lib/recipe-coverage";
import { FREE_MAX_SAVED_RECIPES } from "@/lib/recipe-constants";
import { buildMissingRecipeShoppingItems } from "@/lib/recipe-shopping-list";
import { createRecipe } from "@/services/recipeService";
import {
  AI_DIET_OPTIONS,
  AI_TIME_OPTIONS,
  getAiRecipeStatus,
  suggestAiRecipes,
  type AiRecipeIdea,
  type AiRecipeStatus,
  type AiUsage,
} from "@/services/ai";

/**
 * PP-183: AI recipe builder. Suggests recipes from in-stock pantry items (use-soon
 * items first), lets the cook adjust servings, diet, time and must-use items,
 * saves an idea as a normal saved recipe (PP-138) and adds missing ingredients
 * to the shopping list. Hidden unless the server turns AI on. Copy says "AI" only.
 */
export interface AiRecipeBuilderProps {
  inventory: PantryItem[];
  shoppingList: ShoppingListItem[];
  onAddShoppingItems: (items: ShoppingListItem[]) => void;
  onRecipeSaved?: (recipe: Recipe) => void;
  onUpgrade?: () => void;
}

export const OPTION_LABEL_MAX = 40;

/** Keep native <select> options short so long pantry names cannot widen the control. */
export function truncateOptionLabel(name: string, max = OPTION_LABEL_MAX): string {
  const text = name.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function asRecipe(idea: AiRecipeIdea, index: number): Recipe {
  return {
    id: `ai-idea-${index}`,
    userId: "",
    title: idea.title,
    servings: idea.servings,
    ingredients: idea.ingredients,
    instructions: idea.instructions,
    isComplete: true,
    createdAt: "",
  };
}

function usagePercent(usage?: AiUsage | null): number | null {
  if (!usage || !usage.limitTokens) return null;
  return Math.min(100, Math.round((usage.usedTokens / usage.limitTokens) * 100));
}

export function AiRecipeBuilder({ inventory, shoppingList, onAddShoppingItems, onRecipeSaved, onUpgrade }: AiRecipeBuilderProps) {
  const [status, setStatus] = useState<AiRecipeStatus | null>(null);
  const [servings, setServings] = useState(2);
  const [diet, setDiet] = useState("none");
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [mustUse, setMustUse] = useState<string[]>([]);
  const [mustUsePick, setMustUsePick] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<AiRecipeIdea[]>([]);
  const [savedIds, setSavedIds] = useState<Record<number, string>>({});
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAiRecipeStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const inStock = useMemo(
    () =>
      inventory
        .filter((i) => i.quantity > 0 && i.name.trim())
        .map((i) => i.name.trim())
        .filter((name, idx, arr) => arr.findIndex((n) => n.toLowerCase() === name.toLowerCase()) === idx)
        .sort((a, b) => a.localeCompare(b)),
    [inventory],
  );

  if (!status || !status.enabled) return null;

  const percent = usagePercent(status.usage);

  if (!status.eligible) {
    return (
      <section
        data-testid="ai-recipe-builder"
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="font-serif-heading font-semibold text-lg text-[var(--foreground)] flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent)]" /> AI recipe builder
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Get recipe ideas built from what&apos;s already in your pantry. Part of Pro.
          </p>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] self-start sm:self-auto"
        >
          <Sparkles size={14} /> Upgrade to Pro
        </button>
      </section>
    );
  }

  const addMustUse = (name: string) => {
    const clean = name.trim();
    if (!clean || mustUse.length >= 5) return;
    if (mustUse.some((m) => m.toLowerCase() === clean.toLowerCase())) return;
    setMustUse([...mustUse, clean]);
    setMustUsePick("");
  };

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    trackEvent("ai_recipe_request", { servings, diet, max_minutes: maxMinutes ?? 0, must_use_count: mustUse.length });
    try {
      const result = await suggestAiRecipes({ servings, diet, maxMinutes, mustUse, note: note.trim() });
      setIdeas(result.recipes);
      setSavedIds({});
      if (result.usage) setStatus((s) => (s ? { ...s, usage: result.usage } : s));
    } catch (err) {
      setIdeas([]);
      setError(err instanceof ApiError || err instanceof Error ? err.message : "AI recipe ideas aren't available right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (idea: AiRecipeIdea, index: number) => {
    setSavingIndex(index);
    setNotice(null);
    try {
      const created = await createRecipe({
        title: idea.title,
        servings: idea.servings,
        ingredients: idea.ingredients,
        instructions: idea.instructions,
      });
      setSavedIds((prev) => ({ ...prev, [index]: created.id }));
      onRecipeSaved?.(created);
      trackEvent("ai_recipe_saved", {});
    } catch (err) {
      if (err instanceof ApiError && err.code === "TIER_LIMIT_EXCEEDED") {
        setNotice(`Free accounts can save ${FREE_MAX_SAVED_RECIPES} recipes. Upgrade to Pro for unlimited saved recipes.`);
      } else {
        setNotice(err instanceof Error ? err.message : "Couldn't save that recipe. Please try again.");
      }
    } finally {
      setSavingIndex(null);
    }
  };

  const handleAddMissing = (idea: AiRecipeIdea, index: number) => {
    const coverage = calculateRecipeCoverage(asRecipe(idea, index), inventory);
    const toAdd = buildMissingRecipeShoppingItems(coverage.items, shoppingList);
    if (toAdd.length === 0) {
      setNotice("All missing items are already on your shopping list!");
      return;
    }
    onAddShoppingItems(toAdd);
    trackEvent("ai_recipe_add_missing", { count: toAdd.length });
    setNotice(`Added ${toAdd.length} missing ingredient(s) to your shopping list!`);
  };

  const fieldClass =
    "w-full max-w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]";

  return (
    <section data-testid="ai-recipe-builder" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h2 className="font-serif-heading font-semibold text-lg text-[var(--foreground)] flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent)]" /> AI recipe builder
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Recipe ideas from what&apos;s in your pantry. Fresh items and things that have been sitting a while go first.
          </p>
        </div>
        {percent !== null && (
          <div className="text-xs text-[var(--muted)] min-w-0 w-full sm:w-40" data-testid="ai-usage-meter">
            <span>AI use this week: {percent}%</span>
            <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden" aria-hidden="true">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSuggest} className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
        <label className="text-xs font-medium text-[var(--muted)] space-y-1 min-w-0">
          <span>Servings</span>
          <select aria-label="Servings" className={fieldClass} value={servings} onChange={(e) => setServings(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--muted)] space-y-1 min-w-0">
          <span>Diet</span>
          <select aria-label="Diet" className={fieldClass} value={diet} onChange={(e) => setDiet(e.target.value)}>
            {AI_DIET_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--muted)] space-y-1 min-w-0">
          <span>Time</span>
          <select
            aria-label="Time"
            className={fieldClass}
            value={maxMinutes ?? ""}
            onChange={(e) => setMaxMinutes(e.target.value ? Number(e.target.value) : null)}
          >
            {AI_TIME_OPTIONS.map((t) => (
              <option key={t.label} value={t.value ?? ""}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-3 space-y-1 min-w-0">
          <span className="text-xs font-medium text-[var(--muted)]">Must use (up to 5)</span>
          <div className="flex flex-wrap items-center gap-2 min-w-0 w-full">
            {mustUse.map((m) => (
              <span
                key={m}
                title={m}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--foreground)] max-w-full min-w-0"
              >
                <span className="truncate">{m}</span>
                <button type="button" aria-label={`Remove ${m}`} onClick={() => setMustUse(mustUse.filter((x) => x !== m))}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {mustUse.length < 5 && (
              <select
                aria-label="Add a must-use item"
                className="w-full max-w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]"
                value={mustUsePick}
                onChange={(e) => addMustUse(e.target.value)}
              >
                <option value="">+ Add pantry item</option>
                {inStock
                  .filter((n) => !mustUse.some((m) => m.toLowerCase() === n.toLowerCase()))
                  .map((n) => (
                    <option key={n} value={n} title={n}>
                      {truncateOptionLabel(n)}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>

        <label className="sm:col-span-3 text-xs font-medium text-[var(--muted)] space-y-1 min-w-0">
          <span>Anything else? (optional)</span>
          <input
            aria-label="Note"
            className={fieldClass}
            maxLength={120}
            placeholder="e.g. kid friendly, one pan, no mushrooms"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Building ideas..." : ideas.length ? "Suggest again" : "Suggest recipes"}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-sm">
          {notice}
        </div>
      )}

      {ideas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0" data-testid="ai-recipe-ideas">
          {ideas.map((idea, index) => {
            const coverage = calculateRecipeCoverage(asRecipe(idea, index), inventory);
            const missing = coverage.items.filter((c) => c.status === "missing");
            const savedId = savedIds[index];
            return (
              <article
                key={`${idea.title}-${index}`}
                data-testid="ai-recipe-idea"
                className="border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3 bg-[var(--background)] min-w-0 max-w-full overflow-hidden"
              >
                <div>
                  <h3 className="font-serif-heading font-semibold text-[var(--foreground)] break-words">{idea.title}</h3>
                  <p className="text-xs text-[var(--muted)] mt-1 flex flex-wrap items-center gap-2">
                    {idea.minutes ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {idea.minutes} min
                      </span>
                    ) : null}
                    <span>Serves {idea.servings}</span>
                    <span>
                      {coverage.haveCount}/{coverage.totalCount} in pantry
                    </span>
                  </p>
                  {idea.usesSoon.length > 0 && (
                    <p className="text-xs text-emerald-800 mt-1 break-words">Uses up: {idea.usesSoon.join(", ")}</p>
                  )}
                </div>
                <ul className="text-sm space-y-0.5">
                  {coverage.items.map((c, i) => (
                    <li key={i} className={`${c.status === "missing" ? "text-[var(--muted)]" : "text-[var(--foreground)]"} break-words`}>
                      {c.status === "have" ? "✓ " : c.status === "missing" ? "+ " : "? "}
                      {c.ingredient.raw || c.ingredient.name}
                    </li>
                  ))}
                </ul>
                <details className="text-sm">
                  <summary className="cursor-pointer text-[var(--accent)]">Steps</summary>
                  <ol className="list-decimal pl-5 mt-2 space-y-1 text-[var(--foreground)]">
                    {idea.instructions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </details>
                <div className="mt-auto flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                  {savedId ? (
                    <Link
                      href={`/dashboard/recipes/${savedId}/`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"
                    >
                      <CheckCircle2 size={14} /> Saved. Open recipe
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSave(idea, index)}
                      disabled={savingIndex === index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
                    >
                      {savingIndex === index ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Save recipe
                    </button>
                  )}
                  {missing.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAddMissing(idea, index)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]"
                    >
                      <ShoppingCart size={12} /> Add {missing.length} missing to list
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
