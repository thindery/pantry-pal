"use client";

import { useRouter } from "next/navigation";
import PricingPage from "./PricingPage";

export default function PricingPageRoute() {
  const router = useRouter();
  return <PricingPage onClose={() => router.push("/")} />;
}
