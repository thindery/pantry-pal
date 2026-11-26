"use client";

import { Fragment, useState } from "react";
import { Search } from "lucide-react";
import { DIET_LABELS, MEAL_LABELS, type DietTag, type MealType } from "@/content/recipes";
import type { RecipeWithImage } from "@/content/recipes/images";
import { RecipeCard } from "./RecipeCard";
import { RecipeSignupCta } from "./RecipeSignupCtas";
import { DEFAULT_FILTERS, QUICK_MINUTES, filterRecipes, type RecipeFilters } from "./recipe-filter";

export const PAGE_SIZE = 12;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/** Browse grid with filters. The full list renders on the server; filtering is client-side. */
export function RecipeBrowser({ recipes }: { recipes: RecipeWithImage[] }) {
  const [filters, setFilters] = useState<RecipeFilters>(DEFAULT_FILTERS);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const update = (patch: Partial<RecipeFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setVisible(PAGE_SIZE);
  };

  const meals = (Object.keys(MEAL_LABELS) as MealType[]).filter((m) => recipes.some((r) => r.meal === m));
  const matches = filterRecipes(recipes, filters);
  const shown = matches.slice(0, visible);
  const filtersActive =
    filters.meal !== "all" || filters.diet !== "all" || filters.quick || filters.query.trim() !== "";

  return (
    <div>
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Search recipes</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search recipes or ingredients"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by meal">
          <Chip active={filters.meal === "all"} onClick={() => update({ meal: "all" })}>All meals</Chip>
          {meals.map((meal) => (
            <Chip key={meal} active={filters.meal === meal} onClick={() => update({ meal: filters.meal === meal ? "all" : meal })}>
              {MEAL_LABELS[meal]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by diet and time">
          {(Object.keys(DIET_LABELS) as DietTag[]).map((diet) => (
            <Chip key={diet} active={filters.diet === diet} onClick={() => update({ diet: filters.diet === diet ? "all" : diet })}>
              {DIET_LABELS[diet]}
            </Chip>
          ))}
          <Chip active={filters.quick} onClick={() => update({ quick: !filters.quick })}>
            {QUICK_MINUTES} minutes or less
          </Chip>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => update({ ...DEFAULT_FILTERS })}
              className="px-2 text-sm text-slate-500 underline hover:text-slate-800"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-5 text-sm text-slate-600" aria-live="polite">
        {matches.length === 1 ? "1 recipe" : `${matches.length} recipes`}
      </p>

      {matches.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          No recipes match those filters yet. Try clearing a filter.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {shown.map((recipe, index) => (
            <Fragment key={recipe.slug}>
              <RecipeCard recipe={recipe} />
              {index === 2 ? (
                <li className="list-none sm:col-span-2 lg:col-span-1">
                  <RecipeSignupCta placement="index" />
                </li>
              ) : null}
            </Fragment>
          ))}
        </ul>
      )}

      {matches.length > shown.length ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Show more recipes
          </button>
        </div>
      ) : null}
    </div>
  );
}
