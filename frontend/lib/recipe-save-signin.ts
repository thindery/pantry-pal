/** PP-245: signed-out "Save this recipe" goes to sign-in and comes back to save. */
export const SAVE_AFTER_SIGNIN_PARAM = "save";

/**
 * Sign-in URL whose callback returns to the recipe with ?save=1. The callback is a
 * same-origin path because SignInForm's safeCallbackUrl only accepts "/..." paths.
 */
export function recipeSaveSignInHref(slug: string): string {
  const callback = `/recipes/${encodeURIComponent(slug)}/?${SAVE_AFTER_SIGNIN_PARAM}=1`;
  return `/auth/signin/?callbackUrl=${encodeURIComponent(callback)}`;
}

/** Sign-in URL that returns to a same-origin path afterward. */
export function signInHrefReturningTo(path: string): string {
  return `/auth/signin/?callbackUrl=${encodeURIComponent(path)}`;
}
