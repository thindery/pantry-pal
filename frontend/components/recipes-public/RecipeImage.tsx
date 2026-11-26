import { ChefHat } from "lucide-react";
import type { MealType } from "@/content/recipes";

const PLACEHOLDER_GRADIENTS: Record<MealType, string> = {
  breakfast: "from-amber-100 via-orange-50 to-yellow-100",
  lunch: "from-lime-100 via-emerald-50 to-green-100",
  dinner: "from-orange-100 via-amber-50 to-rose-100",
  snack: "from-yellow-100 via-stone-50 to-amber-100",
};

interface RecipeImageProps {
  slug: string;
  title: string;
  image: string;
  imageAlt: string;
  meal: MealType;
  hasImage: boolean;
  /** "hero" shows the illustration caption under the image. */
  variant?: "card" | "hero";
  className?: string;
}

/**
 * Recipe image, or a neutral gradient + icon placeholder until the real file
 * exists. Real images are AI illustrations, so alt text says so and the hero
 * variant carries a visible caption.
 */
export function RecipeImage({ title, image, imageAlt, meal, hasImage, variant = "card", className = "" }: RecipeImageProps) {
  if (!hasImage) {
    return (
      <div
        data-testid="recipe-image-placeholder"
        role="img"
        aria-label={`Placeholder for ${title}`}
        className={`flex items-center justify-center bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[meal]} ${className}`}
      >
        <ChefHat className={variant === "hero" ? "h-14 w-14 text-slate-400" : "h-8 w-8 text-slate-400"} aria-hidden="true" />
      </div>
    );
  }
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- static export-style site, images.unoptimized is on
    <img
      src={image}
      alt={imageAlt}
      width={1200}
      height={900}
      loading={variant === "hero" ? "eager" : "lazy"}
      className={`object-cover ${className}`}
    />
  );
  if (variant === "hero") {
    return (
      <figure className="m-0">
        {img}
        <figcaption className="mt-2 text-xs text-slate-500">AI illustration, not a photo of this dish.</figcaption>
      </figure>
    );
  }
  return img;
}
