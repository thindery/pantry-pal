import { ApiError } from "@/lib/api-error";

/** PP-242: in-app paywalls that open the upgrade prompt. */
export type UpgradePromptFeature = "items" | "receipts";

export const ITEM_LIMIT_MESSAGE = "Item limit reached for your plan. Upgrade to add more items.";

/** True for the backend's plan-limit error (items, saved recipes). */
export function isTierLimitError(err: unknown): boolean {
  return err instanceof ApiError && err.code === "TIER_LIMIT_EXCEEDED";
}

export const UPGRADE_PROMPT_COPY: Record<UpgradePromptFeature, { title: string; message: string }> = {
  items: {
    title: "Your pantry is full on the free plan",
    message:
      "Free accounts hold up to 50 items. Upgrade to Pro to keep adding everything you buy, with no item limit.",
  },
  receipts: {
    title: "You've used this month's free receipt scans",
    message:
      "Free accounts get 5 AI receipt scans a month. Upgrade to Pro to scan every receipt and add it all in one go.",
  },
};
