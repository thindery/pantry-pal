"use client";

import { useState, useCallback, useRef } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { usePantry } from "@/contexts/pantry-provider";
import type { BarcodeProduct } from "@/types";
import { ApiError } from "@/services/apiService";

interface ScanToast {
  id: string;
  product: BarcodeProduct;
  quantity: number;
}

export function ScanBarcodeView() {
  const {
    handleSaveScannedProduct,
    success,
    error: showError,
    router,
    inventory,
  } = usePantry();

  const [unknownProduct, setUnknownProduct] = useState<BarcodeProduct | null>(null);
  const [scanToasts, setScanToasts] = useState<ScanToast[]>([]);
  const [isSavingUnknown, setIsSavingUnknown] = useState(false);
  const [unknownProductName, setUnknownProductName] = useState("");
  
  // Track recently scanned barcodes to prevent duplicates within 3 seconds
  const recentScansRef = useRef<Set<string>>(new Set());

  const removeScanToast = useCallback((id: string) => {
    setScanToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleScan = useCallback(async (product: BarcodeProduct) => {
    // Prevent duplicate scans within 3 seconds
    if (recentScansRef.current.has(product.barcode)) {
      return;
    }
    recentScansRef.current.add(product.barcode);
    setTimeout(() => recentScansRef.current.delete(product.barcode), 3000);

    // Unknown product (no name) - show modal
    if (!product.name || product.name.trim() === "") {
      setUnknownProduct(product);
      return;
    }

    // Known product - auto-save with qty 1 and show toast
    try {
      await handleSaveScannedProduct(product, 1);
      
      // Add toast with the product
      const toastId = Math.random().toString(36).substring(2, 9);
      setScanToasts((prev) => [...prev, { id: toastId, product, quantity: 1 }]);
      
      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        removeScanToast(toastId);
      }, 5000);
    } catch (err) {
      showError(
        err instanceof ApiError
          ? err.message
          : "Failed to add item. Please try again."
      );
    }
  }, [handleSaveScannedProduct, showError, removeScanToast]);

  const handleIncrement = useCallback(async (toastId: string, product: BarcodeProduct, currentQty: number) => {
    try {
      await handleSaveScannedProduct(product, 1);
      setScanToasts((prev) =>
        prev.map((t) =>
          t.id === toastId ? { ...t, quantity: currentQty + 1 } : t
        )
      );
    } catch (err) {
      showError("Failed to update quantity");
    }
  }, [handleSaveScannedProduct, showError]);

  const handleSaveUnknownProduct = useCallback(async () => {
    if (!unknownProduct || !unknownProductName.trim()) return;

    setIsSavingUnknown(true);
    try {
      const productWithName = {
        ...unknownProduct,
        name: unknownProductName.trim(),
      };
      await handleSaveScannedProduct(productWithName, 1);
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
  }, [unknownProduct, unknownProductName, handleSaveScannedProduct, success, showError]);

  return (
    <div className="relative min-h-screen">
      <BarcodeScanner
        autoStart
        onBarcodeDetected={handleScan}
        onCancel={() => router.push("/dashboard/")}
      />

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
                {toast.product.name}
              </p>
              <p className="text-xs text-slate-400">
                Added {toast.quantity} {toast.quantity === 1 ? "unit" : "units"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleIncrement(toast.id, toast.product, toast.quantity)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-lg transition-colors"
                title="Add 1 more"
              >
                +
              </button>
              <button
                onClick={() => removeScanToast(toast.id)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-lg transition-colors"
                title="Dismiss"
              >
                ×
              </button>
            </div>
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
