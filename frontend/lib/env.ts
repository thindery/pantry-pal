/** Client-safe API base — empty string uses same-origin /api rewrites. */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "";
  }
  return "";
}