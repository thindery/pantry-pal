import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

const RETAIL_FORMATS = [
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
];

/** GTIN check digit for a body of 7, 11, or 12 digits (EAN-8 / UPC-A / EAN-13). */
export function gtinCheckDigit(body: string): string {
  let sum = 0;
  const reversed = [...body].reverse();
  for (let i = 0; i < reversed.length; i++) {
    sum += Number(reversed[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

/**
 * Expand an 8-digit UPC-E (number system 0 or 1 + 6-digit body + check)
 * to its 12-digit UPC-A equivalent, or null if the check digit does not match.
 */
export function expandUpcE(upcE: string): string | null {
  const d = upcE.replace(/\D/g, '');
  if (d.length !== 8) return null;
  if (d[0] !== '0' && d[0] !== '1') return null;
  const ns = d[0];
  const check = d[7];
  const b = d.slice(1, 7);
  const last = b[5];
  let upcA: string;
  if (last === '0' || last === '1' || last === '2') {
    upcA = `${ns}${b[0]}${b[1]}${last}0000${b[2]}${b[3]}${b[4]}${check}`;
  } else if (last === '3') {
    upcA = `${ns}${b[0]}${b[1]}${b[2]}00000${b[3]}${b[4]}${check}`;
  } else if (last === '4') {
    upcA = `${ns}${b[0]}${b[1]}${b[2]}${b[3]}00000${b[4]}${check}`;
  } else {
    upcA = `${ns}${b[0]}${b[1]}${b[2]}${b[3]}${b[4]}0000${last}${check}`;
  }
  if (gtinCheckDigit(upcA.slice(0, 11)) !== upcA[11]) return null;
  return upcA;
}

/**
 * Return the digits of a valid retail barcode (UPC-A, EAN-13, UPC-E, EAN-8),
 * or null if the value is partial, the wrong length, or fails its checksum.
 */
export function normalizeRetailBarcode(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length === 12 && gtinCheckDigit(digits.slice(0, 11)) === digits[11]) {
    return digits;
  }
  if (digits.length === 13 && gtinCheckDigit(digits.slice(0, 12)) === digits[12]) {
    return digits;
  }
  if (digits.length === 8) {
    if (gtinCheckDigit(digits.slice(0, 7)) === digits[7]) return digits;
    if (expandUpcE(digits)) return digits;
  }
  return null;
}

/**
 * Require the same valid retail code on two consecutive successful reads
 * before accepting it. Invalid / partial texts are ignored and do not
 * reset a pending valid candidate.
 */
export function acceptCameraCandidate(
  pending: string | null,
  raw: string
): { pending: string | null; accepted: string | null } {
  const normalized = normalizeRetailBarcode(raw);
  if (!normalized) return { pending, accepted: null };
  if (pending === normalized) return { pending: null, accepted: normalized };
  return { pending: normalized, accepted: null };
}

export function createRetailReader(): BrowserMultiFormatReader {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, RETAIL_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints);
}

type SizedSource = CanvasImageSource & {
  width?: number;
  height?: number;
  videoWidth?: number;
  videoHeight?: number;
  naturalWidth?: number;
  naturalHeight?: number;
};

function sourceSize(source: SizedSource): { width: number; height: number } {
  const width = source.videoWidth || source.naturalWidth || source.width || 0;
  const height = source.videoHeight || source.naturalHeight || source.height || 0;
  return { width, height };
}

/**
 * Draw a grayscale, contrast-stretched frame to help with shadows and
 * low-contrast packaging. Optionally invert for light-on-dark bars.
 */
export function drawEnhancedBarcodeFrame(
  source: SizedSource,
  canvas: HTMLCanvasElement,
  options?: { invert?: boolean; maxWidth?: number }
): boolean {
  const { width: srcW, height: srcH } = sourceSize(source);
  if (!srcW || !srcH) return false;
  const maxWidth = options?.maxWidth ?? 1280;
  const scale = srcW > maxWidth ? maxWidth / srcW : 1;
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const luma = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    luma[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  // Estimate the "paper" illumination per column (max luma), then smooth it
  // horizontally so a lighting falloff / shadow can be divided out.
  const illum = new Float32Array(width);
  const y0 = Math.floor(height * 0.15);
  const y1 = Math.max(y0 + 1, Math.ceil(height * 0.75));
  for (let x = 0; x < width; x++) {
    let max = 0;
    for (let y = y0; y < y1; y++) {
      const v = luma[y * width + x];
      if (v > max) max = v;
    }
    illum[x] = max;
  }
  const smoothed = new Float32Array(width);
  const radius = Math.max(8, Math.round(width / 30));
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let count = 0;
    const lo = Math.max(0, x - radius);
    const hi = Math.min(width - 1, x + radius);
    for (let i = lo; i <= hi; i++) {
      sum += illum[i];
      count++;
    }
    smoothed[x] = sum / count;
  }
  const invert = Boolean(options?.invert);
  for (let p = 0; p < luma.length; p++) {
    const x = p % width;
    const denom = Math.max(18, smoothed[x]);
    let v = (luma[p] / denom) * 255;
    v = (v - 128) * 1.2 + 128;
    if (invert) v = 255 - v;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    const i = p * 4;
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return true;
}

export function decodeRetailTextFromCanvas(
  reader: BrowserMultiFormatReader,
  canvas: HTMLCanvasElement
): string | null {
  try {
    const result = reader.decodeFromCanvas(canvas);
    const text = result?.getText();
    return text ? normalizeRetailBarcode(text) : null;
  } catch {
    return null;
  }
}

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;

export interface NativeBarcodeDetector {
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

export async function createNativeBarcodeDetector(): Promise<NativeBarcodeDetector | null> {
  const Detector = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  if (!Detector) return null;
  let formats: string[] = [...NATIVE_FORMATS];
  if (typeof Detector.getSupportedFormats === 'function') {
    try {
      const supported = await Detector.getSupportedFormats();
      formats = formats.filter((f) => supported.includes(f));
    } catch {
      // Use the default retail list if the probe fails.
    }
  }
  if (formats.length === 0) return null;
  try {
    return new Detector({ formats });
  } catch {
    return null;
  }
}
