import { fetchApi } from "./apiService";
import type { Recipe, RecipeIngredient } from "@/types";

export interface CreateRecipePayload {
  title: string;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  servings?: string | null;
  ingredients: Array<RecipeIngredient | string>;
  instructions: string[];
}

export const getRecipes = async (): Promise<Recipe[]> => {
  const res = await fetchApi<{ success: boolean; data: Recipe[] }>("/api/recipes");
  return res.data || [];
};

export const getRecipe = async (id: string): Promise<Recipe> => {
  const res = await fetchApi<{ success: boolean; data: Recipe }>(`/api/recipes/${id}`);
  return res.data;
};

export const createRecipe = async (payload: CreateRecipePayload): Promise<Recipe> => {
  const res = await fetchApi<{ success: boolean; data: Recipe }>("/api/recipes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
};

export const importRecipe = async (url: string): Promise<Recipe> => {
  const res = await fetchApi<{ success: boolean; data: Recipe }>("/api/recipes/import", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return res.data;
};

export const deleteRecipe = async (id: string): Promise<void> => {
  await fetchApi<{ success: boolean }>(`/api/recipes/${id}`, {
    method: "DELETE",
  });
};
