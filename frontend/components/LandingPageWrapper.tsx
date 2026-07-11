"use client";

import { useRouter } from "next/navigation";
import LandingPage from "@/components/LandingPage";

export function LandingPageWrapper() {
  const router = useRouter();

  return (
    <LandingPage
      onGetStarted={() => router.push("/auth/signin/")}
      onLogin={() => router.push("/auth/signin/")}
    />
  );
}