# PP-184: Free public recipe library (SEO): browse page, recipe pages, AI images, scale servings

**Status:** 🟡 Built, deploying live UNLISTED (2026-11-26); waiting on AI images and Tylor's OK before it goes public
**Priority:** P2
**Phase:** Growth / SEO content
**Created:** 2026-11-25, 3:25 PM America/Chicago
**Source:** Tylor (voice request)
**Related:** PP-139 (public recipes plus affiliate plan). This ticket builds the public library; affiliate links stay in PP-139 and still need Tylor's yes. PP-106 (structured data), PP-108 / PP-110 (content quality).

---

## Coordination: SEO & AEO Desk

The SEO & AEO Desk owns Pantry Hub marketing and SEO (PP-101 to PP-111). **Before building, Pantry Hub Lead sends it this ticket** and asks for its input on recipe topics and keywords, title/meta patterns, Recipe JSON-LD (PP-106), sitemap and internal links. Don't duplicate its tickets. This ticket owns the pages, data model and scaling UI; the desk owns keyword choices and SEO copy review.

## Change from PP-139

Tylor now wants **AI-generated images** for each recipe (PP-139 had said real photos only). Each AI image is labeled honestly in its alt text, with a small caption such as "Illustration, not a photo of this dish". Images are made by Pantry Hub Lead with a $0 image tool and committed as optimized static assets. The coding agent doesn't generate images or call paid image APIs.

## Scope

1. **Public, no sign-in, server-rendered** (SSG or ISR) pages:
   - `/recipes/` is the browse page: a card grid (image, title, total time, servings, tags), filters by meal (breakfast/lunch/dinner/snack), diet tags (vegetarian, etc.), time (≤30 min), and a text search. It's fast, mobile-first and paginated or lazy-loaded.
   - `/recipes/<slug>/` is one recipe: hero image, intro (2 to 3 sentences, original), prep/cook/total time, servings, ingredients, numbered steps, tips/substitutions, a "Uses pantry staples" note, and a soft CTA ("Track what's in your pantry with Pantry Hub, free"). Plus related recipes.
   - Tag pages `/recipes/tag/<tag>/` are optional, and only if the SEO desk wants them.
2. **Serving scaler:** ½×, 1×, 2× and 3× buttons plus a custom servings stepper. Ingredient quantities rescale with friendly fractions (¼, ⅓, ½, ⅔, ¾), and units stay sensible (e.g. 3 tsp becomes 1 tbsp, 16 tbsp becomes 1 cup). Non-scalable lines ("salt to taste") stay as is. The scaled value lives in the URL (`?servings=8`) but the canonical always points at the base page. There's a print-friendly view.
3. **Content:** a starter set of **12 recipes** (6 from PP-139's list plus 6 more classic pantry dishes). Common, well-known dishes are fine, but every intro, step and tip is written in our own words, never copied or paraphrased from another site. Times and yields must be realistic. **No invented ratings, reviews, testimonials or nutrition numbers.** Leave nutrition out unless computed from a real source.
4. **Data:** recipes live as typed content files in the repo (e.g. `frontend/content/recipes/<slug>.json` or `.ts`) with a schema: title, slug, description, image, imageAlt, servings, prepMin, cookMin, tags, ingredients[{qty, unit, item, note, scalable}], steps[], tips[]. No database needed. This is separate from private saved recipes at `/dashboard/recipes/` (PP-138), which stay private.
5. **SEO basics** (final copy to be checked by the SEO desk): a unique title and meta per page, canonical, Open Graph image, valid **Recipe JSON-LD** with real fields only (no aggregateRating/review), BreadcrumbList, sitemap entries (only once at least 3 are live), and internal links from the homepage/footer.
6. **Analytics:** GA4 events `recipe_view`, `recipe_scale` (factor) and `recipe_cta_click`.
7. **No affiliate links** in this ticket (PP-139, needs Tylor's yes).

## Tests

- Unit: the scaler (fractions, unit conversion, non-scalable lines, custom servings, rounding).
- Rendering: the browse page lists every recipe, filters work, the recipe page shows a scaled list, the canonical ignores `?servings`, the JSON-LD parses and has no rating/review fields, and pages render without auth.
- Frontend tests, `tsc` and `next build` all pass. Lighthouse SEO ≥ 95 on one recipe page (local check).

## Allowed paths

- `frontend/app/recipes/**` (new public routes). Must not touch `frontend/app/dashboard/recipes/**`.
- `frontend/components/recipes-public/**` (new)
- `frontend/lib/recipe-scaling.ts` (new)
- `frontend/content/recipes/**` (new content files)
- `frontend/public/recipes/**` (optimized images, added by Pantry Hub Lead)
- `frontend/app/sitemap.ts` / robots, and homepage/footer link components (small link additions only)
- `frontend/tests/` (new tests)
- This ticket file and its `.agents/TICKET_STATUS.md` row

## Rules for the coding agent

- No dependency changes unless truly needed (e.g. no new markdown/CMS libraries). If one is, stop and explain why.
- **No commits, no pushes, no secrets.** Leave changes in the working tree for review.
- No paid image or AI APIs, and don't generate images yourself. Use placeholder image paths that the lead fills.
- No invented ratings, reviews, testimonials or nutrition facts. Don't copy text from other recipe sites.
- Nothing goes public until Tylor OKs the first batch of recipe pages.
- Don't touch the stray `2026-07-30` file or `.agents/email-previews/`.


---

## Build notes (2026-11-26)

Built by Pantry Hub Lead from the ticket plus the SEO & AEO Desk's input (`/workspace/pantry-hub/pp-184-seo-input.md`). Coding was done by hand (no Hermes, no Grok CLI).

- **Routes:** `/recipes/`, `/recipes/<slug>/` (SSG, `dynamicParams = false`), `/recipes/tag/<tag>/` (SSG).
- **Content:** `frontend/content/recipes/<slug>.ts` (typed, see `types.ts`), `index.ts` (order, related, meta description builder), `tags.ts`, `config.ts` (launch flags), `images.ts` (build-time check for the image file).
- **Scaler:** `frontend/lib/recipe-scaling.ts`. Client-side only; first paint and JSON-LD always show the default yield. `?servings=` is read after hydration; the canonical never includes it. Print view via the browser print button.
- **Analytics:** `recipe_view`, `recipe_scale` (factor, servings), `recipe_cta_click`.
- **Images:** none generated. Each recipe points at `frontend/public/recipes/<slug>.webp`. Until that file exists the page shows a neutral gradient + icon placeholder, omits `image` from Recipe JSON-LD, and uses the site OG card. Once the file is committed the recipe switches over automatically on the next build. Alt text starts "AI-generated illustration of ..." and the hero shows the caption "AI illustration, not a photo of this dish."
- **No** ratings, reviews, testimonials, nutrition, or affiliate links. No AdSense on `/recipes`.
- **Not touched:** `frontend/app/dashboard/recipes/**`.

### The 12 starter recipes (SEO desk slugs)

| # | Slug | Dish (H1 / JSON-LD name) |
|---|---|---|
| 1 | `weeknight-chili` | Weeknight Chili |
| 2 | `black-bean-tacos` | Black Bean Tacos |
| 3 | `baked-oatmeal` | Baked Oatmeal with Bananas |
| 4 | `pasta-e-fagioli` | Pasta e Fagioli |
| 5 | `sheet-pan-chicken-and-vegetables` | Sheet Pan Chicken and Vegetables |
| 6 | `freezer-breakfast-burritos` | Freezer Breakfast Burritos |
| 7 | `leftover-rice-fried-rice` | Fried Rice with Leftover Rice |
| 8 | `canned-tuna-pasta` | Canned Tuna Pasta |
| 9 | `canned-chickpea-curry` | Canned Chickpea Curry |
| 10 | `easy-red-lentil-soup` | Easy Red Lentil Soup |
| 11 | `rice-and-beans-with-canned-beans` | Rice and Beans with Canned Beans |
| 12 | `leftover-vegetable-frittata` | Leftover Vegetable Frittata |

Every recipe has an opening answer (2 to 3 sentences), a Substitutions section, exactly 3 hand-picked related recipes, and breadcrumbs (Pantry Hub > Recipes > Dish). FAQs exist only for real questions: leftover-rice safety (cites USDA FSIS), tuna in water vs oil, and whether red lentils need soaking. FAQPage JSON-LD text matches the visible text exactly. No expiry or food-waste tracking claims anywhere.

## Launch flag (the one-line flip)

`frontend/content/recipes/config.ts`:

```ts
export const PUBLIC_RECIPES_INDEXABLE = false; // flip to true to launch
```

While `false` (the current, deployed state):

1. every `/recipes/**` page sends `robots: noindex, nofollow`,
2. `sitemap.xml` has no recipe entries,
3. no "Recipes" link in the nav, footer, or the homepage card.

`RECIPE_TAG_PAGES_INDEXABLE` (same file) keeps `/recipes/tag/**` noindex and out of the sitemap even after the main flag flips. The SEO desk's rule: index a tag only once it has 5+ recipes, a unique 2 to 3 sentence intro, and is not a thin copy of `/recipes/`. Flip it separately.

## Flip checklist (after Tylor OKs the first batch)

SEO & AEO Desk, from its PP-184 input:

- [ ] Tylor OKs the batch; at least 3 recipes quality-checked (real test cooks, times, and yields).
- [ ] AI images committed at `frontend/public/recipes/<slug>.webp` for at least the recipes being launched (optimized, with the illustration alt text and caption already in place). Recipe rich results need an image.
- [ ] In one deploy: set `PUBLIC_RECIPES_INDEXABLE = true` in `frontend/content/recipes/config.ts`. That removes noindex, adds the sitemap entries (priority 0.8 weekly for `/recipes/`, 0.7 monthly for each recipe, real `lastModified` from each recipe's `updated` field, never `new Date()`), and shows the nav, footer, and homepage links.
- [ ] Bump a recipe's `updated` date in its content file whenever its content really changes.
- [ ] Leave tag pages noindex (`RECIPE_TAG_PAGES_INDEXABLE = false`) unless they meet the rule above.
- [ ] Deploy, verify `build-id.txt`, and check `/recipes/` and one recipe page return 200 with NO `noindex`.
- [ ] Run Google's Rich Results Test on a recipe page (Recipe, FAQPage where present, BreadcrumbList all valid; no rating or review fields).
- [ ] Resubmit `sitemap.xml` in Search Console (`sc-domain:mypantryhub.com`).
- [ ] Request indexing: `/recipes/` first, then canned-tuna-pasta, leftover-rice-fried-rice, leftover-vegetable-frittata, canned-chickpea-curry, easy-red-lentil-soup, freezer-breakfast-burritos, then the rest.
- [ ] Confirm GA4 `recipe_view`, `recipe_scale`, and `recipe_cta_click` appear in DebugView.
- [ ] Affiliate links stay out until PP-139 gets Tylor's yes.

## Batch 2 backlog (topic candidates; no search volumes)

Marked **classic** or **trending/seasonal**. Evidence for the trending/seasonal rows is qualitative only, from Google's published Thanksgiving trends, Google Trends analyses reported by other sites, and Google autocomplete / live results. **No volumes are claimed**: Search Console has no usable query data yet and we have no Keyword Planner access. The SEO desk should check keywords and copy before each is written. Timing note: Thanksgiving 2026 is today (Nov 26), and new pages need time to be indexed, so holiday-side pages are mainly for the 2027 season (publish by early October); soups and stews are in season now through winter.

| Priority | Dish | Mark | Why (source) | Pantry fit |
|---|---|---|---|---|
| 1 | Leftover turkey soup | trending/seasonal | "Leftover turkey" searches rise after Thanksgiving, with soup a leading leftovers use (Google Trends daily data analysis, Pantry Hand) | Broth, carrots, celery, rice or noodles |
| 2 | White chicken chili (white beans, canned green chiles) | trending/seasonal | Top winter comfort food in MI, UT, WY (Google Trends analysis, Surety First); a "salsa verde white chicken chili" version is called out in fall 2026 soup roundups. Pairs with the existing bean cluster | Canned white beans, canned green chiles, broth |
| 3 | Baked potato soup | trending/seasonal | Top winter comfort search in IN, KS, MO, OK (Surety First, Google Trends) | Potatoes, milk, broth |
| 4 | Easy vegetable soup | trending/seasonal | Seasonal turn toward soups in fall roundups; confirm with autocomplete before writing | Canned tomatoes, frozen vegetables, broth |
| 5 | Lasagna soup | trending/seasonal | Called the viral soup of fall 2026 in a food-blog roundup (third-party claim, unverified; check Trends before writing) | Pasta, canned tomatoes, broth |
| 6 | Green bean casserole | trending/seasonal | #2 in Google's 2026 trending Thanksgiving recipes; top winter comfort search in 5 states (WSB-TV 11/24/2026; Surety First) | Canned or frozen green beans, canned soup, fried onions |
| 7 | Sweet potato casserole | trending/seasonal | #3 in Google's 2026 trending Thanksgiving recipes | Sweet potatoes, brown sugar, pecans |
| 8 | Cranberry sauce | trending/seasonal | #1 in Google's 2026 trending Thanksgiving recipes | Cranberries, sugar, orange |
| 9 | Stuffing and corn casserole | trending/seasonal | #4 and #5 in Google's 2026 trending Thanksgiving recipes | Bread, broth, canned corn |
| 10 | Chicken and dumplings | trending/seasonal | Top winter comfort search in AR, TN, WV (Surety First) | Flour, broth, chicken |
| 11 | Pumpkin pie and pumpkin bread | trending/seasonal | Pumpkin pie is the most-searched Thanksgiving pie in most states (Google data via WSB-TV) | Canned pumpkin, flour, spices |
| 12 | Slow cooker chili or stew | trending/seasonal | Slow cooker recipe interest peaks in December (Google Trends comparison, as reported by fooddrinklife) | Canned beans, tomatoes |
| 13 | Peanut butter noodles | classic | The SEO desk's backup pick | Pasta, peanut butter, soy sauce |
| 14 | Chickpea salad sandwiches | classic | No-cook pantry lunch; fits the canned-chickpea cluster | Canned chickpeas, mayo, bread |
| 15 | Crispy roasted chickpeas | classic | Pantry snack; fills the snack meal filter | Canned chickpeas, spices |
| 16 | Cheesy chicken and rice casserole | classic | Comfort casserole using canned condensed cheddar soup | Rice, canned soup, frozen broccoli |

**Proposed batch 2 (8 recipes):** leftover turkey soup, white chicken chili, baked potato soup, easy vegetable soup, lasagna soup, green bean casserole, peanut butter noodles, and chickpea salad sandwiches. That mixes the in-season soups with two classics, and keeps the 2027 holiday sides (sweet potato casserole, cranberry sauce, stuffing, corn casserole, pumpkin) queued for early fall. Same rules apply: our own words, no invented numbers, no affiliate links, unlisted until Tylor says go.
