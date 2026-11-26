import { describe, expect, it } from "vitest";
import {
  clampServings,
  factorLabel,
  formatQuantity,
  normalizeUnit,
  parseServingsParam,
  scaleIngredient,
  servingsForFactor,
} from "@/lib/recipe-scaling";

describe("formatQuantity (PP-184)", () => {
  it("uses friendly fractions", () => {
    expect(formatQuantity(0.125)).toBe("⅛");
    expect(formatQuantity(0.25)).toBe("¼");
    expect(formatQuantity(1 / 3)).toBe("⅓");
    expect(formatQuantity(0.5)).toBe("½");
    expect(formatQuantity(2 / 3)).toBe("⅔");
    expect(formatQuantity(0.75)).toBe("¾");
    expect(formatQuantity(1.5)).toBe("1½");
    expect(formatQuantity(2.25)).toBe("2¼");
  });

  it("snaps near-fractions and carries into the whole number", () => {
    expect(formatQuantity(0.33)).toBe("⅓");
    expect(formatQuantity(0.67)).toBe("⅔");
    expect(formatQuantity(1.96)).toBe("2");
    expect(formatQuantity(3)).toBe("3");
  });

  it("never shows zero for a tiny amount and rounds large amounts to the half", () => {
    expect(formatQuantity(0.02)).toBe("⅛");
    expect(formatQuantity(12.4)).toBe("12½");
    expect(formatQuantity(20.1)).toBe("20");
  });
});

describe("normalizeUnit (PP-184)", () => {
  it("3 tsp becomes 1 tbsp and 16 tbsp becomes 1 cup", () => {
    expect(normalizeUnit(3, "tsp")).toEqual({ value: 1, unit: "tbsp" });
    expect(normalizeUnit(16, "tbsp")).toEqual({ value: 1, unit: "cup" });
    expect(normalizeUnit(4, "tbsp")).toEqual({ value: 0.25, unit: "cup" });
  });

  it("steps small amounts down", () => {
    expect(normalizeUnit(0.125, "cup")).toEqual({ value: 2, unit: "tbsp" });
    expect(normalizeUnit(0.5, "tbsp")).toEqual({ value: 1.5, unit: "tsp" });
    expect(normalizeUnit(0.2, "lb")).toEqual({ value: 3.2, unit: "oz" });
  });

  it("does not convert when the result would be an awkward fraction", () => {
    expect(normalizeUnit(3.5, "tsp").unit).toBe("tsp");
    expect(normalizeUnit(5, "tbsp").unit).toBe("tbsp");
  });
});

describe("scaleIngredient (PP-184)", () => {
  it("doubles and halves with plural units", () => {
    const rice = { qty: 1, unit: "cup", item: "rice" } as const;
    expect(scaleIngredient(rice, 1).text).toBe("1 cup rice");
    expect(scaleIngredient(rice, 2).text).toBe("2 cups rice");
    expect(scaleIngredient(rice, 0.5).text).toBe("½ cup rice");
    expect(scaleIngredient(rice, 1.5).text).toBe("1½ cups rice");
  });

  it("converts units while scaling: 1 tbsp x3 stays tbsp, 1 tsp x3 becomes tbsp", () => {
    expect(scaleIngredient({ qty: 1, unit: "tsp", item: "salt" }, 3).text).toBe("1 tbsp salt");
    expect(scaleIngredient({ qty: 2, unit: "tbsp", item: "oil" }, 8).text).toBe("1 cup oil");
    expect(scaleIngredient({ qty: 2, unit: "tbsp", item: "oil" }, 0.25).text).toBe("1½ tsp oil");
  });

  it("uses plural nouns for counted items and keeps notes and sizes", () => {
    expect(scaleIngredient({ qty: 1, item: "large egg", plural: "large eggs" }, 1).text).toBe("1 large egg");
    expect(scaleIngredient({ qty: 1, item: "large egg", plural: "large eggs" }, 3).text).toBe("3 large eggs");
    expect(
      scaleIngredient({ qty: 1, unit: "can", size: "15 oz", item: "black beans", note: "drained" }, 2).text
    ).toBe("2 cans (15 oz) black beans, drained");
  });

  it("leaves non-scalable and amount-less lines alone", () => {
    expect(scaleIngredient({ qty: null, item: "Salt", note: "to taste", scalable: false }, 3).text).toBe(
      "Salt, to taste"
    );
    expect(scaleIngredient({ qty: 1, unit: "pinch", item: "salt", scalable: false }, 4).text).toBe("1 pinch salt");
    expect(scaleIngredient({ qty: null, item: "Salsa", note: "for serving" }, 2).text).toBe("Salsa, for serving");
  });

  it("rounds floating-point noise (1/3 cup x3 is exactly 1 cup)", () => {
    expect(scaleIngredient({ qty: 1 / 3, unit: "cup", item: "mayonnaise" }, 3).text).toBe("1 cup mayonnaise");
    expect(scaleIngredient({ qty: 1 / 3, unit: "cup", item: "mayonnaise" }, 1).text).toBe("⅓ cup mayonnaise");
  });
});

describe("servings helpers (PP-184)", () => {
  it("clamps custom servings", () => {
    expect(clampServings(0)).toBe(1);
    expect(clampServings(100)).toBe(48);
    expect(clampServings(7.4)).toBe(7);
    expect(clampServings(Number.NaN)).toBe(1);
  });

  it("parses ?servings= and ignores junk", () => {
    expect(parseServingsParam("?servings=8", 4)).toBe(8);
    expect(parseServingsParam("?servings=abc", 4)).toBe(4);
    expect(parseServingsParam("?servings=0", 4)).toBe(4);
    expect(parseServingsParam("?servings=999", 4)).toBe(4);
    expect(parseServingsParam("", 4)).toBe(4);
  });

  it("maps presets to servings and labels", () => {
    expect(servingsForFactor(4, 0.5)).toBe(2);
    expect(servingsForFactor(6, 3)).toBe(18);
    expect(factorLabel(0.5)).toBe("½×");
    expect(factorLabel(2)).toBe("2×");
  });
});
