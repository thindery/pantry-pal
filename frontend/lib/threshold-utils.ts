import { DEFAULT_THRESHOLDS } from "@/lib/constants";
import type { PantryItem, ThresholdConfig } from "@/types";

export type ItemThresholdOverrides = Record<string, number>;

/**
 * Pre-2026-07-18 code defaults.
 * produce 3; pantry 2; dairy 2; beverages 2; snacks 2; other 2; frozen 1; meat 1
 */
export const OLD_PRE_JULY_THRESHOLDS: Record<string, number> = {
  produce: 3,
  pantry: 2,
  dairy: 2,
  beverages: 2,
  snacks: 2,
  other: 2,
  frozen: 1,
  meat: 1,
};

/**
 * One-time migration helper: if a category's value EXACTLY equals the old
 * pre-2026-07-18 default, reset that category to 1. Leave any other value untouched.
 */
export function migrateThresholdConfig(config: ThresholdConfig): ThresholdConfig {
  const next: ThresholdConfig = { ...config };
  for (const [cat, oldVal] of Object.entries(OLD_PRE_JULY_THRESHOLDS)) {
    if (next[cat] === oldVal) {
      next[cat] = 1;
    }
  }
  return next;
}

export function getCategoryThreshold(
  category: string,
  thresholdConfig: ThresholdConfig,
): number {
  return thresholdConfig[category] ?? DEFAULT_THRESHOLDS[category] ?? 1;
}

export function getItemTarget(
  item: Pick<PantryItem, "id" | "category"> & { targetQuantity?: number | null },
  thresholdConfig?: ThresholdConfig,
  itemOverrides?: ItemThresholdOverrides,
): number {
  const override = itemOverrides?.[item.id];
  if (override != null && !Number.isNaN(override)) {
    return override;
  }
  if (item.targetQuantity != null && !Number.isNaN(item.targetQuantity)) {
    return item.targetQuantity;
  }
  if (thresholdConfig && item.category in thresholdConfig) {
    const catVal = thresholdConfig[item.category];
    if (catVal != null && !Number.isNaN(catVal)) {
      return catVal;
    }
  }
  return 1;
}

export function getItemThreshold(
  item: Pick<PantryItem, "id" | "category"> & { targetQuantity?: number | null },
  thresholdConfig: ThresholdConfig,
  itemOverrides: ItemThresholdOverrides,
): number {
  return getItemTarget(item, thresholdConfig, itemOverrides);
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