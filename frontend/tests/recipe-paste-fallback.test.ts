import { describe, expect, it, vi } from "vitest";
import { parseRecipe, importRecipe, updateRecipe } from "@/services/recipeService";
import * as apiService from "@/services/apiService";

describe("recipe paste fallback and service methods", () => {
  it("calls /api/recipes/parse with text and sourceUrl", async () => {
    const mockDraft = {
      title: "Neiman Marcus Cake II",
      sourceUrl: "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/",
      imageUrl: null,
      servings: "12",
      ingredients: [
        { raw: "1 package yellow cake mix", name: "yellow cake mix" },
      ],
      instructions: ["Preheat oven to 350 degrees."],
    };

    const fetchSpy = vi.spyOn(apiService, "fetchApi").mockResolvedValueOnce({
      success: true,
      data: mockDraft,
    });

    const result = await parseRecipe({
      text: "Neiman Marcus Cake II\nIngredients\n1 package yellow cake mix\nDirections\nPreheat oven to 350 degrees.",
      sourceUrl: "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/?utm_source=fb",
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/recipes/parse", {
      method: "POST",
      body: JSON.stringify({
        text: "Neiman Marcus Cake II\nIngredients\n1 package yellow cake mix\nDirections\nPreheat oven to 350 degrees.",
        sourceUrl: "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/?utm_source=fb",
      }),
    });
    expect(result.title).toBe("Neiman Marcus Cake II");
    expect(result.ingredients.length).toBe(1);
    fetchSpy.mockRestore();
  });

  it("calls /api/recipes/import with url", async () => {
    const mockRecipe = {
      id: "recipe-123",
      userId: "u1",
      title: "Cookies",
      sourceUrl: "https://example.com/cookies",
      imageUrl: null,
      servings: "24",
      ingredients: [{ raw: "1 cup sugar", name: "sugar" }],
      instructions: ["Bake."],
      createdAt: "2026-11-23T00:00:00Z",
    };

    const fetchSpy = vi.spyOn(apiService, "fetchApi").mockResolvedValueOnce({
      success: true,
      data: mockRecipe,
    });

    const result = await importRecipe("https://example.com/cookies");
    expect(fetchSpy).toHaveBeenCalledWith("/api/recipes/import", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/cookies" }),
    });
    expect(result.id).toBe("recipe-123");
    fetchSpy.mockRestore();
  });

  it("calls PATCH /api/recipes/:id to save added details", async () => {
    const mockRecipe = {
      id: "recipe-123",
      userId: "u1",
      title: "Neiman Marcus Cake II",
      sourceUrl: "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/",
      imageUrl: null,
      servings: "12",
      ingredients: [{ raw: "1 package yellow cake mix", name: "yellow cake mix" }],
      instructions: ["Preheat the oven."],
      isComplete: true,
      createdAt: "2026-11-23T00:00:00Z",
    };
    const fetchSpy = vi.spyOn(apiService, "fetchApi").mockResolvedValueOnce({
      success: true,
      data: mockRecipe,
    });
    const result = await updateRecipe("recipe-123", {
      title: "Neiman Marcus Cake II",
      sourceUrl: "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/",
      servings: "12",
      ingredients: ["1 package yellow cake mix"],
      instructions: ["Preheat the oven."],
    });
    expect(fetchSpy).toHaveBeenCalledWith("/api/recipes/recipe-123", {
      method: "PATCH",
      body: JSON.stringify({
        title: "Neiman Marcus Cake II",
        sourceUrl: "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/",
        servings: "12",
        ingredients: ["1 package yellow cake mix"],
        instructions: ["Preheat the oven."],
      }),
    });
    expect(result.isComplete).toBe(true);
    fetchSpy.mockRestore();
  });
});
