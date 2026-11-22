import { describe, expect, it } from "vitest";
import { barcodeVariants, barcodesMatch } from "@/lib/barcode-variants";

describe("barcodeVariants", () => {
  it("pairs a 12-digit UPC-A with its leading-zero EAN-13 form", () => {
    expect(barcodeVariants("074305001161")).toEqual([
      "074305001161",
      "0074305001161",
    ]);
    expect(barcodeVariants("0074305001161")).toEqual([
      "0074305001161",
      "074305001161",
    ]);
  });
});

describe("barcodesMatch", () => {
  it("treats 12- and 13-digit forms of the same code as equal", () => {
    expect(barcodesMatch("074305001161", "0074305001161")).toBe(true);
    expect(barcodesMatch("074305001161", "074305001161")).toBe(true);
    expect(barcodesMatch("074305001161", "074305001162")).toBe(false);
    expect(barcodesMatch("", "074305001161")).toBe(false);
  });
});
