import { describe, expect, it } from "vitest";
import { normalizeList } from "@/lib/normalize-list";

describe("normalizeList", () => {
  it("returns arrays as-is", () => {
    const arr = [{ id: "1" }];
    expect(normalizeList(arr)).toBe(arr);
  });

  it("unwraps { data: [...] } envelopes", () => {
    const inner = [{ id: "a" }, { id: "b" }];
    expect(normalizeList({ success: true, data: inner })).toEqual(inner);
  });

  it("unwraps { items: [...] } envelopes", () => {
    const inner = [{ id: "x" }];
    expect(normalizeList({ items: inner })).toEqual(inner);
  });

  it("returns [] for non-arrays", () => {
    expect(normalizeList(null)).toEqual([]);
    expect(normalizeList({ success: true })).toEqual([]);
    expect(normalizeList("bad")).toEqual([]);
  });
});