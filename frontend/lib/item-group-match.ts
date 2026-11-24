import type { ItemGroup, PantryItem } from "@/types";

const COMMON_BRANDS = [
  "kirkland signature",
  "signature select",
  "simply nature",
  "good & gather",
  "market pantry",
  "member's mark",
  "members mark",
  "whole foods",
  "great value",
  "campbell's",
  "campbells",
  "campbell",
  "progresso",
  "swanson",
  "pacific",
  "kroger",
  "hy-vee",
  "hy vee",
  "del monte",
  "equate",
  "heinz",
  "kraft",
  "hunt's",
  "hunts",
  "dole",
  "aldi",
  "365",
  "kirkland",
];

export function toTitleCase(str: string): string {
  if (!str) return "";
  return str.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Normalizes a product name to its core product identity for exact matching:
 * - lowercase, strip ®™, apostrophes/possessives, punctuation → spaces, collapse whitespace;
 * - remove the known brand (if brand given) and curated leading common brand names;
 * - remove size/count tokens: numbers with units (oz, fl oz, ounce(s), lb(s), g, kg, ml, l, ct, count, pack, pk, can(s))
 *   and standalone "x" multipliers like "4 x";
 * - keep all other words (variant/flavor words like cream of chicken vs cream of mushroom, low sodium, soup, condensed).
 */
export function productMatchKey(name: string, brand?: string | null): string {
  if (!name) return "";
  let text = name.toLowerCase();

  // Strip ® and ™
  text = text.replace(/[®™]/g, "");

  // Strip apostrophes and possessives (e.g. campbell's -> campbells, hunt's -> hunts)
  text = text.replace(/['’]s\b/g, "").replace(/['’]/g, "");

  // Remove size/count tokens: numbers with units
  text = text.replace(
    /\b\d+(?:\.\d+)?\s*(?:fl\s*oz|oz|ounces?|lbs?|pounds?|kg|grams?|g|ml|liters?|l|count|ct|packs?|pk|cans?)\b/gi,
    " "
  );

  // Standalone multipliers like "4 x" or "4x"
  text = text.replace(/\b\d+\s*x\b/gi, " ");

  // Punctuation to spaces
  text = text.replace(/[^a-z0-9]+/g, " ").trim();

  // Remove known brand if given and leads the name
  if (brand) {
    const cleanBrand = brand
      .toLowerCase()
      .replace(/[®™]/g, "")
      .replace(/['’]s\b/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (cleanBrand && text.startsWith(cleanBrand)) {
      const rest = text.slice(cleanBrand.length).trim();
      if (rest) text = rest;
    }
  }

  // Remove leading curated brand words
  for (const b of COMMON_BRANDS) {
    const cleanB = b
      .replace(/['’]s\b/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (text === cleanB) break;
    if (text.startsWith(cleanB + " ")) {
      text = text.slice(cleanB.length).trim();
      break;
    }
  }

  return text.replace(/\s+/g, " ").trim();
}

/**
 * Returns the first existing other item (or its group, if that item is grouped)
 * whose key equals the new item's key, excluding the item itself and items already
 * in the same group; null otherwise.
 */
export function findGroupSuggestion(
  newItem: PantryItem,
  inventory: PantryItem[],
  groups: ItemGroup[] = []
): PantryItem | ItemGroup | null {
  const newBrand = newItem.productInfo?.brand;
  const newKey = productMatchKey(newItem.name, newBrand);
  if (!newKey) return null;

  for (const item of inventory) {
    if (item.id === newItem.id) continue;
    if (newItem.groupId && item.groupId === newItem.groupId) continue;

    const itemBrand = item.productInfo?.brand;
    const itemKey = productMatchKey(item.name, itemBrand);

    if (itemKey && itemKey === newKey) {
      if (item.groupId) {
        const grp = groups.find((g) => g.id === item.groupId);
        if (grp) return grp;
      }
      return item;
    }
  }

  return null;
}

export const SUGGESTION_STOPWORDS = [
  "of",
  "the",
  "a",
  "an",
  "and",
  "with",
  "in",
  "for",
  "100",
  "pure",
  "condensed",
  "original",
  "classic",
  "style",
  "brand",
  "premium",
  "real",
  "fresh",
] as const;

export const VARIANT_MODIFIERS = [
  "low",
  "sodium",
  "reduced",
  "fat",
  "free",
  "sugar",
  "no",
  "salt",
  "added",
  "lite",
  "light",
  "diet",
  "zero",
  "unsalted",
  "unsweetened",
  "sweetened",
  "spicy",
  "hot",
  "mild",
  "extra",
  "whole",
  "skim",
  "decaf",
] as const;

const STOPWORDS_SET = new Set<string>(SUGGESTION_STOPWORDS);
const VARIANT_MODIFIERS_SET = new Set<string>(VARIANT_MODIFIERS);

export type GroupSuggestion =
  | { kind: "group"; group: ItemGroup; score: number; tier: 1 | 2 | 3 }
  | { kind: "item"; item: PantryItem; score: number; tier: 1 | 2 | 3 };

export function getSignificantTokens(key: string): Set<string> {
  if (!key) return new Set();
  const rawTokens = key.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = rawTokens.filter((t) => !STOPWORDS_SET.has(t));
  return new Set(filtered);
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function isStrictSubset(sub: Set<string>, sup: Set<string>): boolean {
  if (sub.size >= sup.size || sub.size === 0) return false;
  for (const item of sub) {
    if (!sup.has(item)) return false;
  }
  return true;
}

function setDifference(larger: Set<string>, smaller: Set<string>): Set<string> {
  const diff = new Set<string>();
  for (const item of larger) {
    if (!smaller.has(item)) {
      diff.add(item);
    }
  }
  return diff;
}

function scoreComparableName(
  sourceKey: string,
  sourceTokens: Set<string>,
  candName: string,
  candBrand?: string | null
): { tier: 1 | 2 | 3; score: number } | null {
  if (sourceTokens.size === 0) return null;

  const candKey = productMatchKey(candName, candBrand);
  if (!candKey) return null;

  const candTokens = getSignificantTokens(candKey);
  if (candTokens.size === 0) return null;

  let sharedCount = 0;
  for (const t of sourceTokens) {
    if (candTokens.has(t)) {
      sharedCount++;
    }
  }

  if (sharedCount === 0) return null;

  const unionSize = new Set([...sourceTokens, ...candTokens]).size;
  const score = sharedCount / unionSize;

  // Tier 1 – exact core match: keys equal, or significant-token sets equal
  if (sourceKey === candKey || setsEqual(sourceTokens, candTokens)) {
    return { tier: 1, score };
  }

  // Tier 2 – compatible subset: one side's significant tokens are a strict subset of the other's,
  // AND the extra tokens contain no variant modifier
  const isSourceSubset = isStrictSubset(sourceTokens, candTokens);
  const isCandSubset = isStrictSubset(candTokens, sourceTokens);

  if (isSourceSubset || isCandSubset) {
    const extraTokens = isSourceSubset
      ? setDifference(candTokens, sourceTokens)
      : setDifference(sourceTokens, candTokens);

    let hasVariantModifier = false;
    for (const t of extraTokens) {
      if (VARIANT_MODIFIERS_SET.has(t)) {
        hasVariantModifier = true;
        break;
      }
    }

    if (!hasVariantModifier) {
      return { tier: 2, score };
    }
  }

  // Tier 3 – partial overlap
  return { tier: 3, score };
}

function isBetterMatch(
  current: { tier: 1 | 2 | 3; score: number },
  best: { tier: 1 | 2 | 3; score: number } | null
): boolean {
  if (!best) return true;
  if (current.tier !== best.tier) {
    return current.tier < best.tier;
  }
  return current.score > best.score;
}

export function rankGroupSuggestions(
  source: PantryItem,
  inventory: PantryItem[] = [],
  groups: ItemGroup[] = [],
  limit = 5
): GroupSuggestion[] {
  if (!source?.name || limit <= 0) return [];

  const sourceKey = productMatchKey(source.name, source.productInfo?.brand);
  const sourceTokens = getSignificantTokens(sourceKey);
  if (sourceTokens.size === 0) return [];

  const sourceGroupId = source.groupId;
  const isOwnGroup = (g: ItemGroup) => {
    if (sourceGroupId && g.id === sourceGroupId) return true;
    if (g.itemIds && g.itemIds.includes(source.id)) return true;
    return false;
  };

  const results: GroupSuggestion[] = [];

  // Candidate groups: every group except the source's own group
  const candidateGroups = groups.filter((g) => !isOwnGroup(g));

  for (const group of candidateGroups) {
    let bestMatch: { tier: 1 | 2 | 3; score: number } | null = null;

    // Comparable name 1: group's own name
    const groupNameMatch = scoreComparableName(
      sourceKey,
      sourceTokens,
      group.name
    );
    if (groupNameMatch && isBetterMatch(groupNameMatch, bestMatch)) {
      bestMatch = groupNameMatch;
    }

    // Comparable names 2+: each member's name
    const memberItems = inventory.filter(
      (i) =>
        i.id !== source.id &&
        ((group.itemIds && group.itemIds.includes(i.id)) ||
          (i.groupId && i.groupId === group.id))
    );

    for (const member of memberItems) {
      const memberMatch = scoreComparableName(
        sourceKey,
        sourceTokens,
        member.name,
        member.productInfo?.brand
      );
      if (memberMatch && isBetterMatch(memberMatch, bestMatch)) {
        bestMatch = memberMatch;
      }
    }

    if (bestMatch) {
      results.push({
        kind: "group",
        group,
        score: bestMatch.score,
        tier: bestMatch.tier,
      });
    }
  }

  // Candidate items: every ungrouped item except the source itself
  const candidateItems = inventory.filter((item) => {
    if (item.id === source.id) return false;
    if (item.groupId) return false;
    if (groups.some((g) => g.itemIds && g.itemIds.includes(item.id))) return false;
    return true;
  });

  for (const item of candidateItems) {
    const match = scoreComparableName(
      sourceKey,
      sourceTokens,
      item.name,
      item.productInfo?.brand
    );
    if (match) {
      results.push({
        kind: "item",
        item,
        score: match.score,
        tier: match.tier,
      });
    }
  }

  // Sort by tier asc, score desc, then name asc
  results.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const nameA = a.kind === "group" ? a.group.name : a.item.name;
    const nameB = b.kind === "group" ? b.group.name : b.item.name;
    return nameA.localeCompare(nameB);
  });

  return results.slice(0, limit);
}
