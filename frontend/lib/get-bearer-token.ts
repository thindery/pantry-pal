/** Fetch HS256 bearer token for backend API calls (session cookie required). */

const EXPIRY_SKEW_MS = 30_000;
const FALLBACK_TTL_MS = 50 * 60 * 1000;

let cached: { token: string; expiresAt: number } | null = null;

function readJwtExpiryMs(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function clearCachedBearerToken(): void {
  cached = null;
}

/** In-memory cache so quantity taps do not wait on a fresh /api/auth/token each time. */
export async function getBearerToken(): Promise<string | null> {
  if (cached && Date.now() < cached.expiresAt - EXPIRY_SKEW_MS) {
    return cached.token;
  }

  try {
    const res = await fetch("/api/auth/token", { credentials: "include" });
    if (!res.ok) {
      cached = null;
      return null;
    }
    const data = (await res.json()) as { token?: string };
    const token = data.token ?? null;
    if (!token) {
      cached = null;
      return null;
    }
    cached = {
      token,
      expiresAt: readJwtExpiryMs(token) ?? Date.now() + FALLBACK_TTL_MS,
    };
    return token;
  } catch {
    return null;
  }
}
