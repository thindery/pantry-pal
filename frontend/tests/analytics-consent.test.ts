import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SIGN_UP_TRACKED_KEY,
  clearAnalyticsQueue,
  determineInitialConsent,
  flushAnalyticsQueue,
  getQueuedAnalyticsEvents,
  installGtag,
  isValidMeasurementId,
  trackEvent,
  trackFirstScan,
  trackSignUp,
} from "@/lib/analytics";
import { getRegionFromCountry, isEeaCountry } from "@/lib/region";

// Mock localStorage for test environment (prevents Node 22 experimental warning/error)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("region detection", () => {
  it("identifies EEA, UK, and Swiss countries", () => {
    expect(isEeaCountry("DE")).toBe(true);
    expect(isEeaCountry("fr")).toBe(true);
    expect(isEeaCountry("GB")).toBe(true);
    expect(isEeaCountry("CH")).toBe(true);
    expect(isEeaCountry("IS")).toBe(true);
    expect(isEeaCountry("NO")).toBe(true);
    expect(isEeaCountry("IE")).toBe(true);
  });

  it("identifies non-EEA countries and invalid values", () => {
    expect(isEeaCountry("US")).toBe(false);
    expect(isEeaCountry("CA")).toBe(false);
    expect(isEeaCountry("AU")).toBe(false);
    expect(isEeaCountry("")).toBe(false);
    expect(isEeaCountry(null)).toBe(false);
    expect(isEeaCountry(undefined)).toBe(false);
  });

  it("maps country codes to region string", () => {
    expect(getRegionFromCountry("DE")).toBe("eea");
    expect(getRegionFromCountry("gb")).toBe("eea");
    expect(getRegionFromCountry("US")).toBe("other");
    expect(getRegionFromCountry(null)).toBe("other");
  });
});

describe("measurement ID validation", () => {
  it("accepts valid GA4 measurement IDs", () => {
    expect(isValidMeasurementId("G-LEW78LC3EF")).toBe(true);
    expect(isValidMeasurementId("G-1234567890")).toBe(true);
  });

  it("rejects placeholder and invalid IDs", () => {
    expect(isValidMeasurementId("G-XXXXXXXXXX")).toBe(false);
    expect(isValidMeasurementId("")).toBe(false);
    expect(isValidMeasurementId(null)).toBe(false);
    expect(isValidMeasurementId(undefined)).toBe(false);
    expect(isValidMeasurementId("UA-12345-6")).toBe(false);
  });
});

describe("Consent Mode v2 defaults and rules", () => {
  it("always keeps advertising storage, user data, and personalization denied", () => {
    const scenarios = [
      { isEea: false },
      { isEea: true },
      { isEea: true, storedConsent: "granted" },
      { isEea: false, globalPrivacyControl: true },
    ];

    for (const scenario of scenarios) {
      const { consent } = determineInitialConsent(scenario);
      expect(consent.ad_storage).toBe("denied");
      expect(consent.ad_user_data).toBe("denied");
      expect(consent.ad_personalization).toBe("denied");
    }
  });

  it("defaults non-EEA visitors to granted without banner", () => {
    const result = determineInitialConsent({
      isEea: false,
    });
    expect(result.consent.analytics_storage).toBe("granted");
    expect(result.shouldLoadGa).toBe(true);
    expect(result.needsBanner).toBe(false);
  });

  it("honors Global Privacy Control over non-EEA defaults", () => {
    const result = determineInitialConsent({
      isEea: false,
      globalPrivacyControl: true,
    });
    expect(result.consent.analytics_storage).toBe("denied");
    expect(result.shouldLoadGa).toBe(false);
    expect(result.needsBanner).toBe(false);
  });

  it("honors Global Privacy Control over prior accept in EEA", () => {
    const result = determineInitialConsent({
      isEea: true,
      storedConsent: "granted",
      globalPrivacyControl: true,
    });
    expect(result.consent.analytics_storage).toBe("denied");
    expect(result.shouldLoadGa).toBe(false);
    expect(result.needsBanner).toBe(false);
  });

  it("defaults EEA visitors to denied with banner when no choice stored", () => {
    const result = determineInitialConsent({
      isEea: true,
      storedConsent: null,
    });
    expect(result.consent.analytics_storage).toBe("denied");
    expect(result.shouldLoadGa).toBe(false);
    expect(result.needsBanner).toBe(true);
  });

  it("restores prior granted consent in EEA", () => {
    const result = determineInitialConsent({
      isEea: true,
      storedConsent: "granted",
    });
    expect(result.consent.analytics_storage).toBe("granted");
    expect(result.shouldLoadGa).toBe(true);
    expect(result.needsBanner).toBe(false);
  });

  it("restores prior denied consent in EEA", () => {
    const result = determineInitialConsent({
      isEea: true,
      storedConsent: "denied",
    });
    expect(result.consent.analytics_storage).toBe("denied");
    expect(result.shouldLoadGa).toBe(false);
    expect(result.needsBanner).toBe(false);
  });
});

describe("trackEvent helper and queue", () => {
  beforeEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as { __gaLoaded?: boolean }).__gaLoaded;
    clearAnalyticsQueue();
    localStorageMock.clear();
  });

  it("queues events when GA is not loaded and does not call gtag immediately", () => {
    const gtagMock = vi.fn();
    window.gtag = gtagMock;
    window.__gaLoaded = false;

    trackEvent("sign_up", { method: "Google" });
    expect(gtagMock).not.toHaveBeenCalled();
    expect(getQueuedAnalyticsEvents()).toHaveLength(1);
    expect(getQueuedAnalyticsEvents()[0].name).toBe("sign_up");
  });

  it("dispatches immediately when GA is loaded", () => {
    const gtagMock = vi.fn();
    window.gtag = gtagMock;
    window.__gaLoaded = true;

    trackEvent("sign_up", { method: "Google" });
    expect(gtagMock).toHaveBeenCalledWith("event", "sign_up", { method: "Google" });
    expect(getQueuedAnalyticsEvents()).toHaveLength(0);
  });

  it("flushes queued events when GA finishes loading", () => {
    const gtagMock = vi.fn();
    window.gtag = gtagMock;
    window.__gaLoaded = false;

    trackEvent("purchase", { value: 9.99 });
    trackEvent("sign_up", { method: "Google" });
    expect(gtagMock).not.toHaveBeenCalled();
    expect(getQueuedAnalyticsEvents()).toHaveLength(2);

    // Simulate script load completion
    window.__gaLoaded = true;
    flushAnalyticsQueue();

    expect(gtagMock).toHaveBeenCalledTimes(2);
    expect(gtagMock).toHaveBeenNthCalledWith(1, "event", "purchase", { value: 9.99 });
    expect(gtagMock).toHaveBeenNthCalledWith(2, "event", "sign_up", { method: "Google" });
    expect(getQueuedAnalyticsEvents()).toHaveLength(0);
  });

  it("no-ops safely when window.gtag is not a function", () => {
    window.__gaLoaded = true;
    window.gtag = undefined;

    expect(() => trackEvent("purchase")).not.toThrow();
  });

  it("drops expired events if GA never loads", () => {
    window.__gaLoaded = false;
    const gtagMock = vi.fn();
    window.gtag = gtagMock;

    trackEvent("purchase", { value: 10 });
    const events = getQueuedAnalyticsEvents();
    expect(events).toHaveLength(1);

    // Manually age the event beyond TTL
    (events[0] as { enqueuedAt: number }).enqueuedAt = Date.now() - 6000;

    // Flushing when GA loads after expiry should drop expired items
    window.__gaLoaded = true;
    flushAnalyticsQueue();
    expect(gtagMock).not.toHaveBeenCalled();
  });
});

describe("trackSignUp and trackFirstScan single-dispatch guards", () => {
  beforeEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as { __gaLoaded?: boolean }).__gaLoaded;
    clearAnalyticsQueue();
    localStorageMock.clear();
  });

  it("trackSignUp fires on first call and sets the localStorage flag", () => {
    const gtagMock = vi.fn();
    window.gtag = gtagMock;
    window.__gaLoaded = true;

    const firstResult = trackSignUp("Google");
    expect(firstResult).toBe(true);
    expect(gtagMock).toHaveBeenCalledTimes(1);
    expect(gtagMock).toHaveBeenCalledWith("event", "sign_up", { method: "Google" });
    expect(localStorageMock.getItem(SIGN_UP_TRACKED_KEY)).toBe("true");

    // Subsequent calls must be ignored even on repeated dashboard visits
    const secondResult = trackSignUp("Google");
    expect(secondResult).toBe(false);
    expect(gtagMock).toHaveBeenCalledTimes(1);
  });

  it("trackFirstScan only dispatches once per browser", () => {
    const gtagMock = vi.fn();
    window.gtag = gtagMock;
    window.__gaLoaded = true;

    trackFirstScan("barcode");
    expect(gtagMock).toHaveBeenCalledTimes(1);
    expect(gtagMock).toHaveBeenCalledWith("event", "first_scan", { source: "barcode" });

    // Second call should be ignored by the localStorage guard
    trackFirstScan("receipt");
    expect(gtagMock).toHaveBeenCalledTimes(1);
  });
});

describe("installGtag", () => {
  beforeEach(() => {
    window.dataLayer = [];
    delete window.gtag;
    window.__gaLoaded = false;
  });

  it("pushes an Arguments object so gtag.js will treat commands as commands", () => {
    installGtag();
    expect(typeof window.gtag).toBe("function");

    window.gtag?.("consent", "default", { analytics_storage: "granted" });
    window.gtag?.("js", new Date());
    window.gtag?.("config", "G-LEW78LC3EF");

    expect(window.dataLayer).toHaveLength(3);
    for (const item of window.dataLayer ?? []) {
      const tag = Object.prototype.toString.call(item);
      expect(tag).toBe("[object Arguments]");
    }
    expect((window.dataLayer?.[0] as unknown as unknown[])[0]).toBe("consent");
    expect((window.dataLayer?.[2] as unknown as unknown[])[0]).toBe("config");
  });

  it("does not treat a rest-parameter Array as a gtag command (gtag.js Mb() check)", () => {
    // Documents the production bug: dataLayer.push(["config", id]) is ignored
    // because gtag.js only accepts Arguments objects or .callee.
    const arrayCommand = ["config", "G-LEW78LC3EF"];
    const isArgumentsObject = (value: unknown) =>
      !!value &&
      (Object.prototype.toString.call(value) === "[object Arguments]" ||
        Object.prototype.hasOwnProperty.call(value, "callee"));

    expect(isArgumentsObject(arrayCommand)).toBe(false);

    function officialGtag(..._args: unknown[]) {
      // eslint-disable-next-line prefer-rest-params
      return arguments;
    }
    expect(isArgumentsObject(officialGtag("config", "G-LEW78LC3EF"))).toBe(true);
  });
});
