/** Coerce API / localStorage payloads into a plain array. */
export function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value != null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.activities)) return obj.activities as T[];
  }
  return [];
}