import React, { useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeProduct, PantryItem, CacheStatus, CacheStatusInfo } from '../types';
import { lookupBarcode, BarcodeLookupResult, formatRelativeTime } from '../services/barcodeService';

interface LinkBarcodeModalProps {
  item: PantryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, barcode: string, updates?: Partial<PantryItem>) => Promise<void>;
  isLoading: boolean;
}

// Cache status helper
const getCacheStatusInfo = (result: BarcodeLookupResult): CacheStatusInfo => {
  if (!result.cached && !result.success) {
    return {
      status: 'live' as CacheStatus,
      label: 'No product found',
      color: 'bg-rose-100 text-rose-700',
      icon: '❌'
    };
  }

  if (result.cached === false) {
    return {
      status: 'live' as CacheStatus,
      label: 'Live data from OpenFoodFacts',
      color: 'bg-emerald-100 text-emerald-700',
      icon: '🟢'
    };
  }

  if (result.cached && result.stale) {
    return {
      status: 'stale' as CacheStatus,
      label: 'Cached (stale - will refresh soon)',
      color: 'bg-amber-100 text-amber-700',
      icon: '🟠'
    };
  }

  return {
    status: 'cached' as CacheStatus,
    label: 'From local cache',
    color: 'bg-blue-100 text-blue-700',
    icon: '🟡'
  };
};

export const LinkBarcodeModal: React.FC<LinkBarcodeModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  isLoading,
}) => {
  const [barcode, setBarcode] = useState(() => item?.barcode || '');
  const [isScanning, setIsScanning] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookupData, setLookupData] = useState<Partial<PantryItem> | null>(null);
  const [updateName, setUpdateName] = useState(false);
  const [updateCategory, setUpdateCategory] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen && item) {
      setBarcode(item.barcode || '');
      setLookupResult(null);
      setError(null);
      setLookupData(null);
      setUpdateName(false);
      setUpdateCategory(false);
    }
  }, [isOpen, item]);

  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    readerRef.current = null;
    setIsScanning(false);
    isScanningRef.current = false;
  }, []);

  const startScanning = async () => {
    setError(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported on this device');
        return;
      }

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      isScanningRef.current = true;

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      reader.decodeFromVideoElement(videoRef.current!, (result: any, err: any) => {
        if (!isScanningRef.current) return;

        if (result && result.getText()) {
          const scannedBarcode = result.getText();
          console.log('Scanned barcode:', scannedBarcode);
          stopScanning();
          setBarcode(scannedBarcode);
          handleLookup(scannedBarcode);
        }
      });
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. You can type the barcode manually.');
    }
  };

  const handleLookup = async (code: string) => {
    if (!code.trim()) return;
    
    setIsLookingUp(true);
    setError(null);
    setLookupResult(null);
    
    try {
      const result = await lookupBarcode(code.trim());
      console.log('Barcode lookup result:', result);
      
      setLookupResult(result);
      
      if (result.success && result.product && item) {
        // Offer to update item with looked-up data
        const updates: Partial<PantryItem> = {};
        
        if (result.product.name && result.product.name !== item.name) {
          setUpdateName(true);
          updates.name = result.product.name;
        }
        
        if (result.product.category && result.product.category !== item.category) {
          setUpdateCategory(true);
          updates.category = result.product.category;
        }
        
        // Store product info for later
        updates.productInfo = {
          barcode: result.product.barcode,
          name: result.product.name,
          brand: result.product.brand,
          category: result.product.category,
          imageUrl: result.product.image,
          ingredients: result.product.ingredients,
          nutrition: result.product.nutrition,
          source: (result.product.source as 'openfoodfacts' | 'manual') || 'openfoodfacts',
          infoLastSynced: result.infoLastSynced || new Date().toISOString(),
          cached: result.cached,
        };
        
        setLookupData(updates);
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setError('Failed to look up product info, but you can still save the barcode.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLookingUp(true);
    setError(null);

    try {
      const { scanBarcodeFromImage } = await import('../services/barcodeService');
      const result = await scanBarcodeFromImage(file);
      
      if (result.success && result.product?.barcode) {
        setBarcode(result.product.barcode);
        handleLookup(result.product.barcode);
      } else {
        setError(result.error || 'No barcode found in image');
      }
    } catch (err) {
      setError('Failed to process image');
    } finally {
      setIsLookingUp(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!barcode.trim()) {
      setError('Please enter a barcode');
      return;
    }

    if (!item) {
      setError('No item selected');
      return;
    }

    // Don't allow saving if item already has a barcode
    if (item.barcode) {
      setError('Barcode already linked. Unlink to change.');
      return;
    }

    try {
      const updates: Partial<PantryItem> = {};
      
      // Include lookup data if user opted to update
      if (updateName && lookupData?.name) {
        updates.name = lookupData.name;
      }
      if (updateCategory && lookupData?.category) {
        updates.category = lookupData.category;
      }
      if (lookupData?.productInfo) {
        updates.productInfo = lookupData.productInfo;
      }
      
      await onSave(item.id, barcode.trim(), updates);
      onClose();
    } catch (err) {
      setError('Failed to save barcode');
    }
  };

  const handleUnlink = async () => {
    if (!item) {
      setError('No item selected');
      return;
    }

    try {
      await onSave(item.id, '', { productInfo: undefined });
      onClose();
    } catch (err) {
      setError('Failed to unlink barcode');
    }
  };

  // Get cache status for display
  const cacheStatus = lookupResult ? getCacheStatusInfo(lookupResult) : null;

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {item?.barcode ? 'Barcode Linked' : 'Link Barcode'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{item?.name || 'Unknown Item'}</span>
            <span className="text-slate-400 mx-2">•</span>
            <span className="capitalize text-slate-500">{item?.category || 'other'}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">
            {error}
          </div>
        )}

        {/* Cache Status Badge */}
        {cacheStatus && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${cacheStatus.color}`}>
            <span>{cacheStatus.icon}</span>
            <span>{cacheStatus.label}</span>
          </div>
        )}

        {/* Stale Warning */}
        {lookupResult?.stale && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-700 text-sm">
              ⚠️ This product data is older than 7 days and will be refreshed soon.
            </p>
          </div>
        )}

        {/* Camera Scanner */}
        {isScanning ? (
          <div className="mb-4 relative bg-black rounded-xl overflow-hidden aspect-square">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-32 border-2 border-emerald-400 rounded-lg" />
            </div>
            <button
              onClick={stopScanning}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-rose-500 text-white rounded-full font-semibold hover:bg-rose-600"
            >
              Cancel Scan
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Barcode Number
            </label>
            <input
              type="text"
              value={barcode}
              readOnly
              placeholder={item?.barcode ? 'No barcode linked' : 'Scan or upload to set barcode'}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm bg-slate-100 cursor-not-allowed"
              disabled={isLoading || isLookingUp}
            />
            <p className="text-xs text-slate-500 mt-1">
              {item?.barcode ? 'Barcode cannot be edited. Unlink to change.' : 'Use scan, upload, or lookup to set the barcode.'}
            </p>
          </div>
        )}

        {/* Scan Options - only show if no barcode linked */}
        {!isScanning && !item?.barcode && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={startScanning}
              disabled={isLoading || isLookingUp}
              className="flex-1 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>📷</span> Scan
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isLookingUp}
              className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>📁</span> Upload
            </button>
            <button
              onClick={() => handleLookup(barcode)}
              disabled={isLoading || isLookingUp || !barcode.trim()}
              className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>🔍</span> Lookup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Lookup Result - only show when linking new barcode */}
        {!item?.barcode && lookupResult && (
          <div className={`mb-4 p-4 rounded-lg ${lookupResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            {lookupResult.success && lookupResult.product ? (
              <>
                <p className="text-emerald-700 font-semibold mb-2">✓ Product Found</p>
                
                {/* Product Preview */}
                <div className="flex items-start gap-3 mb-4">
                  {lookupResult.product.image ? (
                    <img
                      src={lookupResult.product.image}
                      alt={lookupResult.product.name}
                      className="w-16 h-16 object-contain bg-white rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {lookupResult.product.name}
                    </p>
                    {lookupResult.product.brand && (
                      <p className="text-slate-600 text-xs">{lookupResult.product.brand}</p>
                    )}
                    <p className="text-slate-400 text-xs mt-1">
                      {lookupResult.product.barcode}
                    </p>
                    {lookupResult.infoLastSynced && (
                      <p className="text-slate-400 text-xs">
                        Updated {formatRelativeTime(lookupResult.infoLastSynced)}
                      </p>
                    )}
                    <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full uppercase">
                      {lookupResult.product.category || 'other'}
                    </span>
                  </div>
                </div>

                {/* Update Options */}
                {lookupResult.product.name && lookupResult.product.name !== item?.name && (
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={updateName}
                      onChange={(e) => setUpdateName(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">
                      Update name: &quot;{lookupResult.product.name}&quot;
                    </span>
                  </label>
                )}
                {lookupResult.product.category && lookupResult.product.category !== item?.category && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={updateCategory}
                      onChange={(e) => setUpdateCategory(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">
                      Update category: {lookupResult.product.category}
                    </span>
                  </label>
                )}
              </>
            ) : (
              <p className="text-amber-700 text-sm">
                ⚠️ {lookupResult.error || 'Product not found. You can still save the barcode.'}
              </p>
            )}
          </div>
        )}

        {!item?.barcode && isLookingUp && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg text-center">
            <span className="animate-spin inline-block mr-2">⏳</span>
            <span className="text-slate-600 text-sm">Looking up product...</span>
          </div>
        )}

        {/* Actions */}
        {item?.barcode ? (
          <div className="flex gap-3">
            <button
              onClick={handleUnlink}
              disabled={isLoading}
              className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Unlinking...' : 'Unlink Barcode'}
            </button>
            
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isLoading || !barcode.trim() || isLookingUp}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Linking...' : 'Link Barcode'}
            </button>
            
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkBarcodeModal;
