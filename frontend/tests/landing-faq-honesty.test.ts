import { describe, expect, it } from "vitest";
import { FAQS } from "@/components/LandingPage";

// PP-106: FAQ answers (and their FAQPage JSON-LD) describe shipped behavior only.
describe("landing FAQ honesty", () => {
  it("has no unverifiable or unshipped claims", () => {
    const text = FAQS.map((f) => `${f.question} ${f.answer}`).join(" ");
    for (const banned of [/advanced AI/i, /real-time/i, /never delete/i, /App Store/i, /expir/i, /export your inventory/i, /read-only/i]) {
      expect(text).not.toMatch(banned);
    }
  });
});
