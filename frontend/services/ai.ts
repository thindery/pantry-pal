import { fetchApi } from "./apiService";
import type { RecipeIngredient } from "@/types";

/** PP-183: AI recipe builder API. All AI calls run server-side; no keys in the browser. */

export interface AiUsage {
  usedTokens: number;
  limitTokens: number;
  resetsAt: string | null;
}

export interface AiRecipeStatus {
  enabled: boolean;
  eligible?: boolean;
  usage?: AiUsage | null;
  pausedUntil?: string | null;
}

export interface AiRecipeOptions {
  servings: number;
  diet: string;
  maxMinutes: number | null;
  mustUse: string[];
  note: string;
  excludeTitles?: string[];
  regenerate?: boolean;
}

export interface AiRecipeIdea {
  title: string;
  minutes: number | null;
  servings: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  usesSoon: string[];
}

export interface AiRecipeResult {
  recipes: AiRecipeIdea[];
  cached: boolean;
  usage: AiUsage | null;
  note?: string | null;
}

export const AI_DIET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "No preference" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "dairy-free", label: "Dairy-free" },
  { value: "low-carb", label: "Low-carb" },
  { value: "high-protein", label: "High-protein" },
];

export const AI_TIME_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "Any time" },
  { value: 15, label: "15 min or less" },
  { value: 30, label: "30 min or less" },
  { value: 45, label: "45 min or less" },
  { value: 60, label: "1 hour or less" },
];

export const getAiRecipeStatus = async (): Promise<AiRecipeStatus> => {
  try {
    const res = await fetchApi<{ success: boolean; data: AiRecipeStatus }>("/api/ai/recipes/status");
    return res.data ?? { enabled: false };
  } catch {
    return { enabled: false };
  }
};

export const suggestAiRecipes = async (options: AiRecipeOptions): Promise<AiRecipeResult> => {
  const res = await fetchApi<{ success: boolean; data: AiRecipeResult }>("/api/ai/recipes/suggest", {
    method: "POST",
    body: JSON.stringify(options),
  });
  return res.data;
};
