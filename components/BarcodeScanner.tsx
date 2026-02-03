import React, { useState, useRef } from 'react';
import { CATEGORIES } from '../App';;

interface ProductInfo {
  barcode: string;
  name: string;
  category?: string;
}

interface BarcodeScannerProps {
  onBarcodeDetected: (product: ProductInfo) => void;
  onCancel: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onBarcodeDetected, onCancel }) => {
  const [barcode, setBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('other');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!barcode.trim()) {
      setError('Please enter a barcode');
      return;
    }

    if (!productName.trim()) {
      setError('Please enter a product name');
      return;
    }

    onBarcodeDetected({
      barcode: barcode.trim(),
      name: productName.trim(),
      category,
    });
  };

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1"
        >
          ← Back to Inventory
        </button>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">📱 Scan Barcode</h2>
        <p className="text-slate-500">Enter barcode details manually</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Barcode *
          </label>
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="e.g., 012345678901"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g., Milk, Eggs, Bread"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
          >
            Add to Inventory
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="text-center text-sm text-slate-400">
        <p>Camera-based scanning will be available in a future update.</p>
      </div>
    </div>
  );
};

export default BarcodeScanner;
