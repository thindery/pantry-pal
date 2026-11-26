"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Printer } from "lucide-react";
import { totalMinutes } from "@/content/recipes";
import type { RecipeWithImage } from "@/content/recipes/images";
import { trackEvent } from "@/lib/analytics";
import {
  MAX_SERVINGS,
  MIN_SERVINGS,
  SCALE_PRESETS,
  clampServings,
  factorLabel,
  parseServingsParam,
  scaleIngredients,
  servingsForFactor,
} from "@/lib/recipe-scaling";
import { RecipeCard } from "./RecipeCard";
import { RecipeImage } from "./RecipeImage";
import { RecipeNewsletterForm } from "./RecipeNewsletterForm";
import { RecipeSignedInActions } from "./RecipeSignedInActions";
import { RecipeSignupCta } from "./RecipeSignupCtas";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-[var(--marketing-border)]">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function minutesLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * Recipe page body: scaler, ingredients, steps, CTA, related. Rendered on the
 * server for crawlers; the scaler reads ?servings= after hydration and writes it
 * back with replaceState. The canonical (set in the page metadata) never changes.
 */
export function RecipeDetail({ recipe, related }: { recipe: RecipeWithImage; related: RecipeWithImage[] }) {
  const base = recipe.servings;
  const [servings, setServings] = useState(base);
  const viewed = useRef(false);

  useEffect(() => {
    // The URL is only readable after hydration, so the scaled value is applied in an effect.
    setServings(parseServingsParam(window.location.search, base));
  }, [base]);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackEvent("recipe_view", { recipe_slug: recipe.slug, recipe_title: recipe.title, meal: recipe.meal });
  }, [recipe.slug, recipe.title, recipe.meal]);

  const changeServings = (next: number) => {
    const value = clampServings(next);
    if (value === servings) return;
    setServings(value);
    const url = new URL(window.location.href);
    if (value === base) url.searchParams.delete("servings");
    else url.searchParams.set("servings", String(value));
    window.history.replaceState(window.history.state, "", url.toString());
    trackEvent("recipe_scale", {
      recipe_slug: recipe.slug,
      factor: Math.round((value / base) * 100) / 100,
      servings: value,
    });
  };

  const factor = servings / base;
  const lines = scaleIngredients(recipe.ingredients, factor);

  return (
    <article>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 print:hidden">
          <Link href="/" className="hover:text-slate-800">Pantry Hub</Link>
          <span aria-hidden="true"> / </span>
          <Link href="/recipes/" className="hover:text-slate-800">Recipes</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-slate-700">{recipe.title}</span>
        </nav>

        <h1 className="mt-4 font-serif-heading text-3xl font-bold text-slate-900 sm:text-4xl">{recipe.title}</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-700 sm:text-lg">{recipe.intro}</p>

        <RecipeSignedInActions recipe={recipe} />

        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Prep" value={minutesLabel(recipe.prepMin)} />
          <Stat label="Cook" value={recipe.cookMin > 0 ? minutesLabel(recipe.cookMin) : "No cook"} />
          <Stat label="Total" value={minutesLabel(totalMinutes(recipe))} />
          <Stat label="Makes" value={`${base} servings`} />
        </dl>

        <div className="mt-6 overflow-hidden rounded-2xl">
          <RecipeImage
            slug={recipe.slug}
            title={recipe.title}
            image={recipe.image}
            imageAlt={recipe.imageAlt}
            meal={recipe.meal}
            hasImage={recipe.hasImage}
            variant="hero"
            className="h-56 w-full sm:h-80"
          />
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section aria-labelledby="ingredients-heading">
            <h2 id="ingredients-heading" className="font-serif-heading text-2xl font-bold text-slate-900">Ingredients</h2>

            <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-[var(--marketing-border)] print:hidden" data-testid="scaler">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Scale recipe">
                {SCALE_PRESETS.map((f) => {
                  const target = servingsForFactor(base, f);
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={servings === target}
                      onClick={() => changeServings(target)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                        servings === target
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {factorLabel(f)}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Fewer servings"
                    disabled={servings <= MIN_SERVINGS}
                    onClick={() => changeServings(servings - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-[6rem] text-center text-sm font-semibold text-slate-900" aria-live="polite" data-testid="servings-label">
                    {servings} {servings === 1 ? "serving" : "servings"}
                  </span>
                  <button
                    type="button"
                    aria-label="More servings"
                    disabled={servings >= MAX_SERVINGS}
                    onClick={() => changeServings(servings + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Print
                </button>
              </div>
            </div>

            <ul className="mt-4 space-y-2 pl-0" data-testid="ingredient-list">
              {lines.map((line, i) => (
                <li key={i} className="list-none border-b border-[var(--marketing-border)] pb-2 text-slate-800">
                  {line.text}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Uses pantry staples:</span> {recipe.pantryStaples.join(", ")}.
            </p>
            <div className="mt-6">
              <RecipeSignupCta placement="mid_recipe" recipeSlug={recipe.slug} />
            </div>
          </section>

          <section aria-labelledby="steps-heading">
            <h2 id="steps-heading" className="font-serif-heading text-2xl font-bold text-slate-900">Steps</h2>
            {servings !== base ? (
              <p className="mt-2 text-sm text-slate-600 print:hidden">
                Amounts mentioned inside the steps are for the original {base} servings. Use the ingredient list for your scaled amounts.
              </p>
            ) : null}
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-slate-800 marker:font-semibold marker:text-[var(--primary)]">
              {recipe.steps.map((step, i) => (
                <li key={i} className="pl-1">{step}</li>
              ))}
            </ol>

            <h2 id="substitutions" className="mt-8 font-serif-heading text-2xl font-bold text-slate-900">Substitutions</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-800" data-testid="substitutions">
              {recipe.substitutions.map((swap, i) => (
                <li key={i}>{swap}</li>
              ))}
            </ul>

            <h2 className="mt-8 font-serif-heading text-2xl font-bold text-slate-900">Tips and storage</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-800">
              {recipe.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </section>
        </div>

        {recipe.faqs && recipe.faqs.length > 0 ? (
          <section aria-labelledby="faq-heading" className="mt-10" data-testid="recipe-faqs">
            <h2 id="faq-heading" className="font-serif-heading text-2xl font-bold text-slate-900">Questions</h2>
            <div className="mt-3 space-y-4">
              {recipe.faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="font-semibold text-slate-900">{faq.question}</h3>
                  <p className="mt-1 text-slate-800">{faq.answer}</p>
                </div>
              ))}
            </div>
            {recipe.faqSource ? (
              <p className="mt-3 text-sm text-slate-600">
                Source:{" "}
                <a href={recipe.faqSource.url} rel="noopener noreferrer" className="underline hover:text-slate-900">
                  {recipe.faqSource.label}
                </a>
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="mt-10">
          <RecipeSignupCta placement="end" recipeSlug={recipe.slug} />
        </div>
        <div className="mt-6">
          <RecipeNewsletterForm recipeSlug={recipe.slug} />
        </div>

        {related.length > 0 ? (
          <section aria-labelledby="related-heading" className="mt-10 print:hidden">
            <h2 id="related-heading" className="font-serif-heading text-2xl font-bold text-slate-900">More recipes</h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 p-0 sm:grid-cols-3 sm:gap-5">
              {related.map((r) => (
                <RecipeCard key={r.slug} recipe={r} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}

