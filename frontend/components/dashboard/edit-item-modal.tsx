"use client";

import React, { useEffect, useState } from "react";
import type { PantryItem } from "@/types";
import { UNITS, CATEGORIES } from "@/lib/constants";

interface EditItemModalProps {
  item: PantryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  isLoading: boolean;
  lowStockThreshold: number;
  categoryDefaultThreshold: number;
  hasCustomThreshold: boolean;
  onThresholdChange: (threshold: number | null) => void;
}

export function EditItemModal({
  item,
  isOpen,
  onClose,
  onSave,
  isLoading,
  lowStockThreshold,
  categoryDefaultThreshold,
  hasCustomThreshold,
  onThresholdChange,
}: EditItemModalProps) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [category, setCategory] = useState(item.category);
  const [useCustomThreshold, setUseCustomThreshold] = useState(hasCustomThreshold);
  const [customThreshold, setCustomThreshold] = useState(String(lowStockThreshold));
  const [error, setError] = useState<string | null>(null);
  const isNameLocked = Boolean(item.barcode?.trim());

  useEffect(() => {
    if (isOpen) {
      setName(item.name);
      setUnit(item.unit);
      setCategory(item.category);
      setUseCustomThreshold(hasCustomThreshold);
      setCustomThreshold(String(lowStockThreshold));
      setError(null);
    }
  }, [
    isOpen,
    item.id,
    item.name,
    item.unit,
    item.category,
    hasCustomThreshold,
    lowStockThreshold,
  ]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Item name is required");
      return;
    }

    if (useCustomThreshold) {
      const parsed = parseInt(customThreshold, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        setError("Low stock alert must be 0 or higher");
        return;
      }
      onThresholdChange(parsed);
    } else {
      onThresholdChange(null);
    }

    try {
      const updates: Partial<PantryItem> = { unit, category };
      if (!isNameLocked) {
        updates.name = name.trim();
      }
      await onSave(item.id, updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Edit Item</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Item Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={isNameLocked}
              className={`w-full px-4 py-2 border border-slate-300 rounded-lg outline-none transition-all ${
                isNameLocked
                  ? "bg-slate-50 text-slate-700 cursor-not-allowed"
                  : "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              }`}
              disabled={isLoading || isNameLocked}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Unit
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
              disabled={isLoading}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
              disabled={isLoading}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Low stock alert</p>
              <p className="text-xs text-slate-500 mt-1">
                We flag this item and add it to your shopping list when quantity is at
                or below this number.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!useCustomThreshold}
                onChange={(e) => setUseCustomThreshold(!e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Use category default ({categoryDefaultThreshold} for {category})
            </label>

            {useCustomThreshold && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Alert when at or below
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Set to 0 to only alert when completely out of stock.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}