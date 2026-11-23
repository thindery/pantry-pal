import type { Metadata } from "next";
import { RecipesView } from "@/components/dashboard/views/recipes-view";

export const metadata: Metadata = {
  title: "Recipes | Pantry Hub",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RecipesPage() {
  return <RecipesView />;
}
