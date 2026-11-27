import type { DietTag, MealType, Recipe } from "./types";
import { bakedOatmeal } from "./baked-oatmeal";
import { blackBeanTacos } from "./black-bean-tacos";
import { cannedChickpeaCurry } from "./canned-chickpea-curry";
import { cannedTunaPasta } from "./canned-tuna-pasta";
import { easyRedLentilSoup } from "./easy-red-lentil-soup";
import { freezerBreakfastBurritos } from "./freezer-breakfast-burritos";
import { leftoverRiceFriedRice } from "./leftover-rice-fried-rice";
import { leftoverVegetableFrittata } from "./leftover-vegetable-frittata";
import { pastaEFagioli } from "./pasta-e-fagioli";
import { riceAndBeansWithCannedBeans } from "./rice-and-beans-with-canned-beans";
import { sheetPanChickenAndVegetables } from "./sheet-pan-chicken-and-vegetables";
import { weeknightChili } from "./weeknight-chili";
import { bakedPotatoSoup } from "./baked-potato-soup";
import { chickpeaSaladSandwiches } from "./chickpea-salad-sandwiches";
import { classicMeatloaf } from "./classic-meatloaf";
import { easyLasagna } from "./easy-lasagna";
import { easyVegetableSoup } from "./easy-vegetable-soup";
import { greenBeanCasserole } from "./green-bean-casserole";
import { lasagnaSoup } from "./lasagna-soup";
import { leftoverTurkeySoup } from "./leftover-turkey-soup";
import { peanutButterNoodles } from "./peanut-butter-noodles";
import { sundayChickenAndRice } from "./sunday-chicken-and-rice";
import { sundayPotRoast } from "./sunday-pot-roast";
import { whiteChickenChili } from "./white-chicken-chili";

import { breakfastCasserole } from "./breakfast-casserole";
import { classicStuffing } from "./classic-stuffing";
import { easyChocolateFudge } from "./easy-chocolate-fudge";
import { easySugarCookies } from "./easy-sugar-cookies";
import { homemadeCranberrySauce } from "./homemade-cranberry-sauce";
import { hoppinJohn } from "./hoppin-john";
import { leftoverTurkeyPotPie } from "./leftover-turkey-pot-pie";
import { leftoverTurkeySandwiches } from "./leftover-turkey-sandwiches";
import { peppermintBark } from "./peppermint-bark";
import { pumpkinPie } from "./pumpkin-pie";
import { sausageCheeseBalls } from "./sausage-cheese-balls";
import { sweetPotatoCasserole } from "./sweet-potato-casserole";

import { applePie } from "./apple-pie";
import { brownSugarGlazedHam } from "./brown-sugar-glazed-ham";
import { chocolateCrinkleCookies } from "./chocolate-crinkle-cookies";
import { cranberryCocktailMeatballs } from "./cranberry-cocktail-meatballs";
import { gingerbreadCookies } from "./gingerbread-cookies";
import { herbRoastedPorkLoin } from "./herb-roasted-pork-loin";
import { pecanPie } from "./pecan-pie";
import { pigsInABlanket } from "./pigs-in-a-blanket";
import { rosemaryRoastChicken } from "./rosemary-roast-chicken";
import { spinachArtichokeDip } from "./spinach-artichoke-dip";
import { stuffedMushrooms } from "./stuffed-mushrooms";
import { thumbprintCookies } from "./thumbprint-cookies";

import { appleCrisp } from "./apple-crisp";
import { bananaBread } from "./banana-bread";
import { breadPudding } from "./bread-pudding";
import { chocolateChipCookies } from "./chocolate-chip-cookies";
import { classicRicePudding } from "./classic-rice-pudding";
import { easyChocolateCake } from "./easy-chocolate-cake";
import { fudgyBrownies } from "./fudgy-brownies";
import { lemonBars } from "./lemon-bars";
import { noBakeCheesecake } from "./no-bake-cheesecake";
import { oatmealCookies } from "./oatmeal-cookies";
import { peachCobbler } from "./peach-cobbler";
import { snickerdoodles } from "./snickerdoodles";

import { bakedMacAndCheese } from "./baked-mac-and-cheese";
import { bakedZiti } from "./baked-ziti";
import { beefStew } from "./beef-stew";
import { beefStroganoff } from "./beef-stroganoff";
import { chickenAndDumplings } from "./chicken-and-dumplings";
import { chickenEnchiladas } from "./chicken-enchiladas";
import { chickenNoodleSoup } from "./chicken-noodle-soup";
import { chickenPotPie } from "./chicken-pot-pie";
import { shepherdsPie } from "./shepherds-pie";
import { sloppyJoes } from "./sloppy-joes";
import { spaghettiAndMeatballs } from "./spaghetti-and-meatballs";
import { tunaNoodleCasserole } from "./tuna-noodle-casserole";





export type { DietTag, MealType, Recipe, RecipeFaq, RecipeIngredient } from "./types";

/** Display order on the browse page. */
export const RECIPES: readonly Recipe[] = [
  weeknightChili,
  blackBeanTacos,
  bakedOatmeal,
  pastaEFagioli,
  sheetPanChickenAndVegetables,
  freezerBreakfastBurritos,
  leftoverRiceFriedRice,
  cannedTunaPasta,
  cannedChickpeaCurry,
  easyRedLentilSoup,
  riceAndBeansWithCannedBeans,
  leftoverVegetableFrittata,
  leftoverTurkeySoup,
  whiteChickenChili,
  bakedPotatoSoup,
  easyVegetableSoup,
  lasagnaSoup,
  greenBeanCasserole,
  easyLasagna,
  sundayChickenAndRice,
  sundayPotRoast,
  classicMeatloaf,
  peanutButterNoodles,
  chickpeaSaladSandwiches,
  leftoverTurkeyPotPie,
  leftoverTurkeySandwiches,
  sweetPotatoCasserole,
  homemadeCranberrySauce,
  classicStuffing,
  pumpkinPie,
  easySugarCookies,
  peppermintBark,
  easyChocolateFudge,
  sausageCheeseBalls,
  breakfastCasserole,
  hoppinJohn,
  brownSugarGlazedHam,
  herbRoastedPorkLoin,
  rosemaryRoastChicken,
  gingerbreadCookies,
  pecanPie,
  applePie,
  chocolateCrinkleCookies,
  thumbprintCookies,
  spinachArtichokeDip,
  stuffedMushrooms,
  cranberryCocktailMeatballs,
  pigsInABlanket,
  chocolateChipCookies,
  fudgyBrownies,
  bananaBread,
  appleCrisp,
  noBakeCheesecake,
  peachCobbler,
  breadPudding,
  snickerdoodles,
  oatmealCookies,
  lemonBars,
  easyChocolateCake,
  classicRicePudding,
  chickenPotPie,
  spaghettiAndMeatballs,
  beefStew,
  bakedMacAndCheese,
  chickenNoodleSoup,
  chickenEnchiladas,
  tunaNoodleCasserole,
  bakedZiti,
  sloppyJoes,
  shepherdsPie,
  chickenAndDumplings,
  beefStroganoff,
];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const DIET_LABELS: Record<DietTag, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
};

export function getRecipe(slug: string): Recipe | undefined {
  return RECIPES.find((r) => r.slug === slug);
}

export function totalMinutes(recipe: Pick<Recipe, "prepMin" | "cookMin">): number {
  return recipe.prepMin + recipe.cookMin;
}

/** The three hand-picked related recipes (same staple or leftover theme). */
export function relatedRecipes(recipe: Recipe): Recipe[] {
  return recipe.related.map((slug) => getRecipe(slug)).filter((r): r is Recipe => Boolean(r));
}

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Meta description pattern from the SEO desk:
 * "{what it is and time}. Made with {2-3 staples}. Substitutions included.
 * Track these ingredients in Pantry Hub, free."
 */
export function recipeMetaDescription(recipe: Recipe): string {
  const build = (n: number) =>
    `${recipe.metaSummary}. Made with ${joinList(recipe.pantryStaples.slice(0, n))}. Substitutions included. Track these ingredients in Pantry Hub, free.`;
  // Use up to three staples, dropping to two when the description would run past 160 characters.
  return build(3).length <= 160 ? build(3) : build(2);
}
