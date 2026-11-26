import { notFound } from "next/navigation";
import { JsonLd } from "@/components/recipes-public/JsonLd";
import { RecipeDetail } from "@/components/recipes-public/RecipeDetail";
import { RecipePageShell } from "@/components/recipes-public/RecipePageShell";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildRecipeJsonLd, recipeUrl } from "@/components/recipes-public/recipe-jsonld";
import { RECIPES, getRecipe, recipeMetaDescription, relatedRecipes } from "@/content/recipes";
import { PUBLIC_RECIPES_INDEXABLE } from "@/content/recipes/config";
import { withImageState } from "@/content/recipes/images";
import { BRAND_NAME, SITE_URL } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";

type RecipePageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: RecipePageProps) {
  const { slug } = await params;
  const recipe = getRecipe(slug);
  if (!recipe) return {};
  const { hasImage } = withImageState(recipe);
  // The canonical is always the base page: ?servings= never changes it.
  return createPageMetadata({
    title: recipe.seoTitle,
    description: recipeMetaDescription(recipe),
    path: `/recipes/${recipe.slug}/`,
    image: hasImage ? recipe.image : undefined,
    noindex: !PUBLIC_RECIPES_INDEXABLE,
  });
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug } = await params;
  const base = getRecipe(slug);
  if (!base) notFound();
  const recipe = withImageState(base);
  const related = relatedRecipes(base).map(withImageState);
  return (
    <RecipePageShell>
      <JsonLd data={buildRecipeJsonLd(recipe, { hasImage: recipe.hasImage })} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: BRAND_NAME, url: `${SITE_URL}/` },
          { name: "Recipes", url: `${SITE_URL}/recipes/` },
          { name: recipe.title, url: recipeUrl(recipe.slug) },
        ])}
      />
      {recipe.faqs && recipe.faqs.length > 0 ? <JsonLd data={buildFaqJsonLd(recipe.faqs)} /> : null}
      <RecipeDetail recipe={recipe} related={related} />
    </RecipePageShell>
  );
}
