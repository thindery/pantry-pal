import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: { query: vi.fn() },
}));

import {
  LOGIN_EVENT_SOURCE,
  UNKNOWN_LOGIN_METHOD,
  buildLoginEventInsert,
  normalizeLoginMethod,
} from "@/lib/login-events-sql";
import { recordLoginEvent } from "@/lib/login-events";

describe("normalizeLoginMethod", () => {
  it("returns the provider name", () => {
    expect(normalizeLoginMethod("google")).toBe("google");
    expect(normalizeLoginMethod("  google  ")).toBe("google");
  });

  it("rejects empty values, emails, and over-long strings", () => {
    expect(normalizeLoginMethod(null)).toBe(UNKNOWN_LOGIN_METHOD);
    expect(normalizeLoginMethod("")).toBe(UNKNOWN_LOGIN_METHOD);
    expect(normalizeLoginMethod("user@example.com")).toBe(UNKNOWN_LOGIN_METHOD);
    expect(normalizeLoginMethod("x".repeat(65))).toBe(UNKNOWN_LOGIN_METHOD);
  });
});

describe("buildLoginEventInsert", () => {
  it("builds a parameterized insert with user_id, method, auth source, and no IP fields", () => {
    const { text, values } = buildLoginEventInsert("user-1", "google", "evt-1");
    expect(text).toBe(
      "INSERT INTO login_events (id, user_id, method, source, created_at) VALUES ($1, $2, $3, $4, NOW())",
    );
    expect(values).toEqual(["evt-1", "user-1", "google", LOGIN_EVENT_SOURCE]);
    expect(text.toLowerCase()).not.toContain("ip");
    expect(values).not.toEqual(expect.arrayContaining([expect.stringMatching(/@/)]));
  });
});

describe("recordLoginEvent", () => {
  it("inserts a row and does not throw when the query fails", async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await expect(
      recordLoginEvent({ userId: "user-1", method: "google" }, query),
    ).resolves.toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain("INSERT INTO login_events");
    expect(values[1]).toBe("user-1");
    expect(values[2]).toBe("google");
    expect(values[3]).toBe("auth");
  });

  it("skips empty user ids and swallows query errors", async () => {
    const query = vi.fn();
    await expect(recordLoginEvent({ userId: "  ", method: "google" }, query)).resolves.toBe(
      false,
    );
    expect(query).not.toHaveBeenCalled();

    const failing = vi.fn().mockRejectedValue(new Error("db down"));
    await expect(
      recordLoginEvent({ userId: "user-1", method: "google" }, failing),
    ).resolves.toBe(false);
  });
});
