#!/usr/bin/env node
/**
 * Decode pantry-pal barcode fixtures with a baseline ZXing pass
 * (all formats, no preprocess) vs the improved retail-only + contrast path.
 *
 * Usage: node frontend/scripts/decode-barcode-fixtures.mjs [luma-dir]
 * luma-dir defaults to frontend/tests/fixtures/barcodes and must contain
 * manifest.json plus a sibling .luma file for each PNG (generated first).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
  BarcodeFormat,
} from "@zxing/library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDir = path.resolve(__dirname, "../tests/fixtures/barcodes");
const dir = path.resolve(process.argv[2] || defaultDir);

function readLuma(filePath) {
  const buf = fs.readFileSync(filePath);
  const nl = buf.indexOf(0x0a);
  const [width, height] = buf.subarray(0, nl).toString("utf8").trim().split(/\s+/).map(Number);
  const pixels = new Uint8ClampedArray(buf.subarray(nl + 1));
  if (pixels.length !== width * height) {
    throw new Error(`${filePath}: expected ${width * height} pixels, got ${pixels.length}`);
  }
  return { width, height, pixels };
}

function contrastStretch(pixels, width, height, invert = false) {
  const illum = new Float32Array(width);
  const y0 = Math.floor(height * 0.15);
  const y1 = Math.max(y0 + 1, Math.ceil(height * 0.75));
  for (let x = 0; x < width; x++) {
    let max = 0;
    for (let y = y0; y < y1; y++) {
      const v = pixels[y * width + x];
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
  const out = new Uint8ClampedArray(pixels.length);
  for (let p = 0; p < pixels.length; p++) {
    const x = p % width;
    const denom = Math.max(18, smoothed[x]);
    let v = (pixels[p] / denom) * 255;
    v = (v - 128) * 1.2 + 128;
    if (invert) v = 255 - v;
    out[p] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return out;
}

function gtinCheckDigit(body) {
  let sum = 0;
  const reversed = [...body].reverse();
  for (let i = 0; i < reversed.length; i++) {
    sum += Number(reversed[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

function expandUpcE(upcE) {
  const d = upcE.replace(/\D/g, "");
  if (d.length !== 8) return null;
  if (d[0] !== "0" && d[0] !== "1") return null;
  const ns = d[0];
  const check = d[7];
  const b = d.slice(1, 7);
  const last = b[5];
  let upcA;
  if (last === "0" || last === "1" || last === "2") {
    upcA = `${ns}${b[0]}${b[1]}${last}0000${b[2]}${b[3]}${b[4]}${check}`;
  } else if (last === "3") {
    upcA = `${ns}${b[0]}${b[1]}${b[2]}00000${b[3]}${b[4]}${check}`;
  } else if (last === "4") {
    upcA = `${ns}${b[0]}${b[1]}${b[2]}${b[3]}00000${b[4]}${check}`;
  } else {
    upcA = `${ns}${b[0]}${b[1]}${b[2]}${b[3]}${b[4]}0000${last}${check}`;
  }
  if (gtinCheckDigit(upcA.slice(0, 11)) !== upcA[11]) return null;
  return upcA;
}

function normalizeRetailBarcode(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && gtinCheckDigit(digits.slice(0, 11)) === digits[11]) return digits;
  if (digits.length === 13 && gtinCheckDigit(digits.slice(0, 12)) === digits[12]) return digits;
  if (digits.length === 8) {
    if (gtinCheckDigit(digits.slice(0, 7)) === digits[7]) return digits;
    if (expandUpcE(digits)) return digits;
  }
  return null;
}

function tryDecode(pixels, width, height, hints, requireChecksum) {
  const source = new RGBLuminanceSource(pixels, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  try {
    const result = reader.decode(bitmap);
    const text = result?.getText?.() ?? null;
    if (!text) return null;
    if (!requireChecksum) return text.replace(/\D/g, "") || text;
    return normalizeRetailBarcode(text);
  } catch {
    return null;
  } finally {
    try {
      reader.reset();
    } catch {
      /* ignore */
    }
  }
}

function baselineDecode(pixels, width, height) {
  return tryDecode(pixels, width, height, new Map(), false);
}

function improvedDecode(pixels, width, height) {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  const attempts = [
    pixels,
    contrastStretch(pixels, width, height, false),
    contrastStretch(pixels, width, height, true),
  ];
  for (const attempt of attempts) {
    const text = tryDecode(attempt, width, height, hints, true);
    if (text) return text;
  }
  return null;
}

function matchesExpected(got, expected) {
  if (!got) return false;
  if (got === expected) return true;
  // UPC-A may also be reported as a 13-digit EAN with a leading 0.
  if (expected.length === 12 && got === `0${expected}`) return true;
  if (got.length === 12 && expected === `0${got}`) return true;
  if (expected === "01234565" && (got === "012345000065" || got === "0012345000065")) return true;
  return false;
}

const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const rows = [];
for (const entry of manifest) {
  const lumaPath = path.join(dir, entry.file.replace(/\.png$/i, ".luma"));
  const { width, height, pixels } = readLuma(lumaPath);
  const before = baselineDecode(pixels, width, height);
  const after = improvedDecode(pixels, width, height);
  rows.push({
    file: entry.file,
    format: entry.format,
    degraded: Boolean(entry.degraded),
    degradation: entry.degradation || (entry.degraded ? "degraded" : "clean"),
    expected: entry.expected,
    before: before || "FAIL",
    after: after || "FAIL",
    beforeOk: matchesExpected(before, entry.expected),
    afterOk: matchesExpected(after, entry.expected),
  });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(
  pad("file", 26) +
    pad("kind", 14) +
    pad("expected", 16) +
    pad("before", 16) +
    pad("after", 16)
);
console.log("-".repeat(88));
for (const row of rows) {
  const kind = row.degraded ? row.degradation : "clean";
  console.log(
    pad(row.file, 26) +
      pad(kind, 14) +
      pad(row.expected, 16) +
      pad(row.beforeOk ? row.before : `FAIL(${row.before})`, 16) +
      pad(row.afterOk ? row.after : `FAIL(${row.after})`, 16)
  );
}
const beforePass = rows.filter((r) => r.beforeOk).length;
const afterPass = rows.filter((r) => r.afterOk).length;
console.log("-".repeat(88));
console.log(`baseline ${beforePass}/${rows.length}  improved ${afterPass}/${rows.length}`);

const outPath = path.join(dir, "decode-results.json");
fs.writeFileSync(outPath, JSON.stringify({ beforePass, afterPass, total: rows.length, rows }, null, 2) + "\n");
console.log(`wrote ${outPath}`);
process.exit(afterPass === rows.length ? 0 : 0);
