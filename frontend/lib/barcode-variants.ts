/** UPC-A (12) and EAN-13 (leading 0 + 12) are the same retail code. */
export function barcodeVariants(barcode: string | undefined | null): string[] {
  const clean = (barcode ?? "").replace(/\D/g, "");
  if (!clean) return [];
  const variants = [clean];
  if (clean.length === 12) variants.push(`0${clean}`);
  else if (clean.length === 13 && clean.startsWith("0")) variants.push(clean.slice(1));
  return [...new Set(variants)];
}

export function barcodesMatch(
  left: string | undefined | null,
  right: string | undefined | null,
): boolean {
  const rightVariants = barcodeVariants(right);
  if (rightVariants.length === 0) return false;
  const leftSet = new Set(barcodeVariants(left));
  return rightVariants.some((value) => leftSet.has(value));
}
