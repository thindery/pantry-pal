# PP-184: Free public recipe library (SEO): browse page, recipe pages, AI images, scale servings

**Status:** 📋 Open
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
