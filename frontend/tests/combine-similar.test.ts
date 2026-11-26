import { describe, expect, it } from "vitest";
import {
  buildSimilarRepresentativeMap,
  clusterSimilarItems,
  itemsAreSimilar,
} from "@/lib/combine-similar";
import { buildAutoShoppingListItems } from "@/lib/shopping-list-utils";
import { getIngredientCoverage } from "@/lib/recipe-coverage";
import type { PantryItem } from "@/types";

let n = 0;
function item(name: string, quantity = 1, extra: Partial<PantryItem> = {}): PantryItem {
  n += 1;
  return {
    id: `i${n}`,
    name,
    quantity,
    unit: "units",
    category: "other",
    lastUpdated: "2026-11-26T00:00:00Z",
    ...extra,
  };
}

describe("PP-190 combine similar items", () => {
  it("combines the two pie crusts from the screenshots", () => {
    const a = item("Pie Crust");
    const b = item("Bake house pie crust");
    expect(itemsAreSimilar(a, b)).toBe(true);
    const clusters = clusterSimilarItems([b, a]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].representative.name).toBe("Pie Crust");
    expect(clusters[0].members.map((m) => m.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("combines cream of chicken variants but never cream of mushroom", () => {
    const a = item("Cream of chicken");
    const b = item("Cream of Chicken condensed soup");
    const c = item("Condensed Cream of Chicken Soup");
    const d = item("Cream of Mushroom Condensed Soup");
    expect(itemsAreSimilar(a, b)).toBe(true);
    expect(itemsAreSimilar(a, c)).toBe(true);
    expect(itemsAreSimilar(a, d)).toBe(false);
    expect(clusterSimilarItems([a, b, c, d])).toHaveLength(1);
  });

  it("does not combine butter with look-alikes", () => {
    const butter = item("Butter", 2);
    for (const other of [
      "Peanut Butter Spread",
      "Butter cake",
      "Butter Golden Cake Mix",
      "Buttermilk Pancake & Waffle Mix",
      "Buttery Golden Selects Mashed Potatoes",
    ]) {
      expect(itemsAreSimilar(butter, item(other))).toBe(false);
    }
  });

  it("does not combine heavy whipping cream with cream cheese or cream of chicken", () => {
    const cream = item("Heavy Whipping Cream");
    expect(itemsAreSimilar(cream, item("Cream Cheese"))).toBe(false);
    expect(itemsAreSimilar(cream, item("Cream of chicken"))).toBe(false);
  });

  it("does not treat a flavor as a brand (graham cracker pie crust)", () => {
    expect(itemsAreSimilar(item("Pie Crust"), item("Graham cracker pie crust"))).toBe(false);
  });

  it("does not combine items with different units", () => {
    expect(itemsAreSimilar(item("Pie Crust"), item("Pie Crust", 1, { unit: "lbs" }))).toBe(false);
  });

  it("never mutates the underlying items", () => {
    const a = item("Pie Crust", 1);
    const b = item("Bake house pie crust", 2);
    const before = JSON.stringify([a, b]);
    clusterSimilarItems([a, b]);
    expect(JSON.stringify([a, b])).toBe(before);
  });

  it("shopping list rolls similar items up into one row", () => {
    const a = item("Pie Crust", 1);
    const b = item("Bake house pie crust", 1);
    const reps = buildSimilarRepresentativeMap([b, a]);
    const without = buildAutoShoppingListItems([b, a], undefined, undefined, [], []);
    expect(without).toHaveLength(0); // both have 1 (target 1) so nothing is needed either way
    const low = [item("Pie Crust", 0), item("Bake house pie crust", 0)];
    const split = buildAutoShoppingListItems(low, undefined, undefined, [], []);
    const combined = buildAutoShoppingListItems(
      low,
      undefined,
      undefined,
      [],
      [],
      buildSimilarRepresentativeMap(low),
    );
    expect(split).toHaveLength(2);
    expect(combined).toHaveLength(1);
    expect(combined[0].name).toBe("Pie Crust");
    expect(reps.size).toBe(2);
  });

  it("recipe matching counts the combined quantity of similar items", () => {
    const inv = [item("Pie Crust", 1), item("Bake house pie crust", 1)];
    const cov = getIngredientCoverage({ raw: "2 pie crusts", name: "pie crusts" }, inv);
    expect(cov.status).toBe("have");
  });
});

describe("PP-190 against the real pantry shape (names from the live report)", () => {
  it("groups only the genuine near-duplicates", () => {
    const names = [
      "Always save, condensed soup, cream of mushroom", "Bake house pie crust", "Butter",
      "Butter Golden Cake Mix", "Butter cake", "Butter golden cake mix, butter golden imp",
      "Buttermilk Pancake & Waffle Mix", "Buttery Golden Selects Mashed Potatoes",
      "Condensed Cream of Chicken Soup", "Cream Cheese", "Cream of Chicken condensed soup",
      "Cream of Mushroom Condensed Soup", "Cream of chicken", "Cream style corn, cream style",
      "Heavy Whipping Cream", "Peanut Butter Spread", "Pie Crust", "SWEET CORN CREAM STYLE",
      "Cream of tartar",
    ];
    const clusters = clusterSimilarItems(names.map((nm) => item(nm)));
    const summary = clusters.map((c) => c.members.map((m) => m.name).sort()).sort();
    expect(summary).toEqual([
      ["Always save, condensed soup, cream of mushroom", "Cream of Mushroom Condensed Soup"],
      ["Bake house pie crust", "Pie Crust"],
      ["Condensed Cream of Chicken Soup", "Cream of Chicken condensed soup", "Cream of chicken"],
      ["Cream style corn, cream style", "SWEET CORN CREAM STYLE"],
    ]);
  });
});
