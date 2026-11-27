import type { Recipe } from "./types";

export const easyChocolateFudge: Recipe = {
  slug: "easy-chocolate-fudge",
  title: "Easy Chocolate Fudge",
  seoTitle: "Easy Chocolate Fudge with Condensed Milk",
  metaSummary: "Easy chocolate fudge, 15 minutes",
  intro:
    "This is a simple chocolate fudge made with condensed milk and chocolate chips, with about 15 minutes of work plus time to chill. You melt the chocolate with the condensed milk, stir in vanilla and a pinch of salt, and pour it into a pan. No candy thermometer is required.",
  meal: "snack",
  tags: ["holiday"],
  servings: 16,
  prepMin: 10,
  cookMin: 5,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/easy-chocolate-fudge.webp",
  imageAlt: "AI-generated illustration of cubed chocolate fudge on parchment, not a photo of this dish",
  ingredients: [
    { qty: 3, unit: "cup", item: "semisweet chocolate chips" },
    { qty: 1, unit: "can", size: "14 oz", item: "sweetened condensed milk" },
    { qty: 2, unit: "tbsp", item: "butter" },
    { qty: 1, unit: "tsp", item: "vanilla extract" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 0.5, unit: "cup", item: "chopped walnuts or pecans", note: "optional" },
  ],
  steps: [
    "Line an 8-inch square pan with parchment, leaving an overhang on two sides.",
    "Put the chocolate chips, condensed milk, and butter in a medium saucepan. Warm them over low heat, stirring, until the chocolate is melted and the mixture is smooth, about 5 minutes. You can also melt them in a microwave-safe bowl in short bursts, stirring between each one.",
    "Take the pan off the heat and stir in the vanilla, salt, and nuts, if you are using them.",
    "Spread the fudge in the pan and smooth the top. Chill until firm, about 2 hours.",
    "Lift the fudge out by the parchment and cut it into small squares. Keep it covered in the fridge.",
  ],
  substitutions: [
    "Semisweet chocolate chips: use dark chocolate chips, or a mix of semisweet and milk chocolate.",
    "Sweetened condensed milk: this recipe needs condensed milk, not evaporated milk, which is unsweetened and will not set the same way.",
    "Walnuts or pecans: use crushed peppermint, mini marshmallows, or leave the fudge plain.",
    "Butter: leave it out if you do not have it; the fudge will still set, with a slightly firmer bite.",
    "Vanilla: use 1/2 teaspoon peppermint extract for a mint fudge, or skip the extract.",
  ],
  tips: [
    "Low heat matters here. If the chocolate gets too hot, it can turn grainy; pull the pan off the heat as soon as it is smooth.",
    "For cleaner cuts, run a knife under hot water, dry it, and slice the cold fudge, wiping the knife between cuts.",
  ],
  pantryStaples: ["chocolate chips", "condensed milk", "butter", "vanilla"],
  related: ["peppermint-bark", "easy-sugar-cookies", "sausage-cheese-balls"],
};
