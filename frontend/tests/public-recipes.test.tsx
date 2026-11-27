import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import fs from "node:fs";
import { renderToString } from "react-dom/server";
import path from "node:path";

const trackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "unauthenticated", data: null }),
}));

import RecipesPage, { metadata as browseMetadata } from "@/app/recipes/page";
import RecipePage, { generateMetadata, generateStaticParams } from "@/app/recipes/[slug]/page";
import TagPage, {
  generateMetadata as generateTagMetadata,
  generateStaticParams as generateTagStaticParams,
} from "@/app/recipes/tag/[tag]/page";
import sitemap, { recipeSitemapPages } from "@/app/sitemap";
import HolidayRecipesPage, { metadata as holidayMetadata } from "@/app/recipes/holiday/page";
import { holidayRecipes, HOLIDAY_COLLECTION } from "@/content/recipes/holiday";
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
  "leftover-turkey-soup",
  "white-chicken-chili",
  "baked-potato-soup",
  "easy-vegetable-soup",
  "lasagna-soup",
  "green-bean-casserole",
  "easy-lasagna",
  "sunday-chicken-and-rice",
  "sunday-pot-roast",
  "classic-meatloaf",
  "peanut-butter-noodles",
  "chickpea-salad-sandwiches",
];

describe("recipe content (PP-184)", () => {
  it("ships 84 recipes with unique slugs and realistic times", () => {
    expect(RECIPES).toHaveLength(84);
    expect(new Set(RECIPES.map((r) => r.slug)).size).toBe(84);
    for (const r of RECIPES) {
      expect(r.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(r.servings).toBeGreaterThanOrEqual(2);
      expect(r.prepMin).toBeGreaterThan(0);
      expect(totalMinutes(r)).toBeLessThanOrEqual(240);
      expect(r.ingredients.length).toBeGreaterThanOrEqual(5);
      expect(r.steps.length).toBeGreaterThanOrEqual(4);
      expect(r.tips.length).toBeGreaterThanOrEqual(2);
      expect(r.pantryStaples.length).toBeGreaterThan(0);
      expect(r.intro.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(4);
      expect(r.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps the first 24 slugs in order, then the holiday batches", () => {
    expect(RECIPES.map((r) => r.slug).slice(0, 24)).toEqual(EXPECTED_SLUGS);
    expect(RECIPES.map((r) => r.slug).slice(24)).toEqual([
      "leftover-turkey-pot-pie",
      "leftover-turkey-sandwiches",
      "sweet-potato-casserole",
      "homemade-cranberry-sauce",
      "classic-stuffing",
      "pumpkin-pie",
      "easy-sugar-cookies",
      "peppermint-bark",
      "easy-chocolate-fudge",
      "sausage-cheese-balls",
      "breakfast-casserole",
      "hoppin-john",
      "brown-sugar-glazed-ham",
      "herb-roasted-pork-loin",
      "rosemary-roast-chicken",
      "gingerbread-cookies",
      "pecan-pie",
      "apple-pie",
      "chocolate-crinkle-cookies",
      "thumbprint-cookies",
      "spinach-artichoke-dip",
      "stuffed-mushrooms",
      "cranberry-cocktail-meatballs",
      "pigs-in-a-blanket",
      "chocolate-chip-cookies",
      "fudgy-brownies",
      "banana-bread",
      "apple-crisp",
      "no-bake-cheesecake",
      "peach-cobbler",
      "bread-pudding",
      "snickerdoodles",
      "oatmeal-cookies",
      "lemon-bars",
      "easy-chocolate-cake",
      "classic-rice-pudding",
      "chicken-pot-pie",
      "spaghetti-and-meatballs",
      "beef-stew",
      "baked-mac-and-cheese",
      "chicken-noodle-soup",
      "chicken-enchiladas",
      "tuna-noodle-casserole",
      "baked-ziti",
      "sloppy-joes",
      "shepherds-pie",
      "chicken-and-dumplings",
      "beef-stroganoff",
      "sheet-pan-sausage-and-peppers",
      "one-pot-creamy-chicken-pasta",
      "slow-cooker-pulled-pork",
      "air-fryer-chicken-thighs",
      "butter-chicken",
      "chicken-fajitas",
      "shakshuka",
      "buttermilk-pancakes",
      "garlic-mashed-potatoes",
      "skillet-cornbread",
      "vegetable-stir-fry",
      "sheet-pan-lemon-salmon",
    ]);
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
    expect(withFaqs.sort()).toEqual(["canned-tuna-pasta", "easy-red-lentil-soup", "leftover-rice-fried-rice", "leftover-turkey-pot-pie", "leftover-turkey-sandwiches", "leftover-turkey-soup"]);
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
    expect(filterRecipes(RECIPES, DEFAULT_FILTERS)).toHaveLength(84);
    expect(filterRecipes(RECIPES, { ...DEFAULT_FILTERS, meal: "lunch" }).map((r) => r.slug)).toEqual([
      "easy-red-lentil-soup",
      "easy-vegetable-soup",
      "chickpea-salad-sandwiches",
      "leftover-turkey-sandwiches",
      "chicken-noodle-soup",
      "sloppy-joes",
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
    fireEvent.click(screen.getByRole("button", { name: "Show more recipes" }));
    fireEvent.click(screen.getByRole("button", { name: "Show more recipes" }));
    fireEvent.click(screen.getByRole("button", { name: "Show more recipes" }));
    fireEvent.click(screen.getByRole("button", { name: "Show more recipes" }));
    fireEvent.click(screen.getByRole("button", { name: "Show more recipes" }));
    fireEvent.click(screen.getByRole("button", { name: "Show more recipes" }));
    for (const r of RECIPES) {
      const link = screen.getByRole("link", { name: new RegExp(r.title) });
      // next/link drops the trailing slash in jsdom; next.config trailingSlash adds it in the real build
      expect((link.getAttribute("href") ?? "").replace(/\/$/, "")).toBe(`/recipes/${r.slug}`);
    }
    expect(screen.getByText("84 recipes")).toBeTruthy();
  }, 25_000);

  it("filter buttons and search narrow the grid", () => {
    render(<RecipeBrowser recipes={allRecipesWithImageState()} />);
    fireEvent.click(screen.getByRole("button", { name: "Lunch" }));
    expect(screen.getByRole("button", { name: "Snack" })).toBeTruthy();
    expect(screen.getByText("6 recipes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("84 recipes")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "stroganoff" } });
    expect(screen.getByText("1 recipe")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nothingmatches" } });
    expect(screen.getByText(/No recipes match/)).toBeTruthy();
  });

  it("renders committed WebP illustrations for every recipe, with no placeholders", () => {
    const recipes = allRecipesWithImageState();
    expect(recipes.every((r) => r.hasImage)).toBe(true);
    expect(recipes).toHaveLength(84);
    render(RecipesPage());
    expect((screen.getByRole("link", { name: /Holiday recipes/ }).getAttribute("href") ?? "").replace(/\/$/, "")).toBe("/recipes/holiday");
    expect(screen.queryAllByTestId("recipe-image-placeholder")).toHaveLength(0);
    expect(screen.getByTestId("recipe-newsletter-form")).toBeTruthy();
    expect(screen.getByText("Get new pantry recipes by email")).toBeTruthy();
    expect(screen.getByText("We'll email new recipes occasionally. Unsubscribe anytime.")).toBeTruthy();
    for (const r of recipes.slice(0, 3)) {
      const img = screen.getByRole("img", { name: r.imageAlt });
      expect(img.getAttribute("src")).toBe(r.image);
    }
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
    expect(screen.getByTestId("recipe-signup-cta-mid_recipe")).toBeTruthy();
    expect(screen.getByTestId("recipe-signup-cta-end")).toBeTruthy();
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
    const end = screen.getByTestId("recipe-signup-cta-end");
    const cta = end.querySelector("a")!;
    expect((cta.getAttribute("href") ?? "").replace(/\/$/, "")).toBe("/auth/signin");
    expect(cta.getAttribute("href")).not.toContain("dashboard");
    fireEvent.click(cta);
    expect(trackEvent).toHaveBeenCalledWith("recipe_cta_click", expect.objectContaining({ recipe_slug: "black-bean-tacos", location: "end" }));
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

  it("uses the illustration as the OG image and shows the honest caption", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "canned-tuna-pasta" }) });
    expect(JSON.stringify(meta.openGraph?.images)).toContain("/recipes/canned-tuna-pasta.webp");
    expect(JSON.stringify(meta.twitter?.images)).toContain("/recipes/canned-tuna-pasta.webp");
    const { container } = await renderRecipe("canned-tuna-pasta");
    expect(screen.queryByTestId("recipe-image-placeholder")).toBeNull();
    const hero = screen.getByRole("img", { name: getRecipe("canned-tuna-pasta")!.imageAlt });
    expect(hero.getAttribute("src")).toBe("/recipes/canned-tuna-pasta.webp");
    expect(screen.getByText("AI illustration, not a photo of this dish.")).toBeTruthy();
    const recipeLd = JSON.parse(
      Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
        .map((n) => n.textContent ?? "")
        .find((t) => t.includes('"Recipe"')) ?? "{}"
    );
    expect(recipeLd.image).toEqual(["https://www.mypantryhub.com/recipes/canned-tuna-pasta.webp"]);
  });

  it("uses the batch 2 illustration in JSON-LD and has no placeholder", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "lasagna-soup" }) });
    expect(JSON.stringify(meta.openGraph?.images)).toContain("/recipes/lasagna-soup.webp");
    const { container } = await renderRecipe("lasagna-soup");
    expect(screen.queryByTestId("recipe-image-placeholder")).toBeNull();
    const hero = screen.getByRole("img", { name: getRecipe("lasagna-soup")!.imageAlt });
    expect(hero.getAttribute("src")).toBe("/recipes/lasagna-soup.webp");
    const recipeLd = JSON.parse(
      Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
        .map((n) => n.textContent ?? "")
        .find((t) => t.includes('"Recipe"')) ?? "{}"
    );
    expect(recipeLd.image).toEqual(["https://www.mypantryhub.com/recipes/lasagna-soup.webp"]);
    expect(screen.getAllByTestId("recipe-newsletter-form").length).toBeGreaterThan(0);
    expect(screen.getByText("We'll email new recipes occasionally. Unsubscribe anytime.")).toBeTruthy();
  });

  it("uses the holiday illustration in JSON-LD and has no placeholder", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "leftover-turkey-pot-pie" }) });
    expect(JSON.stringify(meta.openGraph?.images)).toContain("/recipes/leftover-turkey-pot-pie.webp");
    const { container } = await renderRecipe("leftover-turkey-pot-pie");
    expect(screen.queryByTestId("recipe-image-placeholder")).toBeNull();
    const hero = screen.getByRole("img", { name: getRecipe("leftover-turkey-pot-pie")!.imageAlt });
    expect(hero.getAttribute("src")).toBe("/recipes/leftover-turkey-pot-pie.webp");
    const recipeLd = JSON.parse(
      Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
        .map((n) => n.textContent ?? "")
        .find((t) => t.includes('"Recipe"')) ?? "{}"
    );
    expect(recipeLd.image).toEqual(["https://www.mypantryhub.com/recipes/leftover-turkey-pot-pie.webp"]);
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
      expect(ld).not.toHaveProperty("image"); // builder omits image when hasImage is false
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
  it("is on: /recipes and recipe pages are indexable (tag pages stay noindex)", async () => {
    expect(PUBLIC_RECIPES_INDEXABLE).toBe(true);
    expect(browseMetadata.robots).toBeUndefined();
    for (const r of RECIPES) {
      const meta = await generateMetadata({ params: Promise.resolve({ slug: r.slug }) });
      expect(meta.robots).toBeUndefined();
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

  it("sitemap lists /recipes/ and each recipe with real dates, and leaves tags out", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(MIN_RECIPES_FOR_SITEMAP);
    const recipeEntries = recipeSitemapPages();
    expect(recipeEntries).toHaveLength(86);
    expect(recipeEntries[0]).toMatchObject({ path: "/recipes/", priority: 0.8, changeFrequency: "weekly" });
    expect(recipeEntries[1]).toMatchObject({ path: "/recipes/holiday/", priority: 0.75, changeFrequency: "weekly" });
    expect(recipeEntries.some((e) => e.path.includes("/tag/"))).toBe(false);
    for (const e of recipeEntries) expect(String(e.lastModified)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain("https://www.mypantryhub.com/recipes/");
    expect(urls).toContain("https://www.mypantryhub.com/recipes/holiday/");
    expect(urls).toContain("https://www.mypantryhub.com/recipes/canned-tuna-pasta/");
    expect(urls).toContain("https://www.mypantryhub.com/recipes/hoppin-john/");
    expect(urls.some((u) => u.includes("/tag/"))).toBe(false);
  });

  it("nav, footer, and homepage card link to /recipes/", () => {
    cleanup();
    const hrefOf = (el: { container: HTMLElement }) =>
      Array.from(el.container.querySelectorAll("a")).map((a) => (a.getAttribute("href") ?? "").replace(/\/$/, ""));
    const footer = render(<MarketingFooter />);
    expect(hrefOf(footer)).toContain("/recipes");
    cleanup();
    const nav = render(<MarketingNav />);
    expect(hrefOf(nav)).toContain("/recipes");
  });

  it("one flag in one file drives all signals", () => {
    const config = fs.readFileSync(path.join(process.cwd(), "content/recipes/config.ts"), "utf8");
    expect(config).toMatch(/export const PUBLIC_RECIPES_INDEXABLE = true;/);
    for (const file of ["app/recipes/page.tsx", "app/recipes/[slug]/page.tsx", "app/sitemap.ts", "components/marketing/MarketingFooter.tsx", "components/marketing/MarketingNav.tsx", "components/LandingPage.tsx"]) {
      expect(fs.readFileSync(path.join(process.cwd(), file), "utf8")).toContain("PUBLIC_RECIPES_INDEXABLE");
    }
  });
});


describe("holiday collection (PP-238)", () => {
  it("is indexable, has a unique intro, and lists every holiday recipe", () => {
    expect(holidayMetadata.robots).toBeUndefined();
    expect(holidayMetadata.alternates?.canonical).toBe("/recipes/holiday/");
    expect(HOLIDAY_COLLECTION.metaDescription.length).toBeGreaterThanOrEqual(140);
    expect(HOLIDAY_COLLECTION.metaDescription.length).toBeLessThanOrEqual(160);
    expect(holidayRecipes().length).toBeGreaterThanOrEqual(12);
    expect(holidayRecipes().every((r) => r.tags.includes("holiday"))).toBe(true);
    expect(holidayRecipes().map((r) => r.slug)).toEqual(expect.arrayContaining([
      "leftover-turkey-soup",
      "green-bean-casserole",
      "leftover-turkey-pot-pie",
      "peppermint-bark",
      "hoppin-john",
      "breakfast-casserole",
    ]));
    const { container } = render(HolidayRecipesPage());
    expect(screen.getByRole("heading", { level: 1, name: "Holiday Recipes" })).toBeTruthy();
    expect(screen.getByText(HOLIDAY_COLLECTION.intro)).toBeTruthy();
    expect(container.querySelectorAll("ul li a[href*='/recipes/']").length).toBe(holidayRecipes().length);
    const types = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map(
      (n) => JSON.parse(n.textContent ?? "{}")["@type"],
    );
    expect(types).toEqual(["BreadcrumbList", "CollectionPage"]);
  });
});
