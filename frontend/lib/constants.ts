import type { ThresholdConfig } from "@/types";

export const UNITS = [
  "units",
  "lbs",
  "oz",
  "grams",
  "kg",
  "cups",
  "bottles",
  "cans",
  "boxes",
  "other",
] as const;

export const CATEGORIES = [
  "produce",
  "pantry",
  "dairy",
  "frozen",
  "meat",
  "beverages",
  "snacks",
  "other",
] as const;

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  produce: 3,
  pantry: 2,
  dairy: 2,
  frozen: 1,
  meat: 1,
  beverages: 2,
  snacks: 2,
  other: 2,
};