"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { usePantry } from "@/contexts/pantry-provider";
import type { BarcodeProduct, PantryItem } from "@/types";
import { ApiError } from "@/services/apiService";

const QUICK_SCAN_STORAGE_KEY = "pantry-quick-scan";

interface ScanToast {
  id: string;
  product: BarcodeProduct;
}

interface SessionEntry {
  key: string;
  itemId: string;
  product: BarcodeProduct;
  sessionQty: number;
}

function sessionKey(product: BarcodeProduct): string {
  return product.barcode || product.name.toLowerCase();
}

export function ScanBarcodeView() {
  const {
    handleSaveScannedProduct,
    handleAdjustQuantity,
    success,
    error: showError,
    router,
  } = usePantry();

  const [unknownProduct, setUnknownProduct] = useState<BarcodeProduct | null>(null);
  const [scanToasts, setScanToasts] = useState<ScanToast[]>([]);
  const [sessionEntries, setSessionEntries] = useState<SessionEntry[]>([]);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isSavingUnknown, setIsSavingUnknown] = useState(false);
  const [unknownProductName, setUnknownProductName] = useState("");
  const [quickScan, setQuickScan] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(QUICK_SCAN_STORAGE_KEY);
      return stored !== "false";
    } catch {
      return true;
    }
  });

  // Track recently scanned barcodes to prevent duplicates within 3 seconds
  const recentScansRef = useRef<Set<string>>(new Set());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickScanRef = useRef(quickScan);

  useEffect(() => {
    quickScanRef.current = quickScan;
  }, [quickScan]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(QUICK_SCAN_STORAGE_KEY, String(quickScan));
    } catch {
      // Ignore storage errors (e.g. private mode)
    }
  }, [quickScan]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const removeScanToast = useCallback((id: string) => {
    setScanToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const highlightEntry = useCallback((key: string) => {
    setHighlightedKey(key);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedKey((current) => (current === key ? null : current));
    }, 1600);
  }, []);

  const bumpOrAddEntry = useCallback((product: BarcodeProduct, item: PantryItem) => {
    const key = sessionKey(product);
    setSessionEntries((prev) => {
      const existing = prev.find((entry) => entry.key === key);
      if (existing) {
        return [
          {
            ...existing,
            sessionQty: existing.sessionQty + 1,
            product,
            itemId: item.id,
          },
          ...prev.filter((entry) => entry.key !== key),
        ];
      }
      return [{ key, itemId: item.id, product, sessionQty: 1 }, ...prev];
    });
    highlightEntry(key);
  }, [highlightEntry]);

  const showAddedToast = useCallback((product: BarcodeProduct) => {
    const toastId = Math.random().toString(36).substring(2, 9);
    setScanToasts((prev) => [...prev, { id: toastId, product }]);
    setTimeout(() => {
      removeScanToast(toastId);
    }, 5000);
  }, [removeScanToast]);

  const handleScan = useCallback(async (product: BarcodeProduct) => {
    // Prevent duplicate scans within 3 seconds
    if (recentScansRef.current.has(product.barcode)) {
      return;
    }
    recentScansRef.current.add(product.barcode);
    setTimeout(() => recentScansRef.current.delete(product.barcode), 3000);

    // Unknown product (no name) - show modal and reset any stale name
    if (!product.name || product.name.trim() === "") {
      setUnknownProductName("");
      setUnknownProduct(product);
      return;
    }

    try {
      const item = await handleSaveScannedProduct(product, 1);
      if (quickScanRef.current && item?.id) {
        bumpOrAddEntry(product, item);
      }
      showAddedToast(product);
    } catch (err) {
      showError(
        err instanceof ApiError
          ? err.message
          : "Failed to add item. Please try again."
      );
    }
  }, [handleSaveScannedProduct, showError, bumpOrAddEntry, showAddedToast]);

  const handleSessionIncrement = useCallback(async (entry: SessionEntry) => {
    if (busyKey) return;
    setBusyKey(entry.key);
    try {
      const item = await handleSaveScannedProduct(entry.product, 1);
      if (item?.id) {
        bumpOrAddEntry(entry.product, item);
      }
    } catch (_err) {
      showError("Failed to update quantity");
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, handleSaveScannedProduct, bumpOrAddEntry, showError]);

  const handleSessionDecrement = useCallback(async (entry: SessionEntry) => {
    if (busyKey || entry.sessionQty <= 0) return;
    setBusyKey(entry.key);
    try {
      await handleAdjustQuantity(entry.itemId, -1, {
        silent: true,
        source: "BARCODE_SCAN",
      });
      setSessionEntries((prev) => {
        const current = prev.find((row) => row.key === entry.key);
        if (!current || current.sessionQty <= 1) {
          return prev.filter((row) => row.key !== entry.key);
        }
        return prev.map((row) =>
          row.key === entry.key ? { ...row, sessionQty: row.sessionQty - 1 } : row
        );
      });
      if (entry.sessionQty > 1) {
        highlightEntry(entry.key);
      }
    } catch (_err) {
      showError("Failed to update quantity");
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, handleAdjustQuantity, highlightEntry, showError]);

  const handleClearSession = useCallback(() => {
    setSessionEntries([]);
    setHighlightedKey(null);
  }, []);

  const handleSaveUnknownProduct = useCallback(async () => {
    if (!unknownProduct || !unknownProductName.trim()) return;

    setIsSavingUnknown(true);
    try {
      const productWithName = {
        ...unknownProduct,
        name: unknownProductName.trim(),
      };
      const item = await handleSaveScannedProduct(productWithName, 1);
      if (quickScanRef.current && item?.id) {
        bumpOrAddEntry(productWithName, item);
      }
      showAddedToast(productWithName);
      success(`Added ${unknownProductName.trim()} to inventory`);
      setUnknownProduct(null);
      setUnknownProductName("");
    } catch (err) {
      showError(
        err instanceof ApiError
          ? err.message
          : "Failed to add item. Please try again."
      );
    } finally {
      setIsSavingUnknown(false);
    }
  }, [unknownProduct, unknownProductName, handleSaveScannedProduct, success, showError, bumpOrAddEntry, showAddedToast]);

  // Commit unknown-product name on explicit Enter key in the modal input
  const handleUnknownNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && unknownProductName.trim()) {
        e.preventDefault();
        handleSaveUnknownProduct();
      }
    },
    [unknownProductName, handleSaveUnknownProduct]
  );

  const leaveScan = useCallback(() => {
    handleClearSession();
    router.push("/dashboard/");
  }, [handleClearSession, router]);

  return (
    <div className="relative min-h-screen pb-8">
      <BarcodeScanner
        autoStart
        quickScan={quickScan}
        onQuickScanChange={setQuickScan}
        onBarcodeDetected={handleScan}
        onCancel={leaveScan}
      />

      {quickScan && sessionEntries.length > 0 && (
        <div
          className="max-w-lg mx-auto mt-4 px-1"
          data-testid="quick-scan-ledger"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-sm font-semibold text-slate-700">This session</h3>
            <button
              type="button"
              onClick={handleClearSession}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md"
              data-testid="clear-session-ledger"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {sessionEntries.map((entry) => {
              const label = entry.product.name?.trim() || entry.product.barcode;
              const isHighlighted = highlightedKey === entry.key;
              return (
                <li
                  key={entry.key}
                  data-testid={`session-row-${entry.key}`}
                  data-highlighted={isHighlighted ? "true" : "false"}
                  className={`flex items-center gap-2 px-3 py-1.5 ${
                    isHighlighted ? "bg-emerald-50" : "bg-white"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{label}</p>
                  </div>
                  <span
                    className="w-8 text-center text-sm font-semibold tabular-nums text-slate-800"
                    data-testid={`session-qty-${entry.key}`}
                  >
                    {entry.sessionQty}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSessionDecrement(entry)}
                      disabled={busyKey === entry.key || entry.sessionQty <= 0}
                      className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 text-xl font-bold hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 transition-colors"
                      aria-label={`Decrease ${label}`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSessionIncrement(entry)}
                      disabled={busyKey === entry.key}
                      className="w-11 h-11 rounded-xl bg-emerald-600 text-white text-xl font-bold hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 transition-colors"
                      aria-label={`Increase ${label}`}
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Scan Toasts - Floating at bottom */}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {scanToasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto mx-auto max-w-md w-full bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-2 duration-200 flex items-center gap-3"
          >
            {toast.product.image ? (
              <img
                src={toast.product.image}
                alt={toast.product.name}
                className="w-10 h-10 object-cover rounded-lg bg-slate-800"
              />
            ) : (
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-lg">
                📦
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                Added {toast.product.name}
              </p>
            </div>
            <button
              onClick={() => removeScanToast(toast.id)}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-lg transition-colors"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Unknown Product Modal */}
      {unknownProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              New Product
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              We couldn't find this product. Please enter a name to add it.
            </p>

            <div className="flex items-start gap-4 mb-4">
              {unknownProduct.image ? (
                <img
                  src={unknownProduct.image}
                  alt="Product"
                  className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-4xl">
                  📦
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">Barcode</p>
                <p className="font-mono text-sm text-slate-600">
                  {unknownProduct.barcode}
                </p>
              </div>
            </div>

            <input
              type="text"
              value={unknownProductName}
              onChange={(e) => setUnknownProductName(e.target.value)}
              onKeyDown={handleUnknownNameKeyDown}
              placeholder="Enter product name"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none mb-4"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setUnknownProduct(null);
                  setUnknownProductName("");
                }}
                disabled={isSavingUnknown}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUnknownProduct}
                disabled={isSavingUnknown || !unknownProductName.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isSavingUnknown ? "Saving..." : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
