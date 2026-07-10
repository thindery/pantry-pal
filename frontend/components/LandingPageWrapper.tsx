"use client";

import { useRouter } from "next/navigation";
import LandingPage from "@/components/LandingPage";

export function LandingPageWrapper() {
  const router = useRouter();

  return (
    <LandingPage
      onGetStarted={() => router.push("/sign-up/")}
      onLogin={() => router.push("/sign-in/")}
    />
  );
}