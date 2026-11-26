import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CookChecklist } from "@/components/dashboard/CookChecklist";
import { UsedItTypeahead } from "@/components/dashboard/UsedItTypeahead";
import { buildCookLines, defaultConsumeAmount, searchPantryForUse } from "@/lib/consume";
import { calculateRecipeCoverage } from "@/lib/recipe-coverage";
import type { PantryItem, Recipe } from "@/types";

function item(id: string, name: string, quantity: number, unit = "units"): PantryItem {
  return { id, name, quantity, unit, category: "other", lastUpdated: "2026-11-26T00:00:00Z" };
}

const recipe = {
  id: "r1",
  userId: "u",
  title: "Cheddar casserole",
  ingredients: [
    { raw: "1 can cheddar cheese soup", name: "cheddar cheese soup" },
    { raw: "2 tbsp butter", name: "butter" },
    { raw: "1 cup heavy cream (optional)", name: "heavy cream" },
    { raw: "salt", name: "salt" },
    { raw: "3 eggs", name: "eggs" },
  ],
} as unknown as Recipe;

const inventory = [
  item("a", "Cheddar Cheese Soup", 2),
  item("b", "Butter", 1),
  item("c", "Heavy Whipping Cream", 1),
  item("d", "Peanut Butter Spread", 1),
];

describe("PP-191 I used this", () => {
  it("pre-checks matched in-stock ingredients and skips staples and missing", () => {
    const cov = calculateRecipeCoverage(recipe, inventory);
    const lines = buildCookLines(cov.items, inventory);
    expect(lines.map((l) => l.itemId)).toEqual(["a", "b", "c"]);
    expect(lines.find((l) => l.itemId === "a")?.checked).toBe(true);
    expect(lines.find((l) => l.itemId === "c")?.checked).toBe(false); // optional
    expect(lines.every((l) => l.amount === 1)).toBe(true);
  });

  it("never picks Peanut Butter Spread for butter", () => {
    const cov = calculateRecipeCoverage(recipe, inventory);
    const butter = buildCookLines(cov.items, inventory).find((l) => l.ingredientRaw.includes("butter"));
    expect(butter?.candidates.map((c) => c.id)).toEqual(["b"]);
  });

  it("default amount is 1 unit capped at stock", () => {
    expect(defaultConsumeAmount({ quantity: 3 })).toBe(1);
    expect(defaultConsumeAmount({ quantity: 0.5 })).toBe(0.5);
    expect(defaultConsumeAmount({ quantity: 0 })).toBe(0);
  });

  it("search lists in-stock items first and keeps out-of-stock for 'Already out'", () => {
    const inv = [item("x", "Cheddar soup", 0), item("y", "Cheddar cheese soup", 2), item("z", "Rice", 1)];
    expect(searchPantryForUse(inv, "cheddar").map((i) => i.id)).toEqual(["y", "x"]);
    expect(searchPantryForUse(inv, "zzz")).toEqual([]);
  });

  it("checklist deducts only checked lines and closes on success", async () => {
    const cov = calculateRecipeCoverage(recipe, inventory);
    const onConsume = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    render(
      <CookChecklist
        coverageItems={cov.items}
        inventory={inventory}
        recipeTitle="Cheddar casserole"
        onConsume={onConsume}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("Deduct from pantry"));
    await waitFor(() => expect(onConsume).toHaveBeenCalled());
    expect(onConsume.mock.calls[0][0]).toEqual([
      { itemId: "a", amount: 1 },
      { itemId: "b", amount: 1 },
    ]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("checklist warns when the last unit is used and cancel changes nothing", () => {
    const cov = calculateRecipeCoverage(recipe, inventory);
    const onConsume = vi.fn();
    const onClose = vi.fn();
    render(
      <CookChecklist
        coverageItems={cov.items}
        inventory={inventory}
        recipeTitle="x"
        onConsume={onConsume}
        onClose={onClose}
      />,
    );
    expect(screen.getAllByText("You'll have 0 left").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
    expect(onConsume).not.toHaveBeenCalled();
  });

  it("typeahead uses the item on click and blocks items that are already out", () => {
    const onUse = vi.fn();
    const inv = [item("y", "Cheddar cheese soup", 2), item("x", "Cheddar dip", 0)];
    render(<UsedItTypeahead inventory={inv} onUse={onUse} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ched" } });
    fireEvent.click(screen.getByText("Already out"));
    expect(onUse).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Cheddar cheese soup"));
    expect(onUse).toHaveBeenCalledWith(inv[0], 1);
  });
});
