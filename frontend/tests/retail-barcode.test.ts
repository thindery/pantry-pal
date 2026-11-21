import { describe, expect, it } from "vitest";
import {
  acceptCameraCandidate,
  expandUpcE,
  gtinCheckDigit,
  normalizeRetailBarcode,
} from "@/lib/retail-barcode";

describe("gtinCheckDigit", () => {
  it("computes known UPC-A / EAN check digits", () => {
    expect(gtinCheckDigit("01234567890")).toBe("5");
    expect(gtinCheckDigit("590123412345")).toBe("7");
    expect(gtinCheckDigit("9638507")).toBe("4");
  });
});

describe("normalizeRetailBarcode", () => {
  it("accepts valid UPC-A, EAN-13, EAN-8, and UPC-E", () => {
    expect(normalizeRetailBarcode("012345678905")).toBe("012345678905");
    expect(normalizeRetailBarcode("5901234123457")).toBe("5901234123457");
    expect(normalizeRetailBarcode("96385074")).toBe("96385074");
    expect(normalizeRetailBarcode("01234565")).toBe("01234565");
  });

  it("strips non-digits before validating", () => {
    expect(normalizeRetailBarcode("01234-56789-05")).toBe("012345678905");
  });

  it("rejects partial, short, and bad-checksum values", () => {
    expect(normalizeRetailBarcode("0123456789")).toBeNull();
    expect(normalizeRetailBarcode("01234567890")).toBeNull();
    expect(normalizeRetailBarcode("1234567")).toBeNull();
    expect(normalizeRetailBarcode("012345678906")).toBeNull();
    expect(normalizeRetailBarcode("")).toBeNull();
  });
});

describe("expandUpcE", () => {
  it("expands a valid UPC-E to UPC-A", () => {
    expect(expandUpcE("01234565")).toBe("012345000065");
  });

  it("rejects a UPC-E with a bad check digit", () => {
    expect(expandUpcE("01234566")).toBeNull();
  });
});

describe("acceptCameraCandidate", () => {
  it("requires the same valid code on two consecutive reads", () => {
    const first = acceptCameraCandidate(null, "012345678905");
    expect(first).toEqual({ pending: "012345678905", accepted: null });
    const second = acceptCameraCandidate(first.pending, "012345678905");
    expect(second).toEqual({ pending: null, accepted: "012345678905" });
  });

  it("ignores partial or invalid reads without resetting a pending code", () => {
    const pending = acceptCameraCandidate(null, "012345678905").pending;
    const afterJunk = acceptCameraCandidate(pending, "0123456789");
    expect(afterJunk).toEqual({ pending: "012345678905", accepted: null });
    const afterBad = acceptCameraCandidate(afterJunk.pending, "012345678906");
    expect(afterBad).toEqual({ pending: "012345678905", accepted: null });
  });

  it("resets the streak when a different valid code appears", () => {
    const pending = acceptCameraCandidate(null, "012345678905").pending;
    const switched = acceptCameraCandidate(pending, "5901234123457");
    expect(switched).toEqual({ pending: "5901234123457", accepted: null });
    expect(acceptCameraCandidate(switched.pending, "5901234123457")).toEqual({
      pending: null,
      accepted: "5901234123457",
    });
  });
});
