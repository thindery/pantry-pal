/**
 * PP-191: helpers for the "I used this" / "I cooked this" flow.
 */
import type { PantryItem, RecipeIngredientCoverage } from "@/types";

export function formatConsumeAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

/** Step for the amount stepper, matching the pantry row +/- steps. */
export function consumeStep(unit: string | undefined): number {
  const u = (unit || "").toLowerCase();
  if (["lbs", "lb", "kg", "grams", "g", "oz"].includes(u)) return 0.5;
  if (u === "cups" || u === "cup") return 0.25;
  return 1;
}

/** Default amount: 1 pantry unit, capped at what is in stock (design doc section 6). */
export function defaultConsumeAmount(item: Pick<PantryItem, "quantity">): number {
  return Math.min(1, Math.max(0, Number(item.quantity) || 0));
}

/** Items matching a typeahead query, in-stock first, prefix matches before substring. */
export function searchPantryForUse(inventory: PantryItem[], query: string, limit = 8): PantryItem[] {
  const q = query.trim().toLowerCase();
  const rows = inventory.filter((i) => i.name.trim());
  const scored = rows
    .map((item) => {
      const name = item.name.toLowerCase();
      const rank = !q ? 2 : name.startsWith(q) ? 0 : name.includes(q) ? 1 : -1;
      return { item, rank, inStock: (Number(item.quantity) || 0) > 0 };
    })
    .filter((r) => r.rank >= 0);
  scored.sort(
    (a, b) =>
      Number(b.inStock) - Number(a.inStock) ||
      a.rank - b.rank ||
      a.item.name.localeCompare(b.item.name),
  );
  return scored.slice(0, limit).map((r) => r.item);
}

export interface CookLine {
  key: string;
  ingredientRaw: string;
  /** In-stock pantry candidates, closest first. */
  candidates: PantryItem[];
  itemId: string;
  amount: number;
  checked: boolean;
}

/**
 * Build the "I cooked this" checklist from recipe coverage: every ingredient that
 * matched an in-stock pantry item is pre-checked at 1 pantry unit. Staples,
 * missing and unsure lines are not deducted.
 */
export function buildCookLines(
  coverageItems: RecipeIngredientCoverage[],
  inventory: PantryItem[],
): CookLine[] {
  const byId = new Map(inventory.map((i) => [i.id, i]));
  const lines: CookLine[] = [];
  coverageItems.forEach((c, index) => {
    if (c.status !== "have") return;
    const candidates = (c.matchedItemIds ?? [])
      .map((id) => byId.get(id))
      .filter((i): i is PantryItem => !!i && (Number(i.quantity) || 0) > 0);
    if (candidates.length === 0) return;
    const first = candidates[0];
    lines.push({
      key: `${index}-${c.ingredient.raw || c.ingredient.name}`,
      ingredientRaw: c.ingredient.raw?.trim() || c.ingredient.name,
      candidates,
      itemId: first.id,
      amount: defaultConsumeAmount(first),
      checked: !/\boptional\b/i.test(c.ingredient.raw ?? ""),
    });
  });
  return lines;
}
