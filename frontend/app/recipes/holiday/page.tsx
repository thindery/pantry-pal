import Link from "next/link";
import { JsonLd } from "@/components/recipes-public/JsonLd";
import { RecipeCard } from "@/components/recipes-public/RecipeCard";
import { RecipePageShell } from "@/components/recipes-public/RecipePageShell";
import { buildBreadcrumbJsonLd } from "@/components/recipes-public/recipe-jsonld";
import { PUBLIC_RECIPES_INDEXABLE } from "@/content/recipes/config";
import {
  HOLIDAY_COLLECTION,
  holidayRecipes,
} from "@/content/recipes/holiday";
import { withImageState } from "@/content/recipes/images";
import { BRAND_NAME, SITE_URL } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: HOLIDAY_COLLECTION.seoTitle,
  description: HOLIDAY_COLLECTION.metaDescription,
  path: HOLIDAY_COLLECTION.path,
  noindex: !PUBLIC_RECIPES_INDEXABLE,
});

function buildHolidayCollectionJsonLd(recipes: ReturnType<typeof holidayRecipes>) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: HOLIDAY_COLLECTION.title,
    description: HOLIDAY_COLLECTION.intro,
    url: `${SITE_URL}${HOLIDAY_COLLECTION.path}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: recipes.length,
      itemListElement: recipes.map((recipe, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: recipe.title,
        url: `${SITE_URL}/recipes/${recipe.slug}/`,
      })),
    },
  };
}

export default function HolidayRecipesPage() {
  const recipes = holidayRecipes().map(withImageState);
  return (
    <RecipePageShell>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: BRAND_NAME, url: `${SITE_URL}/` },
          { name: "Recipes", url: `${SITE_URL}/recipes/` },
          { name: HOLIDAY_COLLECTION.title, url: `${SITE_URL}${HOLIDAY_COLLECTION.path}` },
        ])}
      />
      <JsonLd data={buildHolidayCollectionJsonLd(recipes)} />
      <section className="border-b border-[var(--marketing-border)] px-4 pb-8 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800">Pantry Hub</Link>
            <span aria-hidden="true"> / </span>
            <Link href="/recipes/" className="hover:text-slate-800">Recipes</Link>
            <span aria-hidden="true"> / </span>
            <span className="text-slate-700">{HOLIDAY_COLLECTION.title}</span>
          </nav>
          <h1 className="mt-4 font-serif-heading text-3xl font-bold text-slate-900 sm:text-4xl">
            {HOLIDAY_COLLECTION.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-700 sm:text-lg">{HOLIDAY_COLLECTION.intro}</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="mb-4 text-sm text-slate-600">
          {recipes.length === 1 ? "1 recipe" : `${recipes.length} recipes`}
        </p>
        <ul className="grid grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </ul>
      </section>
    </RecipePageShell>
  );
}
