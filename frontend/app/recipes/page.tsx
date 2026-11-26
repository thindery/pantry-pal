import { RecipeBrowser } from "@/components/recipes-public/RecipeBrowser";
import { JsonLd } from "@/components/recipes-public/JsonLd";
import { RecipePageShell } from "@/components/recipes-public/RecipePageShell";
import { buildBreadcrumbJsonLd } from "@/components/recipes-public/recipe-jsonld";
import { PUBLIC_RECIPES_INDEXABLE } from "@/content/recipes/config";
import { allRecipesWithImageState } from "@/content/recipes/images";
import { BRAND_NAME, SITE_URL } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";

// PP-184: noindex until Tylor OKs the first batch (PUBLIC_RECIPES_INDEXABLE).
export const metadata = createPageMetadata({
  title: "Easy Pantry Recipes from What You Have",
  description:
    "Cook from pantry staples and leftovers. Easy recipes with times, substitutions, and a serving scaler. Track the ingredients in Pantry Hub, free.",
  path: "/recipes/",
  noindex: !PUBLIC_RECIPES_INDEXABLE,
});

export default function RecipesPage() {
  const recipes = allRecipesWithImageState();
  return (
    <RecipePageShell>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: BRAND_NAME, url: `${SITE_URL}/` },
          { name: "Recipes", url: `${SITE_URL}/recipes/` },
        ])}
      />
      <section className="border-b border-[var(--marketing-border)] px-4 pb-8 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-serif-heading text-3xl font-bold text-slate-900 sm:text-4xl">Easy pantry recipes from what you have</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-700 sm:text-lg">
            Cook from pantry staples and leftovers. Every recipe lists times and substitutions, and scales to the number of servings you need.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <RecipeBrowser recipes={recipes} />
      </section>
    </RecipePageShell>
  );
}
