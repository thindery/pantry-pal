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
  const newBrand = newItem.productInfo?.brand || (newItem as any).brand;
  const newKey = productMatchKey(newItem.name, newBrand);
  if (!newKey) return null;

  for (const item of inventory) {
    if (item.id === newItem.id) continue;
    if (newItem.groupId && item.groupId === newItem.groupId) continue;

    const itemBrand = item.productInfo?.brand || (item as any).brand;
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
