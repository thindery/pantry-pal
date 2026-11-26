import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { MEAL_LABELS, totalMinutes } from "@/content/recipes";
import type { RecipeWithImage } from "@/content/recipes/images";
import { RecipeImage } from "./RecipeImage";

/** Compact on phones (thumbnail beside the text), a small vertical card from sm up. */
export function RecipeCard({ recipe }: { recipe: RecipeWithImage }) {
  return (
    <li className="list-none">
      <Link
        href={`/recipes/${recipe.slug}/`}
        className="group flex h-full gap-3 rounded-2xl border border-[var(--marketing-border)] bg-white p-3 transition-shadow hover:shadow-md sm:flex-col sm:gap-0 sm:p-0 sm:overflow-hidden"
      >
        <RecipeImage
          slug={recipe.slug}
          title={recipe.title}
          image={recipe.image}
          imageAlt={recipe.imageAlt}
          meal={recipe.meal}
          hasImage={recipe.hasImage}
          className="h-24 w-24 shrink-0 rounded-xl sm:h-40 sm:w-full sm:rounded-none"
        />
        <div className="min-w-0 sm:p-4">
          <h3 className="font-serif-heading text-lg font-bold leading-snug text-slate-900 group-hover:text-[var(--primary)]">
            {recipe.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {totalMinutes(recipe)} min
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {recipe.servings} servings
            </span>
          </p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">{MEAL_LABELS[recipe.meal]}</span>
            {recipe.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {tag}
              </span>
            ))}
          </p>
        </div>
      </Link>
    </li>
  );
}
