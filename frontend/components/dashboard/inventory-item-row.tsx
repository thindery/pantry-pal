"use client";

import React from "react";
import type { PantryItem } from "@/types";

interface InventoryItemRowProps {
  item: PantryItem;
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onSetToZero: (id: string) => Promise<void>;
  onEdit: () => void;
  onInfo: () => void;
  onLinkBarcode: () => void;
  isUpdating: boolean;
}

export function InventoryItemRow({ item, onAdjustQuantity, onSetToZero, onEdit, onInfo, onLinkBarcode, isUpdating }: InventoryItemRowProps) {
  const isOutOfStock = item.quantity <= 0;
  const getStep = (unit: string) => {
    if (['lbs', 'kg', 'grams', 'oz'].includes(unit)) return 0.5;
    if (['cups'].includes(unit)) return 0.25;
    return 1;
  };

  const step = getStep(item.unit);

  return (
    <tr className={`border-b border-slate-100 transition-colors ${isOutOfStock ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
      <td className="px-3 py-3 md:px-6 md:py-4">
        <div className={`flex items-center gap-2 font-medium ${isOutOfStock ? 'text-slate-400' : 'text-slate-800'}`}>
          <span>{item.name}</span>
          {item.barcode && (
            <button
              onClick={onInfo}
              className="text-slate-400 hover:text-emerald-600 transition-colors"
              title="View product details"
            >
              ℹ️
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="capitalize">{item.category}</span>
        </div>
      </td>
      <td className="px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAdjustQuantity(item.id, -step)}
            disabled={isUpdating || item.quantity <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-bold"
            title="Decrease quantity"
          >
            −
          </button>
          <span className={`min-w-[60px] text-center font-semibold ${isOutOfStock ? 'text-slate-400' : 'text-slate-700'}`}>
            {item.quantity}
          </span>
          <button
            onClick={() => onAdjustQuantity(item.id, step)}
            disabled={isUpdating}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:bg-emerald-300 disabled:opacity-50 transition-colors text-sm font-bold"
            title="Increase quantity"
          >
            +
          </button>
          <span className={`text-sm hidden sm:inline ${isOutOfStock ? 'text-slate-400' : 'text-slate-500'}`}>
            {item.unit}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2">
          {isOutOfStock ? (
            <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-200 text-slate-500">
              Out of Stock
            </span>
          ) : item.quantity < 3 ? (
            <span className="text-xs font-bold px-2 py-1 rounded bg-amber-50 text-amber-600">
              Low
            </span>
          ) : (
            <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-600">
              OK
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            disabled={isUpdating}
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
            title="Edit item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => onSetToZero(item.id)}
            disabled={isUpdating || item.quantity === 0}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition-colors"
            title="Set to 0 (out of stock)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={onLinkBarcode}
            disabled={isUpdating}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-colors"
            title={item.barcode ? 'Edit barcode' : 'Link barcode'}
          >
            {item.barcode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
};