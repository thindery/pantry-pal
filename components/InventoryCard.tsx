import React from 'react';
import { PantryItem } from '../types';

interface Props {
  item: PantryItem;
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onSetToZero: (id: string) => Promise<void>;
  onEdit: () => void;
  onInfo: () => void;
  onLinkBarcode: () => void;
  isUpdating: boolean;
}

const categoryIcons: Record<string, string> = {
  produce: '🥬',
  pantry: '🥫',
  dairy: '🥛',
  frozen: '🧊',
  meat: '🥩',
  beverages: '🥤',
  snacks: '🍿',
  other: '📦',
};

export const InventoryCard: React.FC<Props> = ({
  item,
  onAdjustQuantity,
  onSetToZero,
  onEdit,
  onInfo,
  onLinkBarcode,
  isUpdating,
}) => {
  const isOutOfStock = item.quantity <= 0;

  const getStep = (unit: string) => {
    if (['lbs', 'kg', 'grams', 'oz'].includes(unit)) return 0.5;
    if (['cups'].includes(unit)) return 0.25;
    return 1;
  };

  const step = getStep(item.unit);

  const getStatusBadge = () => {
    if (isOutOfStock) {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-200 text-slate-500">
          Out of Stock
        </span>
      );
    }
    if (item.quantity < 3) {
      return (
        <span className="text-xs font-bold px-2 py-1 rounded bg-amber-50 text-amber-600">
          Low
        </span>
      );
    }
    return (
      <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-600">
        OK
      </span>
    );
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-all hover:shadow-md ${
        isOutOfStock ? 'opacity-75' : ''
      }`}
    >
      {/* Header: Name + Category */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`font-semibold text-slate-800 truncate ${
                isOutOfStock ? 'text-slate-400' : ''
              }`}
            >
              {item.name}
            </h3>
            {item.barcode && (
              <button
                onClick={onInfo}
                className="text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                title="View product details"
              >
                ℹ️
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg">{categoryIcons[item.category] || '📦'}</span>
            <span className="text-xs text-slate-500 capitalize">{item.category}</span>
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {/* Quantity Row */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2 mb-3">
        <span className="text-sm text-slate-600">
          Qty: <span className="font-semibold">{item.quantity}</span>{' '}
          <span className="text-slate-400">{item.unit}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAdjustQuantity(item.id, -step)}
            disabled={isUpdating || item.quantity <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-bold shadow-sm"
            title="Decrease"
          >
            −
          </button>
          <button
            onClick={() => onSetToZero(item.id)}
            disabled={isUpdating || item.quantity === 0}
            className="px-2 h-8 text-xs font-medium rounded-lg bg-white text-rose-500 hover:bg-rose-50 disabled:opacity-30 transition-colors shadow-sm"
            title="Set to 0"
          >
            Set 0
          </button>
          <button
            onClick={() => onAdjustQuantity(item.id, step)}
            disabled={isUpdating}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:bg-emerald-300 disabled:opacity-50 transition-colors text-sm font-bold shadow-sm"
            title="Increase"
          >
            +
          </button>
        </div>
      </div>

      {/* Info button (if barcode present) */}
      {item.barcode && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <button
            onClick={onInfo}
            className="text-slate-400 hover:text-emerald-600 transition-colors"
            title="View product details"
          >
            ℹ️
          </button>
        </div>
      )}

      {/* Actions Row */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            disabled={isUpdating}
            className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
            title="Edit item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={onLinkBarcode}
            disabled={isUpdating}
            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-colors"
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
        <span className="text-xs text-slate-400">
          {item.lastUpdated
            ? `Updated ${new Date(item.lastUpdated).toLocaleDateString()}`
            : 'Recently added'}
        </span>
      </div>
    </div>
  );
};

export default InventoryCard;
