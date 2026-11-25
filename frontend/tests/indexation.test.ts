import { describe, expect, it } from "vitest";
import { trailingSlashTarget } from "@/lib/trailing-slash";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("PP-105 indexation hygiene", () => {
  it("301s page paths to the trailing-slash canonical only", () => {
    expect(trailingSlashTarget("/pricing")).toBe("/pricing/");
    expect(trailingSlashTarget("/auth/signin")).toBe("/auth/signin/");
    expect(trailingSlashTarget("/pricing/")).toBeNull();
    expect(trailingSlashTarget("/")).toBeNull();
    expect(trailingSlashTarget("/api/items")).toBeNull();
    expect(trailingSlashTarget("/sitemap.xml")).toBeNull();
    expect(trailingSlashTarget("/og-image")).toBeNull();
    expect(trailingSlashTarget("/pricing/og-image")).toBeNull();
  });

  it("sitemap lists only indexable pages with stable lastmod and canonical locs", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toEqual([
      "https://www.mypantryhub.com/",
      "https://www.mypantryhub.com/pricing/",
      "https://www.mypantryhub.com/privacy/",
      "https://www.mypantryhub.com/terms/",
    ]);
    expect(urls.some((u) => u.includes("/auth/"))).toBe(false);
    for (const e of entries) {
      expect(String(e.lastModified)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(sitemap()[0].lastModified).toBe(entries[0].lastModified);
  });

  it("robots disallows non-landing surfaces", () => {
    const rules = robots().rules;
    const disallow = (Array.isArray(rules) ? rules[0] : rules).disallow;
    for (const p of ["/dashboard/", "/admin/", "/api/", "/auth/", "/checkout/", "/design-system/"]) {
      expect(disallow).toContain(p);
    }
  });
});
