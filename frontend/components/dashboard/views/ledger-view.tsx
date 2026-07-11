"use client";

import { useEffect } from "react";
import ActivityLedger from "@/components/ActivityLedger";
import { usePantry } from "@/contexts/pantry-provider";

export function LedgerView() {
  const { activities, isLoadingActivities, activitiesError, loadActivities } =
    usePantry();

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  return (
    <ActivityLedger
      activities={activities}
      isLoading={isLoadingActivities}
      error={activitiesError}
      onRetry={loadActivities}
    />
  );
}