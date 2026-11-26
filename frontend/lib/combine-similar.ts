/**
 * PP-190: combine similar pantry items (display grouping only).
 *
 * Near-duplicate rows (two "pie crust" entries from different brands/barcodes)
 * are shown as one row with a combined quantity. Underlying rows are never merged
 * or deleted; scanning and +/- still act on a specific item. Reuses the PP-189
 * ingredient normalizer (tokenizeForMatch / scoreTokenMatch) instead of a new one.
 */
import type { PantryItem } from "@/types";
import { scoreTokenMatch, tokenizeForMatch } from "@/lib/recipe-coverage";

export const COMBINE_SIMILAR_STORAGE_KEY = "pantry-combine-similar";

/** Product-form words that do not change what the item is (cream of chicken == cream of chicken soup). */
const IGNORABLE = new Set(["soup", "condensed", "canned", "can", "original", "brand", "classic"]);

/** Words that change what a product is; never treated as a leading brand name. */
const IDENTITY_WORDS = new Set([
  "graham", "cracker", "chocolate", "vanilla", "peanut", "almond", "cheese", "cream",
  "apple", "cherry", "pumpkin", "pecan", "lemon", "lime", "orange", "garlic", "onion",
  "chicken", "beef", "pork", "turkey", "tomato", "mushroom", "corn", "rice", "wheat",
  "honey", "maple", "brown", "powdered", "cake", "sugar", "butter", "milk", "egg",
  "potato", "bean", "cocoa", "coconut", "strawberry", "blueberry", "banana",
  "oat", "bread", "pasta", "sauce", "cookie", "sweet", "sour", "spicy", "mix",
]);

function unitClass(unit: string | undefined): string {
  const u = (unit || "").trim().toLowerCase();
  if (!u || u === "unit" || u === "units" || u === "un" || u === "pcs" || u === "piece" || u === "pieces") {
    return "units";
  }
  return u;
}

function brandTokens(item: PantryItem): Set<string> {
  const brand = item.productInfo?.brand;
  return new Set(brand ? tokenizeForMatch(brand) : []);
}

/** Core identity tokens of an item (PP-189 tokens minus brand and product-form words). */
export function combineTokens(item: PantryItem): string[] {
  const brand = brandTokens(item);
  return tokenizeForMatch(item.name).filter((t) => !IGNORABLE.has(t) && !brand.has(t));
}

function isContiguousSuffix(short: string[], long: string[]): boolean {
  if (short.length === 0 || short.length >= long.length) return false;
  const offset = long.length - short.length;
  return short.every((t, i) => long[offset + i] === t);
}

/**
 * True when two token lists describe the same product. Either PP-189 closest-match
 * scoring accepts them, or the shorter name is the tail of the longer one and the
 * extra leading words (at most two) look like a brand ("Bake house pie crust").
 */
export function tokensDescribeSameProduct(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  if (scoreTokenMatch(a, b) > 0) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (!isContiguousSuffix(short, long)) return false;
  const extra = long.slice(0, long.length - short.length);
  return extra.length <= 2 && !extra.some((t) => IDENTITY_WORDS.has(t));
}

export function itemsAreSimilar(a: PantryItem, b: PantryItem): boolean {
  if (unitClass(a.unit) !== unitClass(b.unit)) return false;
  return tokensDescribeSameProduct(combineTokens(a), combineTokens(b));
}

export interface SimilarCluster {
  /** Stable id derived from the representative item. */
  id: string;
  representative: PantryItem;
  members: PantryItem[];
}

/**
 * Cluster items (only clusters of 2+ are returned). Shortest names go first so the
 * generic name ("Pie Crust") becomes the representative; each item joins the first
 * cluster whose representative it matches, so matches never chain.
 */
export function clusterSimilarItems(items: PantryItem[]): SimilarCluster[] {
  const sorted = [...items]
    .map((item) => ({ item, tokens: combineTokens(item) }))
    .filter((e) => e.tokens.length > 0)
    .sort(
      (x, y) =>
        x.tokens.length - y.tokens.length ||
        x.item.name.length - y.item.name.length ||
        x.item.id.localeCompare(y.item.id),
    );
  const clusters: { rep: (typeof sorted)[number]; members: PantryItem[] }[] = [];
  for (const entry of sorted) {
    const home = clusters.find(
      (c) =>
        unitClass(c.rep.item.unit) === unitClass(entry.item.unit) &&
        tokensDescribeSameProduct(c.rep.tokens, entry.tokens),
    );
    if (home) home.members.push(entry.item);
    else clusters.push({ rep: entry, members: [entry.item] });
  }
  return clusters
    .filter((c) => c.members.length >= 2)
    .map((c) => ({
      id: `similar-${c.rep.item.id}`,
      representative: c.rep.item,
      members: [c.rep.item, ...c.members.filter((m) => m.id !== c.rep.item.id)],
    }));
}

/** itemId → representative item, for items that belong to a similar cluster. */
export function buildSimilarRepresentativeMap(items: PantryItem[]): Map<string, PantryItem> {
  const map = new Map<string, PantryItem>();
  for (const cluster of clusterSimilarItems(items)) {
    for (const m of cluster.members) map.set(m.id, cluster.representative);
  }
  return map;
}
