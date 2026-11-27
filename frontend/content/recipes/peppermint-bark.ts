import type { Recipe } from "./types";

export const peppermintBark: Recipe = {
  slug: "peppermint-bark",
  title: "Peppermint Bark",
  seoTitle: "Easy Peppermint Bark (No-Bake Holiday)",
  metaSummary: "Easy peppermint bark, 20 minutes",
  intro:
    "This is a no-bake peppermint bark you can make in about 20 minutes of work, plus time to chill. It uses semisweet chocolate, white chocolate, and crushed candy canes or peppermint candies. A little oil in the melted chocolate helps the layers spread smoothly.",
  meal: "snack",
  tags: ["holiday"],
  servings: 16,
  prepMin: 15,
  cookMin: 10,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/peppermint-bark.webp",
  imageAlt: "AI-generated illustration of broken pieces of peppermint bark with crushed candy canes, not a photo of this dish",
  ingredients: [
    { qty: 8, unit: "oz", item: "semisweet chocolate chips", note: "or chopped semisweet chocolate" },
    { qty: 8, unit: "oz", item: "white chocolate chips", note: "or chopped white chocolate" },
    { qty: 1, unit: "tsp", item: "neutral oil", note: "divided, optional, for smoother melting" },
    { qty: 0.5, unit: "cup", item: "crushed candy canes or peppermint candies" },
    { qty: 1, unit: "pinch", item: "salt" },
  ],
  steps: [
    "Line an 8-inch square pan with parchment, leaving an overhang on two sides.",
    "Melt the semisweet chocolate with 1/2 teaspoon of the oil in a heatproof bowl set over a pan of barely simmering water, or in short bursts in the microwave, stirring until smooth. Stir in the pinch of salt. Spread the chocolate in the pan in an even layer.",
    "Chill the first layer for 15 minutes, until it is just set but not rock hard.",
    "Melt the white chocolate with the remaining 1/2 teaspoon of oil the same way. Spread it over the dark layer and sprinkle the crushed peppermint on top, pressing it in lightly.",
    "Chill for about 1 hour, until firm. Lift the bark out by the parchment and break or cut it into pieces. Keep it cool until you serve it.",
  ],
  substitutions: [
    "Semisweet chocolate: use dark chocolate, or milk chocolate for a sweeter bark.",
    "White chocolate: use more semisweet chocolate for a single-layer bark, and still add the peppermint on top.",
    "Candy canes: use crushed peppermint candies, or skip the candy and sprinkle toasted chopped nuts instead.",
    "Neutral oil: use coconut oil, or leave it out if the chocolate is melting smoothly on its own.",
    "8-inch pan: use a small rimmed sheet pan and spread the layers a little thinner; the chill time will be shorter.",
  ],
  tips: [
    "Keep water out of the chocolate, which can make it seize. If a layer looks streaky, it may have gotten a little too hot; stir in a teaspoon of oil and spread it anyway.",
    "Store the bark in an airtight container in the fridge, with parchment between layers, especially in a warm kitchen.",
  ],
  pantryStaples: ["semisweet chocolate", "white chocolate", "candy canes", "oil"],
  related: ["easy-chocolate-fudge", "easy-sugar-cookies", "pumpkin-pie"],
};
