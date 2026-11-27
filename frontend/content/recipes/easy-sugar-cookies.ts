import type { Recipe } from "./types";

export const easySugarCookies: Recipe = {
  slug: "easy-sugar-cookies",
  title: "Easy Sugar Cookies",
  seoTitle: "Easy Holiday Sugar Cookies to Decorate",
  metaSummary: "Easy holiday sugar cookies, 45 minutes",
  intro:
    "These are simple holiday sugar cookies you can roll and cut, ready in about 45 minutes. The dough uses butter, sugar, an egg, flour, and vanilla from the pantry. A short chill makes the cookies easier to cut, and you can decorate them once they are cool.",
  meal: "snack",
  tags: ["holiday"],
  servings: 24,
  prepMin: 25,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/easy-sugar-cookies.webp",
  imageAlt: "AI-generated illustration of decorated holiday sugar cookies on a plate, not a photo of this dish",
  ingredients: [
    { qty: 2.25, unit: "cup", item: "all-purpose flour", note: "plus more for rolling" },
    { qty: 0.5, unit: "tsp", item: "baking powder" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 12, unit: "tbsp", item: "butter", note: "softened" },
    { qty: 0.75, unit: "cup", item: "granulated sugar" },
    { qty: 1, item: "egg", plural: "eggs" },
    { qty: 2, unit: "tsp", item: "vanilla extract" },
    { qty: null, item: "decorating sugar or simple icing", note: "optional", scalable: false },
  ],
  steps: [
    "Whisk the flour, baking powder, and salt in a bowl. In a second bowl, beat the butter and sugar until they look creamy. Beat in the egg and vanilla.",
    "Stir the dry ingredients into the butter mixture until a soft dough forms. Split the dough in half, flatten each half into a disk, wrap, and chill for 20 minutes, until it is firm enough to roll.",
    "Heat the oven to 350°F (175°C). Line two baking sheets with parchment. Roll one disk at a time on a lightly floured surface to about 1/4 inch thick and cut out shapes. Reroll the scraps once.",
    "Set the cookies 1 inch apart on the sheets. Bake, one sheet at a time, for 8 to 10 minutes, until the edges are just turning pale gold. Cool on the sheet for 2 minutes, then move the cookies to a rack.",
    "Decorate with sugar or icing once the cookies are completely cool.",
  ],
  substitutions: [
    "Butter: use a 1:1 baking stick margarine; the flavor will be a little different.",
    "Vanilla: use 1/2 teaspoon almond extract plus 1½ teaspoons vanilla, or skip the almond if anyone at the table cannot have it.",
    "Cut-out shapes: roll the dough into 1-inch balls, flatten them with a glass, and bake as drop cookies if you do not want to cut shapes.",
    "Decorating sugar: leave the cookies plain, or mix 1 cup powdered sugar with 2 to 3 teaspoons of milk for a simple icing.",
    "All-purpose flour: if the dough feels sticky after chilling, dust the counter with more flour rather than adding a lot to the dough, which can make the cookies tough.",
  ],
  tips: [
    "If the dough gets soft while you are cutting, slide the cut shapes on the parchment back into the fridge for 10 minutes before baking so they hold their shape.",
    "Baked cookies keep in an airtight container for several days, or you can freeze the dough disks for up to a month.",
  ],
  pantryStaples: ["flour", "butter", "sugar", "vanilla"],
  related: ["peppermint-bark", "easy-chocolate-fudge", "pumpkin-pie"],
};
