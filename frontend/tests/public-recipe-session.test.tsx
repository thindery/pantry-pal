import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Recipe as PublicRecipe } from "@/content/recipes/types";
import { leftoverRiceFriedRice } from "@/content/recipes/leftover-rice-fried-rice";

const useSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => useSession(),
  signOut: vi.fn(),
  getSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/recipes/leftover-rice-fried-rice/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

const getItems = vi.fn();
const getRecipes = vi.fn();
const createRecipe = vi.fn();

vi.mock("@/services/apiService", () => ({
  getItems: (...a: unknown[]) => getItems(...a),
}));

vi.mock("@/services/recipeService", () => ({
  getRecipes: (...a: unknown[]) => getRecipes(...a),
  createRecipe: (...a: unknown[]) => createRecipe(...a),
}));

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { RecipePageShell } from "@/components/recipes-public/RecipePageShell";
import { RecipeSignedInActions } from "@/components/recipes-public/RecipeSignedInActions";
import { RecipeSignupCta } from "@/components/recipes-public/RecipeSignupCtas";


function hrefOf(el: HTMLElement): string {
  return (el.getAttribute("href") ?? "").replace(/\/$/, "");
}

const fixture: PublicRecipe = {
  slug: "test-pantry-pasta",
  title: "Test Pantry Pasta",
  seoTitle: "Test Pantry Pasta",
  metaSummary: "A fixture for coverage tests",
  intro: "A fixture recipe.",
  meal: "dinner",
  tags: [],
  servings: 2,
  prepMin: 5,
  cookMin: 10,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/test-pantry-pasta.webp",
  imageAlt: "AI-generated illustration of pasta, not a photo of this dish",
  ingredients: [
    { qty: 8, unit: "oz", item: "spaghetti" },
    { qty: 2, item: "garlic clove", plural: "garlic cloves" },
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: null, item: "salt" },
  ],
  steps: ["Boil the pasta.", "Toss with oil and garlic."],
  substitutions: ["Use any long pasta.", "Use butter instead of oil."],
  tips: ["Salt the water.", "Reserve a splash of pasta water."],
  pantryStaples: ["spaghetti", "garlic", "olive oil"],
  related: ["canned-tuna-pasta", "pasta-e-fagioli", "leftover-rice-fried-rice"],
};

const signedIn = {
  status: "authenticated" as const,
  data: { user: { name: "Tylor", email: "tylor@example.com" } },
};
const signedOut = { status: "unauthenticated" as const, data: null };
const pending = { status: "loading" as const, data: null };

describe("public recipe session chrome (PP-200)", () => {
  beforeEach(() => {
    cleanup();
    useSession.mockReturnValue(signedOut);
    getItems.mockReset();
    getRecipes.mockReset();
    createRecipe.mockReset();
  });

  it("shows Sign in and Get started when signed out", () => {
    render(<MarketingNav />);
    expect(hrefOf(screen.getByRole("link", { name: "Sign in" }))).toBe("/auth/signin");
    expect(hrefOf(screen.getByRole("link", { name: "Get started" }))).toBe("/auth/signin");
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  it("renders a neutral placeholder while the session is loading", () => {
    useSession.mockReturnValue(pending);
    render(<MarketingNav />);
    expect(screen.getByTestId("marketing-nav-session-pending")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Get started" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  it("shows Dashboard and the account menu instead of Sign in when signed in", () => {
    useSession.mockReturnValue(signedIn);
    render(<MarketingNav />);
    expect(hrefOf(screen.getByRole("link", { name: "Dashboard" }))).toBe("/dashboard");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Get started" })).toBeNull();
    expect(hrefOf(screen.getByRole("link", { name: /Tylor/ }))).toBe("/dashboard/account");
  });

  it("uses the dashboard nav and a Back to my recipes link for signed-in recipe pages", () => {
    useSession.mockReturnValue(signedIn);
    render(
      <RecipePageShell>
        <p>Recipe body</p>
      </RecipePageShell>,
    );
    expect(hrefOf(screen.getByRole("link", { name: "Back to my recipes" }))).toBe("/dashboard/recipes");
    expect(screen.getByTestId("recipe-back-to-mine")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Recipes" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Get started" })).toBeNull();
  });

  it("keeps the marketing header on recipe pages when signed out", () => {
    render(
      <RecipePageShell>
        <p>Recipe body</p>
      </RecipePageShell>,
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back to my recipes" })).toBeNull();
  });

  it("hides signup CTAs for signed-in visitors", () => {
    useSession.mockReturnValue(signedIn);
    render(<RecipeSignupCta placement="end" recipeSlug="leftover-rice-fried-rice" />);
    expect(screen.queryByTestId("recipe-signup-cta-end")).toBeNull();
  });

  it("does not render pantry match or save for signed-out visitors", () => {
    render(<RecipeSignedInActions recipe={leftoverRiceFriedRice} />);
    expect(screen.queryByTestId("recipe-signed-in-actions")).toBeNull();
    expect(getItems).not.toHaveBeenCalled();
  });

  it("shows pantry match and saves the public recipe for a signed-in visitor", async () => {
    useSession.mockReturnValue(signedIn);
    getItems.mockResolvedValue([
      { id: "1", name: "spaghetti", quantity: 1, unit: "box", category: "other", lastUpdated: "2026-11-26T00:00:00Z" },
      { id: "2", name: "garlic cloves", quantity: 4, unit: "ea", category: "other", lastUpdated: "2026-11-26T00:00:00Z" },
    ]);
    getRecipes.mockResolvedValue([]);
    createRecipe.mockResolvedValue({ id: "saved-1", title: fixture.title });

    render(<RecipeSignedInActions recipe={fixture} />);

    expect(await screen.findByTestId("recipe-pantry-match")).toHaveTextContent("You have 4 of 4 ingredients");
    fireEvent.click(screen.getByRole("button", { name: "Save to my recipes" }));
    await waitFor(() => {
      expect(createRecipe).toHaveBeenCalledTimes(1);
    });
    const payload = createRecipe.mock.calls[0][0];
    expect(payload.title).toBe("Test Pantry Pasta");
    expect(payload.sourceUrl).toBe("https://www.mypantryhub.com/recipes/test-pantry-pasta/");
    expect(payload.instructions).toEqual(fixture.steps);
    expect(hrefOf(await screen.findByRole("link", { name: "Open in my recipes" }))).toBe(
      "/dashboard/recipes/saved-1",
    );
  });

  it("shows Open in my recipes when the library recipe is already saved", async () => {
    useSession.mockReturnValue(signedIn);
    getItems.mockResolvedValue([]);
    getRecipes.mockResolvedValue([
      {
        id: "existing",
        title: leftoverRiceFriedRice.title,
        sourceUrl: "https://www.mypantryhub.com/recipes/leftover-rice-fried-rice/",
      },
    ]);

    render(<RecipeSignedInActions recipe={leftoverRiceFriedRice} />);

    expect(hrefOf(await screen.findByRole("link", { name: "Open in my recipes" }))).toBe(
      "/dashboard/recipes/existing",
    );
    expect(screen.queryByRole("button", { name: "Save to my recipes" })).toBeNull();
  });
});
