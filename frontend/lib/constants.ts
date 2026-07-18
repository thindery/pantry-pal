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
  produce: 1,
  pantry: 1,
  dairy: 1,
  frozen: 1,
  meat: 1,
  beverages: 1,
  snacks: 1,
  other: 1,
};