import type { Recipe } from "./types";

export const bakedZiti: Recipe = {
  slug: "baked-ziti",
  title: "Baked Ziti",
  seoTitle: "Easy Baked Ziti with Marinara and Ricotta",
  metaSummary: "Baked ziti with ricotta, about 50 minutes",
  intro:
    "This is baked ziti that takes about 50 minutes, including time in the oven. Ziti or penne is tossed with marinara, ricotta, and mozzarella, then baked until the cheese is browned and bubbling. Ground beef is browned and stirred into the marinara for a meat sauce; you can skip the beef if you want a cheese-only version.",
  meal: "dinner",
  tags: [],
  servings: 8,
  prepMin: 20,
  cookMin: 30,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/baked-ziti.webp",
  imageAlt: "AI-generated illustration of baked ziti with melted cheese, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "lb", item: "ziti", note: "or penne" },
    { qty: 1, unit: "lb", item: "ground beef" },
    { qty: 24, unit: "oz", item: "marinara sauce" },
    { qty: 15, unit: "oz", item: "ricotta" },
    { qty: 2, unit: "cup", item: "shredded mozzarella" },
    { qty: 0.25, unit: "cup", item: "grated Parmesan" },
    { qty: 1, unit: "tsp", item: "Italian seasoning" },
    { qty: 0.5, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Grease a 9×13-inch baking dish. Cook the ziti in salted boiling water until just shy of al dente. Drain.",
    "Brown the ground beef in a skillet over medium heat, breaking it up, until no longer pink. Drain extra fat. Stir in the marinara and Italian seasoning and simmer for 5 minutes.",
    "In a bowl, stir the ricotta, 1 cup of the mozzarella, the Parmesan, and the salt.",
    "Toss the pasta with most of the sauce, leaving about ½ cup for the top. Spread half of the pasta in the dish, dollop on the ricotta mixture, and add the remaining pasta. Spoon on the reserved sauce and sprinkle the remaining 1 cup mozzarella on top.",
    "Bake for 25 to 30 minutes, until the sauce is bubbling and the cheese is browned in spots. Rest for 10 minutes before serving.",
  ],
  substitutions: [
    "Ground beef: skip it for a vegetarian baked ziti, or use Italian sausage, casings removed.",
    "Ziti: use penne or rigatoni in the same amount.",
    "Ricotta: use 1½ cups cottage cheese, blended until somewhat smooth if you prefer.",
    "Marinara: use 3 cups homemade tomato sauce.",
  ],
  tips: [
    "Undercook the pasta slightly so it finishes in the oven without getting soft.",
    "The rest after baking helps the slices hold together.",
  ],
  pantryStaples: ["ziti", "marinara", "ricotta", "mozzarella"],
  related: ["easy-lasagna", "spaghetti-and-meatballs", "lasagna-soup"],
};
