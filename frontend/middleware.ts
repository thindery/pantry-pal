import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/api/user/(.*)",
  "/api/subscription(.*)",
  "/api/customer-portal",
  "/api/admin(.*)",
  "/api/items(.*)",
  "/api/activities(.*)",
  "/api/shopping-sessions(.*)",
  "/api/receipts(.*)",
  "/api/barcode(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/checkout(.*)",
  "/api/webhooks/clerk",
  "/api/webhooks/stripe",
  "/build-id.txt",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn, getToken } = await auth();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-email");

  if (userId) {
    const token = await getToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  if (isProtectedRoute(req) && !userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  if (isPublicRoute(req)) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt)).*)",
    "/(api|trpc)(.*)",
  ],
};