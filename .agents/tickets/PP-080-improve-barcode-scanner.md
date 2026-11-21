# PP-080: Improve barcode scanner reliability

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** User-reported enhancement  
**Created:** 2026-11-21  
**Completed:** 2026-11-21  
**Depends on:** PP-075 (manual-name first-letter fix), PP-076 (Quick Scan)

---

## Problem

Tylor: the Scan Barcode camera sometimes reads only part of the number and then errors. It seems more reliable after tapping the screen (focus). Shadows and some harder barcodes are difficult to scan. He asked for a ticket to gather example barcodes and improve scanner logic.

## Behavior

Harden the live camera scanner (and image-upload decode) without changing Quick Scan or manual name entry:

- Validate UPC-A / EAN-13 / UPC-E / EAN-8 checksums. Reject partial or short camera reads silently and keep scanning (do not show an error).
- Require the same valid code on 2 consecutive successful frames before accepting.
- Restrict decode formats to retail UPC/EAN (not QR / Code 128 / etc.).
- Request a higher-resolution rear camera (ideal 1920×1080), continuous autofocus when the browser supports it, tap-to-focus, and a flashlight toggle only when torch is supported.
- Use the native `BarcodeDetector` API when available, with the existing ZXing path as fallback.
- Apply contrast / grayscale (and invert retry on still images) preprocessing to help with shadows and low contrast.
- Keep Quick Scan (`localStorage` key `pantry-quick-scan`) and PP-075 manual name entry working.

## Acceptance Criteria

- [x] Ticket + status row exist for PP-080
- [x] Example barcode fixtures (UPC-A, EAN-13, UPC-E, EAN-8, including degraded samples) are in the repo and have been run through the decoder
- [x] Camera path validates checksums, ignores partial reads without an error banner, and requires 2 agreeing frames
- [x] Formats restricted to retail UPC/EAN
- [x] Higher-res + continuous autofocus request, tap-to-focus, torch button only if supported
- [x] Native BarcodeDetector used when available, ZXing fallback otherwise
- [x] Quick Scan and manual name entry still work
- [x] Frontend build passes
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy

## Out of scope

- Receipt / usage scanners
- Backend barcode lookup changes
- Manual typed-entry checksum hard-fail (users can still type a code)

## Implementation notes

- Scanner UI: `frontend/components/BarcodeScanner.tsx` (`@zxing/browser` + `@zxing/library`).
- Image upload decode: `frontend/services/barcodeService.ts` (`scanBarcodeFromImage`).
- Shared helpers: `frontend/lib/retail-barcode.ts`.
- Fixtures: `frontend/tests/fixtures/barcodes/`.
- Camera now restricts formats to UPC-A / UPC-E / EAN-13 / EAN-8, drops partial or bad-checksum reads silently, and requires two agreeing frames before lookup.
- Requests 1920×1080, applies continuous autofocus when advertised, supports tap-to-focus, and shows the flashlight button only when `torch` is available.
- Uses native `BarcodeDetector` when the browser supports a retail format; ZXing remains the fallback, with an illumination-correction canvas pass for shadows.
- Fixture decode (baseline ZXing vs improved): clean UPC-A / EAN-13 / EAN-8, blur, low-contrast UPC-A, and curved EAN-8 already passed. Shadowed UPC-A, shadowed EAN-13, and shadow+low-contrast UPC-A failed before and passed after. UPC-E still fails in `@zxing/library` 0.21.3 because of a StringBuilder port bug in `UPCEReader`; the app still requests UPC-E and will use `BarcodeDetector` when the device provides it.

