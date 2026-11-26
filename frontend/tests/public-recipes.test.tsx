import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import fs from "node:fs";
import { renderToString } from "react-dom/server";
import path from "node:path";

const trackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }));

import RecipesPage, { metadata as browseMetadata } from "@/app/recipes/page";
import RecipePage, { generateMetadata, generateStaticParams } from "@/app/recipes/[slug]/page";
import TagPage, {
  generateMetadata as generateTagMetadata,
  generateStaticParams as generateTagStaticParams,
} from "@/app/recipes/tag/[tag]/page";
import sitemap, { recipeSitemapPages } from "@/app/sitemap";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { RecipeBrowser } from "@/components/recipes-public/RecipeBrowser";
import { DEFAULT_FILTERS, filterRecipes } from "@/components/recipes-public/recipe-filter";
import { buildFaqJsonLd, buildRecipeJsonLd, isoDuration } from "@/components/recipes-public/recipe-jsonld";
import { RECIPES, getRecipe, recipeMetaDescription, relatedRecipes, totalMinutes } from "@/content/recipes";
import {
  MIN_RECIPES_FOR_SITEMAP,
  PUBLIC_RECIPES_INDEXABLE,
  RECIPE_TAG_PAGES_INDEXABLE,
} from "@/content/recipes/config";
import { TAG_PAGES, activeTagPages, recipesForTag } from "@/content/recipes/tags";
import { allRecipesWithImageState } from "@/content/recipes/images";

const BANNED_FIELDS = ["aggregateRating", "review", "nutrition", "rating", "reviews", "calories"];
const MODEL_NAMES = /gemini|gemma|ollama|gpt|openai|claude|llama|grok/i;
// PP-108/110 guardrail: no expiry or food-waste tracking claims.
const BANNED_CLAIMS = /expir|food[- ]waste|waste less|before it goes bad/i;
const EXPECTED_SLUGS = [
  "weeknight-chili",
  "black-bean-tacos",
  "baked-oatmeal",
  "pasta-e-fagioli",
  "sheet-pan-chicken-and-vegetables",
  "freezer-breakfast-burritos",
  "leftover-rice-fried-rice",
  "canned-tuna-pasta",
  "canned-chickpea-curry",
  "easy-red-lentil-soup",
  "rice-and-beans-with-canned-beans",
  "leftover-vegetable-frittata",
];

describe("recipe content (PP-184)", () => {
  it("ships 12 recipes with unique slugs and realistic times", () => {
    expect(RECIPES).toHaveLength(12);
    expect(new Set(RECIPES.map((r) => r.slug)).size).toBe(12);
    for (const r of RECIPES) {
      expect(r.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(r.servings).toBeGreaterThanOrEqual(2);
      expect(r.prepMin).toBeGreaterThan(0);
      expect(totalMinutes(r)).toBeLessThanOrEqual(120);
      expect(r.ingredients.length).toBeGreaterThanOrEqual(5);
      expect(r.steps.length).toBeGreaterThanOrEqual(4);
      expect(r.tips.length).toBeGreaterThanOrEqual(2);
      expect(r.pantryStaples.length).toBeGreaterThan(0);
      expect(r.intro.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(4);
      expect(r.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("uses the SEO desk's 12 slugs in order", () => {
    expect(RECIPES.map((r) => r.slug)).toEqual(EXPECTED_SLUGS);
  });

  it("follows the title, meta, and H1 patterns (brand only via the template)", () => {
    for (const r of RECIPES) {
      expect(r.seoTitle.length).toBeGreaterThanOrEqual(38);
      expect(r.seoTitle.length).toBeLessThanOrEqual(52);
      expect(r.seoTitle).not.toMatch(/pantry hub/i);
      expect(r.title).not.toMatch(/pantry hub/i);
      const meta = recipeMetaDescription(r);
      expect(meta.length, `${r.slug}: ${meta.length} chars`).toBeGreaterThanOrEqual(140);
      expect(meta.length, `${r.slug}: ${meta.length} chars`).toBeLessThanOrEqual(160);
      expect(meta).toContain("Track these ingredients in Pantry Hub, free.");
    }
  });

  it("every recipe has an opening answer, substitutions, and three related recipes", () => {
    for (const r of RECIPES) {
      expect(r.intro.split(/(?<=[.!?])\s+/).length).toBeGreaterThanOrEqual(2);
      expect(r.substitutions.length).toBeGreaterThanOrEqual(2);
      expect(new Set(r.related).size).toBe(3);
      for (const slug of r.related) {
        expect(slug).not.toBe(r.slug);
        expect(getRecipe(slug)).toBeTruthy();
      }
    }
  });

  it("never claims expiry or food-waste tracking", () => {
    expect(JSON.stringify(RECIPES)).not.toMatch(BANNED_CLAIMS);
    expect(JSON.stringify(TAG_PAGES.map((t) => [t.title, t.intro, t.metaDescription]))).not.toMatch(BANNED_CLAIMS);
  });

  it("only has FAQs where the question is real, and cites the source for safety facts", () => {
    const withFaqs = RECIPES.filter((r) => r.faqs?.length).map((r) => r.slug);
    expect(withFaqs).toEqual(["leftover-rice-fried-rice", "canned-tuna-pasta", "easy-red-lentil-soup"]);
    const rice = getRecipe("leftover-rice-fried-rice")!;
    expect(rice.faqSource?.url).toMatch(/^https:\/\/www\.fsis\.usda\.gov\//);
    expect(rice.faqs![0].answer).toMatch(/165°F/);
  });

  it("has no rating, review, or nutrition fields and no model names", () => {
    for (const r of RECIPES) {
      for (const key of BANNED_FIELDS) expect(r).not.toHaveProperty(key);
      expect(JSON.stringify(r)).not.toMatch(MODEL_NAMES);
    }
  });

  it("labels images as AI illustrations and uses the placeholder path convention", () => {
    for (const r of RECIPES) {
      expect(r.image).toBe(`/recipes/${r.slug}.webp`);
      expect(r.imageAlt).toMatch(/^AI-generated illustration/);
    }
  });

  it("covers breakfast, lunch, dinner and the vegetarian/vegan filters", () => {
    for (const meal of ["breakfast", "lunch", "dinner"] as const) {
      expect(RECIPES.some((r) => r.meal === meal)).toBe(true);
    }
    expect(RECIPES.some((r) => r.tags.includes("vegan"))).toBe(true);
    expect(RECIPES.some((r) => r.tags.includes("vegetarian"))).toBe(true);
  });

  it("does not use affiliate links or tracking params in any recipe text", () => {
    // The only URL in recipe content is the USDA FSIS source for the rice safety FAQ.
    const urls = JSON.stringify(RECIPES).match(/https?:\/\/[^"]+/g) ?? [];
    expect(urls.every((u) => u.startsWith("https://www.fsis.usda.gov/"))).toBe(true);
    expect(JSON.stringify(RECIPES)).not.toMatch(/amzn|affiliate|tag=/i);
  });

  it("relatedRecipes returns the three hand-picked recipes", () => {
    const r = RECIPES[0];
    expect(relatedRecipes(r).map((x) => x.slug)).toEqual(r.related);
  });
});

describe("filters (PP-184)", () => {
  it("filters by meal, diet, time, and text", () => {
    expect(filterRecipes(RECIPES, DEFAULT_FILTERS)).toHaveLength(12);
    expect(filterRecipes(RECIPES, { ...DEFAULT_FILTERS, meal: "lunch" }).map((r) => r.slug)).toEqual([
      "easy-red-lentil-soup",
    ]);
    const vegan = filterRecipes(RECIPES, { ...DEFAULT_FILTERS, diet: "vegan" });
    expect(vegan.length).toBeGreaterThan(0);
    expect(vegan.every((r) => r.tags.includes("vegan"))).toBe(true);
    const veg = filterRecipes(RECIPES, { ...DEFAULT_FILTERS, diet: "vegetarian" });
    expect(veg.length).toBeGreaterThan(vegan.length);
    const quick = filterRecipes(RECIPES, { ...DEFAULT_FILTERS, quick: true });
    expect(quick.length).toBeGreaterThan(0);
    expect(quick.every((r) => totalMinutes(r) <= 30)).toBe(true);
    expect(filterRecipes(RECIPES, { ...DEFAULT_FILTERS, query: "lentils" }).map((r) => r.slug)).toContain(
      "easy-red-lentil-soup"
    );
    expect(filterRecipes(RECIPES, { ...DEFAULT_FILTERS, query: "zzzz" })).toHaveLength(0);
  });
});

describe("browse page (PP-184)", () => {
  beforeEach(() => {
    cleanup();
    trackEvent.mockClear();
  });

  it("renders without auth and lists every recipe linking to its page", async () => {
    render(RecipesPage());
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    for (const r of RECIPES) {
      const link = screen.getByRole("link", { name: new RegExp(r.title) });
      // next/link drops the trailing slash in jsdom; next.config trailingSlash adds it in the real build
      expect((link.getAttribute("href") ?? "").replace(/\/$/, "")).toBe(`/recipes/${r.slug}`);
    }
    expect(screen.getByText("12 recipes")).toBeTruthy();
  });

  it("filter buttons and search narrow the grid", () => {
    render(<RecipeBrowser recipes={allRecipesWithImageState()} />);
    fireEvent.click(screen.getByRole("button", { name: "Lunch" }));
    expect(screen.queryByRole("button", { name: "Snack" })).toBeNull();
    expect(screen.getByText("1 recipe")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("12 recipes")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "tortilla" } });
    expect(screen.getByText("2 recipes")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nothingmatches" } });
    expect(screen.getByText(/No recipes match/)).toBeTruthy();
  });

  it("shows a neutral placeholder (not a broken image) while image files are missing", () => {
    render(RecipesPage());
    const missing = allRecipesWithImageState().filter((r) => !r.hasImage).length;
    expect(screen.queryAllByTestId("recipe-image-placeholder")).toHaveLength(missing);
    expect(missing).toBeGreaterThan(0);
  });
});

async function renderRecipe(slug: string) {
  const el = await RecipePage({ params: Promise.resolve({ slug }) });
  return render(el);
}

describe("recipe page (PP-184)", () => {
  beforeEach(() => {
    cleanup();
    trackEvent.mockClear();
    window.history.replaceState(null, "", "/recipes/black-bean-tacos/");
  });

  it("generates a static page for every recipe", () => {
    expect(generateStaticParams().map((p) => p.slug)).toEqual(RECIPES.map((r) => r.slug));
  });

  it("renders ingredients, steps, tips, pantry note, CTA, and fires recipe_view", async () => {
    await renderRecipe("black-bean-tacos");
    expect(screen.getByRole("heading", { level: 1, name: "Black Bean Tacos" })).toBeTruthy();
    expect(screen.getByTestId("ingredient-list").children.length).toBe(getRecipe("black-bean-tacos")!.ingredients.length);
    expect(screen.getByText(/Uses pantry staples:/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Track these ingredients in Pantry Hub, free" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Substitutions" })).toBeTruthy();
    expect(screen.getByTestId("substitutions").children.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" }).textContent).toBe("Pantry Hub / Recipes / Black Bean Tacos");
    expect(screen.queryByTestId("recipe-faqs")).toBeNull();
    expect(trackEvent).toHaveBeenCalledWith("recipe_view", expect.objectContaining({ recipe_slug: "black-bean-tacos" }));
  });

  it("scales ingredients with the preset buttons and fires recipe_scale", async () => {
    await renderRecipe("black-bean-tacos");
    const list = screen.getByTestId("ingredient-list");
    expect(within(list).getByText(/^8 small corn tortillas/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "2×" }));
    expect(within(list).getByText(/^16 small corn tortillas/)).toBeTruthy();
    expect(within(list).getByText(/^4 cans \(15 oz\) black beans/)).toBeTruthy();
    expect(within(list).getByText("Salsa, for serving")).toBeTruthy();
    expect(screen.getByTestId("servings-label").textContent).toBe("8 servings");
    expect(window.location.search).toBe("?servings=8");
    expect(trackEvent).toHaveBeenCalledWith("recipe_scale", expect.objectContaining({ recipe_slug: "black-bean-tacos", factor: 2 }));
    fireEvent.click(screen.getByRole("button", { name: "½×" }));
    expect(within(list).getByText(/^4 small corn tortillas/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "1×" }));
    expect(window.location.search).toBe("");
  });

  it("custom servings stepper rescales and clamps", async () => {
    await renderRecipe("black-bean-tacos");
    fireEvent.click(screen.getByRole("button", { name: "More servings" }));
    expect(screen.getByTestId("servings-label").textContent).toBe("5 servings");
    expect(within(screen.getByTestId("ingredient-list")).getByText(/^10 small corn tortillas/)).toBeTruthy();
  });

  it("reads ?servings= from the URL after hydration", async () => {
    window.history.replaceState(null, "", "/recipes/black-bean-tacos/?servings=12");
    await renderRecipe("black-bean-tacos");
    expect(screen.getByTestId("servings-label").textContent).toBe("12 servings");
    expect(within(screen.getByTestId("ingredient-list")).getByText(/^24 small corn tortillas/)).toBeTruthy();
  });

  it("fires recipe_cta_click from the CTA", async () => {
    await renderRecipe("black-bean-tacos");
    const cta = screen.getByRole("link", { name: /Track these ingredients/ });
    expect(cta.getAttribute("href")).toMatch(/^\/auth\/signin/);
    expect(cta.getAttribute("href")).not.toContain("dashboard");
    fireEvent.click(cta);
    expect(trackEvent).toHaveBeenCalledWith("recipe_cta_click", expect.objectContaining({ recipe_slug: "black-bean-tacos" }));
  });

  it("has no affiliate links", async () => {
    const { container } = await renderRecipe("weeknight-chili");
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.every((h) => h.startsWith("/") || h.startsWith("mailto:"))).toBe(true);
    expect(hrefs.join(" ")).not.toMatch(/amzn|amazon|instacart|affiliate|tag=/i);
  });

  it("shows three related recipes", async () => {
    await renderRecipe("canned-tuna-pasta");
    const heading = screen.getByRole("heading", { name: "More recipes" });
    const items = heading.parentElement!.querySelectorAll("li");
    expect(items).toHaveLength(3);
  });

  it("first paint shows default quantities, not a scaled value", async () => {
    window.history.replaceState(null, "", "/recipes/black-bean-tacos/");
    const el = await RecipePage({ params: Promise.resolve({ slug: "black-bean-tacos" }) });
    const html = renderToString(el);
    expect(html).toContain("8 small corn tortillas");
    expect(html).toContain("Salsa, for serving");
  });

  it("renders the FAQ with the exact text that is in the FAQPage JSON-LD", async () => {
    const { container } = await renderRecipe("leftover-rice-fried-rice");
    const faqs = getRecipe("leftover-rice-fried-rice")!.faqs!;
    const ld = JSON.parse(
      Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
        .map((n) => n.textContent ?? "")
        .find((t) => t.includes("FAQPage")) ?? "{}"
    );
    const visible = screen.getByTestId("recipe-faqs").textContent ?? "";
    for (const [i, faq] of faqs.entries()) {
      expect(ld.mainEntity[i].name).toBe(faq.question);
      expect(ld.mainEntity[i].acceptedAnswer.text).toBe(faq.answer);
      expect(visible).toContain(faq.question);
      expect(visible).toContain(faq.answer);
    }
    expect(buildFaqJsonLd(faqs)).toEqual(ld);
  });

  it("canonical is the base page and ignores ?servings", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "weeknight-chili" }) });
    expect(meta.alternates?.canonical).toBe("/recipes/weeknight-chili/");
    expect(meta.description).toBe(recipeMetaDescription(getRecipe("weeknight-chili")!));
    expect(JSON.stringify(meta)).not.toContain("servings=");
  });
});

describe("Recipe JSON-LD (PP-184)", () => {
  it("parses, has real fields only, and no rating/review/nutrition", () => {
    for (const r of RECIPES) {
      const ld = JSON.parse(JSON.stringify(buildRecipeJsonLd(r, { hasImage: false })));
      expect(ld["@type"]).toBe("Recipe");
      expect(ld.name).toBe(r.title);
      expect(ld.description).toBe(r.intro);
      expect(ld.datePublished).toBe(r.datePublished);
      expect(ld.recipeYield).toBe(`${r.servings} servings`);
      expect(ld.author).toMatchObject({ "@type": "Organization", name: "Pantry Hub" });
      expect(ld.recipeInstructions.every((st: { text: string }) => !/^step\s*\d/i.test(st.text))).toBe(true);
      expect(ld.recipeIngredient).toHaveLength(r.ingredients.length);
      expect(ld.recipeInstructions).toHaveLength(r.steps.length);
      expect(ld.totalTime).toBe(isoDuration(totalMinutes(r)));
      for (const key of ["aggregateRating", "review", "nutrition"]) expect(ld).not.toHaveProperty(key);
      expect(ld).not.toHaveProperty("image"); // no image until the file exists
    }
  });

  it("includes image only when the image exists, and omits cookTime for no-cook recipes", () => {
    const r = getRecipe("canned-tuna-pasta")!;
    const ld = buildRecipeJsonLd(r, { hasImage: true });
    expect(ld.image).toEqual(["https://www.mypantryhub.com/recipes/canned-tuna-pasta.webp"]);
    expect(ld.cookTime).toBe("PT15M");
    expect(ld.prepTime).toBe("PT5M");
    expect(buildRecipeJsonLd({ ...r, cookMin: 0 }, { hasImage: false })).not.toHaveProperty("cookTime");
  });

  it("formats durations", () => {
    expect(isoDuration(45)).toBe("PT45M");
    expect(isoDuration(60)).toBe("PT1H");
    expect(isoDuration(75)).toBe("PT1H15M");
  });

  it("emits a parseable script tag on the page", async () => {
    const el = await RecipePage({ params: Promise.resolve({ slug: "easy-red-lentil-soup" }) });
    const { container } = render(el);
    const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
    expect(scripts).toHaveLength(3);
    const types = scripts.map((s) => JSON.parse(s.textContent ?? "{}")["@type"]);
    expect(types).toEqual(["Recipe", "BreadcrumbList", "FAQPage"]);
  });
});

describe("launch gate (PP-184)", () => {
  it("is off by default: noindex+nofollow on every /recipes page", async () => {
    expect(PUBLIC_RECIPES_INDEXABLE).toBe(false);
    expect(browseMetadata.robots).toMatchObject({ index: false, follow: false });
    for (const r of RECIPES) {
      const meta = await generateMetadata({ params: Promise.resolve({ slug: r.slug }) });
      expect(meta.robots).toMatchObject({ index: false, follow: false });
    }
  });

  it("tag pages exist for each tag with recipes, are always noindex, and have unique intros", async () => {
    expect(RECIPE_TAG_PAGES_INDEXABLE).toBe(false);
    expect(generateTagStaticParams().map((p) => p.tag)).toEqual(activeTagPages().map((t) => t.slug));
    expect(activeTagPages().map((t) => t.slug)).toEqual(["breakfast", "dinner", "vegetarian", "30-min", "leftovers"]);
    expect(new Set(TAG_PAGES.map((t) => t.intro)).size).toBe(TAG_PAGES.length);
    for (const tag of activeTagPages()) {
      cleanup();
      const meta = await generateTagMetadata({ params: Promise.resolve({ tag: tag.slug }) });
      expect(meta.robots).toMatchObject({ index: false, follow: false });
      expect(meta.alternates?.canonical).toBe(`/recipes/tag/${tag.slug}/`);
      expect(String(meta.description).length).toBeGreaterThanOrEqual(140);
      expect(String(meta.description).length).toBeLessThanOrEqual(165);
      const el = await TagPage({ params: Promise.resolve({ tag: tag.slug }) });
      render(el);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(tag.title);
      expect(document.querySelectorAll("ul li a[href*='/recipes/']").length).toBe(recipesForTag(tag).length);
    }
  });

  it("is off by default: no sitemap entries", () => {
    expect(recipeSitemapPages()).toEqual([]);
    expect(sitemap().some((e) => e.url.includes("/recipes"))).toBe(false);
    expect(RECIPES.length).toBeGreaterThanOrEqual(MIN_RECIPES_FOR_SITEMAP);
  });

  it("is off by default: no footer link to /recipes", () => {
    cleanup();
    const { container } = render(<MarketingFooter />);
    expect(Array.from(container.querySelectorAll("a")).some((a) => (a.getAttribute("href") ?? "").includes("/recipes"))).toBe(false);
  });

  it("is off by default: no nav link to /recipes", () => {
    cleanup();
    const { container } = render(<MarketingNav />);
    expect(Array.from(container.querySelectorAll("a")).some((a) => (a.getAttribute("href") ?? "").includes("/recipes"))).toBe(false);
  });

  it("when the flag is on, the sitemap lists /recipes/ and each recipe with real dates", async () => {
    vi.resetModules();
    vi.doMock("@/content/recipes/config", async (orig) => ({
      ...(await orig<typeof import("@/content/recipes/config")>()),
      PUBLIC_RECIPES_INDEXABLE: true,
    }));
    const mod = await import("@/app/sitemap");
    const entries = mod.default();
    const recipeEntries = entries.filter((e) => e.url.includes("/recipes/"));
    expect(recipeEntries).toHaveLength(13);
    expect(recipeEntries[0]).toMatchObject({ url: "https://www.mypantryhub.com/recipes/", priority: 0.8, changeFrequency: "weekly" });
    expect(recipeEntries[1]).toMatchObject({ priority: 0.7, changeFrequency: "monthly" });
    expect(recipeEntries.some((e) => e.url.includes("/tag/"))).toBe(false);
    for (const e of recipeEntries) expect(String(e.lastModified)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    vi.doUnmock("@/content/recipes/config");
    vi.resetModules();
  });

  it("one flag in one file drives all signals", () => {
    const config = fs.readFileSync(path.join(process.cwd(), "content/recipes/config.ts"), "utf8");
    expect(config).toMatch(/export const PUBLIC_RECIPES_INDEXABLE = false;/);
    for (const file of ["app/recipes/page.tsx", "app/recipes/[slug]/page.tsx", "app/sitemap.ts", "components/marketing/MarketingFooter.tsx", "components/marketing/MarketingNav.tsx", "components/LandingPage.tsx"]) {
      expect(fs.readFileSync(path.join(process.cwd(), file), "utf8")).toContain("PUBLIC_RECIPES_INDEXABLE");
    }
  });
});
