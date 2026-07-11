import { getToken } from "next-auth/jwt";
import { SignJWT } from "jose";
import type { NextRequest } from "next/server";

/** Issue HS256 bearer token for FastAPI (matches backend auth_session.verify_nextauth_token). */
export async function createBearerToken(req: NextRequest): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const token = await getToken({ req, secret });
  if (!token?.sub) return null;

  const key = new TextEncoder().encode(secret);
  return new SignJWT({
    sub: token.sub,
    email: typeof token.email === "string" ? token.email : undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60)
    .sign(key);
}