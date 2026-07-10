"use client";

import { useRouter } from "next/navigation";
import PricingPage from "@/components/PricingPage";

export default function PricingRoutePage() {
  const router = useRouter();

  return <PricingPage onClose={() => router.push("/dashboard/")} />;
}