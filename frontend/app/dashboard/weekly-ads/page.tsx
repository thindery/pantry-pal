import type { Metadata } from "next";
import { WeeklyAdsView } from "@/components/dashboard/views/weekly-ads-view";

export const metadata: Metadata = {
  title: "Weekly ads | Pantry Hub",
  robots: {
    index: false,
    follow: false,
  },
};

export default function WeeklyAdsPage() {
  return <WeeklyAdsView />;
}
