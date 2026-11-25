import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { BrowserMultiFormatReader } from '@zxing/browser';
import type { BarcodeProduct } from '../types';
import { lookupBarcode, scanBarcodeFromImage } from '../services/barcodeService';
import { isUsableProductName } from '../lib/product-name';
import {
  acceptCameraCandidate,
  createNativeBarcodeDetector,
  createRetailReader,
  decodeRetailTextFromCanvas,
  drawEnhancedBarcodeFrame,
  type NativeBarcodeDetector,
} from '../lib/retail-barcode';

type VideoTrackCaps = MediaTrackCapabilities & {
  torch?: boolean;
  focusMode?: string[];
  pointsOfInterest?: boolean | { x: number; y: number }[];
};

interface BarcodeScannerProps {
  onBarcodeDetected: (product: BarcodeProduct) => void;
  onCancel: () => void;
  autoStart?: boolean;
  quickScan?: boolean;
  onQuickScanChange?: (enabled: boolean) => void;
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeDetected,
  onCancel,
  autoStart = false,
  quickScan = true,
  onQuickScanChange,
  className,
  collapsed = false,
  onCollapsedChange,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [detectedProduct, setDetectedProduct] = useState<BarcodeProduct | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [unknownNameInput, setUnknownNameInput] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);
  const isLoadingRef = useRef(false);
  const quickScanRef = useRef(quickScan);
  const lastCameraScanRef = useRef<{ barcode: string; at: number } | null>(null);
  const pendingCodeRef = useRef<string | null>(null);
  const enhanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enhanceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeDetectorRef = useRef<NativeBarcodeDetector | null>(null);
  const enhanceInFlightRef = useRef(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    quickScanRef.current = quickScan;
  }, [quickScan]);

  // Auto-start scanning when component mounts with autoStart
  // Browsers require a user gesture for getUserMedia, so we try once on mount
  // and if permission is denied, the user can still click "Start Scanning"
  const autoStartAttempted = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStartAttempted.current) {
      autoStartAttempted.current = true;
      startScanning().catch(() => {
        // Permission denied or no user gesture — user can click Start Scanning manually
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wasCollapsedRef = useRef(false);
  useEffect(() => {
    if (collapsed) {
      wasCollapsedRef.current = true;
      stopScanning();
      return;
    }
    if (wasCollapsedRef.current) {
      wasCollapsedRef.current = false;
      if (autoStart) {
        startScanning().catch(() => {});
      }
    }
  }, [collapsed, autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const stopEnhanceLoop = useCallback(() => {
    if (enhanceTimerRef.current != null) {
      clearInterval(enhanceTimerRef.current);
      enhanceTimerRef.current = null;
    }
    enhanceInFlightRef.current = false;
  }, []);

  const stopScanning = useCallback(() => {
    stopEnhanceLoop();
    pendingCodeRef.current = null;
    nativeDetectorRef.current = null;
    // Stop the media stream (ZXing reader stops automatically when stream ends)
    if (streamRef.current != null) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Clear the reader reference (ZXing BrowserMultiFormatReader has no stop/reset method)
    readerRef.current = null;
    setIsScanning(false);
    setTorchOn(false);
    setTorchSupported(false);
  }, [stopEnhanceLoop]);

  const startScanning = async () => {
    setError(null);
    setDetectedProduct(null);

    try {
      // Check for camera support
      if (navigator.mediaDevices == null || navigator.mediaDevices.getUserMedia == null) {
        setHasCameraPermission(false);
        setError('Camera not supported on this device');
        return;
      }

      // Request a high-res rear camera. Autofocus is applied after the
      // stream starts so an unsupported focusMode constraint cannot fail getUserMedia.
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current != null) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      const capabilities = (track?.getCapabilities?.() ?? {}) as VideoTrackCaps;
      setTorchSupported(Boolean(capabilities.torch));
      setTorchOn(false);
      try {
        if (track && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
          await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
          });
        }
      } catch {
        // Some browsers advertise focusMode but still reject it.
      }

      setHasCameraPermission(true);
      setIsScanning(true);
      pendingCodeRef.current = null;

      const reader = createRetailReader();
      readerRef.current = reader;
      nativeDetectorRef.current = await createNativeBarcodeDetector();

      const considerRawText = (raw: string) => {
        // Ignore results if we're no longer scanning or already processing
        if (!isScanningRef.current || isLoadingRef.current) return;
        const next = acceptCameraCandidate(pendingCodeRef.current, raw);
        pendingCodeRef.current = next.pending;
        if (next.accepted) {
          console.log('Camera scan accepted barcode:', next.accepted);
          handleBarcodeDetected(next.accepted, true);
        }
      };

      // Start continuous scanning (ZXing). Partial / invalid reads are dropped
      // in considerRawText and never shown as errors.
      reader.decodeFromVideoElement(videoRef.current!, (result: unknown, _err: unknown) => {
        if (!isScanningRef.current || isLoadingRef.current) return;
        if (result != null && (result as { getText(): string }).getText() != null) {
          considerRawText((result as { getText(): string }).getText());
        }
      });

      // Parallel pass: native BarcodeDetector (when available) plus a
      // contrast/grayscale canvas decode to help with shadows and low contrast.
      stopEnhanceLoop();
      if (!enhanceCanvasRef.current) {
        enhanceCanvasRef.current = document.createElement('canvas');
      }
      enhanceTimerRef.current = setInterval(() => {
        if (enhanceInFlightRef.current) return;
        if (!isScanningRef.current || isLoadingRef.current) return;
        const video = videoRef.current;
        const canvas = enhanceCanvasRef.current;
        if (video == null || canvas == null || video.readyState < 2 || !video.videoWidth) return;
        enhanceInFlightRef.current = true;
        const finish = () => {
          enhanceInFlightRef.current = false;
        };
        const run = async () => {
          const detector = nativeDetectorRef.current;
          if (detector) {
            try {
              const found = await detector.detect(video);
              const raw = found[0]?.rawValue;
              if (raw) {
                considerRawText(raw);
                return;
              }
            } catch {
              // Fall through to the enhanced ZXing canvas pass.
            }
          }
          if (drawEnhancedBarcodeFrame(video, canvas)) {
            const decoded = decodeRetailTextFromCanvas(reader, canvas);
            if (decoded) considerRawText(decoded);
          }
        };
        void run().finally(finish);
      }, 150);
    } catch {
      // If this was an auto-start attempt, just fail silently — user can click Start Scanning
      // Only show permanent error if user explicitly clicked the button
      if (!autoStart) {
        setHasCameraPermission(false);
        setError('Camera access denied. You can upload a barcode image instead.');
      }
    }
  };

  const handleBarcodeDetected = async (barcode: string, fromCamera = false) => {
    // Prevent multiple scans of the same barcode while the camera is active.
    // Manual entry is intentional, so allow repeats there. Use refs so a stale
    // startScanning closure cannot skip the debounce or ignore a toggle change.
    if (fromCamera) {
      if (isLoadingRef.current) return;
      const last = lastCameraScanRef.current;
      if (last && last.barcode === barcode && Date.now() - last.at < 3000) return;
      lastCameraScanRef.current = { barcode, at: Date.now() };
    }

    console.log('Processing barcode:', barcode);
    setIsLoading(true);
    setError(null);
    setUnknownNameInput('');

    // Pause scanning temporarily
    stopScanning();

    try {
      const result = await lookupBarcode(barcode);
      console.log('Barcode lookup result:', result);

      if (Boolean(result.success) && result.product != null && isUsableProductName(result.product.name)) {
        if (quickScanRef.current && fromCamera) {
          // Quick Scan: add known products immediately and resume scanning
          onBarcodeDetected(result.product);
          startScanning();
          return;
        }
        setDetectedProduct(result.product);
      } else {
        // Unknown barcode or junk cached name - allow manual entry
        setUnknownNameInput('');
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
      setUnknownNameInput('');
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
    if (file == null) return;

    console.log('Processing image upload:', file.name, file.type, file.size);
    setError(null);
    setIsLoading(true);
    setDetectedProduct(null);

    try {
      const result = await scanBarcodeFromImage(file);
      console.log('Image scan result:', result);

      if (Boolean(result.success) && result.product != null && isUsableProductName(result.product.name)) {
        setDetectedProduct(result.product);
      } else if (result.product?.barcode) {
        // Barcode found but lookup failed
        setUnknownNameInput('');
        setDetectedProduct({
          barcode: result.product!.barcode,
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
      if (fileInputRef.current != null) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) return;

    setShowManualEntry(false);
    await handleBarcodeDetected(manualBarcode.trim(), false);
  };

  const handleConfirmProduct = () => {
    if (detectedProduct == null) return;

    const typedName = (detectedProduct.name || unknownNameInput).trim();
    if (!isUsableProductName(typedName)) return;

    const finalProduct = { ...detectedProduct, name: typedName };

    onBarcodeDetected(finalProduct);
    // Reset for next scan
    setDetectedProduct(null);
    setUnknownNameInput('');
    startScanning();
  };

  const handleRescan = () => {
    setDetectedProduct(null);
    setUnknownNameInput('');
    setError(null);
    startScanning();
  };

  const toggleTorch = async () => {
    if (streamRef.current == null) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (track == null) return;

    try {
      const capabilities = track.getCapabilities() as VideoTrackCaps;
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }] as unknown as MediaTrackConstraints['advanced'],
        });
        setTorchOn(!torchOn);
      }
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  };

  const handleCameraPointer = async (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const track = streamRef.current?.getVideoTracks()[0];
    if (track == null || !isScanning) return;
    const capabilities = (track.getCapabilities?.() ?? {}) as VideoTrackCaps;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const advanced: Record<string, unknown> = {};
    if (capabilities.pointsOfInterest) {
      advanced.pointsOfInterest = [{ x, y }];
    }
    if (Array.isArray(capabilities.focusMode)) {
      if (capabilities.focusMode.includes('single-shot')) advanced.focusMode = 'single-shot';
      else if (capabilities.focusMode.includes('manual')) advanced.focusMode = 'manual';
    }
    if (Object.keys(advanced).length === 0) return;
    try {
      await track.applyConstraints({
        advanced: [advanced as unknown as MediaTrackConstraintSet],
      });
      window.setTimeout(() => {
        const current = streamRef.current?.getVideoTracks()[0];
        if (!current) return;
        const caps = (current.getCapabilities?.() ?? {}) as VideoTrackCaps;
        if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          current
            .applyConstraints({
              advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
            })
            .catch(() => {});
        }
      }, 1500);
    } catch {
      // Tap-to-focus is best-effort; keep scanning if the device rejects it.
    }
  };

  return (
    <div className={`max-w-lg mx-auto w-full flex flex-col shrink-0 gap-2 ${className ?? ""}`}>
      <header className="flex items-center h-11 shrink-0 gap-1">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back to Inventory"
          className="flex items-center justify-center w-11 h-11 -ml-1.5 text-xl text-slate-600 hover:text-slate-800"
        >
          ←
        </button>
        <h2 className="text-base font-semibold text-slate-800 truncate">Scan</h2>
        <label className="ml-auto inline-flex items-center gap-1.5 cursor-pointer select-none pr-0.5">
          <span className="text-xs font-medium text-slate-600">Quick Scan</span>
          <input
            type="checkbox"
            checked={quickScan}
            onChange={(e) => onQuickScanChange?.(e.target.checked)}
            className="sr-only peer"
            aria-label="Toggle Quick Scan"
          />
          <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </header>

      {error != null && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">{error}</p>
              {hasCameraPermission === false && !quickScan && (
                <p className="mt-2 text-sm">You can also try uploading a barcode image or typing the barcode number manually.</p>
              )}
              {hasCameraPermission === false && quickScan && (
                <p className="mt-2 text-sm">Turn off Quick Scan to upload an image or type a barcode.</p>
              )}
            </div>
          </div>
          {hasCameraPermission === false && !quickScan && (
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
      {collapsed && detectedProduct == null && (
        <button
          type="button"
          data-testid="scan-camera-collapsed-bar"
          onClick={() => onCollapsedChange?.(false)}
          className="shrink-0 h-9 w-full rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
        >
          Camera paused · Tap to show
        </button>
      )}
      {!collapsed && detectedProduct == null && hasCameraPermission !== false && (
        <div
          data-testid="scan-camera-box"
          className="relative shrink-0 w-full overflow-hidden rounded-2xl bg-black cursor-pointer h-[clamp(12.5rem,33dvh,18.75rem)]"
          onPointerDown={handleCameraPointer}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
          />
          {isScanning && (
            <p
              data-testid="scan-camera-hint"
              className="absolute top-2 left-2 z-10 max-w-[calc(100%-4.25rem)] pointer-events-none rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium leading-tight text-white/95"
            >
              Point at a barcode · Tap to focus
            </p>
          )}

          {/* Scan overlay — inset so it stays clear of the hint and side controls */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              data-testid="scan-viewfinder"
              className="absolute inset-x-16 inset-y-12 border-2 border-emerald-400 rounded-lg"
            >
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

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

          {/* Controls — compact icons pinned to the top-right */}
          <div
            data-testid="scan-camera-controls"
            className="absolute top-2 right-2 z-10 flex flex-col gap-1.5"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                if (isScanning) {
                  stopScanning();
                } else {
                  startScanning();
                }
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm backdrop-blur-sm transition-colors ${
                isScanning
                  ? "bg-rose-600/80 hover:bg-rose-600"
                  : "bg-black/55 hover:bg-black/70"
              }`}
              aria-label={isScanning ? "Stop scanning" : "Start scanning"}
              title={isScanning ? "Stop scanning" : "Start scanning"}
            >
              {isScanning ? "■" : "▶"}
            </button>

            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-black/55 text-white text-sm backdrop-blur-sm hover:bg-black/70 transition-colors"
                title="Toggle flashlight"
                aria-label="Toggle flashlight"
              >
                {torchOn ? "🔦" : "💡"}
              </button>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Fallback Options — hidden in Quick Scan; still available in normal mode */}
      {detectedProduct == null && !quickScan && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-4 bg-slate-100 rounded-xl text-center hover:bg-slate-200 transition-colors"
          >
            <div className="text-2xl mb-2">📁</div>
            <p className="text-sm font-semibold text-slate-600">Upload Image</p>
          </button>

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
      {detectedProduct != null && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-4 mb-4">
            {detectedProduct.image ? (
              <img
                src={detectedProduct.image}
                alt={detectedProduct.name || 'Unknown Product'}
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
                value={unknownNameInput}
                onChange={(e) => setUnknownNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isUsableProductName(unknownNameInput)) {
                    e.preventDefault();
                    handleConfirmProduct();
                  }
                }}
                placeholder="Enter product name"
                className="w-full mt-2 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              {unknownNameInput.trim() && !isUsableProductName(unknownNameInput) && (
                <p className="text-amber-700 text-xs mt-2">
                  Please enter a name with at least 3 characters.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirmProduct}
              disabled={!isUsableProductName(detectedProduct.name || unknownNameInput)}
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
