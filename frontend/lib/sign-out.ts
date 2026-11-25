import { getSession, signOut } from "next-auth/react";

/**
 * PP-175: sign out so it sticks.
 *
 * Auth.js rolls the session cookie on every authenticated response. A request
 * that was already in flight when sign-out cleared the cookie (a token fetch, a
 * route prefetch) can land afterwards and set it again, leaving the user signed
 * in. So sign out without redirecting, let in-flight responses land, confirm
 * the session is gone (sign out again if it came back), then leave the page.
 */
export async function signOutCompletely(
  callbackUrl = "/",
  { attempts = 3, settleMs = 300 }: { attempts?: number; settleMs?: number } = {},
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    await signOut({ redirect: false, redirectTo: callbackUrl });
    await new Promise((resolve) => setTimeout(resolve, settleMs));
    if (!(await getSession())) break;
  }
  window.location.assign(callbackUrl);
}
