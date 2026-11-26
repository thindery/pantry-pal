import { notFound } from "next/navigation";
import { JsonLd } from "@/components/recipes-public/JsonLd";
import { RecipeCard } from "@/components/recipes-public/RecipeCard";
import { RecipePageShell } from "@/components/recipes-public/RecipePageShell";
import { buildBreadcrumbJsonLd } from "@/components/recipes-public/recipe-jsonld";
import { RECIPE_TAG_PAGES_INDEXABLE } from "@/content/recipes/config";
import { withImageState } from "@/content/recipes/images";
import { activeTagPages, getTagPage, recipesForTag } from "@/content/recipes/tags";
import { BRAND_NAME, SITE_URL } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";
import Link from "next/link";

type TagPageProps = { params: Promise<{ tag: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return activeTagPages().map((t) => ({ tag: t.slug }));
}

export async function generateMetadata({ params }: TagPageProps) {
  const { tag } = await params;
  const page = getTagPage(tag);
  if (!page) return {};
  // PP-184: tag pages stay noindex until a tag has 5+ recipes and a unique intro
  // (separate flag from the main recipe launch).
  return createPageMetadata({
    title: page.title,
    description: page.metaDescription,
    path: `/recipes/tag/${page.slug}/`,
    noindex: !RECIPE_TAG_PAGES_INDEXABLE,
  });
}

export default async function RecipeTagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const page = getTagPage(tag);
  if (!page) notFound();
  const recipes = recipesForTag(page).map(withImageState);
  if (recipes.length === 0) notFound();
  return (
    <RecipePageShell>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: BRAND_NAME, url: `${SITE_URL}/` },
          { name: "Recipes", url: `${SITE_URL}/recipes/` },
          { name: page.title, url: `${SITE_URL}/recipes/tag/${page.slug}/` },
        ])}
      />
      <section className="border-b border-[var(--marketing-border)] px-4 pb-8 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800">Pantry Hub</Link>
            <span aria-hidden="true"> / </span>
            <Link href="/recipes/" className="hover:text-slate-800">Recipes</Link>
            <span aria-hidden="true"> / </span>
            <span className="text-slate-700">{page.title}</span>
          </nav>
          <h1 className="mt-4 font-serif-heading text-3xl font-bold text-slate-900 sm:text-4xl">{page.title}</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-700 sm:text-lg">{page.intro}</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </ul>
      </section>
    </RecipePageShell>
  );
}
