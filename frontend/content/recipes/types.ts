/**
 * PP-184: typed content model for the public recipe library.
 *
 * Deliberately has NO rating, review, or nutrition fields: we never invent
 * those, and structured data may only use fields that exist here.
 */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/** Diet tags we filter on. "vegan" recipes are also vegetarian. */
export type DietTag = "vegetarian" | "vegan";

export interface RecipeIngredient {
  /** Quantity at the recipe's base servings. null means "no amount" (salt to taste). */
  qty: number | null;
  /** Singular unit: tsp, tbsp, cup, oz, lb, can, clove, stalk, slice, pinch. Omit for counted items. */
  unit?: "tsp" | "tbsp" | "cup" | "oz" | "lb" | "can" | "clove" | "stalk" | "slice" | "pinch";
  /** Package size shown after the unit, e.g. "15 oz" renders "1 can (15 oz) black beans". */
  size?: string;
  item: string;
  /** Plural form of `item` for counted items (e.g. "large eggs"). */
  plural?: string;
  /** Prep note shown after a comma ("diced", "drained and rinsed"). */
  note?: string;
  /** false keeps the line exactly as written when servings change. Defaults to true. */
  scalable?: boolean;
}

export interface RecipeFaq {
  question: string;
  /** Plain text. Rendered on the page and in FAQPage JSON-LD character for character. */
  answer: string;
}

export interface Recipe {
  slug: string;
  /** Dish name. Used for the H1, breadcrumbs, and the Recipe JSON-LD name. No brand. */
  title: string;
  /** Page <title> without the brand (the root template adds " | Pantry Hub"). Aim for 40 to 50 characters. */
  seoTitle: string;
  /** Short phrase that starts the meta description; the rest is built from pantryStaples. */
  metaSummary: string;
  /** Opening answer, 2 to 3 sentences: what it is, how long it takes, which staples it uses. Also the JSON-LD description. */
  intro: string;
  meal: MealType;
  /** Extra tags: diet tags plus things like "one-pot", "freezer-friendly", "leftovers". */
  tags: string[];
  servings: number;
  prepMin: number;
  cookMin: number;
  /** Real dates (YYYY-MM-DD) for JSON-LD datePublished and the sitemap lastModified. Never `new Date()`. */
  datePublished: string;
  updated: string;
  /** Static image path under /public. Real image lands later; a placeholder renders until then. */
  image: string;
  /** Alt text. Must say the image is an AI illustration. */
  imageAlt: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  /** What to swap if you are missing something. Every recipe has at least two. */
  substitutions: string[];
  /** Storage, reheating, and serving ideas. */
  tips: string[];
  /** Only real questions people ask about this dish. Most recipes have none. */
  faqs?: RecipeFaq[];
  /** Source for facts stated in the FAQ answers (for example USDA FSIS). */
  faqSource?: { label: string; url: string };
  /** Pantry staples this recipe leans on. The first three feed the meta description. */
  pantryStaples: string[];
  /** Exactly three related recipe slugs on the same staple or leftover theme. */
  related: [string, string, string];
}
