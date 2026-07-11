import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { createBearerToken } from "@/lib/auth-token";

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
  "/design-system",
]);

const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/api/webhooks/stripe",
];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
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

export default auth(async (req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    const signIn = new URL("/auth/signin", nextUrl);
    const callback = nextUrl.searchParams.get("redirect_url");
    if (callback) signIn.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(signIn);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-email");

  const isLoggedIn = !!req.auth;
  const userEmail = req.auth?.user?.email?.toLowerCase();

  if (isLoggedIn) {
    const token = await createBearerToken(req);
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  if (normalizePath(pathname).startsWith("/admin")) {
    if (!isLoggedIn) {
      const signIn = new URL("/auth/signin", nextUrl);
      signIn.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signIn);
    }
    const adminEmails = getAdminEmails();
    if (!userEmail || !adminEmails.includes(userEmail)) {
      return NextResponse.redirect(new URL("/dashboard/", nextUrl));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isProtectedPath(pathname) && !isLoggedIn) {
    const signIn = new URL("/auth/signin", nextUrl);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  if (!isLoggedIn) {
    const signIn = new URL("/auth/signin", nextUrl);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|build-id\\.txt|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt)).*)",
    "/(api|trpc)(.*)",
  ],
};