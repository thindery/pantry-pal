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
} from "@/types";
import { useToast } from "@/components/Toast";
import { useSubscription } from "@/services/subscription";
import {
  getItems,
  createItem,
  updateItem,
  logActivity,
  getActivities,
  useSetupAuthToken,
  createShoppingSession,
} from "@/services/apiService";
import { useFeatureFlags } from "@/src/hooks/useFeatureFlags";
import { DEFAULT_THRESHOLDS } from "@/lib/constants";

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
  const [infoItem, setInfoItem] = useState<PantryItem | null>(null);
  const [linkingBarcodeItem, setLinkingBarcodeItem] = useState<PantryItem | null>(null);
  const [isLinkingBarcode, setIsLinkingBarcode] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [_showVoiceLock, setShowVoiceLock] = useState(false);

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

  // Sort state
  const [sortBy, setSortBy] = useState<'recent' | 'quantity' | 'alphabetical'>('recent');

  // Stat card filter state (for inventory view)
  const [statCardFilter, setStatCardFilter] = useState<string | null>(null);

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

  // Filtered and sorted inventory
  const filteredInventory = useMemo(() => {
    let items = Array.isArray(inventory) ? [...inventory] : [];

    // Apply stat card filter
    if (statCardFilter) {
      switch (statCardFilter) {
        case 'In Stock':
          items = items.filter((i) => i.quantity > 0);
          break;
        case 'Low Stock':
          items = items.filter((i) => i.quantity > 0 && i.quantity < 3);
          break;
        case 'Out of Stock':
          items = items.filter((i) => i.quantity === 0);
          break;
        case 'Expiring Soon':
          // For now, filter to items with quantity > 0 (placeholder for expiry logic)
          items = items.filter((i) => i.quantity > 0);
          break;
        case 'Total':
        default:
          // No filtering for Total
          break;
      }
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        return items.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      case 'quantity':
        return items.sort((a, b) => b.quantity - a.quantity);
      case 'alphabetical':
        return items.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return items;
    }
  }, [inventory, sortBy, statCardFilter]);

  // Shopping List State
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [thresholdConfig, setThresholdConfig] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [shoppingListBoughtQuantities, setShoppingListBoughtQuantities] = useState<Record<string, number>>({});
  const [hasLoadedShoppingList, setHasLoadedShoppingList] = useState(false);

  // Load shopping list from localStorage on mount
  useEffect(() => {
    const savedList = localStorage.getItem('pantry_shopping_list');
    const savedThresholds = localStorage.getItem('pantry_threshold_config');
    
    if (savedList) {
      try {
        const parsed = JSON.parse(savedList);
        setShoppingList(parsed);
        console.log('[Pantry Hub] Loaded shopping list from localStorage:', parsed.length, 'items');
      } catch (e) {
        console.error('Failed to parse shopping list:', e);
      }
    }
    
    if (savedThresholds) {
      try {
        setThresholdConfig(JSON.parse(savedThresholds));
      } catch (e) {
        console.error('Failed to parse threshold config:', e);
      }
    }
    
    // Mark as loaded so auto-generate can run safely
    setHasLoadedShoppingList(true);
  }, []);

  // Save shopping list to localStorage
  useEffect(() => {
    localStorage.setItem('pantry_shopping_list', JSON.stringify(shoppingList));
  }, [shoppingList]);

  // Auto-generate shopping list when inventory changes (only after loading from localStorage)
  useEffect(() => {
    if (inventory.length > 0 && hasLoadedShoppingList) {
      generateShoppingList();
    }
  }, [inventory, hasLoadedShoppingList]);

  // Save threshold config to localStorage
  useEffect(() => {
    localStorage.setItem('pantry_threshold_config', JSON.stringify(thresholdConfig));
  }, [thresholdConfig]);

  // Get threshold for a category (with fallback to default)
  const getThreshold = (category: string): number => {
    return thresholdConfig[category] ?? DEFAULT_THRESHOLDS[category] ?? 2;
  };

  // Calculate suggested quantity based on past consumption
  const calculateSuggestedQuantity = useCallback((item: PantryItem): number => {
    const itemActivities = activities.filter(
      (a) => a.itemId === item.id && (a.type === 'REMOVE' || a.type === 'ADJUST')
    );
    
    if (itemActivities.length === 0) {
      return Math.max(getThreshold(item.category) * 2, 1);
    }
    
    const totalUsed = itemActivities.reduce((sum, a) => sum + a.amount, 0);
    const avgUsage = totalUsed / itemActivities.length;
    
    if (avgUsage === 0) return Math.max(getThreshold(item.category) * 2, 1);
    
    const daysOfHistory = Math.max(
      1,
      (Date.now() - new Date(itemActivities[itemActivities.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyUsage = totalUsed / daysOfHistory;
    const suggested = Math.ceil(dailyUsage * 14 / avgUsage) * Math.ceil(avgUsage);
    
    return Math.max(suggested, 1);
  }, [activities, thresholdConfig]);

  // Check if item is low stock
  const isLowStock = useCallback((item: PantryItem): boolean => {
    const threshold = getThreshold(item.category);
    return item.quantity <= threshold && item.quantity >= 0;
  }, [thresholdConfig]);

  // Check if item is out of stock
  const isOutOfStock = useCallback((item: PantryItem): boolean => {
    return item.quantity === 0;
  }, []);

  // Generate shopping list from low stock items
  const generateShoppingList = useCallback(async () => {
    setIsGeneratingList(true);
    
    try {
      const inventoryArray = Array.isArray(inventory) ? inventory : [];
      const lowStockItems = inventoryArray.filter(
        (item) => isLowStock(item) || isOutOfStock(item)
      );
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recommendationItems = inventoryArray.filter((item) => {
        if (lowStockItems.includes(item)) return false;
        
        const lastAdd = activities.find(
          (a) => a.itemId === item.id && a.type === 'ADD'
        );
        
        if (lastAdd == null) return false;
        
        const lastAddDate = new Date(lastAdd.timestamp);
        return lastAddDate < thirtyDaysAgo && item.quantity > 0 && item.quantity <= getThreshold(item.category) * 2;
      });
      
      const newItems: ShoppingListItem[] = [
        ...lowStockItems.map((item) => ({
          id: `low-${item.id}-${Date.now()}`,
          name: item.name,
          category: item.category,
          currentQuantity: item.quantity,
          suggestedQuantity: isOutOfStock(item) 
            ? calculateSuggestedQuantity(item) 
            : Math.max(calculateSuggestedQuantity(item) - item.quantity, 1),
          unit: item.unit,
          isManual: false,
          isChecked: false,
          addedAt: new Date().toISOString(),
          reason: 'low_stock' as 'low_stock' | 'manual' | 'recommendation',
        })),
        ...recommendationItems.map((item) => ({
          id: `rec-${item.id}-${Date.now()}`,
          name: item.name,
          category: item.category,
          currentQuantity: item.quantity,
          suggestedQuantity: calculateSuggestedQuantity(item),
          unit: item.unit,
          isManual: false,
          isChecked: false,
          addedAt: new Date().toISOString(),
          reason: 'recommendation' as 'low_stock' | 'manual' | 'recommendation',
        })),
      ];
      
      const existingManualItems = shoppingList.filter((item) => item.isManual);
      const existingItemNames = new Set(newItems.map((i) => i.name.toLowerCase()));
      
      const mergedItems = [
        ...newItems,
        ...existingManualItems.filter((item) => !existingItemNames.has(item.name.toLowerCase())),
      ];
      
      setShoppingList(mergedItems.sort((a, b) => a.category.localeCompare(b.category)));
    } finally {
      setIsGeneratingList(false);
    }
  }, [inventory, activities, shoppingList, isLowStock, isOutOfStock, calculateSuggestedQuantity, getThreshold]);

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
    
    setShoppingList((prev) => [...prev, newItem].sort((a, b) => a.category.localeCompare(b.category)));
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
  const updateShoppingItemQuantity = useCallback((id: string, newQuantity: number) => {
    setShoppingList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, suggestedQuantity: newQuantity } : item
      )
    );
  }, []);

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
  const loadActivities = async () => {
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
      const acts = await getActivities();
      setActivities(acts);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
      const savedAct = localStorage.getItem('pantry_activities');
      if (savedAct) {
        try {
          const parsed = JSON.parse(savedAct);
          setActivities(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error('Failed to parse saved activities:', e);
          setActivities([]);
        }
      }
    } finally {
      setIsLoadingActivities(false);
    }
  };

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
    if (activities.length > 0) {
      localStorage.setItem('pantry_activities', JSON.stringify(activities));
    }
  }, [activities]);

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
      });
      setActivities((prev) => [activity, ...prev].slice(0, 100));
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
      setActivities((prev) => [newActivity, ...prev].slice(0, 100));
    }
  };

  // Subscription state
  const { isPaid, isPro: _isPro, isFree: _isFree, itemsRemaining: _itemsRemaining, receiptScansRemaining, isFeatureAvailable } = useSubscription();
  const [_showItemLimitPrompt, setShowItemLimitPrompt] = useState(false);
  const [_showReceiptLimitPrompt, setShowReceiptLimitPrompt] = useState(false);

  const handleCreateItem = async (itemData: Omit<PantryItem, 'id' | 'lastUpdated'>) => {
    // Check item limit before creating
    if (inventory.length >= 50 && !isPaid) {
      setShowItemLimitPrompt(true);
      return;
    }

    setIsAddingItem(true);
    try {
      const response = await createItem(itemData);
      // Backend returns { data: {...}, success: true, meta: {...} }
      const newItem =
        response != null && typeof response === 'object' && 'data' in response
          ? (response as { data: PantryItem }).data
          : (response as PantryItem);
      setInventory((prev) => [...prev, newItem]);
      await addActivityLog(
        { id: newItem.id, name: newItem.name },
        'ADD',
        Number(newItem.quantity ?? itemData.quantity),
        'MANUAL'
      );
      success(`Added ${newItem.name} to inventory`);
      return Promise.resolve();
    } catch (err) {
      error('Failed to add item');
      throw err;
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleAdjustQuantity = async (id: string, delta: number) => {
    setUpdatingItemIds((prev) => new Set(prev).add(id));
    try {
      const item = inventory.find((i) => i.id === id);
      if (item == null) return;

      // Calculate new quantity and adjustment amount
      const newQuantity = Math.max(0, item.quantity + delta);
      const actualDelta = newQuantity - item.quantity;

      // Skip if no actual change
      if (actualDelta === 0) return;

      // Call activities endpoint which updates quantity AND logs activity
      await logActivity({
        itemId: item.id,
        itemName: item.name,
        type: actualDelta > 0 ? 'ADD' : 'REMOVE',
        amount: Math.abs(actualDelta),
        source: 'MANUAL',
      });

      // Update local state optimistically
      setInventory((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, quantity: newQuantity, lastUpdated: new Date().toISOString() } : i
        )
      );
    } catch (err) {
      console.error('Failed to adjust quantity:', err);
      alert('Failed to update quantity. Please try again.');
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
      // Call activities endpoint which updates quantity AND logs activity
      await logActivity({
        itemId: item.id,
        itemName: item.name,
        type: 'REMOVE',
        amount: item.quantity,
        source: 'MANUAL',
      });

      // Update local state optimistically
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
      const updatedItem = await updateItem(id, updates);
      setInventory((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, ...updates, lastUpdated: updatedItem.lastUpdated }
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
      const response = await updateItem(id, updateData);
      const updatedItem =
        response != null && typeof response === 'object' && 'data' in response
          ? (response as { data: PantryItem }).data
          : (response as PantryItem);
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

  const handleVoiceAssistantClick = useCallback(() => {
    if (!isFeatureAvailable('voice')) {
      setShowVoiceLock(true);
    } else {
      setIsVoiceActive(true);
    }
  }, [isFeatureAvailable]);

  const handleScanReceiptClick = useCallback(() => {
    // Check receipt scan limit
    if (receiptScansRemaining !== Infinity && receiptScansRemaining <= 0) {
      setShowReceiptLimitPrompt(true);
    } else {
      router.push('/dashboard/scan-receipt/');
    }
  }, [receiptScansRemaining]);

  const adjustStock = useCallback(
    (name: string, amount: number) => {
      let resultMessage = '';

      const existing = inventory.find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      );

      if (existing != null) {
        handleAdjustQuantity(existing.id, amount);
        resultMessage = `Successfully updated ${name}.`;
      } else if (amount > 0) {
        handleCreateItem({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          quantity: amount,
          unit: 'units',
          category: 'other',
        }).then(() => {
          resultMessage = `Added new item ${name} with quantity ${amount}.`;
        });
      } else {
        resultMessage = `Could not find ${name} to remove.`;
      }

      return resultMessage;
    },
    [inventory]
  );

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

    router.push('/dashboard/inventory/');

    if (failedItems.length === 0) {
      alert(`Successfully added ${addedItems.length} item(s) to inventory!`);
    } else {
      alert(`Added ${addedItems.length} item(s), but failed to add: ${failedItems.join(', ')}`);
    }
  };

  return {
    router,
    toasts, success, error, removeToast,
    toast, showToast,
    inventory, activities,
    isProcessing, setIsProcessing,
    isLoadingInventory, isLoadingActivities,
    featureFlags,
    inventoryError, activitiesError,
    updatingItemIds,
    isAddingItem,
    editingItem, setEditingItem,
    isEditing,
    infoItem, setInfoItem,
    linkingBarcodeItem, setLinkingBarcodeItem,
    isLinkingBarcode,
    isVoiceActive, setIsVoiceActive,
    activeShoppingSession, setActiveShoppingSession,
    sessionExpanded, setSessionExpanded,
    startingSession, handleStartSessionInline,
    viewMode, setViewMode,
    sortBy, setSortBy,
    statCardFilter, setStatCardFilter,
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
    handleAdjustQuantity,
    handleSetToZero,
    markItemAsBought,
    handleEditItem,
    handleLinkBarcode,
    handleVoiceAssistantClick,
    handleScanReceiptClick,
    adjustStock,
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
