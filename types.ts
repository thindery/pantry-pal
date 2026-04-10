export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  lastUpdated: string;
  updatedAt?: string;
  createdAt?: string;
  barcode?: string;
  productInfo?: ProductInfo;
}

export interface NutritionData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
  servingSize?: string;
  servingUnit?: string;
}

export interface BarcodeProduct {
  barcode: string;
  name: string;
  productName?: string;
  brand?: string;
  category?: string;
  image?: string;
  imageUrl?: string;
  source?: 'cache' | 'live' | 'stale';
  updatedAt?: string;
  infoLastSynced?: string;
  nutrition?: NutritionData;
  ingredients?: string[];
}

export type CacheStatus = 'live' | 'cached' | 'stale';

export interface CacheStatusInfo {
  status: CacheStatus;
  label: string;
  color: string;
  icon: string;
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

export type ActivityType = 'CREATE' | 'UPDATE' | 'DELETE' | 'ADD' | 'REMOVE' | 'ADJUST';

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
  isArchived?: boolean;
  addedAt: string;
  reason: 'low_stock' | 'manual' | 'recommendation';
  priority?: ShoppingItemPriority;
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

// Shopping Session types
export interface ShoppingSessionItem {
  id: string;
  name: string;
  barcode?: string;
  quantity: number;
  price?: number;
  category?: string;
  addedAt: string;
}

export interface ShoppingSession {
  id: string;
  userId: string;
  status: 'active' | 'completed' | 'cancelled';
  totalAmount: number;
  itemCount: number;
  items: ShoppingSessionItem[];
  startedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface ShoppingSessionListResponse {
  data: ShoppingSession[];
  meta: {
    timestamp: string;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Subscription types
export type UserTier = 'free' | 'pro' | 'family';

export interface ProductInfo {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  ingredients?: string[];
  nutrition?: NutritionData;
  source: string;
  infoLastSynced: string;
  cached?: boolean;
}

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
