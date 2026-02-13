import React from 'react';
import { PantryItem } from '../types';

interface ProductInfoModalProps {
  item: PantryItem;
  isOpen: boolean;
  onClose: () => void;
}

const ProductInfoModal: React.FC<ProductInfoModalProps> = ({ item, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Product Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex items-start gap-4 mb-6">
          {/* Placeholder image - in a real app, would fetch from barcode lookup */}
          <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center text-4xl flex-shrink-0">
            📦
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-800">{item.name}</h3>
            <p className="text-slate-500 text-sm capitalize">{item.category}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500">Barcode</span>
            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded text-sm">
              {item.barcode}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500">Brand</span>
            <span className="text-slate-700">—</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500">Quantity in Stock</span>
            <span className="font-semibold text-emerald-600">
              {item.quantity} {item.unit}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500">Last Updated</span>
            <span className="text-slate-700 text-sm">
              {new Date(item.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ProductInfoModal;
