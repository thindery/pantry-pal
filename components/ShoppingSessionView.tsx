import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingSession, ShoppingSessionItem, BarcodeProduct } from '../types';
import BarcodeScanner from './BarcodeScanner';
import {
  createShoppingSession,
  getShoppingSession,
  addItemToShoppingSession,
  removeItemFromShoppingSession,
  completeShoppingSession,
} from '../services/apiService';

interface ShoppingSessionViewProps {
  session: ShoppingSession | null;
  onSessionCreated: (session: ShoppingSession) => void;
  onSessionCompleted: (session: ShoppingSession) => void;
  onCancel: () => void;
}

interface SessionItemWithImage extends ShoppingSessionItem {
  image?: string;
  brand?: string;
}

const ShoppingSessionView: React.FC<ShoppingSessionViewProps> = ({
  session,
  onSessionCreated,
  onSessionCompleted,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [sessionData, setSessionData] = useState<ShoppingSession | null>(session);
  const [showReceiptCapture, setShowReceiptCapture] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [justAddedItem, setJustAddedItem] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsEndRef = useRef<HTMLDivElement>(null);

  // Refresh session data when session changes
  useEffect(() => {
    setSessionData(session);
  }, [session]);

  // Scroll to bottom when new items are added
  useEffect(() => {
    if (justAddedItem && itemsEndRef.current) {
      itemsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionData?.items?.length, justAddedItem]);

  const handleStartSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await createShoppingSession();
      if (response.success && response.data) {
        setSessionData(response.data);
        onSessionCreated(response.data);
      } else {
        setError('Failed to create shopping session');
      }
    } catch (err) {
      setError('Failed to create shopping session. Please try again.');
      console.error('Start session error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    if (!sessionData?.id) return;
    try {
      const response = await getShoppingSession(sessionData.id);
      if (response.success && response.data) {
        setSessionData(response.data);
      }
    } catch (err) {
      console.error('Failed to refresh session:', err);
    }
  };

  const handleBarcodeDetected = useCallback(async (product: BarcodeProduct) => {
    if (!sessionData?.id) return;

    setShowScanner(false);
    setIsLoading(true);
    setError(null);

    try {
      const response = await addItemToShoppingSession(sessionData.id, {
        barcode: product.barcode,
        name: product.name || 'Unknown Product',
        category: product.category || 'other',
        quantity: 1,
      });

      if (response.success && response.data) {
        setJustAddedItem(response.data.id);
        await refreshSession();
      } else {
        setError('Failed to add item to session');
      }
    } catch (err) {
      setError('Failed to add item. Please try again.');
      console.error('Add item error:', err);
    } finally {
      setIsLoading(false);
      // Clear the highlight after 2 seconds
      setTimeout(() => setJustAddedItem(null), 2000);
    }
  }, [sessionData?.id]);

  const handleRemoveItem = async (itemId: string) => {
    if (!sessionData?.id) return;

    setIsLoading(true);
    try {
      const response = await removeItemFromShoppingSession(sessionData.id, itemId);
      if (response.success) {
        await refreshSession();
      } else {
        setError('Failed to remove item');
      }
    } catch (err) {
      setError('Failed to remove item. Please try again.');
      console.error('Remove item error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiptCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteSession = async () => {
    if (!sessionData?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await completeShoppingSession(sessionData.id, {
        receiptUrl: receiptPreview || undefined,
        notes: notes || undefined,
      });

      if (response.success && response.data) {
        onSessionCompleted(response.data);
      } else {
        setError('Failed to complete session');
      }
    } catch (err) {
      setError('Failed to complete session. Please try again.');
      console.error('Complete session error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // No active session - show start screen
  if (!sessionData || sessionData.status !== 'active') {
    return (
      <div className="max-w-lg mx-auto space-y-8 animate-in fade-in duration-300">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">🛒</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Shopping Session</h2>
          <p className="text-slate-500">
            Start a new shopping session to track your cart and save receipts.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleStartSession}
            disabled={isLoading}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Starting...
              </>
            ) : (
              <>
                <span>▶</span>
                Start Shopping
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            className="w-full py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
          >
            ← Back to Shopping List
          </button>
        </div>
      </div>
    );
  }

  // Show barcode scanner
  if (showScanner) {
    return (
      <div className="max-w-lg mx-auto">
        <BarcodeScanner
          onBarcodeDetected={handleBarcodeDetected}
          onCancel={() => setShowScanner(false)}
        />
      </div>
    );
  }

  // Show receipt capture
  if (showReceiptCapture) {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowReceiptCapture(false);
              setReceiptPreview(null);
            }}
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1"
          >
            ← Back to Session
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Complete Session</h2>
          <p className="text-slate-500">
            Add a receipt photo and notes before finishing
          </p>
        </div>

        {/* Session Summary */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Items:</span>
            <span className="font-semibold">{sessionData.itemCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Started:</span>
            <span className="font-semibold">{formatDate(sessionData.startedAt)}</span>
          </div>
          {sessionData.totalAmount > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-700 font-medium">Total:</span>
              <span className="text-xl font-bold text-emerald-600">
                {formatCurrency(sessionData.totalAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Receipt Upload */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Receipt Photo (optional)
          </label>

          {receiptPreview ? (
            <div className="relative">
              <img
                src={receiptPreview}
                alt="Receipt preview"
                className="w-full h-48 object-contain bg-slate-100 rounded-xl"
              />
              <button
                onClick={() => setReceiptPreview(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-slate-800/80 text-white rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all flex flex-col items-center gap-2"
            >
              <span className="text-3xl">📷</span>
              <span className="text-slate-600 font-medium">Tap to capture receipt</span>
              <span className="text-slate-400 text-sm">or choose from gallery</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptCapture}
            className="hidden"
          />
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Walmart trip, Sunday shopping"
            rows={3}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
          />
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Complete Button */}
        <button
          onClick={handleCompleteSession}
          disabled={isLoading}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              Completing...
            </>
          ) : (
            <>
              <span>✓</span>
              Complete Session
            </>
          )}
        </button>
      </div>
    );
  }

  // Active session view
  return (
    <div className="max-w-lg mx-auto space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1"
          >
            ← Back
          </button>
        </div>
        <span className="text-xs font-medium px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
          ● Active Session
        </span>
      </div>

      {/* Running Total Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-emerald-100 text-sm font-medium">Running Total</p>
            <p className="text-3xl font-bold">
              {formatCurrency(sessionData.totalAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-sm font-medium">Items</p>
            <p className="text-3xl font-bold">{sessionData.itemCount}</p>
          </div>
        </div>
        <p className="text-emerald-200 text-xs mt-4">
          Started {formatDate(sessionData.startedAt)}
        </p>
      </div>

      {/* Scan Button */}
      <button
        onClick={() => setShowScanner(true)}
        className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-3"
      >
        <span className="text-2xl">📱</span>
        Scan Barcode
      </button>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Scanned Items List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Scanned Items</h3>
          {sessionData.items?.length > 0 && (
            <span className="text-sm text-slate-500">
              {sessionData.items.length} item{sessionData.items.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {sessionData.items?.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <span className="text-4xl mb-3 block">📱</span>
            <p className="text-slate-500 font-medium">No items scanned yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Tap "Scan Barcode" to start adding items
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pb-2">
            {sessionData.items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  justAddedItem === item.id
                    ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📦</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-full uppercase">
                      {item.category || 'other'}
                    </span>
                    {item.barcode && (
                      <span className="font-mono">{item.barcode.slice(-6)}</span>
                    )}
                  </div>
                </div>
                {item.price !== undefined && item.price !== null && (
                  <div className="text-right">
                    <p className="font-bold text-slate-700">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={isLoading}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remove item"
                >
                  ×
                </button>
              </div>
            ))}
            <div ref={itemsEndRef} />
          </div>
        )}
      </div>

      {/* End Session Button */}
      {sessionData.items?.length > 0 && (
        <button
          onClick={() => setShowReceiptCapture(true)}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 mt-4"
        >
          <span>✓</span>
          End Session & Save
        </button>
      )}
    </div>
  );
};

export default ShoppingSessionView;
