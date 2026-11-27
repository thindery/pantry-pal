import type { Recipe } from "./types";

export const gingerbreadCookies: Recipe = {
  slug: "gingerbread-cookies",
  title: "Gingerbread Cookies",
  seoTitle: "Easy Gingerbread Cookies for Christmas",
  metaSummary: "Cut-out gingerbread cookies, about 90 minutes",
  intro:
    "These are cut-out gingerbread cookies that take about 90 minutes, including a chill in the fridge. The dough uses molasses, brown sugar, and pantry spices, and it rolls cleanly for trees, people, or simple rounds. Bake until the edges are just set so the cookies stay a little soft in the center.",
  meal: "snack",
  tags: ["holiday", "vegetarian"],
  servings: 24,
  prepMin: 30,
  cookMin: 60,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/gingerbread-cookies.webp",
  imageAlt: "AI-generated illustration of decorated gingerbread cookies on a plate, not a photo of this dish",
  ingredients: [
    { qty: 3, unit: "cup", item: "all-purpose flour", note: "plus more for rolling" },
    { qty: 0.75, unit: "cup", item: "packed brown sugar" },
    { qty: 0.75, unit: "cup", item: "unsulphured molasses" },
    { qty: 0.5, unit: "cup", item: "butter", note: "softened" },
    { qty: 1, item: "egg", plural: "eggs" },
    { qty: 1, unit: "tbsp", item: "ground ginger" },
    { qty: 1, unit: "tsp", item: "ground cinnamon" },
    { qty: 1, unit: "tsp", item: "baking soda" },
    { qty: 0.5, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Beat the butter and brown sugar until creamy. Beat in the molasses and egg.",
    "In a second bowl, whisk the flour, ginger, cinnamon, baking soda, and salt. Mix the dry ingredients into the wet just until a dough forms. Divide in half, flatten into disks, wrap, and refrigerate for at least 45 minutes.",
    "Heat the oven to 350°F (175°C). On a lightly floured surface, roll one disk to about ¼-inch thickness. Cut shapes and set them 1 inch apart on parchment-lined baking sheets. Reroll the scraps once.",
    "Bake for 8 to 10 minutes, until the edges are set and the centers look dry. Cool on the sheet for 5 minutes, then move to a rack.",
    "Decorate with icing if you like, once the cookies are completely cool.",
  ],
  substitutions: [
    "Molasses: use dark molasses, not blackstrap, which can taste bitter. In a pinch, use ½ cup molasses plus ¼ cup honey.",
    "Butter: use an equal amount of plant butter if you need a dairy-free dough.",
    "Brown sugar: use packed dark or light brown sugar.",
    "Individual spices: add ¼ teaspoon ground cloves if you want a stronger spice note.",
  ],
  tips: [
    "If the dough sticks while rolling, chill it for 10 more minutes or roll it between two sheets of parchment.",
    "For sharper shapes, freeze the cut cookies on the sheet for 10 minutes before baking.",
  ],
  pantryStaples: ["molasses", "brown sugar", "flour", "ginger"],
  related: ["easy-sugar-cookies", "chocolate-crinkle-cookies", "thumbprint-cookies"],
};
