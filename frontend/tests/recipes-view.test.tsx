import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PantryItem, Recipe } from "@/types";

const getRecipes = vi.fn();
const deleteRecipe = vi.fn();
const createRecipe = vi.fn();
const importRecipe = vi.fn();
const getAiRecipeStatus = vi.fn();
const suggestAiRecipes = vi.fn();
const confirmFn = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/hooks/use-confirm", () => ({
  useConfirm: () => confirmFn,
}));

vi.mock("@/services/recipeService", () => ({
  getRecipes: (...a: unknown[]) => getRecipes(...a),
  deleteRecipe: (...a: unknown[]) => deleteRecipe(...a),
  createRecipe: (...a: unknown[]) => createRecipe(...a),
  importRecipe: (...a: unknown[]) => importRecipe(...a),
}));

vi.mock("@/services/ai", async () => {
  const actual = await vi.importActual<typeof import("@/services/ai")>("@/services/ai");
  return {
    ...actual,
    getAiRecipeStatus: (...a: unknown[]) => getAiRecipeStatus(...a),
    suggestAiRecipes: (...a: unknown[]) => suggestAiRecipes(...a),
  };
});

const inventory: PantryItem[] = [
  { id: "i-butter", name: "Butter", quantity: 1, unit: "lb", category: "dairy", lastUpdated: "" },
  { id: "i-pasta", name: "Pasta", quantity: 2, unit: "boxes", category: "pantry", lastUpdated: "" },
];

vi.mock("@/contexts/pantry-provider", () => ({
  usePantry: () => ({
    inventory,
    isPaid: true,
    error: vi.fn(),
    shoppingList: [],
    addBatchShoppingItems: vi.fn(),
  }),
}));

import { RecipesView } from "@/components/dashboard/views/recipes-view";

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: "r-1",
    userId: "u-1",
    title: "Butter Pasta",
    sourceUrl: "https://www.allrecipes.com/butter-pasta",
    imageUrl: null,
    servings: "4",
    ingredients: [
      { raw: "2 cups pasta", name: "pasta" },
      { raw: "4 tbsp butter", name: "butter" },
    ],
    instructions: ["Boil the pasta.", "Toss with butter."],
    isComplete: true,
    createdAt: "2026-11-26T00:00:00Z",
    ...overrides,
  };
}

const store = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", memoryStorage);
  Object.defineProperty(window, "localStorage", { value: memoryStorage, configurable: true });
  getRecipes.mockReset();
  deleteRecipe.mockReset();
  createRecipe.mockReset();
  importRecipe.mockReset();
  getAiRecipeStatus.mockReset();
  suggestAiRecipes.mockReset();
  confirmFn.mockReset();
  push.mockReset();
  getRecipes.mockResolvedValue([recipe()]);
  getAiRecipeStatus.mockResolvedValue({
    enabled: true,
    eligible: true,
    usage: { usedTokens: 5000, limitTokens: 50000, resetsAt: null },
  });
});

afterEach(() => {
  cleanup();
});

describe("RecipesView compact layout (PP-192)", () => {
  it("defaults to My recipes and keeps the AI generator off the first screen", async () => {
    render(<RecipesView />);
    expect(await screen.findByRole("heading", { name: "Butter Pasta" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "My recipes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("ai-recipe-builder")).not.toBeVisible();
    expect(screen.queryByRole("button", { name: /Suggest recipes/ })).toBeNull();
  });

  it("shows the existing AI builder, including Suggest recipes, after opening Suggest with AI", async () => {
    render(<RecipesView />);
    await screen.findByRole("heading", { name: "Butter Pasta" });
    fireEvent.click(screen.getByRole("tab", { name: "Suggest with AI" }));
    const builder = screen.getByTestId("ai-recipe-builder");
    expect(builder).toBeVisible();
    expect(within(builder).getByRole("button", { name: /Suggest recipes/ })).toBeVisible();
    expect(within(builder).getByLabelText("Search your pantry")).toBeVisible();
  });

  it("renders compact cards with title, servings, pantry coverage, and source host", async () => {
    render(<RecipesView />);
    const card = await screen.findByTestId("recipe-card");
    expect(card).toHaveTextContent("Butter Pasta");
    expect(card).toHaveTextContent("Serves 4");
    expect(card).toHaveTextContent("2/2 ingredients in pantry");
    expect(card).toHaveTextContent("allrecipes.com");
    expect(screen.getByTestId("recipes-list")).toHaveAttribute("data-layout", "list");
  });

  it("switches between list and grid and remembers the choice", async () => {
    render(<RecipesView />);
    await screen.findByTestId("recipe-card");
    fireEvent.click(screen.getByRole("button", { name: "Grid view" }));
    expect(screen.getByTestId("recipes-list")).toHaveAttribute("data-layout", "grid");
    expect(window.localStorage.getItem("ph-recipes-layout")).toBe("grid");
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByTestId("recipes-list")).toHaveAttribute("data-layout", "list");
  });

  it("does not include model names in the recipes page copy", async () => {
    render(<RecipesView />);
    await screen.findByRole("tab", { name: "Suggest with AI" });
    fireEvent.click(screen.getByRole("tab", { name: "Suggest with AI" }));
    await waitFor(() => expect(screen.getByTestId("ai-recipe-builder")).toBeVisible());
    const text = document.body.textContent || "";
    expect(text.toLowerCase()).not.toMatch(/gemini|ollama|gemma/);
  });
});
