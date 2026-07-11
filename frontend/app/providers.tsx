"use client";

import { SessionProvider } from "next-auth/react";
import VersionUpdateToast from "@/components/VersionUpdateToast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <VersionUpdateToast />
    </SessionProvider>
  );
}