import { getToken } from "next-auth/jwt";
import { SignJWT } from "jose";
import type { NextRequest } from "next/server";

/** Audience claim for FastAPI bearer tokens (must match backend JWT_AUDIENCE). */
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "pantry-pal";

/**
 * Short-lived API bearer TTL (SEC-202). Middleware re-mints per request;
 * client /api/auth/token is also re-fetched — long-lived tokens only increase
 * impact of token theft via XSS or logs.
 */
export const BEARER_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

async function signBearerJwt(sub: string, email?: string | null): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !sub) return null;

  const key = new TextEncoder().encode(secret);
  return new SignJWT({
    sub,
    email: email ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + BEARER_TOKEN_TTL_SECONDS)
    .sign(key);
}

/** Issue HS256 bearer token for FastAPI (matches backend auth_session.verify_nextauth_token). */
export async function createBearerToken(req: NextRequest): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const token = await getToken({ req, secret });
  if (token?.sub) {
    return signBearerJwt(
      token.sub,
      typeof token.email === "string" ? token.email : undefined,
    );
  }
  return null;
}

/** Fallback when getToken cannot read the session cookie but auth() has a session. */
export async function createBearerTokenFromSession(
  userId: string,
  email?: string | null,
): Promise<string | null> {
  return signBearerJwt(userId, email);
}