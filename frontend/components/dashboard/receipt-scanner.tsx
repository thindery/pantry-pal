"use client";

import React, { useRef, useState } from "react";
import type { ScanResult } from "@/types";
import { scanReceiptBackend } from "@/services/apiService";

interface ReceiptScannerProps {
  onAddItems: (items: ScanResult[]) => Promise<void>;
  onCancel: () => void;
}

export function ReceiptScanner({ onAddItems, onCancel }: ReceiptScannerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file == null) return;

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
      // Use backend Tesseract.js OCR, not browser Gemini
      const response = await scanReceiptBackend(base64Image);
      const results = response.items ?? [];
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
    if (scanResults == null || scanResults.length === 0) return;

    setIsAdding(true);
    try {
      await onAddItems(scanResults);
    } catch (_err) {
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
    if (fileInputRef.current != null) {
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
      {Boolean(selectedImage) && scanResults == null && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <img
              src={selectedImage ?? undefined}
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
                  Scanning...
                </>
              ) : (
                <>
                  <span>🧾</span> Scan Receipt
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
      {scanResults != null && (
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
              {scanResults.map((item, _index) => (
                <div key={_index} className="px-6 py-4 flex justify-between items-center">
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