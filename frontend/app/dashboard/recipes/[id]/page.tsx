import type { Metadata } from "next";
import { RecipeDetailView } from "@/components/dashboard/views/recipe-detail-view";

export const metadata: Metadata = {
  title: "Recipe Details | Pantry Hub",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <RecipeDetailView params={params} />;
}
