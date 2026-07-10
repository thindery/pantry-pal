"use client";

import ActivityLedger from "@/components/ActivityLedger";
import { usePantry } from "@/contexts/pantry-provider";

export function LedgerView() {
  const { activities, isLoadingActivities, activitiesError, loadActivities } =
    usePantry();

  return (
    <ActivityLedger
      activities={activities}
      isLoading={isLoadingActivities}
      error={activitiesError}
      onRetry={loadActivities}
    />
  );
}