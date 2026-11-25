/** Minimum length for a product name we will cache or save from a scan. */
export const MIN_USABLE_PRODUCT_NAME_LENGTH = 3;

/**
 * Reject empty or 1–2 character names so a mid-typing scan (PP-075 / PP-181)
 * cannot be cached as the real product title.
 */
export function isUsableProductName(name: unknown): boolean {
  if (typeof name !== "string") return false;
  return name.trim().length >= MIN_USABLE_PRODUCT_NAME_LENGTH;
}
