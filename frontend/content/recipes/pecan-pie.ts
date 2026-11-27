import type { Recipe } from "./types";

export const pecanPie: Recipe = {
  slug: "pecan-pie",
  title: "Pecan Pie",
  seoTitle: "Classic Pecan Pie for the Holiday Table",
  metaSummary: "Classic pecan pie, about 80 minutes",
  intro:
    "This is a classic pecan pie that takes about 80 minutes, most of it in the oven. The filling is corn syrup, brown sugar, eggs, butter, and pecans in a single crust. It is done when the edges are set and the center still has a slight jiggle; it firms as it cools.",
  meal: "snack",
  tags: ["holiday", "vegetarian"],
  servings: 8,
  prepMin: 15,
  cookMin: 65,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/pecan-pie.webp",
  imageAlt: "AI-generated illustration of a sliced pecan pie, not a photo of this dish",
  ingredients: [
    { qty: 1, item: "unbaked 9-inch pie crust", plural: "unbaked 9-inch pie crusts" },
    { qty: 1, unit: "cup", item: "light corn syrup" },
    { qty: 1, unit: "cup", item: "packed brown sugar" },
    { qty: 3, item: "egg", plural: "eggs" },
    { qty: 0.25, unit: "cup", item: "butter", note: "melted" },
    { qty: 1.5, unit: "cup", item: "pecan halves" },
    { qty: 1, unit: "tsp", item: "vanilla extract" },
    { qty: 0.25, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C). Fit the crust into a 9-inch pie dish and crimp the edge.",
    "In a large bowl, whisk the corn syrup, brown sugar, eggs, melted butter, vanilla, and salt until smooth. Stir in the pecans.",
    "Pour the filling into the crust and spread the pecans into an even layer.",
    "Bake for 50 to 60 minutes, until the edges are set and the center jiggles slightly when you nudge the dish. Tent the crust edge with foil if it browns too fast.",
    "Cool the pie on a rack for at least 2 hours before slicing.",
  ],
  substitutions: [
    "Light corn syrup: use dark corn syrup for a deeper flavor, or 1 cup maple syrup; the filling may set a little softer.",
    "Pecan halves: use chopped pecans, or a mix of pecans and walnuts.",
    "Brown sugar: use granulated sugar; the filling will be a little lighter in color.",
    "Store-bought crust: use a homemade single-crust pastry.",
  ],
  tips: [
    "The pie will look puffed when it comes out of the oven and will settle as it cools.",
    "If the center is still liquid after 60 minutes, bake 5 to 10 minutes more and check again.",
  ],
  pantryStaples: ["corn syrup", "brown sugar", "pecans", "eggs"],
  related: ["pumpkin-pie", "apple-pie", "easy-sugar-cookies"],
};
