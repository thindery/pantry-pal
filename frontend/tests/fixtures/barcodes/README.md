# Barcode scanner fixtures (PP-080)

Public, valid test codes rendered as PNGs, plus degraded copies (shadow, blur, low contrast, slight curve) for decoder checks.

| File | Format | Code | Notes |
|------|--------|------|-------|
| upc-a-clean.png | UPC-A | 012345678905 | Standard test UPC-A |
| ean-13-clean.png | EAN-13 | 5901234123457 | Standard test EAN-13 |
| ean-8-clean.png | EAN-8 | 96385074 | Standard test EAN-8 |
| upc-e-clean.png | UPC-E | 01234565 | Expands to UPC-A 012345000065 |
| upc-a-shadow.png | UPC-A | 012345678905 | Uneven side lighting |
| ean-13-shadow.png | EAN-13 | 5901234123457 | Uneven side lighting |
| ean-13-blur.png | EAN-13 | 5901234123457 | Mild blur |
| upc-a-low-contrast.png | UPC-A | 012345678905 | Grey bars on grey |
| upc-e-low-contrast.png | UPC-E | 01234565 | Grey bars on grey |
| ean-8-curved.png | EAN-8 | 96385074 | Slight wave/curve |
| upc-a-shadow-low-contrast.png | UPC-A | 012345678905 | Shadow + low contrast |

Regenerate and compare the baseline ZXing pass vs illumination-corrected retail decode:

```bash
# Needs Pillow + python-barcode (use a throwaway venv)
python frontend/scripts/generate-barcode-fixtures.py
python frontend/scripts/pngs-to-luma.py
node frontend/scripts/decode-barcode-fixtures.mjs
```

Note: `@zxing/library` 0.21.3's JavaScript UPC-E reader does not decode valid UPC-E images (a StringBuilder port bug in `UPCEReader.decodeMiddle`). The app still requests UPC-E and will use the native `BarcodeDetector` API when the browser provides it.
