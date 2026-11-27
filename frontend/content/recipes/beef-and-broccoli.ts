import type { Recipe } from "./types";

export const beefAndBroccoli: Recipe = {
  slug: "beef-and-broccoli",
  title: "Beef and Broccoli",
  seoTitle: "Beef and Broccoli Stir-Fry for Weeknights",
  metaSummary: "Beef and broccoli stir-fry, about 30 minutes",
  intro:
    "This is a beef and broccoli stir-fry that takes about 30 minutes. Thin slices of beef and broccoli cook in a skillet with a garlic-soy sauce. Serve it over rice for a weeknight dinner.",
  meal: "dinner",
  tags: ["quick"],
  servings: 4,
  prepMin: 15,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/beef-and-broccoli.webp",
  imageAlt: "AI-generated illustration of beef and broccoli in a brown garlic-soy sauce in a skillet, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "lb", item: "flank steak", note: "sliced thin against the grain" },
    { qty: 4, unit: "cup", item: "broccoli florets" },
    { qty: 0.25, unit: "cup", item: "soy sauce" },
    { qty: 2, unit: "tbsp", item: "brown sugar" },
    { qty: 3, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 1, unit: "tbsp", item: "vegetable oil" },
    { qty: 0.5, unit: "cup", item: "beef broth", note: "or water" },
    { qty: 1, unit: "tbsp", item: "cornstarch" },
  ],
  steps: [
    "Stir the soy sauce, brown sugar, garlic, broth, and cornstarch together in a bowl.",
    "Heat ½ tablespoon of the oil in a large skillet over high heat. Cook the beef in a single layer, in batches if needed, until browned, about 2 minutes per batch. Transfer to a plate.",
    "Add the remaining ½ tablespoon oil and the broccoli. Stir-fry for 3 to 4 minutes, adding a splash of water if the pan is dry, until the broccoli is crisp-tender.",
    "Return the beef, pour in the sauce, and toss until the sauce thickens and coats everything, about 1 minute. Serve hot over rice if you like.",
  ],
  substitutions: [
    "Flank steak: use sirloin or skirt steak, sliced thin, or 1 pound leftover steak warmed in the sauce at the end.",
    "Beef broth: use water or chicken broth.",
    "Brown sugar: use 2 tablespoons honey.",
  ],
  tips: [
    "Slicing the beef thin and against the grain keeps it tender; a 15-minute freeze makes slicing easier.",
    "Do not crowd the skillet when you brown the beef, or it will steam.",
  ],
  pantryStaples: ["beef", "broccoli", "soy sauce"],
  related: ["vegetable-stir-fry", "leftover-rice-fried-rice", "honey-garlic-shrimp"],
};
