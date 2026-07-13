import { DEFAULT_THRESHOLDS } from "@/lib/constants";
import type { PantryItem, ThresholdConfig } from "@/types";

export type ItemThresholdOverrides = Record<string, number>;

export function getCategoryThreshold(
  category: string,
  thresholdConfig: ThresholdConfig,
): number {
  return thresholdConfig[category] ?? DEFAULT_THRESHOLDS[category] ?? 2;
}

export function getItemThreshold(
  item: Pick<PantryItem, "id" | "category">,
  thresholdConfig: ThresholdConfig,
  itemOverrides: ItemThresholdOverrides,
): number {
  const override = itemOverrides[item.id];
  if (override != null && !Number.isNaN(override)) {
    return override;
  }
  return getCategoryThreshold(item.category, thresholdConfig);
}

export function isItemLowStock(
  item: PantryItem,
  thresholdConfig: ThresholdConfig,
  itemOverrides: ItemThresholdOverrides,
): boolean {
  if (item.quantity <= 0) return false;
  const threshold = getItemThreshold(item, thresholdConfig, itemOverrides);
  return item.quantity <= threshold;
}