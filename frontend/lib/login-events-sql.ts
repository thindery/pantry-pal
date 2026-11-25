/**
 * Pure helpers for writing login_events rows (PP-165).
 * Keep this file free of server-only imports so Vitest can cover it.
 * Never put IPs, emails, tokens, or secrets in the insert values.
 */

export const LOGIN_EVENT_SOURCE = "auth";
export const UNKNOWN_LOGIN_METHOD = "unknown";
const MAX_METHOD_LENGTH = 64;

export function normalizeLoginMethod(method?: string | null): string {
  const trimmed = (method ?? "").trim();
  if (!trimmed) return UNKNOWN_LOGIN_METHOD;
  if (trimmed.includes("@")) return UNKNOWN_LOGIN_METHOD;
  if (trimmed.length > MAX_METHOD_LENGTH) return UNKNOWN_LOGIN_METHOD;
  return trimmed;
}

export function buildLoginEventInsert(
  userId: string,
  method?: string | null,
  id: string = crypto.randomUUID(),
): { text: string; values: [string, string, string, string] } {
  return {
    text:
      "INSERT INTO login_events (id, user_id, method, source, created_at) VALUES ($1, $2, $3, $4, NOW())",
    values: [id, userId, normalizeLoginMethod(method), LOGIN_EVENT_SOURCE],
  };
}
