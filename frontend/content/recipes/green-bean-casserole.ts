import type { Recipe } from "./types";

export const greenBeanCasserole: Recipe = {
  slug: "green-bean-casserole",
  title: "Green Bean Casserole",
  seoTitle: "Green Bean Casserole (Classic Holiday Side)",
  metaSummary: "Classic green bean casserole, 45 minutes",
  intro:
    "This is the classic green bean casserole, ready in about 45 minutes. It uses canned or frozen green beans, a can of condensed cream of mushroom soup, and a can of fried onions. The beans bake in the sauce, and the onions go on at the end so they stay crisp.",
  meal: "dinner",
  tags: ["make-ahead"],
  servings: 8,
  prepMin: 15,
  cookMin: 30,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/green-bean-casserole.webp",
  imageAlt: "AI-generated illustration of a baking dish of green bean casserole with crispy fried onions, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "lb", item: "green beans", note: "trimmed, or two 12- to 16-oz bags frozen, thawed and drained" },
    { qty: 1, unit: "can", size: "10.5 oz", item: "condensed cream of mushroom soup" },
    { qty: 0.5, unit: "cup", item: "milk" },
    { qty: 1, unit: "tsp", item: "soy sauce" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
    { qty: 1.5, unit: "cup", item: "canned fried onions", note: "divided" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C).",
    "If you are using fresh green beans, boil them in salted water for 5 minutes, then drain well. Frozen beans only need to be thawed and patted dry.",
    "In a 2-quart baking dish, stir together the soup, milk, soy sauce, and pepper. Fold in the beans and ⅔ cup of the fried onions.",
    "Bake, uncovered, for 25 minutes, until the sauce is bubbling.",
    "Stir, sprinkle the remaining fried onions on top, and bake for 5 minutes more, until the onions are golden. Let it sit for 5 minutes before serving.",
  ],
  substitutions: [
    "Cream of mushroom soup: use cream of chicken soup, or a homemade white sauce made with 2 tablespoons each of butter and flour whisked with 1 cup of milk and a handful of chopped sautéed mushrooms.",
    "Fried onions: use buttered breadcrumbs or crushed crackers for the topping.",
    "Soy sauce: use Worcestershire sauce or a pinch of extra salt.",
    "Fresh or frozen beans: canned green beans work too. Drain them well and skip the boiling step.",
    "Milk: use broth or unsweetened plant milk.",
  ],
  tips: [
    "You can assemble the casserole, without the final onion topping, up to a day ahead. Cover and refrigerate, then add 10 minutes to the first bake and put the onions on at the end.",
    "If the sauce looks tight after baking, stir in a splash of milk before you add the topping.",
  ],
  pantryStaples: ["green beans", "canned soup", "fried onions", "milk"],
  related: ["sunday-pot-roast", "classic-meatloaf", "sunday-chicken-and-rice"],
};
