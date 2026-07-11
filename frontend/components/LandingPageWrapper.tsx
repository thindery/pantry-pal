"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LandingPage from "@/components/LandingPage";

export function LandingPageWrapper() {
  const router = useRouter();
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <LandingPage
      isLoggedIn={isLoggedIn}
      onGetStarted={() =>
        router.push(isLoggedIn ? "/dashboard/" : "/auth/signin/")
      }
      onLogin={() => router.push("/auth/signin/")}
      onGoToDashboard={() => router.push("/dashboard/")}
    />
  );
}