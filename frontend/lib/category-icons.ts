export const CATEGORY_ICONS: Record<string, string> = {
  produce: "🥬",
  pantry: "🥫",
  dairy: "🥛",
  frozen: "🧊",
  meat: "🥩",
  beverages: "🥤",
  snacks: "🍿",
  other: "📦",
};

export function categoryIcon(category: string, name = ""): string {
  const key = (category || "other").trim().toLowerCase();
  return CATEGORY_ICONS[key] || (name.trim().charAt(0) || "?").toUpperCase();
}
