import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { createBearerToken } from "@/lib/auth-token";
import { getRegionFromCountry } from "@/lib/region";
import { trailingSlashTarget } from "@/lib/trailing-slash";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set([
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/checkout",
  "/checkout/success",
  "/checkout/cancel",
  "/auth/signin",
  "/auth/error",
  "/build-id.txt",
  "/sitemap.xml",
  "/robots.txt",
  "/guides/barcode-scanning",
  "/guides/receipt-scanning",
  "/guides/barcode-vs-receipt-vs-manual",
  "/guides/pantry-hub-vs-grocy",
  // PP-104: social card images must load for crawlers and link unfurlers
  "/og-image",
  "/pricing/og-image",
]);

const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/api/webhooks/stripe",
  "/api/webhooks/resend",
  "/api/public/offer",
];

const PROTECTED_PREFIXES = [
  "/dashboard",
  // PP-105: internal style guide is not a public document
  "/design-system",
  "/admin",
  // PP-072: internal component reference, admins only.
  "/design-system",
  "/api/user/",
  "/api/subscription",
  "/api/customer-portal",
  "/api/admin",
  "/api/items",
  "/api/activities",
  "/api/shopping-sessions",
  "/api/receipts",
  "/api/barcode",
  "/api/client-errors",
  "/api/scan-receipt",
  "/api/visual-usage",
];

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isPublicPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (PUBLIC_PATHS.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isProtectedPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getAdminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function applyRegionCookie(res: NextResponse, req: NextRequest): NextResponse {
  if (!req.cookies.has("ph_region")) {
    const country =
      req.headers.get("cf-ipcountry") || req.headers.get("CF-IPCountry");
    const region = getRegionFromCountry(country);
    res.cookies.set("ph_region", region, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
      httpOnly: false,
    });
  }
  return res;
}

export default auth(async (req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    const signIn = new URL("/auth/signin", nextUrl);
    const callback = nextUrl.searchParams.get("redirect_url");
    if (callback) signIn.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(signIn);
  }

  const slashTarget = trailingSlashTarget(pathname);
  if (slashTarget) {
    const target = new URL(nextUrl);
    target.pathname = slashTarget;
    return NextResponse.redirect(target, 301);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-email");

  // PP-172: require a real session user. When Auth.js is misconfigured (for
  // example a missing AUTH_SECRET) `req.auth` can be a truthy non-session
  // value, and `!!req.auth` let anonymous visitors through as "logged in".
  const isLoggedIn = !!req.auth?.user;
  const userEmail = req.auth?.user?.email?.toLowerCase();

  if (isLoggedIn) {
    const token = await createBearerToken(req);
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const normalizedPath = normalizePath(pathname);
  if (
    normalizedPath.startsWith("/admin") ||
    normalizedPath === "/design-system" ||
    normalizedPath.startsWith("/design-system/")
  ) {
    if (!isLoggedIn) {
      const signIn = new URL("/auth/signin", nextUrl);
      signIn.searchParams.set("callbackUrl", pathname);
      return applyRegionCookie(NextResponse.redirect(signIn), req);
    }
    const adminEmails = getAdminEmails();
    const adminUserIds = getAdminUserIds();
    const userId = req.auth?.user?.id?.trim();
    const isEmailAdmin = !!(userEmail && adminEmails.includes(userEmail.trim()));
    const isIdAdmin = !!(userId && adminUserIds.includes(userId));
    if (!isEmailAdmin && !isIdAdmin) {
      return applyRegionCookie(
        NextResponse.redirect(new URL("/dashboard/", nextUrl)),
        req
      );
    }
    return applyRegionCookie(
      NextResponse.next({ request: { headers: requestHeaders } }),
      req
    );
  }

  if (isPublicPath(pathname)) {
    return applyRegionCookie(
      NextResponse.next({ request: { headers: requestHeaders } }),
      req
    );
  }

  if (isProtectedPath(pathname) && !isLoggedIn) {
    const signIn = new URL("/auth/signin", nextUrl);
    signIn.searchParams.set("callbackUrl", pathname);
    return applyRegionCookie(NextResponse.redirect(signIn), req);
  }

  // PP-105: unauthenticated API calls outside the public allowlist keep the
  // old sign-in redirect; unknown *pages* fall through so Next.js returns a
  // real 404 (noindex) instead of a soft-404 sign-in page.
  if (!isLoggedIn && normalizePath(pathname).startsWith("/api")) {
    const signIn = new URL("/auth/signin", nextUrl);
    signIn.searchParams.set("callbackUrl", pathname);
    return applyRegionCookie(NextResponse.redirect(signIn), req);
  }

  return applyRegionCookie(
    NextResponse.next({ request: { headers: requestHeaders } }),
    req
  );
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|build-id\\.txt|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt)).*)",
    "/(api|trpc)(.*)",
  ],
};