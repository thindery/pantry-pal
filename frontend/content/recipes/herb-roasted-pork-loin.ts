import type { Recipe } from "./types";

export const herbRoastedPorkLoin: Recipe = {
  slug: "herb-roasted-pork-loin",
  title: "Herb Roasted Pork Loin",
  seoTitle: "Herb Roasted Pork Loin for Christmas Dinner",
  metaSummary: "Herb roasted pork loin, about 90 minutes",
  intro:
    "This is an herb roasted pork loin that takes about 90 minutes, including time in the oven. A boneless loin is rubbed with garlic, rosemary, thyme, and olive oil, then roasted until the center is just cooked through. It slices cleanly for a Christmas dinner main when you want something smaller than a ham.",
  meal: "dinner",
  tags: ["holiday"],
  servings: 6,
  prepMin: 15,
  cookMin: 75,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/herb-roasted-pork-loin.webp",
  imageAlt: "AI-generated illustration of a sliced herb roasted pork loin, not a photo of this dish",
  ingredients: [
    { qty: 3, unit: "lb", item: "boneless pork loin roast" },
    { qty: 3, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: 2, unit: "tsp", item: "chopped fresh rosemary", note: "or 1 teaspoon dried" },
    { qty: 1, unit: "tsp", item: "dried thyme" },
    { qty: 1, unit: "tsp", item: "kosher salt" },
    { qty: 0.5, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Pat the pork loin dry. Tie it with kitchen twine in 3 or 4 places so it cooks evenly.",
    "Stir the garlic, olive oil, rosemary, thyme, salt, and pepper into a paste. Rub it all over the pork and set the roast fat side up on a rack in a roasting pan.",
    "Roast for 60 to 75 minutes, until a thermometer in the center reads 145°F (63°C).",
    "Rest the pork, tented with foil, for 10 to 15 minutes. The temperature will rise a few degrees.",
    "Remove the twine, slice into ½-inch pieces, and spoon any pan juices over the slices.",
  ],
  substitutions: [
    "Pork loin: use a pork tenderloin (about 1½ pounds) and start checking the temperature at 20 minutes; the cook time will be much shorter.",
    "Fresh rosemary: use 1 teaspoon dried rosemary, crushed between your fingers.",
    "Olive oil: use melted butter or a neutral oil.",
    "Dried thyme: use Italian seasoning or an equal amount of dried sage.",
  ],
  tips: [
    "Pork loin and pork tenderloin are different cuts; a loin roast is thicker and needs the longer cook time in this recipe.",
    "If the crust is browning too fast, tent the roast with foil for the last 15 minutes.",
  ],
  pantryStaples: ["garlic", "olive oil", "dried thyme", "rosemary"],
  related: ["brown-sugar-glazed-ham", "rosemary-roast-chicken", "classic-stuffing"],
};
