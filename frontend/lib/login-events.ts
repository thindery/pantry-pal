/**
 * Persist a login_events row on each successful sign-in (PP-165).
 * Server-only — import from NextAuth events in auth.ts, never from client components.
 */
import "server-only";

import pool from "@/lib/db";
import { buildLoginEventInsert } from "@/lib/login-events-sql";

export type LoginEventQuery = (
  text: string,
  values: readonly unknown[],
) => Promise<unknown>;

/**
 * Insert one login_events row. Returns false if skipped or if the write failed.
 * A failure must never block sign-in.
 */
export async function recordLoginEvent(
  input: { userId?: string | null; method?: string | null },
  query: LoginEventQuery = (text, values) => pool.query(text, values as unknown[]),
): Promise<boolean> {
  const userId = (input.userId ?? "").trim();
  if (!userId) return false;

  const { text, values } = buildLoginEventInsert(userId, input.method);
  try {
    await query(text, values);
    return true;
  } catch {
    console.error("[Auth] Failed to record login_event");
    return false;
  }
}
