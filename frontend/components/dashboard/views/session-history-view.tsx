"use client";

import SessionHistory from "@/components/SessionHistory";
import { usePantry } from "@/contexts/pantry-provider";

export function SessionHistoryView() {
  const { router } = usePantry();

  return (
    <div className="animate-in fade-in duration-300">
      <SessionHistory onBack={() => router.push("/dashboard/shopping-list/")} />
    </div>
  );
}