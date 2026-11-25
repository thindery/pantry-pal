import { beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
const getSession = vi.fn();
vi.mock("next-auth/react", () => ({ signOut: (...a: unknown[]) => signOut(...a), getSession: () => getSession() }));

import { signOutCompletely } from "@/lib/sign-out";

describe("signOutCompletely (PP-175)", () => {
  const assign = vi.fn();
  beforeEach(() => {
    signOut.mockReset().mockResolvedValue({ url: "/" });
    getSession.mockReset();
    assign.mockReset();
    Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true });
  });

  it("signs out once and leaves when the session is gone", async () => {
    getSession.mockResolvedValue(null);
    await signOutCompletely("/", { settleMs: 0 });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ redirect: false, redirectTo: "/" });
    expect(assign).toHaveBeenCalledWith("/");
  });

  it("signs out again when a late response restored the session", async () => {
    getSession.mockResolvedValueOnce({ user: { email: "a@example.test" } }).mockResolvedValueOnce(null);
    await signOutCompletely("/", { settleMs: 0 });
    expect(signOut).toHaveBeenCalledTimes(2);
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("gives up after the attempt limit but still leaves the page", async () => {
    getSession.mockResolvedValue({ user: { email: "a@example.test" } });
    await signOutCompletely("/", { attempts: 3, settleMs: 0 });
    expect(signOut).toHaveBeenCalledTimes(3);
    expect(assign).toHaveBeenCalledWith("/");
  });
});
