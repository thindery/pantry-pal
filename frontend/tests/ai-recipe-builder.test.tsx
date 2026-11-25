import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PantryItem, ShoppingListItem } from "@/types";
import { ApiError } from "@/lib/api-error";

const getAiRecipeStatus = vi.fn();
const suggestAiRecipes = vi.fn();
const createRecipe = vi.fn();
const trackEvent = vi.fn();

vi.mock("@/services/ai", async () => {
  const actual = await vi.importActual<typeof import("@/services/ai")>("@/services/ai");
  return {
    ...actual,
    getAiRecipeStatus: (...a: unknown[]) => getAiRecipeStatus(...a),
    suggestAiRecipes: (...a: unknown[]) => suggestAiRecipes(...a),
  };
});
vi.mock("@/services/recipeService", () => ({ createRecipe: (...a: unknown[]) => createRecipe(...a) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }));

import { AiRecipeBuilder } from "@/components/dashboard/AiRecipeBuilder";

const inventory = [
  { id: "1", name: "Eggs", quantity: 12, unit: "units", category: "dairy", lastUpdated: "" },
  { id: "2", name: "Spinach", quantity: 1, unit: "bags", category: "produce", lastUpdated: "" },
  { id: "3", name: "Rice", quantity: 0, unit: "bags", category: "pantry", lastUpdated: "" },
] as PantryItem[];

const idea = {
  title: "Spinach Omelet",
  minutes: 10,
  servings: "2",
  ingredients: [
    { raw: "4 eggs", name: "eggs" },
    { raw: "1 cup spinach", name: "spinach" },
    { raw: "1/4 cup feta", name: "feta" },
  ],
  instructions: ["Whisk eggs.", "Cook with spinach."],
  usesSoon: ["Spinach"],
};

const usage = { usedTokens: 5000, limitTokens: 50000, resetsAt: null };

function renderBuilder(shoppingList: ShoppingListItem[] = []) {
  const onAdd = vi.fn();
  const onSaved = vi.fn();
  const onUpgrade = vi.fn();
  render(
    <AiRecipeBuilder
      inventory={inventory}
      shoppingList={shoppingList}
      onAddShoppingItems={onAdd}
      onRecipeSaved={onSaved}
      onUpgrade={onUpgrade}
    />,
  );
  return { onAdd, onSaved, onUpgrade };
}

beforeEach(() => {
  getAiRecipeStatus.mockReset();
  suggestAiRecipes.mockReset();
  createRecipe.mockReset();
  trackEvent.mockReset();
});
afterEach(cleanup);

describe("AiRecipeBuilder", () => {
  it("renders nothing when the server has AI off", async () => {
    getAiRecipeStatus.mockResolvedValue({ enabled: false });
    renderBuilder();
    await waitFor(() => expect(getAiRecipeStatus).toHaveBeenCalled());
    expect(screen.queryByTestId("ai-recipe-builder")).toBeNull();
  });

  it("shows the Pro upsell to free users and never calls suggest", async () => {
    getAiRecipeStatus.mockResolvedValue({ enabled: true, eligible: false });
    const { onUpgrade } = renderBuilder();
    fireEvent.click(await screen.findByRole("button", { name: /Upgrade to Pro/ }));
    expect(onUpgrade).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Suggest recipes/ })).toBeNull();
    expect(suggestAiRecipes).not.toHaveBeenCalled();
  });

  it("sends the adjustments, shows ideas, saves and adds missing to the list", async () => {
    getAiRecipeStatus.mockResolvedValue({ enabled: true, eligible: true, usage });
    suggestAiRecipes.mockResolvedValue({ recipes: [idea], cached: false, usage: { ...usage, usedTokens: 10000 } });
    createRecipe.mockResolvedValue({ id: "r-1", title: idea.title });
    const { onAdd, onSaved } = renderBuilder();

    expect(await screen.findByTestId("ai-usage-meter")).toHaveTextContent("AI use this week: 10%");
    fireEvent.change(screen.getByLabelText("Servings"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Diet"), { target: { value: "vegetarian" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "30" } });
    // only in-stock items are offered as must-use
    const pick = screen.getByLabelText("Add a must-use item");
    expect(pick).not.toHaveTextContent("Rice");
    fireEvent.change(pick, { target: { value: "Spinach" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "one pan" } });
    fireEvent.click(screen.getByRole("button", { name: /Suggest recipes/ }));

    await screen.findByText("Spinach Omelet");
    expect(suggestAiRecipes).toHaveBeenCalledWith({
      servings: 4,
      diet: "vegetarian",
      maxMinutes: 30,
      mustUse: ["Spinach"],
      note: "one pan",
    });
    expect(screen.getByText("Uses up: Spinach")).toBeInTheDocument();
    expect(screen.getByText("2/3 in pantry")).toBeInTheDocument();
    expect(screen.getByTestId("ai-usage-meter")).toHaveTextContent("20%");

    fireEvent.click(screen.getByRole("button", { name: /Add 1 missing to list/ }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0].map((i: ShoppingListItem) => i.name)).toEqual(["feta"]);

    fireEvent.click(screen.getByRole("button", { name: /Save recipe/ }));
    await screen.findByText(/Saved. Open recipe/);
    expect(createRecipe).toHaveBeenCalledWith({
      title: "Spinach Omelet",
      servings: "2",
      ingredients: idea.ingredients,
      instructions: idea.instructions,
    });
    expect(onSaved).toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith("ai_recipe_saved", {});
  });

  it("shows the server's friendly message when blocked", async () => {
    getAiRecipeStatus.mockResolvedValue({ enabled: true, eligible: true, usage });
    suggestAiRecipes.mockRejectedValue(
      new ApiError("You've used this week's AI recipe ideas. They refresh within 7 days.", 429, "AI_WEEKLY_LIMIT"),
    );
    renderBuilder();
    fireEvent.click(await screen.findByRole("button", { name: /Suggest recipes/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("this week's AI recipe ideas");
  });

  it("does not re-add items already on the shopping list", async () => {
    getAiRecipeStatus.mockResolvedValue({ enabled: true, eligible: true, usage });
    suggestAiRecipes.mockResolvedValue({ recipes: [idea], cached: true, usage });
    const existing = [
      { id: "s", name: "feta", category: "other", currentQuantity: 0, suggestedQuantity: 1, unit: "pieces", isManual: true, isChecked: false, addedAt: "", reason: "manual" },
    ] as ShoppingListItem[];
    const { onAdd } = renderBuilder(existing);
    fireEvent.click(await screen.findByRole("button", { name: /Suggest recipes/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Add 1 missing to list/ }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("already on your shopping list");
  });

  it("never names a model or vendor in the UI", async () => {
    getAiRecipeStatus.mockResolvedValue({ enabled: true, eligible: true, usage });
    suggestAiRecipes.mockResolvedValue({ recipes: [idea], cached: false, usage });
    renderBuilder();
    fireEvent.click(await screen.findByRole("button", { name: /Suggest recipes/ }));
    await screen.findByText("Spinach Omelet");
    const text = (screen.getByTestId("ai-recipe-builder").textContent || "").toLowerCase();
    for (const banned of ["gemini", "ollama", "gemma", "google", "openai", "gpt", "llama"]) {
      expect(text).not.toContain(banned);
    }
  });
});
