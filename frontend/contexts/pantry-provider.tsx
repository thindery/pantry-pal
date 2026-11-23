"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type {
  PantryItem,
  Activity,
  ActivityType,
  ScanResult,
  ShoppingListItem,
  ThresholdConfig,
  ShoppingSession,
  BarcodeProduct,
  InventorySortBy,
} from "@/types";
import {
  INVENTORY_SORT_STORAGE_KEY,
  normalizeInventorySort,
  sortInventoryItems,
} from "@/lib/inventory-sort";
import { barcodesMatch } from "@/lib/barcode-variants";
import { useToast } from "@/components/Toast";
import { trackFirstScan } from "@/lib/analytics";
import { useSubscription } from "@/services/subscription";
import {
  getItems,
  createItem,
  updateItem,
  logActivity,
  getActivities,
  useSetupAuthToken,
  createShoppingSession,
  saveBarcodeProduct,
  ApiError,
} from "@/services/apiService";
import { useFeatureFlags } from "@/src/hooks/useFeatureFlags";
import { DEFAULT_THRESHOLDS } from "@/lib/constants";
import { normalizeList } from "@/lib/normalize-list";
import {
  type ItemThresholdOverrides,
  getCategoryThreshold,
  getItemThreshold,
  getItemTarget,
  isItemLowStock,
  migrateThresholdConfig,
} from "@/lib/threshold-utils";
import {
  buildAutoShoppingListItems,
  calculateNeed,
  migrateShoppingListItems,
  normalizeItemName,
} from "@/lib/shopping-list-utils";

export type DashboardInlineFilter =
  | "low-stock"
  | "out-of-stock"
  | "expiring-soon"
  | "expired"
  | "all-items"
  | null;

export function usePantryState() {
  // Set up auth token for API calls
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  useSetupAuthToken();

  // Toast notifications
  const { toasts, success, error, removeToast } = useToast();

  // Local toast state for barcode scan notifications
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'; visible: boolean} | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({message, type, visible: true});
    setTimeout(() => setToast(null), 3000);
  };

  const [inventory, setInventory] = useState<PantryItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const safeActivities = useMemo(
    () => normalizeList<Activity>(activities),
    [activities],
  );

  const setActivitiesSafe = useCallback(
    (value: React.SetStateAction<Activity[]>) => {
      setActivities((prev) => {
        const base = normalizeList<Activity>(prev);
        const next = typeof value === "function" ? value(base) : value;
        return normalizeList<Activity>(next);
      });
    },
    [],
  );

  // Repair in-memory state if a legacy wrapped API payload was stored
  useEffect(() => {
    if (!Array.isArray(activities)) {
      setActivitiesSafe(safeActivities);
    }
  }, [activities, safeActivities, setActivitiesSafe]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Feature flags
  const { flags: featureFlags } = useFeatureFlags();
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(new Set());
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [linkingBarcodeItem, setLinkingBarcodeItem] = useState<PantryItem | null>(null);
  const [isLinkingBarcode, setIsLinkingBarcode] = useState(false);
  // Shopping Session State
  const [activeShoppingSession, setActiveShoppingSession] = useState<ShoppingSession | null>(null);
  const [sessionExpanded, setSessionExpanded] = useState(false);
  const [startingSession, setStartingSession] = useState(false);

  // Barcode Scan Quantity Adjustment State
  const [scannedProduct, setScannedProduct] = useState<BarcodeProduct | null>(null);
  const [scanQuantity, setScanQuantity] = useState<number>(1);
  const [isConfirmingScan, setIsConfirmingScan] = useState(false);

  const handleStartSessionInline = async () => {
    setStartingSession(true);
    try {
      const response = await createShoppingSession();
      if (response.success && response.data) {
        setActiveShoppingSession(response.data);
        setSessionExpanded(true);
      } else {
        console.error('Failed to start session');
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setStartingSession(false);
    }
  };

  // View Mode State (table | cards) - default to cards on mobile
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    if (window.innerWidth < 640) {
      setViewMode('cards');
    }
  }, []);

  // Sort state (restored from localStorage after mount to avoid hydration mismatch)
  const [sortBy, setSortByState] = useState<InventorySortBy>("recent");
  useEffect(() => {
    try {
      setSortByState(normalizeInventorySort(localStorage.getItem(INVENTORY_SORT_STORAGE_KEY)));
    } catch {
      // ignore private-mode / storage errors
    }
  }, []);
  const setSortBy = useCallback((value: InventorySortBy) => {
    setSortByState(value);
    try {
      localStorage.setItem(INVENTORY_SORT_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }, []);

  // Stat card filter state (legacy / inventory deep links)
  const [statCardFilter, setStatCardFilter] = useState<string | null>(null);

  // Pantry list filter chips (PP-043)
  const [pantryFilter, setPantryFilter] = useState<"all" | "low" | "out">("all");

  const [thresholdConfig, setThresholdConfig] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);
  const [itemThresholdOverrides, setItemThresholdOverrides] =
    useState<ItemThresholdOverrides>({});

  // Dashboard inline filter state
  type DashboardInlineFilter = 'low-stock' | 'out-of-stock' | 'expiring-soon' | 'expired' | 'all-items' | null;
  const [dashboardInlineFilter, setDashboardInlineFilter] = useState<DashboardInlineFilter>(null);

  // Clear stat card filter (inventory view)
  const clearStatCardFilter = useCallback(() => {
    setStatCardFilter(null);
  }, []);

  // Clear dashboard inline filter
  const clearDashboardInlineFilter = useCallback(() => {
    setDashboardInlineFilter(null);
  }, []);

  // Handle stat card click - set inline filter on dashboard instead of navigating
  const handleStatCardClick = useCallback((label: string) => {
    switch(label) {
      case 'Low Stock':
        setDashboardInlineFilter('low-stock');
        break;
      case 'Out of Stock':
        setDashboardInlineFilter('out-of-stock');
        break;
      case 'Expiring Soon':
        setDashboardInlineFilter('expiring-soon');
        break;
      case 'Expired':
        setDashboardInlineFilter('expired');
        break;
      case 'All Items':
      case 'Total':
      default:
        setDashboardInlineFilter('all-items');
        break;
    }
  }, []);

  const itemIsLowStock = useCallback(
    (item: PantryItem): boolean =>
      isItemLowStock(item, thresholdConfig, itemThresholdOverrides),
    [thresholdConfig, itemThresholdOverrides],
  );

  // Filtered and sorted inventory
  const filteredInventory = useMemo(() => {
    let items = Array.isArray(inventory) ? [...inventory] : [];

    if (pantryFilter === "low") {
      items = items.filter((i) => itemIsLowStock(i));
    } else if (pantryFilter === "out") {
      items = items.filter((i) => i.quantity === 0);
    } else if (statCardFilter) {
      switch (statCardFilter) {
        case "In Stock":
          items = items.filter((i) => i.quantity > 0);
          break;
        case "Low Stock":
          items = items.filter((i) => itemIsLowStock(i));
          break;
        case "Out of Stock":
          items = items.filter((i) => i.quantity === 0);
          break;
        case "Expiring Soon":
          items = items.filter((i) => i.quantity > 0);
          break;
        case "Total":
        default:
          break;
      }
    }

    return sortInventoryItems(items, sortBy);
  }, [inventory, sortBy, statCardFilter, pantryFilter, itemIsLowStock]);

  // Shopping List State
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [shoppingListBoughtQuantities, setShoppingListBoughtQuantities] = useState<Record<string, number>>({});
  const [hasLoadedShoppingList, setHasLoadedShoppingList] = useState(false);

  // Sanitize legacy corrupted localStorage payloads on mount
  useEffect(() => {
    for (const key of ["pantry_activities", "pantry_inventory", "pantry_shopping_list"] as const) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          const normalized = normalizeList(parsed);
          if (normalized.length > 0) {
            localStorage.setItem(key, JSON.stringify(normalized));
          } else {
            localStorage.removeItem(key);
          }
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }, []);

  // Load shopping list from localStorage on mount (with one-time PP-156 migration)
  useEffect(() => {
    const PP156_MIGRATION_FLAG = "pantry_pp156_unified_target_migrated_v1";
    try {
      const migrationDone = localStorage.getItem(PP156_MIGRATION_FLAG);
      if (!migrationDone) {
        const rawThresholds = localStorage.getItem('pantry_threshold_config');
        if (rawThresholds) {
          try {
            const parsed = JSON.parse(rawThresholds);
            if (parsed && typeof parsed === "object") {
              const migrated = migrateThresholdConfig(parsed);
              localStorage.setItem('pantry_threshold_config', JSON.stringify(migrated));
            }
          } catch {}
        }
        const rawList = localStorage.getItem('pantry_shopping_list');
        if (rawList) {
          try {
            const parsed = JSON.parse(rawList);
            if (Array.isArray(parsed)) {
              const migratedList = migrateShoppingListItems(parsed);
              localStorage.setItem('pantry_shopping_list', JSON.stringify(migratedList));
            }
          } catch {}
        }
        localStorage.setItem(PP156_MIGRATION_FLAG, "true");
      }
    } catch {}

    const savedList = localStorage.getItem('pantry_shopping_list');
    const savedThresholds = localStorage.getItem('pantry_threshold_config');
    const savedItemThresholds = localStorage.getItem('pantry_item_threshold_overrides');
    
    if (savedList) {
      try {
        const parsed = JSON.parse(savedList);
        const list = normalizeList<ShoppingListItem>(parsed);
        setShoppingList(list);
        if (list.length > 0) {
          console.log('[Pantry Hub] Loaded shopping list from localStorage:', list.length, 'items');
        }
      } catch (e) {
        console.error('Failed to parse shopping list:', e);
        localStorage.removeItem('pantry_shopping_list');
      }
    }
    
    if (savedThresholds) {
      try {
        setThresholdConfig(JSON.parse(savedThresholds));
      } catch (e) {
        console.error('Failed to parse threshold config:', e);
      }
    }

    if (savedItemThresholds) {
      try {
        const parsed = JSON.parse(savedItemThresholds) as ItemThresholdOverrides;
        if (parsed != null && typeof parsed === "object") {
          setItemThresholdOverrides(parsed);
        }
      } catch (e) {
        console.error('Failed to parse item threshold overrides:', e);
      }
    }
    
    // Mark as loaded so auto-generate can run safely
    setHasLoadedShoppingList(true);
  }, []);

  // Save shopping list to localStorage
  useEffect(() => {
    localStorage.setItem('pantry_shopping_list', JSON.stringify(shoppingList));
  }, [shoppingList]);

  // Save threshold config to localStorage
  useEffect(() => {
    localStorage.setItem('pantry_threshold_config', JSON.stringify(thresholdConfig));
  }, [thresholdConfig]);

  useEffect(() => {
    localStorage.setItem(
      'pantry_item_threshold_overrides',
      JSON.stringify(itemThresholdOverrides),
    );
  }, [itemThresholdOverrides]);

  const getThresholdForItem = useCallback(
    (item: Pick<PantryItem, "id" | "category">): number =>
      getItemThreshold(item, thresholdConfig, itemThresholdOverrides),
    [thresholdConfig, itemThresholdOverrides],
  );

  const getThreshold = useCallback(
    (category: string): number =>
      getCategoryThreshold(category, thresholdConfig),
    [thresholdConfig],
  );

  const setItemThreshold = useCallback((itemId: string, threshold: number | null) => {
    const val =
      threshold == null || Number.isNaN(threshold)
        ? null
        : Math.max(0, Math.floor(threshold));
    setItemThresholdOverrides((prev) => {
      const next = { ...prev };
      if (val == null) {
        delete next[itemId];
      } else {
        next[itemId] = val;
      }
      return next;
    });
    // Persist to DB as targetQuantity as well
    updateItem(itemId, { targetQuantity: val }).catch(() => {});
  }, []);

  // Target-based suggested quantity: need = max(target - have, 0)
  const calculateSuggestedQuantity = useCallback((item: PantryItem): number => {
    const target = getItemTarget(item, thresholdConfig, itemThresholdOverrides);
    return calculateNeed(target, item.quantity);
  }, [thresholdConfig, itemThresholdOverrides]);

  const isLowStock = useCallback(
    (item: PantryItem): boolean =>
      isItemLowStock(item, thresholdConfig, itemThresholdOverrides),
    [thresholdConfig, itemThresholdOverrides],
  );

  // Check if item is out of stock
  const isOutOfStock = useCallback((item: PantryItem): boolean => {
    return item.quantity === 0;
  }, []);

  // Generate shopping list from low stock items using exact-name grouping and target-based need
  const generateShoppingList = useCallback(async () => {
    setIsGeneratingList(true);
    
    try {
      const inventoryArray = Array.isArray(inventory) ? inventory : [];
      setShoppingList((prevList) => {
        const safeShoppingList = normalizeList<ShoppingListItem>(prevList);
        const autoItems = buildAutoShoppingListItems(
          inventoryArray,
          thresholdConfig,
          itemThresholdOverrides,
          safeShoppingList,
        );
        const autoNames = new Set(autoItems.map((i) => normalizeItemName(i.name)));
        // Keep manual items that aren't already represented in the newly generated items
        const existingManualItems = safeShoppingList.filter(
          (item) => item.isManual && !autoNames.has(normalizeItemName(item.name))
        );

        const mergedItems = [...autoItems, ...existingManualItems];
        return mergedItems.sort((a, b) => a.category.localeCompare(b.category));
      });
    } finally {
      setIsGeneratingList(false);
    }
  }, [
    inventory,
    thresholdConfig,
    itemThresholdOverrides,
  ]);

  useEffect(() => {
    if (inventory.length > 0 && hasLoadedShoppingList) {
      generateShoppingList();
    }
  }, [
    inventory,
    hasLoadedShoppingList,
    thresholdConfig,
    itemThresholdOverrides,
    generateShoppingList,
  ]);

  // Add manual item to shopping list
  const addManualShoppingItem = useCallback((name: string, category: string, quantity: number, unit: string) => {
    const trimmedName = name.trim();
    
    // Check if item already exists in shopping list
    const existingItem = shoppingList.find(
      (item) => item.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (existingItem != null) {
      alert(`"${trimmedName}" is already in your shopping list!`);
      return;
    }
    
    const newItem: ShoppingListItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: trimmedName,
      category,
      currentQuantity: 0,
      suggestedQuantity: quantity,
      unit,
      isManual: true,
      isChecked: false,
      addedAt: new Date().toISOString(),
      reason: 'manual',
    };
    
    setShoppingList((prev) =>
      [...normalizeList<ShoppingListItem>(prev), newItem].sort((a, b) =>
        a.category.localeCompare(b.category),
      ),
    );
  }, [shoppingList]);

  // Toggle item checked status
  const toggleItemChecked = useCallback((id: string) => {
    setShoppingList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isChecked: !item.isChecked } : item
      )
    );
  }, []);

  // Remove item from shopping list
  const removeShoppingItem = useCallback((id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Update shopping list item quantity
  // If the user changes the stepper on an auto row, persist that as an explicit per-item target override
  const updateShoppingItemQuantity = useCallback((id: string, newQuantity: number) => {
    const targetNeed = Math.max(1, newQuantity);
    const row = shoppingList.find((item) => item.id === id);
    if (row == null) return;
    const isAutoRow = !row.isManual && row.pantryItemId != null;
    const newTarget = isAutoRow ? (row.currentQuantity || 0) + targetNeed : null;
    if (isAutoRow && row.pantryItemId != null && newTarget != null) {
      setItemThreshold(row.pantryItemId, newTarget);
    }
    setShoppingList((prev) =>
      prev.map((item) =>
        item.id !== id
          ? item
          : {
              ...item,
              suggestedQuantity: targetNeed,
              ...(newTarget != null ? { lowStockThreshold: newTarget } : {}),
            }
      )
    );
  }, [shoppingList, setItemThreshold]);

  // Clear entire shopping list
  const clearShoppingList = useCallback(() => {
    if (confirm('Are you sure you want to clear the entire shopping list?')) {
      setShoppingList([]);
    }
  }, []);

  // Export shopping list as formatted text
  const exportShoppingList = useCallback((): string => {
    if (shoppingList.length === 0) return '';
    
    const grouped: Record<string, ShoppingListItem[]> = shoppingList.reduce((acc, item) => {
      if (acc[item.category] == null) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ShoppingListItem[]>);
    
    const lines: string[] = ['🛒 Shopping List', ''];
    
    Object.entries(grouped).forEach(([category, items]) => {
      lines.push(`${category.toUpperCase()}:`);
      items.forEach((item: ShoppingListItem) => {
        const check = item.isChecked ? '✓' : '☐';
        lines.push(`  ${check} ${item.name} (${item.suggestedQuantity} ${item.unit})`);
      });
      lines.push('');
    });
    
    return lines.join('\n');
  }, [shoppingList]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    const text = exportShoppingList();
    if (!text) {
      alert('Shopping list is empty!');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      alert('Shopping list copied to clipboard!');
    } catch (_err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Shopping list copied to clipboard!');
    }
  }, [exportShoppingList]);

  // Share shopping list using Web Share API
  const shareShoppingList = useCallback(async () => {
    const text = exportShoppingList();
    if (!text) {
      alert('Shopping list is empty!');
      return;
    }
    
    if (navigator.share != null) {
      try {
        await navigator.share({
          title: 'My Shopping List',
          text: text,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      copyToClipboard();
    }
  }, [exportShoppingList, copyToClipboard]);

  // Load inventory from API
  const loadInventory = async () => {
    setIsLoadingInventory(true);
    setInventoryError(null);
    try {
      const items = await getItems();
      setInventory(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setInventoryError(err instanceof Error ? err.message : 'Failed to load inventory');
      const savedInv = localStorage.getItem('pantry_inventory');
      if (savedInv) {
        try {
          const parsed = JSON.parse(savedInv);
          // Ensure parsed data is an array
          setInventory(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error('Failed to parse saved inventory:', e);
          setInventory([]);
        }
      }
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Load activities from API
  const loadActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
      const acts = await getActivities();
      setActivitiesSafe(acts);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
      const savedAct = localStorage.getItem('pantry_activities');
      if (savedAct) {
        try {
          const parsed = JSON.parse(savedAct);
          setActivitiesSafe(parsed);
        } catch (e) {
          console.error('Failed to parse saved activities:', e);
          setActivitiesSafe([]);
        }
      }
    } finally {
      setIsLoadingActivities(false);
    }
  }, [setActivitiesSafe]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    void loadInventory();
    void loadActivities();
  }, [sessionStatus]);

  // Save to localStorage as backup
  useEffect(() => {
    if (inventory.length > 0) {
      localStorage.setItem('pantry_inventory', JSON.stringify(inventory));
    }
  }, [inventory]);

  useEffect(() => {
    if (safeActivities.length > 0) {
      localStorage.setItem('pantry_activities', JSON.stringify(safeActivities));
    }
  }, [safeActivities]);

  const prependActivity = useCallback((activity: Activity) => {
    setActivitiesSafe((prev) => [activity, ...prev].slice(0, 100));
  }, [setActivitiesSafe]);

  const addActivityLog = async (
    item: { id: string; name: string },
    type: ActivityType,
    amount: number,
    source: Activity['source']
  ) => {
    try {
      const activity = await logActivity({
        itemId: item.id,
        itemName: item.name,
        type,
        amount: Math.abs(amount),
        source,
        adjustQuantity: false,
      });
      prependActivity(activity);
    } catch (_err) {
      const newActivity: Activity = {
        id: Math.random().toString(36).substr(2, 9),
        itemId: item.id,
        itemName: item.name,
        type,
        amount: Math.abs(amount),
        timestamp: new Date().toISOString(),
        source,
      };
      prependActivity(newActivity);
    }
  };

  // Subscription state
  const { isPaid, isPro: _isPro, isFree: _isFree, itemsRemaining: _itemsRemaining, receiptScansRemaining, isFeatureAvailable } = useSubscription();
  const [_showItemLimitPrompt, setShowItemLimitPrompt] = useState(false);
  const [_showReceiptLimitPrompt, setShowReceiptLimitPrompt] = useState(false);

  const handleCreateItem = async (itemData: Omit<PantryItem, 'id' | 'lastUpdated'>) => {
    const existing = inventory.find((item) =>
      itemData.barcode
        ? barcodesMatch(item.barcode, itemData.barcode)
        : !item.barcode &&
          item.name.toLowerCase() === itemData.name.toLowerCase() &&
          item.category === itemData.category,
    );
    if (existing != null) {
      await handleAdjustQuantity(existing.id, Number(itemData.quantity ?? 1), {
        silent: true,
        source: "MANUAL",
      });
      success(`Added ${itemData.quantity} to ${existing.name}`);
      return Promise.resolve();
    }

    // Check item limit before creating a new row
    if (inventory.length >= 50 && !isPaid) {
      setShowItemLimitPrompt(true);
      return;
    }

    setIsAddingItem(true);
    try {
      const newItem = await createItem(itemData);
      setInventory((prev) => {
        const list = normalizeList<PantryItem>(prev);
        const index = list.findIndex((item) => item.id === newItem.id);
        if (index >= 0) {
          const next = [...list];
          next[index] = { ...list[index], ...newItem };
          return next;
        }
        return [...list, newItem];
      });
      await addActivityLog(
        { id: newItem.id, name: newItem.name },
        'ADD',
        Number(newItem.quantity ?? itemData.quantity),
        'MANUAL'
      );
      success(`Added ${newItem.name} to inventory`);
      return Promise.resolve();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to add item. Please try again.";
      error(message);
      throw err instanceof ApiError ? err : new ApiError(message, 0);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleSaveScannedProduct = async (
    product: BarcodeProduct,
    quantity: number,
    options?: { silent?: boolean },
  ): Promise<PantryItem> => {
    const displayName =
      product.name.charAt(0).toUpperCase() + product.name.slice(1);

    const norm = (s: string) => normalizeItemName(s);
    let existing = product.barcode
      ? inventory.find((i) => barcodesMatch(i.barcode, product.barcode))
      : inventory.find(
          (i) =>
            norm(i.name) === norm(product.name) &&
            i.category === (product.category || "other"),
        );

    if (!existing && product.barcode) {
      // Milk gap: attach to existing unbarcoded row with same normalized name
      existing = inventory.find(
        (i) => !i.barcode && norm(i.name) === norm(product.name),
      );
    }

    if (existing != null) {
      if (!existing.barcode && product.barcode) {
        await updateItem(existing.id, { barcode: product.barcode });
      }
      await handleAdjustQuantity(existing.id, quantity, {
        silent: true,
        source: "BARCODE_SCAN",
      });
      const unitText =
        quantity === 1
          ? existing.unit.replace(/s$/, "")
          : existing.unit;
      if (!options?.silent) {
        success(`Added ${quantity} ${unitText} to ${existing.name}`);
      }
      trackFirstScan("barcode");
      return {
        ...existing,
        quantity: existing.quantity + quantity,
        barcode: existing.barcode || product.barcode,
      };
    }

    const ingredients =
      Array.isArray(product.ingredients) && product.ingredients.length > 0
        ? product.ingredients.join(", ")
        : undefined;

    const result = await saveBarcodeProduct(product.barcode, {
      name: displayName,
      quantity,
      unit: "units",
      category: product.category || "other",
      brand: product.brand,
      imageUrl: product.image ?? product.imageUrl,
      ingredients,
      nutrition: product.nutrition,
    });

    const savedItem: PantryItem = {
      ...result.item,
      imageUrl: result.item.imageUrl || product.image || product.imageUrl,
    };
    setInventory((prev) => {
      const list = normalizeList<PantryItem>(prev);
      const index = list.findIndex((item) => item.id === savedItem.id);
      if (index >= 0) {
        const next = [...list];
        next[index] = { ...list[index], ...savedItem };
        return next;
      }
      return [...list, savedItem];
    });
    if (result.activity) {
      prependActivity(result.activity);
    }
    const unitText = quantity === 1 ? "unit" : "units";
    if (!options?.silent) {
      success(`${displayName} (${quantity} ${unitText}) added to inventory`);
    }
    trackFirstScan("barcode");
    return savedItem;
  };

  const handleAdjustQuantity = async (
    id: string,
    delta: number,
    options?: { silent?: boolean; source?: Activity["source"] },
  ) => {
    setUpdatingItemIds((prev) => new Set(prev).add(id));
    try {
      const item = inventory.find((i) => i.id === id);
      if (item == null) return;

      // Calculate new quantity and adjustment amount
      const newQuantity = Math.max(0, item.quantity + delta);
      const actualDelta = newQuantity - item.quantity;

      // Skip if no actual change
      if (actualDelta === 0) return;

      const activity = await logActivity({
        itemId: item.id,
        itemName: item.name,
        type: actualDelta > 0 ? 'ADD' : 'REMOVE',
        amount: Math.abs(actualDelta),
        source: options?.source ?? 'MANUAL',
      });
      prependActivity(activity);

      setInventory((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, quantity: newQuantity, lastUpdated: new Date().toISOString() } : i
        )
      );
    } catch (err) {
      console.error('Failed to adjust quantity:', err);
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to update quantity. Please try again.";
      if (!options?.silent) {
        error(message);
      }
      throw err instanceof ApiError ? err : new ApiError(message, 0);
    } finally {
      setUpdatingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSetToZero = async (id: string) => {
    const item = inventory.find((i) => i.id === id);
    if (!item || item.quantity === 0) return;

    setUpdatingItemIds((prev) => new Set(prev).add(id));
    try {
      const activity = await logActivity({
        itemId: item.id,
        itemName: item.name,
        type: 'REMOVE',
        amount: item.quantity,
        source: 'MANUAL',
      });
      prependActivity(activity);

      setInventory((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, quantity: 0, lastUpdated: new Date().toISOString() } : i
        )
      );
    } catch (err) {
      console.error('Failed to set quantity to 0:', err);
      alert('Failed to update item. Please try again.');
    } finally {
      setUpdatingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Mark item as bought (remove from list and add to inventory)
  const markItemAsBought = useCallback(async (item: ShoppingListItem) => {
    const existingItem = inventory.find(
      (i) => i.name.toLowerCase() === item.name.toLowerCase()
    );
    
    try {
      // First, update the inventory via API
      if (existingItem != null) {
        await handleAdjustQuantity(existingItem.id, item.suggestedQuantity);
      } else {
        await handleCreateItem({
          name: item.name,
          quantity: item.suggestedQuantity,
          unit: item.unit,
          category: item.category,
        });
      }
      
      // Only remove from shopping list after successful inventory update
      setShoppingList((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      console.error('Failed to mark item as bought:', err);
      alert(`Failed to add "${item.name}" to inventory. Please try again.`);
      // Item remains in shopping list (rollback behavior)
    }
  }, [inventory, handleAdjustQuantity, handleCreateItem]);

  const handleEditItem = async (id: string, updates: Partial<PantryItem>) => {
    setIsEditing(true);
    try {
      const existing = inventory.find((i) => i.id === id);
      const payload = { ...updates };
      if (existing?.barcode?.trim() && "name" in payload) {
        delete payload.name;
      }
      const updatedItem = await updateItem(id, payload);
      setInventory((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, ...payload, lastUpdated: updatedItem.lastUpdated }
            : i
        )
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleLinkBarcode = async (id: string, barcode: string, updates?: Partial<PantryItem>) => {
    setIsLinkingBarcode(true);
    try {
      const updateData: Partial<PantryItem> = { barcode, ...updates };
      const updatedItem = await updateItem(id, updateData);
      setInventory((prev) =>
        prev.map((item) => (item.id === id ? updatedItem : item))
      );
      success('Barcode linked successfully!');
    } catch (err) {
      error('Failed to link barcode');
      console.error('Link barcode error:', err);
    } finally {
      setIsLinkingBarcode(false);
      setLinkingBarcodeItem(null);
    }
  };

  const handleScanReceiptClick = useCallback(() => {
    // Check receipt scan limit
    if (receiptScansRemaining !== Infinity && receiptScansRemaining <= 0) {
      setShowReceiptLimitPrompt(true);
    } else {
      router.push('/dashboard/scan-receipt/');
    }
  }, [receiptScansRemaining]);

  const handleAddScannedItems = async (items: ScanResult[]) => {
    const addedItems: string[] = [];
    const failedItems: string[] = [];

    for (const item of items) {
      try {
        const existing = inventory.find(
          (i) => i.name.toLowerCase() === item.name.toLowerCase()
        );

        if (existing != null) {
          await handleAdjustQuantity(existing.id, item.quantity);
          addedItems.push(`${item.name} (+${item.quantity})`);
        } else {
          await handleCreateItem({
            name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
            quantity: item.quantity,
            unit: item.unit || 'units',
            category: item.category || 'pantry',
          });
          addedItems.push(`${item.name} (new +${item.quantity})`);
        }
      } catch (err) {
        console.error(`Failed to add item ${item.name}:`, err);
        failedItems.push(item.name);
      }
    }

    router.push('/dashboard/');

    if (failedItems.length === 0) {
      if (addedItems.length > 0) {
        trackFirstScan("receipt");
      }
      alert(`Successfully added ${addedItems.length} item(s) to inventory!`);
    } else {
      if (addedItems.length > 0) {
        trackFirstScan("receipt");
      }
      alert(`Added ${addedItems.length} item(s), but failed to add: ${failedItems.join(', ')}`);
    }
  };

  return {
    router,
    toasts, success, error, removeToast,
    toast, showToast,
    inventory, activities: safeActivities,
    isProcessing, setIsProcessing,
    isLoadingInventory, isLoadingActivities,
    featureFlags,
    inventoryError, activitiesError,
    updatingItemIds,
    isAddingItem,
    editingItem, setEditingItem,
    isEditing,
    linkingBarcodeItem, setLinkingBarcodeItem,
    isLinkingBarcode,
    activeShoppingSession, setActiveShoppingSession,
    sessionExpanded, setSessionExpanded,
    startingSession, handleStartSessionInline,
    viewMode, setViewMode,
    sortBy, setSortBy,
    statCardFilter, setStatCardFilter,
    pantryFilter, setPantryFilter,
    itemIsLowStock,
    getThresholdForItem,
    setItemThreshold,
    itemThresholdOverrides,
    dashboardInlineFilter, setDashboardInlineFilter,
    clearStatCardFilter, clearDashboardInlineFilter,
    handleStatCardClick,
    filteredInventory,
    shoppingList,
    thresholdConfig, setThresholdConfig,
    showThresholdSettings, setShowThresholdSettings,
    isGeneratingList,
    shoppingListBoughtQuantities,
    setShoppingListBoughtQuantities,
    generateShoppingList,
    addManualShoppingItem,
    toggleItemChecked,
    removeShoppingItem,
    updateShoppingItemQuantity,
    clearShoppingList,
    copyToClipboard,
    shareShoppingList,
    loadInventory,
    loadActivities,
    isPaid,
    receiptScansRemaining,
    isFeatureAvailable,
    handleCreateItem,
    handleSaveScannedProduct,
    handleAdjustQuantity,
    handleSetToZero,
    markItemAsBought,
    handleEditItem,
    handleLinkBarcode,
    handleScanReceiptClick,
    handleAddScannedItems,
    scannedProduct, setScannedProduct,
    scanQuantity, setScanQuantity,
    isConfirmingScan, setIsConfirmingScan,
  };
}

type PantryContextValue = ReturnType<typeof usePantryState>;

const PantryContext = createContext<PantryContextValue | null>(null);

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const value = usePantryState();
  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}

export function usePantry(): PantryContextValue {
  const ctx = useContext(PantryContext);
  if (!ctx) throw new Error("usePantry must be used within PantryProvider");
  return ctx;
}
