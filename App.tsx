import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { PantryItem, Activity, ActivityType, ScanResult, UsageResult } from './types';
import { scanReceipt, analyzeUsage } from './services/geminiService';
import {
  getItems,
  createItem,
  updateItem,
  logActivity,
  getActivities,
} from './services/apiService';

// --- Audio Utilities ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Constants ---
const UNITS = [
  'units',
  'lbs',
  'oz',
  'grams',
  'kg',
  'cups',
  'bottles',
  'cans',
  'boxes',
  'other',
];

const CATEGORIES = [
  'produce',
  'pantry',
  'dairy',
  'frozen',
  'meat',
  'beverages',
  'snacks',
  'other',
];

// --- Components ---
type View = 'dashboard' | 'inventory' | 'ledger' | 'scan-receipt' | 'scan-usage' | 'add-item';

const Navbar: React.FC<{ activeView: View; setView: (v: View) => void }> = ({ activeView, setView }) => {
  const links: { id: View; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'ledger', label: 'Ledger', icon: '📜' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center md:top-0 md:bottom-auto md:border-t-0 md:border-b md:justify-start md:gap-8 z-50">
      <div className="hidden md:block font-bold text-xl text-emerald-600 mr-4">PantryPal</div>
      {links.map((link) => (
        <button
          key={link.id}
          onClick={() => setView(link.id)}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1 rounded-lg transition-colors ${
            activeView === link.id ? 'text-emerald-600 font-semibold bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <span className="text-xl md:text-lg">{link.icon}</span>
          <span className="text-xs md:text-sm">{link.label}</span>
        </button>
      ))}
    </nav>
  );
};

// Add Item Form Component
const AddItemForm: React.FC<{
  onSubmit: (item: Omit<PantryItem, 'id' | 'lastUpdated'>) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ onSubmit, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('units');
  const [category, setCategory] = useState('pantry');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Item name is required');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) {
      setError('Quantity must be a positive number');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        quantity: qty,
        unit,
        category,
      });
      // Reset form
      setName('');
      setQuantity('1');
      setUnit('units');
      setCategory('pantry');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Add New Item</h2>
        <button
          onClick={onCancel}
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Item Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Milk, Eggs, Bread"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              disabled={isLoading}
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

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Adding...
              </>
            ) : (
              'Add Item'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// Edit Item Modal Component
const EditItemModal: React.FC<{
  item: PantryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  isLoading: boolean;
}> = ({ item, isOpen, onClose, onSave, isLoading }) => {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [category, setCategory] = useState(item.category);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(item.name);
      setUnit(item.unit);
      setCategory(item.category);
      setError(null);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Item name is required');
      return;
    }

    try {
      await onSave(item.id, {
        name: name.trim(),
        unit,
        category,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
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
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              disabled={isLoading}
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

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
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
};

// Receipt Scanner Component
const ReceiptScanner: React.FC<{
  onAddItems: (items: ScanResult[]) => Promise<void>;
  onCancel: () => void;
}> = ({ onAddItems, onCancel }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setScanResults(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large. Max size is 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage(result);
      // Extract base64 part (remove data:image/...;base64, prefix)
      const base64 = result.split(',')[1];
      setBase64Image(base64);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!base64Image) {
      setError('Please select an image first');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const results = await scanReceipt(base64Image);
      if (results.length === 0) {
        setError('No items detected in receipt. Try a clearer image.');
      } else {
        setScanResults(results);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to scan receipt';
      setError(`Scan failed: ${errorMsg}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (!scanResults || scanResults.length === 0) return;

    setIsAdding(true);
    try {
      await onAddItems(scanResults);
    } catch (err) {
      setError('Failed to add items to inventory');
    } finally {
      setIsAdding(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setBase64Image(null);
    setScanResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan Receipt</h2>
        <p className="text-slate-500">Upload a receipt photo and we'll extract your grocery items</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="px-3 py-1 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Image Selection Area */}
      {!selectedImage && (
        <div className="border-2 border-dashed border-slate-300 rounded-3xl p-12 bg-white hover:border-emerald-400 transition-colors">
          <div className="text-center space-y-4">
            <div className="text-6xl">📷</div>
            <p className="text-slate-500">Take a photo or upload a receipt image</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              id="receipt-file-input"
            />
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <label
                htmlFor="receipt-file-input"
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 active:bg-emerald-800 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>📷</span> Take Photo
              </label>
              <label
                htmlFor="receipt-file-input"
                className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 active:bg-slate-300 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>📁</span> Choose File
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {selectedImage && !scanResults && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <img
              src={selectedImage}
              alt="Receipt preview"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  Scanning with AI...
                </>
              ) : (
                <>
                  <span>🧠</span> Scan Receipt
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={isScanning}
              className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Change Image
            </button>
          </div>
        </div>
      )}

      {/* Scan Results */}
      {scanResults && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-emerald-800 font-semibold">
              🎉 Found {scanResults.length} item{scanResults.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-700">Extracted Items</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {scanResults.map((item, index) => (
                <div key={index} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{item.category || 'other'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">
                      +{item.quantity} {item.unit || 'units'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={isAdding}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAdding ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Adding to Inventory...
                </>
              ) : (
                <>
                  <span>✅</span> Confirm & Add All
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={isAdding}
              className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Inventory Item Row Component
const InventoryItemRow: React.FC<{
  item: PantryItem;
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onSetToZero: (id: string) => Promise<void>;
  onEdit: () => void;
  isUpdating: boolean;
}> = ({ item, onAdjustQuantity, onSetToZero, onEdit, isUpdating }) => {
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
        <div className={`font-medium ${isOutOfStock ? 'text-slate-400' : 'text-slate-800'}`}>
          {item.name}
        </div>
        <div className="text-xs text-slate-400 capitalize">
          {item.category}
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
        </div>
      </td>
    </tr>
  );
};

const VoiceAssistant: React.FC<{
  onAdjustStock: (name: string, amount: number) => string;
  onClose: () => void;
}> = ({ onAdjustStock, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const adjustStockTool: FunctionDeclaration = {
        name: 'adjustStock',
        parameters: {
          type: Type.OBJECT,
          description: 'Adjust the quantity of a pantry item. Positive adds, negative removes.',
          properties: {
            itemName: { type: Type.STRING, description: 'The name of the item to adjust' },
            amount: { type: Type.NUMBER, description: 'The amount to add or remove' },
          },
          required: ['itemName', 'amount'],
        },
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const outCtx = audioContextsRef.current!.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.outputTranscription) {
              setTranscription((prev) => prev + message.serverContent!.outputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              setTranscription('');
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'adjustStock') {
                  const result = onAdjustStock(fc.args.itemName as string, fc.args.amount as number);
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: [{ id: fc.id, name: fc.name, response: { result } }],
                    })
                  );
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach((s) => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => console.error('Live session error:', e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ functionDeclarations: [adjustStockTool] }],
          systemInstruction:
            'You are a helpful pantry manager. You can adjust item quantities. If a user says they used something, deduct it. If they bought something, add it. Be brief and friendly.',
          outputAudioTranscription: {},
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start voice session', err);
      alert('Microphone access is required for voice support.');
      onClose();
    }
  };

  useEffect(() => {
    startSession();
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextsRef.current) {
        audioContextsRef.current.input.close();
        audioContextsRef.current.output.close();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 flex flex-col items-center gap-8 shadow-2xl mx-4">
        <div className="relative">
          <div
            className={`absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-20 animate-pulse ${
              isActive ? 'scale-150' : ''
            }`}
          />
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-inner transition-all ${
              isActive ? 'bg-emerald-500 text-white scale-110' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {isActive ? '🎙️' : '⏳'}
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-800">{isActive ? 'Listening...' : 'Connecting...'}</h3>
          <p className="text-slate-500 text-sm italic min-h-[1.5rem]">
            {transcription || '"Try saying: I used 3 eggs"'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors"
        >
          End Session
        </button>
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [inventory, setInventory] = useState<PantryItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(new Set());
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load inventory from API
  const loadInventory = async () => {
    setIsLoadingInventory(true);
    setInventoryError(null);
    try {
      const items = await getItems();
      setInventory(items);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setInventoryError(err instanceof Error ? err.message : 'Failed to load inventory');
      // Fallback to localStorage if API fails
      const savedInv = localStorage.getItem('pantry_inventory');
      if (savedInv) {
        setInventory(JSON.parse(savedInv));
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
        setActivities(JSON.parse(savedAct));
      }
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    loadInventory();
    loadActivities();
  }, []);

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
    } catch (err) {
      // Fallback: add activity locally
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

  // Create new item
  const handleCreateItem = async (itemData: Omit<PantryItem, 'id' | 'lastUpdated'>) => {
    setIsAddingItem(true);
    try {
      const newItem = await createItem(itemData);
      setInventory((prev) => [...prev, newItem]);
      await addActivityLog(
        { id: newItem.id, name: newItem.name },
        'ADD',
        newItem.quantity,
        'MANUAL'
      );
      return Promise.resolve();
    } catch (err) {
      throw err;
    } finally {
      setIsAddingItem(false);
    }
  };

  // Adjust item quantity
  const handleAdjustQuantity = async (id: string, delta: number) => {
    setUpdatingItemIds((prev) => new Set(prev).add(id));
    try {
      const item = inventory.find((i) => i.id === id);
      if (!item) return;

      const newQuantity = Math.max(0, item.quantity + delta);
      const updatedItem = await updateItem(id, { quantity: newQuantity });

      setInventory((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, quantity: newQuantity, lastUpdated: updatedItem.lastUpdated } : i
        )
      );

      await addActivityLog(
        { id: item.id, name: item.name },
        delta >= 0 ? 'ADD' : 'REMOVE',
        delta,
        'MANUAL'
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

  // Set item quantity to 0 (soft delete)
  const handleSetToZero = async (id: string) => {
    const item = inventory.find((i) => i.id === id);
    if (!item) return;

    setUpdatingItemIds((prev) => new Set(prev).add(id));
    try {
      const updatedItem = await updateItem(id, { quantity: 0 });
      setInventory((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, quantity: 0, lastUpdated: updatedItem.lastUpdated } : i
        )
      );

      await addActivityLog(
        { id: item.id, name: item.name },
        'ADJUST',
        item.quantity,
        'MANUAL'
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

  // Edit item details
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
    } catch (err) {
      throw err;
    } finally {
      setIsEditing(false);
    }
  };

  const adjustStock = useCallback(
    (name: string, amount: number) => {
      let resultMessage = '';

      const existing = inventory.find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        handleAdjustQuantity(existing.id, amount);
        resultMessage = `Successfully updated ${name}.`;
      } else if (amount > 0) {
        // Create new item via API
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

  // Handle adding scanned items to inventory
  const handleAddScannedItems = async (items: ScanResult[]) => {
    const addedItems: string[] = [];
    const failedItems: string[] = [];

    for (const item of items) {
      try {
        // Check if item already exists
        const existing = inventory.find(
          (i) => i.name.toLowerCase() === item.name.toLowerCase()
        );

        if (existing) {
          // Update existing item quantity
          await handleAdjustQuantity(existing.id, item.quantity);
          addedItems.push(`${item.name} (+${item.quantity})`);
        } else {
          // Create new item
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

    // Navigate to inventory after successful add
    setView('inventory');

    // Show summary
    if (failedItems.length === 0) {
      alert(`Successfully added ${addedItems.length} item(s) to inventory!`);
    } else {
      alert(`Added ${addedItems.length} item(s), but failed to add: ${failedItems.join(', ')}`);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pt-16 max-w-5xl mx-auto px-4 sm:px-6">
      <Navbar activeView={view} setView={setView} />

      {isVoiceActive && (
        <VoiceAssistant onAdjustStock={adjustStock} onClose={() => setIsVoiceActive(false)} />
      )}

      <EditItemModal
        item={editingItem || { id: '', name: '', quantity: 0, unit: 'units', category: '', lastUpdated: '' }}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleEditItem}
        isLoading={isEditing}
      />

      <main className="py-8">
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-slate-900">Welcome Home!</h1>
              <p className="text-slate-500">How would you like to update your pantry?</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setView('scan-receipt')}
                className="bg-emerald-600 text-white p-6 rounded-2xl flex flex-col items-start gap-4 hover:shadow-xl transition-all shadow-lg"
              >
                <div className="bg-white/20 p-3 rounded-xl text-2xl">🧾</div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Log Groceries</h3>
                  <p className="text-emerald-100 text-sm">Scan a receipt</p>
                </div>
              </button>

              <button
                onClick={() => setView('scan-usage')}
                className="bg-amber-500 text-white p-6 rounded-2xl flex flex-col items-start gap-4 hover:shadow-xl transition-all shadow-lg"
              >
                <div className="bg-white/20 p-3 rounded-xl text-2xl">🍳</div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Log Cooking</h3>
                  <p className="text-amber-100 text-sm">Scan counter items</p>
                </div>
              </button>

              <button
                onClick={() => setIsVoiceActive(true)}
                className="bg-indigo-600 text-white p-6 rounded-2xl flex flex-col items-start gap-4 hover:shadow-xl transition-all shadow-lg"
              >
                <div className="bg-white/20 p-3 rounded-xl text-2xl">🎙️</div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Voice Assistant</h3>
                  <p className="text-indigo-100 text-sm">"I used 2 apples"</p>
                </div>
              </button>

              <button
                onClick={() => setView('add-item')}
                className="bg-sky-600 text-white p-6 rounded-2xl flex flex-col items-start gap-4 hover:shadow-xl transition-all shadow-lg md:col-span-3"
              >
                <div className="bg-white/20 p-3 rounded-xl text-2xl">➕</div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Add Item Manually</h3>
                  <p className="text-sky-100 text-sm">Enter item details by hand</p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Items</p>
                <p className="text-2xl font-bold text-slate-800">{inventory.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">In Stock</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {inventory.filter((i) => i.quantity > 0).length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Low Stock</p>
                <p className="text-2xl font-bold text-amber-500">
                  {inventory.filter((i) => i.quantity > 0 && i.quantity < 3).length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Out of Stock</p>
                <p className="text-2xl font-bold text-slate-400">
                  {inventory.filter((i) => i.quantity === 0).length}
                </p>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Your Pantry</h2>
              <button
                onClick={() => setView('add-item')}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm"
              >
                <span>➕</span> Add Item
              </button>
            </div>

            {inventoryError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm flex justify-between items-center">
                <span>Error loading inventory: {inventoryError}</span>
                <button
                  onClick={loadInventory}
                  className="px-3 py-1 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoadingInventory ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin text-4xl">⏳</div>
              </div>
            ) : inventory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-4xl mb-4">📦</p>
                <p className="text-slate-500 mb-4">Your pantry is empty</p>
                <button
                  onClick={() => setView('add-item')}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Add Your First Item
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-3 md:px-6 md:py-4">Item</th>
                        <th className="px-3 py-3 md:px-6 md:py-4">Quantity</th>
                        <th className="px-3 py-3 md:px-6 md:py-4">Status</th>
                        <th className="px-3 py-3 md:px-6 md:py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <InventoryItemRow
                          key={item.id}
                          item={item}
                          onAdjustQuantity={handleAdjustQuantity}
                          onSetToZero={handleSetToZero}
                          onEdit={() => setEditingItem(item)}
                          isUpdating={updatingItemIds.has(item.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'add-item' && (
          <div className="max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setView('inventory')}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ← Back to Inventory
              </button>
            </div>
            <AddItemForm
              onSubmit={handleCreateItem}
              onCancel={() => setView('inventory')}
              isLoading={isAddingItem}
            />
          </div>
        )}

        {view === 'ledger' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Activity Ledger</h2>

            {activitiesError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm flex justify-between items-center">
                <span>Error loading activities: {activitiesError}</span>
                <button
                  onClick={loadActivities}
                  className="px-3 py-1 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoadingActivities ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin text-4xl">⏳</div>
              </div>
            ) : activities.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-4xl mb-4">📜</p>
                <p className="text-slate-500">No activities yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{activity.itemName}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(activity.timestamp).toLocaleString()} •{' '}
                        {activity.source.replace('_', ' ')}
                      </p>
                    </div>
                    <p
                      className={`font-bold ${
                        activity.type === 'ADD' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {activity.type === 'ADD' ? '+' : '-'}
                      {activity.amount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'scan-receipt' && (
          <ReceiptScanner
            onAddItems={handleAddScannedItems}
            onCancel={() => setView('dashboard')}
          />
        )}

        {view === 'scan-usage' && (
          <div className="max-w-md mx-auto space-y-8 text-center animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('dashboard')}
                className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1"
              >
                ← Back to Dashboard
              </button>
            </div>
            <h2 className="text-2xl font-bold">Scan Usage</h2>
            <div
              className={`border-2 border-dashed border-slate-300 rounded-3xl p-12 ${
                isProcessing ? 'bg-slate-50' : 'bg-white'
              }`}
            >
              {isProcessing ? (
                <div className="animate-pulse space-y-4">
                  <div className="text-4xl">🌀</div>
                  <p className="text-amber-600 font-bold">AI Analyzing...</p>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="text-6xl mb-4">🥕</div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsProcessing(true);
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const base64 = (reader.result as string).split(',')[1];
                        try {
                          const results = await analyzeUsage(base64);
                          for (const r of results) {
                            await adjustStock(r.name, -r.quantityUsed);
                          }
                          setView('inventory');
                        } catch (err) {
                          alert('Error processing image.');
                        } finally {
                          setIsProcessing(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                  <span className="bg-amber-500 text-white px-6 py-2 rounded-full font-bold">
                    Take Photo
                  </span>
                </label>
              )}
            </div>
          </div>
        )}
      </main>

      {view !== 'add-item' && (
        <button
          onClick={() => setIsVoiceActive(true)}
          className="fixed bottom-20 right-6 md:bottom-8 md:right-8 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all z-40"
        >
          🎙️
        </button>
      )}
    </div>
  );
};

export default App;
