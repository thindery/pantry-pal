/**
 * PP-105: one URL per page. With `trailingSlash: true` the canonical form ends
 * in "/". `skipTrailingSlashRedirect` stays on so API proxy paths keep their
 * exact shape, so page paths are normalized here instead.
 */
const NO_SLASH_REDIRECT = new Set(["/og-image", "/pricing/og-image"]);

export function trailingSlashTarget(pathname: string): string | null {
  if (pathname === "/" || pathname.endsWith("/")) return null;
  if (pathname.startsWith("/api/") || pathname === "/api") return null;
  if (pathname.startsWith("/_next/")) return null;
  if (NO_SLASH_REDIRECT.has(pathname)) return null;
  const last = pathname.split("/").pop() ?? "";
  if (last.includes(".")) return null; // files such as /sitemap.xml
  return `${pathname}/`;
}
