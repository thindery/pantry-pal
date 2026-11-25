import { describe, expect, it } from "vitest";
import { canonicalPath, createPageMetadata, fullTitle } from "@/lib/site-metadata";

describe("site metadata (PP-103)", () => {
  it("uses the trailing-slash canonical for each page", () => {
    expect(canonicalPath("/")).toBe("/");
    expect(canonicalPath("/pricing")).toBe("/pricing/");
    expect(canonicalPath("/pricing/")).toBe("/pricing/");
    const meta = createPageMetadata({ title: "Simple Pricing - Start Free", path: "/pricing/" });
    expect(meta.alternates?.canonical).toBe("/pricing/");
    expect(meta.openGraph?.url).toBe("https://www.mypantryhub.com/pricing/");
  });

  it("never doubles the brand", () => {
    expect(fullTitle("Sign In")).toBe("Sign In | Pantry Hub");
    expect(fullTitle("Pantry Hub: Smart Inventory")).toBe("Pantry Hub: Smart Inventory");
    const home = createPageMetadata({ title: "Pantry Hub: Smart Inventory & Shopping Lists", path: "/" });
    expect(home.title).toEqual({ absolute: "Pantry Hub: Smart Inventory & Shopping Lists" });
    const pricing = createPageMetadata({ title: "Simple Pricing - Start Free" });
    expect(pricing.title).toBe("Simple Pricing - Start Free");
    expect(pricing.openGraph?.title).toBe("Simple Pricing - Start Free | Pantry Hub");
  });

  it("marks non-landing pages noindex, nofollow", () => {
    const meta = createPageMetadata({ title: "Sign In", path: "/auth/signin/", noindex: true });
    expect(meta.robots).toMatchObject({ index: false, follow: false });
    expect(createPageMetadata({ title: "Terms" }).robots).toBeUndefined();
  });
});
