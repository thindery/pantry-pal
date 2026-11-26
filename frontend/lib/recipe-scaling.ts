/**
 * PP-184: serving scaler for the public recipe library.
 *
 * Pure functions, no DOM. Quantities snap to friendly fractions (⅛ ¼ ⅓ ½ ⅔ ¾),
 * units step up or down when that reads better (3 tsp -> 1 tbsp, 16 tbsp ->
 * 1 cup), and lines marked non-scalable ("salt to taste") are left untouched.
 */
import type { RecipeIngredient } from "@/content/recipes/types";

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 48;
export const SCALE_PRESETS = [0.5, 1, 2, 3] as const;

const FRACTION_GLYPHS: Record<string, string> = {
  "0.125": "⅛",
  "0.25": "¼",
  "0.3333": "⅓",
  "0.5": "½",
  "0.6667": "⅔",
  "0.75": "¾",
};
const FRACTION_VALUES = [0, 0.125, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1];
/** Fractions we accept as "clean" when deciding whether to change units. */
const CLEAN_FRACTIONS = [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1];
const CLEAN_TOLERANCE = 0.02;

function glyphFor(frac: number): string {
  const key = Number(frac.toFixed(4)).toString();
  return FRACTION_GLYPHS[key] ?? "";
}

/** Formats a number with friendly fractions: 1.5 -> "1½", 0.333 -> "⅓", 12.4 -> "12½". */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 10) {
    const rounded = Math.round(value * 2) / 2;
    const whole = Math.floor(rounded);
    return rounded - whole === 0.5 ? `${whole}½` : String(whole);
  }
  let whole = Math.floor(value);
  const frac = value - whole;
  let best = FRACTION_VALUES[0];
  for (const f of FRACTION_VALUES) {
    if (Math.abs(f - frac) < Math.abs(best - frac)) best = f;
  }
  if (best === 1) {
    whole += 1;
    best = 0;
  }
  if (whole === 0 && best === 0) best = 0.125; // never show "0" for a tiny amount
  const glyph = best === 0 ? "" : glyphFor(best);
  return `${whole > 0 ? whole : ""}${glyph}` || "0";
}

function isClean(value: number): boolean {
  const frac = value - Math.floor(value);
  return CLEAN_FRACTIONS.some((f) => Math.abs(f - frac) < CLEAN_TOLERANCE);
}

type Unit = NonNullable<RecipeIngredient["unit"]>;

/** Step a quantity up or down to a unit that reads naturally. */
export function normalizeUnit(
  value: number,
  unit: Unit | undefined
): { value: number; unit: Unit | undefined } {
  let v = value;
  let u = unit;
  if (u === "tsp" && v >= 3 && isClean(v / 3)) {
    v = v / 3;
    u = "tbsp";
  }
  if (u === "tbsp") {
    if (v >= 4 && isClean(v / 16)) {
      v = v / 16;
      u = "cup";
    } else if (v < 1) {
      v = v * 3;
      u = "tsp";
    }
  } else if (u === "cup" && v < 0.25) {
    v = v * 16;
    u = "tbsp";
  } else if (u === "oz" && v >= 16 && isClean(v / 16)) {
    v = v / 16;
    u = "lb";
  } else if (u === "lb" && v < 0.25) {
    v = v * 16;
    u = "oz";
  }
  return { value: v, unit: u };
}

const UNIT_LABELS: Record<Unit, [string, string]> = {
  tsp: ["tsp", "tsp"],
  tbsp: ["tbsp", "tbsp"],
  cup: ["cup", "cups"],
  oz: ["oz", "oz"],
  lb: ["lb", "lb"],
  can: ["can", "cans"],
  clove: ["clove", "cloves"],
  stalk: ["stalk", "stalks"],
  slice: ["slice", "slices"],
  pinch: ["pinch", "pinches"],
};

export interface ScaledIngredient {
  /** The line as shown, e.g. "1½ cups long-grain rice, rinsed". */
  text: string;
  qty: number | null;
  unit: Unit | undefined;
}

/** More than one of something, judged by what is displayed ("1" stays singular). */
function isPlural(qty: number): boolean {
  return qty > 1 && formatQuantity(qty) !== "1";
}

function isScalable(ing: RecipeIngredient): boolean {
  return ing.scalable !== false && ing.qty !== null;
}

/** Scales one ingredient line by `factor` (servings / base servings). */
export function scaleIngredient(ing: RecipeIngredient, factor: number): ScaledIngredient {
  let qty = ing.qty;
  let unit = ing.unit;
  if (qty !== null && isScalable(ing)) {
    const normalized = normalizeUnit(qty * factor, unit);
    qty = normalized.value;
    unit = normalized.unit;
  }
  const parts: string[] = [];
  if (qty !== null) {
    parts.push(formatQuantity(qty));
    if (unit) {
      const [one, many] = UNIT_LABELS[unit];
      parts.push(isPlural(qty) ? many : one);
    }
    if (ing.size) parts.push(`(${ing.size})`);
  }
  const noun = qty !== null && isPlural(qty) && ing.plural ? ing.plural : ing.item;
  parts.push(noun);
  let text = parts.join(" ");
  if (ing.note) text += `, ${ing.note}`;
  return { text, qty, unit };
}

export function scaleIngredients(ings: readonly RecipeIngredient[], factor: number): ScaledIngredient[] {
  return ings.map((i) => scaleIngredient(i, factor));
}

/** Clamp to a whole number of servings in [MIN_SERVINGS, MAX_SERVINGS]. */
export function clampServings(n: number): number {
  if (!Number.isFinite(n)) return MIN_SERVINGS;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(n)));
}

/** Reads `?servings=` from a query string; falls back to `base` when missing or invalid. */
export function parseServingsParam(search: string, base: number): number {
  const raw = new URLSearchParams(search).get("servings");
  if (!raw || !/^\d{1,3}$/.test(raw)) return base;
  const n = Number(raw);
  if (n < MIN_SERVINGS || n > MAX_SERVINGS) return base;
  return n;
}

/** Servings for a preset multiplier ("½×", "2×") relative to the base. */
export function servingsForFactor(base: number, factor: number): number {
  return clampServings(base * factor);
}

/** Label for the preset buttons. */
export function factorLabel(factor: number): string {
  return factor === 0.5 ? "½×" : `${factor}×`;
}
