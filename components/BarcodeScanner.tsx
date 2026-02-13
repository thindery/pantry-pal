import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeProduct } from '../types';
import { BarcodeLookupResult, lookupBarcode, scanBarcodeFromImage } from '../services/barcodeService';

interface BarcodeScannerProps {
  onBarcodeDetected: (product: BarcodeProduct) => void;
  onCancel: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onBarcodeDetected, onCancel }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [detectedProduct, setDetectedProduct] = useState<BarcodeProduct | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);
  const isLoadingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  // Sync refs with state for use in callbacks
  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const stopScanning = useCallback(() => {
    // Stop the media stream (ZXing reader stops automatically when stream ends)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Clear the reader reference (ZXing BrowserMultiFormatReader has no stop/reset method)
    readerRef.current = null;
    setIsScanning(false);
  }, []);

  const startScanning = async () => {
    setError(null);
    setScannedBarcode(null);
    setDetectedProduct(null);

    try {
      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        setError('Camera not supported on this device');
        return;
      }

      // Request camera with rear camera preference
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

      setHasCameraPermission(true);
      setIsScanning(true);

      // Initialize ZXing reader
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Start continuous scanning
      reader.decodeFromVideoElement(videoRef.current!, (result: any, err: any) => {
        // Ignore results if we're no longer scanning or already processing
        // Use refs here to avoid stale closure issues
        if (!isScanningRef.current || isLoadingRef.current) return;

        if (result && result.getText()) {
          const barcode = result.getText();
          console.log('Camera scan detected barcode:', barcode);
          handleBarcodeDetected(barcode);
        }
      });
    } catch (err) {
      console.error('Camera access error:', err);
      setHasCameraPermission(false);
      setError('Camera access denied. You can upload a barcode image instead.');
    }
  };

  const handleBarcodeDetected = async (barcode: string) => {
    // Prevent multiple scans of the same barcode
    if (scannedBarcode === barcode || isLoading) return;

    console.log('Processing barcode:', barcode);
    setScannedBarcode(barcode);
    setIsLoading(true);
    setError(null);

    // Pause scanning temporarily
    stopScanning();

    try {
      const result = await lookupBarcode(barcode);
      console.log('Barcode lookup result:', result);

      if (result.success && result.product) {
        setDetectedProduct(result.product);
      } else {
        // Unknown barcode - allow manual entry
        setDetectedProduct({
          barcode,
          name: '',
          category: 'other',
        });
      }
    } catch (err) {
      console.error('Error looking up barcode:', err);
      setError('Failed to look up product information. Please check your connection and try again.');
      // Still allow manual entry with the barcode
      setDetectedProduct({
        barcode,
        name: '',
        category: 'other',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Processing image upload:', file.name, file.type, file.size);
    setError(null);
    setIsLoading(true);
    setScannedBarcode(null);
    setDetectedProduct(null);

    try {
      const result = await scanBarcodeFromImage(file);
      console.log('Image scan result:', result);

      if (result.success && result.product) {
        setDetectedProduct(result.product);
      } else if (result.product?.barcode) {
        // Barcode found but lookup failed
        setDetectedProduct({
          barcode: result.product.barcode,
          name: '',
          category: 'other',
        });
      } else {
        setError(result.error || 'No barcode found in image. Try a clearer image with better lighting.');
      }
    } catch (err) {
      console.error('Error processing image upload:', err);
      setError('Failed to process image. Please try again with a different image.');
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) return;

    setShowManualEntry(false);
    await handleBarcodeDetected(manualBarcode.trim());
  };

  const handleConfirmProduct = () => {
    if (detectedProduct) {
      onBarcodeDetected(detectedProduct);
    }
  };

  const handleRescan = () => {
    setDetectedProduct(null);
    setScannedBarcode(null);
    setError(null);
    startScanning();
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }] as any,
        });
        setTorchOn(!torchOn);
      }
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
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
        <p className="text-slate-500">
          Point camera at a barcode to add an item
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">{error}</p>
              {hasCameraPermission === false && (
                <p className="mt-2 text-sm">You can also try uploading a barcode image or typing the barcode number manually.</p>
              )}
            </div>
          </div>
          {hasCameraPermission === false && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                📁 Upload Image
              </button>
              <button
                onClick={() => setShowManualEntry(true)}
                className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
              >
                ⌨️ Type Barcode
              </button>
            </div>
          )}
        </div>
      )}

      {/* Camera View */}
      {!detectedProduct && hasCameraPermission !== false && (
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-48 border-2 border-emerald-400 rounded-lg relative">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Scan line animation */}
              {isScanning && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 animate-[scan_2s_ease-in-out_infinite]">
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-1 bg-emerald-400 rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-2">⏳</div>
                <p className="text-white font-semibold">Looking up product...</p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button
              onClick={isScanning ? stopScanning : startScanning}
              className={`px-6 py-3 rounded-full font-bold transition-all ${
                isScanning
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {isScanning ? '⏹ Stop Scanning' : '▶ Start Scanning'}
            </button>

            <button
              onClick={toggleTorch}
              className="p-3 bg-slate-700/80 text-white rounded-full hover:bg-slate-600 transition-colors"
              title="Toggle flashlight"
            >
              {torchOn ? '🔦' : '💡'}
            </button>
          </div>
        </div>
      )}

      {/* Fallback Options */}
      {!detectedProduct && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-4 bg-slate-100 rounded-xl text-center hover:bg-slate-200 transition-colors"
          >
            <div className="text-2xl mb-2">📁</div>
            <p className="text-sm font-semibold text-slate-600">Upload Image</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <button
            onClick={() => setShowManualEntry(true)}
            className="p-4 bg-slate-100 rounded-xl text-center hover:bg-slate-200 transition-colors"
          >
            <div className="text-2xl mb-2">⌨️</div>
            <p className="text-sm font-semibold text-slate-600">Type Barcode</p>
          </button>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
          <h3 className="font-bold text-slate-800 mb-4">Enter Barcode Manually</h3>
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="e.g., 012345678905"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none mb-4"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={handleManualSubmit}
              disabled={!manualBarcode.trim() || isLoading}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Looking up...' : 'Look Up Product'}
            </button>
            <button
              onClick={() => setShowManualEntry(false)}
              className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Product Preview */}
      {detectedProduct && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-4 mb-4">
            {detectedProduct.image ? (
              <img
                src={detectedProduct.image}
                alt={detectedProduct.name}
                className="w-24 h-24 object-contain bg-slate-50 rounded-xl"
              />
            ) : (
              <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center text-4xl">
                📦
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    {detectedProduct.name || 'Unknown Product'}
                  </h3>
                  {detectedProduct.brand && (
                    <p className="text-slate-500 text-sm">{detectedProduct.brand}</p>
                  )}
                </div>
                {detectedProduct.source && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${detectedProduct.source === 'cache' ? 'bg-blue-100 text-blue-700' : detectedProduct.source === 'stale' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {detectedProduct.source === 'cache' ? '🟡 Cached' : detectedProduct.source === 'stale' ? '🟠 Stale' : '🟢 Live'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">Barcode: {detectedProduct.barcode}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full uppercase">
                {detectedProduct.category || 'other'}
              </span>
            </div>
          </div>

          {!detectedProduct.name && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-700 text-sm">
                ⚠️ We couldn't find this product in our database. You can still add it with a custom name.
              </p>
              <input
                type="text"
                value={detectedProduct.name}
                onChange={(e) => setDetectedProduct({ ...detectedProduct, name: e.target.value })}
                placeholder="Enter product name"
                className="w-full mt-2 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirmProduct}
              disabled={!detectedProduct.name}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              ✅ Add to Inventory
            </button>
            <button
              onClick={handleRescan}
              className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              ↻ Scan Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
