
export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  lastUpdated: string;
}

export type ActivityType = 'ADD' | 'REMOVE' | 'ADJUST';

export interface Activity {
  id: string;
  itemId: string;
  itemName: string;
  type: ActivityType;
  amount: number;
  timestamp: string;
  source: 'MANUAL' | 'RECEIPT_SCAN' | 'VISUAL_USAGE';
}

export interface ScanResult {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
}

export interface UsageResult {
  name: string;
  quantityUsed: number;
}

export interface ThresholdConfig {
  [category: string]: number;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  currentQuantity: number;
  suggestedQuantity: number;
  unit: string;
  isManual: boolean;
  isChecked: boolean;
  addedAt: string;
  reason: 'low_stock' | 'manual' | 'recommendation';
}

export interface ShoppingList {
  items: ShoppingListItem[];
  generatedAt: string;
  thresholdConfig: ThresholdConfig;
}
