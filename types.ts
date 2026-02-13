export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  lastUpdated: string;
  barcode?: string;
}

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  image?: string;
}

export interface BarcodeScanRecord {
  id: string;
  barcode: string;
  name: string;
  category?: string;
  scannedAt: string;
  action: 'add' | 'lookup' | 'error';
  quantityAdded?: number;
  errorMessage?: string;
  itemId?: string;
}

export interface BarcodeScanStats {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  mostScannedItems: { name: string; barcode: string; count: number }[];
  scanHistoryByDate: { date: string; count: number }[];
}

export type ActivityType = 'ADD' | 'REMOVE' | 'ADJUST';

export interface Activity {
  id: string;
  itemId: string;
  itemName: string;
  type: ActivityType;
  amount: number;
  timestamp: string;
  source: 'MANUAL' | 'RECEIPT_SCAN' | 'VISUAL_USAGE' | 'BARCODE_SCAN';
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

export type ShoppingItemPriority = 'high' | 'medium' | 'low';

export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  currentQuantity: number;
  suggestedQuantity: number;
  unit: string;
  isManual: boolean;
  isChecked: boolean;
  isArchived: boolean;
  addedAt: string;
  reason: 'low_stock' | 'manual' | 'recommendation';
  priority: ShoppingItemPriority;
  autoAddedAt?: string;
}

export interface ShoppingList {
  items: ShoppingListItem[];
  generatedAt: string;
  thresholdConfig: ThresholdConfig;
}

export interface ShoppingListConfig {
  autoRefresh: boolean;
  autoRefreshInterval: number; // in minutes
  autoArchiveChecked: boolean;
  archiveAfterDays: number;
  defaultPriority: ShoppingItemPriority;
  enableNotifications: boolean;
}

export type ShoppingListExportFormat = 'text' | 'csv' | 'json';

export interface ShoppingListExportOptions {
  format: ShoppingListExportFormat;
  includeChecked: boolean;
  includeArchived: boolean;
  categoryFilter?: string[];
  priorityFilter?: ShoppingItemPriority[];
}

// Subscription types
export type UserTier = 'free' | 'pro' | 'family';

export interface TierInfo {
  tier: UserTier;
  limits: {
    maxItems: number;
    receiptScansPerMonth: number;
    aiCallsPerMonth: number;
    voiceAssistant: boolean;
    multiDevice: boolean;
    sharedInventory: boolean;
    maxFamilyMembers: number;
  };
  usage: {
    currentItems: number;
    receiptScansThisMonth: number;
    aiCallsThisMonth: number;
    voiceSessionsThisMonth: number;
  };
}
