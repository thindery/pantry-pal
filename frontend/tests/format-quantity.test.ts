import { describe, expect, it } from "vitest";
import { formatQuantity } from "@/lib/format-quantity";

describe("formatQuantity", () => {
  it("singularizes the default units label", () => {
    expect(formatQuantity(1, "units")).toBe("1 unit");
    expect(formatQuantity(2, "units")).toBe("2 units");
    expect(formatQuantity(0, "units")).toBe("0 units");
  });

  it("leaves other units readable", () => {
    expect(formatQuantity(1, "cups")).toBe("1 cup");
    expect(formatQuantity(2, "cups")).toBe("2 cups");
    expect(formatQuantity(1, "lbs")).toBe("1 lbs");
  });
});
