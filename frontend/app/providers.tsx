"use client";

import { ClerkProvider } from "@clerk/nextjs";
import VersionUpdateToast from "@/components/VersionUpdateToast";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in/"
      signUpUrl="/sign-up/"
      signInFallbackRedirectUrl="/dashboard/"
      signUpFallbackRedirectUrl="/dashboard/"
      appearance={clerkAuthAppearance}
    >
      {children}
      <VersionUpdateToast />
    </ClerkProvider>
  );
}