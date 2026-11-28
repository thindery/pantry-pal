import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { leftoverRiceFriedRice } from "@/content/recipes/leftover-rice-fried-rice";

const session = { status: "unauthenticated" as "unauthenticated" | "authenticated" | "loading" };
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: session.status, data: null }),
}));

const trackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }));

const getItems = vi.fn();
const getRecipes = vi.fn();
const createRecipe = vi.fn();
vi.mock("@/services/apiService", () => ({ getItems: () => getItems() }));
vi.mock("@/services/recipeService", () => ({
  getRecipes: () => getRecipes(),
  createRecipe: (...a: unknown[]) => createRecipe(...a),
}));

import { RecipeSignedInActions } from "@/components/recipes-public/RecipeSignedInActions";
import { RecipeSignupCta } from "@/components/recipes-public/RecipeSignupCtas";
import {
  FirstRunChecklist,
  ONBOARDING_DISMISSED_KEY,
  ONBOARDING_LIST_SEEN_KEY,
} from "@/components/dashboard/FirstRunChecklist";
import { recipeSaveSignInHref, signInHrefReturningTo } from "@/lib/recipe-save-signin";
import { safeCallbackUrl } from "@/lib/safe-redirect";

const recipe = leftoverRiceFriedRice;

// jsdom here has no usable localStorage; install a small in-memory one.
const store = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.clearAllMocks();
  getItems.mockResolvedValue([]);
  getRecipes.mockResolvedValue([]);
  createRecipe.mockResolvedValue({ id: "saved-1" });
});
afterEach(() => {
  cleanup();
  session.status = "unauthenticated";
});

describe("PP-245 save a recipe across sign-in", () => {
  it("builds same-origin callbacks the sign-in form accepts", () => {
    const href = recipeSaveSignInHref(recipe.slug);
    const cb = new URL(href, "https://x.test").searchParams.get("callbackUrl");
    expect(cb).toBe(`/recipes/${recipe.slug}/?save=1`);
    expect(safeCallbackUrl(cb)).toBe(cb);
    expect(safeCallbackUrl(new URL(signInHrefReturningTo("/pricing/"), "https://x.test").searchParams.get("callbackUrl"))).toBe("/pricing/");
  });

  it("signed-out visitors get Save this recipe pointing at sign-in with ?save=1", () => {
    render(<RecipeSignedInActions recipe={recipe} />);
    const link = screen.getByTestId("recipe-save-signin");
    expect(link.getAttribute("href")).toBe(recipeSaveSignInHref(recipe.slug));
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledWith("recipe_save_signup", { recipe_slug: recipe.slug });
  });

  it("renders nothing while the session is loading (no flash)", () => {
    session.status = "loading";
    const { container } = render(<RecipeSignedInActions recipe={recipe} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("after sign-in, ?save=1 saves once and is removed from the URL", async () => {
    session.status = "authenticated";
    window.history.replaceState(null, "", `/recipes/${recipe.slug}/?save=1`);
    render(<RecipeSignedInActions recipe={recipe} />);
    await waitFor(() => expect(createRecipe).toHaveBeenCalledTimes(1));
    expect(window.location.search).toBe("");
    await waitFor(() => expect(screen.getByTestId("recipe-open-saved")).toBeInTheDocument());
  });

  it("does not save twice when the recipe is already saved", async () => {
    session.status = "authenticated";
    getRecipes.mockResolvedValue([{ id: "old", sourceUrl: `https://www.mypantryhub.com/recipes/${recipe.slug}/` }]);
    window.history.replaceState(null, "", `/recipes/${recipe.slug}/?save=1`);
    render(<RecipeSignedInActions recipe={recipe} />);
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("recipe signup CTAs return to the recipe after sign-in", () => {
    render(<RecipeSignupCta placement="end" recipeSlug={recipe.slug} />);
    // next/link drops a trailing slash in jsdom only; compare the decoded callback.
    const href = screen.getByRole("link", { name: "Create a free account" }).getAttribute("href") ?? "";
    expect(new URL(href, "https://x.test").searchParams.get("callbackUrl")).toBe(`/recipes/${recipe.slug}/`);
    expect(signInHrefReturningTo(`/recipes/${recipe.slug}/`)).toContain(encodeURIComponent(`/recipes/${recipe.slug}/`));
  });
});

describe("PP-246 first-run checklist", () => {
  it("leads a new user to the first scan", async () => {
    const onScanReceipt = vi.fn();
    render(<FirstRunChecklist itemCount={0} onScanReceipt={onScanReceipt} />);
    expect(await screen.findByTestId("first-run-checklist")).toHaveTextContent("Scan your first item");
    expect(screen.getByRole("link", { name: /Scan a barcode/ }).getAttribute("href")?.replace(/\/$/, "")).toBe("/dashboard/scan-barcode");
    fireEvent.click(screen.getByRole("button", { name: /Scan a receipt/ }));
    expect(onScanReceipt).toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith("onboarding_view", { done: 0, items: 0 });
  });

  it("moves to the shopping list once 5 items are in", async () => {
    render(<FirstRunChecklist itemCount={5} onScanReceipt={vi.fn()} />);
    const link = await screen.findByRole("link", { name: /Open my shopping list/ });
    fireEvent.click(link);
    expect(window.localStorage.getItem(ONBOARDING_LIST_SEEN_KEY)).toBe("1");
  });

  it("stays hidden once dismissed, done, or for an established pantry", async () => {
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    const a = render(<FirstRunChecklist itemCount={0} onScanReceipt={vi.fn()} />);
    await waitFor(() => expect(a.container).toBeEmptyDOMElement());
    a.unmount();
    window.localStorage.clear();
    const b = render(<FirstRunChecklist itemCount={50} onScanReceipt={vi.fn()} />);
    await waitFor(() => expect(b.container).toBeEmptyDOMElement());
  });

  it("dismiss hides it and remembers", async () => {
    render(<FirstRunChecklist itemCount={1} onScanReceipt={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss getting started" }));
    expect(screen.queryByTestId("first-run-checklist")).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBe("1");
  });
});
