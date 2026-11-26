import { MEAL_LABELS, totalMinutes, type Recipe, type RecipeFaq } from "@/content/recipes";
import { scaleIngredients } from "@/lib/recipe-scaling";
import { BRAND_NAME, SITE_URL } from "@/lib/site-content";

/** ISO 8601 duration, e.g. 75 -> "PT1H15M". */
export function isoDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h > 0 ? `${h}H` : ""}${m > 0 || h === 0 ? `${m}M` : ""}`;
}

export function recipeUrl(slug: string): string {
  return `${SITE_URL}/recipes/${slug}/`;
}

/**
 * Recipe structured data built only from fields we really have.
 * No aggregateRating, review, or nutrition: we never invent those. `image` is
 * only emitted once the real image file exists.
 */
export function buildRecipeJsonLd(recipe: Recipe, opts: { hasImage: boolean }): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.intro,
    datePublished: recipe.datePublished,
    url: recipeUrl(recipe.slug),
    author: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
    prepTime: isoDuration(recipe.prepMin),
    totalTime: isoDuration(totalMinutes(recipe)),
    recipeYield: `${recipe.servings} servings`,
    recipeCategory: MEAL_LABELS[recipe.meal],
    keywords: recipe.tags.join(", "),
    recipeIngredient: scaleIngredients(recipe.ingredients, 1).map((i) => i.text),
    recipeInstructions: recipe.steps.map((text) => ({ "@type": "HowToStep", text })),
  };
  if (recipe.cookMin > 0) ld.cookTime = isoDuration(recipe.cookMin);
  if (opts.hasImage) ld.image = [`${SITE_URL}${recipe.image}`];
  const diets: string[] = [];
  if (recipe.tags.includes("vegan")) diets.push("https://schema.org/VeganDiet");
  if (recipe.tags.includes("vegetarian")) diets.push("https://schema.org/VegetarianDiet");
  if (diets.length > 0) ld.suitableForDiet = diets;
  return ld;
}

/** FAQPage markup. The answers are the exact visible text on the page (PP-106). */
export function buildFaqJsonLd(faqs: readonly RecipeFaq[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function buildBreadcrumbJsonLd(items: ReadonlyArray<{ name: string; url: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Serialize for a <script type="application/ld+json"> tag without allowing "</script>". */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
