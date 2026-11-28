/**
 * Analytics and Google Consent Mode v2 utilities for Pantry Hub.
 */

export const GA_MEASUREMENT_ID = (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-LEW78LC3EF"
).trim();

export const CF_BEACON_TOKEN = (
  process.env.NEXT_PUBLIC_CF_BEACON_TOKEN || "a1ab471f80614de994b2058dd378aa26"
).trim();

export const SIGN_UP_TRACKED_KEY = "ph_sign_up_tracked";
export const FIRST_SCAN_TRACKED_KEY = "ph_first_scan_tracked";
export const CHECKOUT_SESSION_STORAGE_KEY = "ph_checkout_session_id";
export const PURCHASE_TRACKED_PREFIX = "ph_purchase_tracked:";
export const DEFAULT_PURCHASE_CURRENCY = "USD";

export function isValidMeasurementId(id?: string | null): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return (
    trimmed.startsWith("G-") &&
    trimmed !== "G-XXXXXXXXXX" &&
    trimmed.length > 4
  );
}

/**
 * Local / loopback hosts must never send hits to the production GA4 property.
 * Production Docker does not pass NEXT_PUBLIC_GA_MEASUREMENT_ID, so the
 * G-LEW78LC3EF fallback stays for www.mypantryhub.com; this guard is the
 * safe minimum (PP-253).
 */
export function isLocalAnalyticsHost(hostname?: string | null): boolean {
  if (!hostname) return false;
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function isCurrentHostLocalAnalytics(): boolean {
  if (typeof window === "undefined") return false;
  return isLocalAnalyticsHost(window.location.hostname);
}

export type ConsentStatus = "granted" | "denied";

export interface GtagConsentParams {
  ad_storage: "denied";
  ad_user_data: "denied";
  ad_personalization: "denied";
  analytics_storage: ConsentStatus;
}

export interface ConsentDecision {
  consent: GtagConsentParams;
  shouldLoadGa: boolean;
  needsBanner: boolean;
}

/**
 * Determines initial consent based on GPC, visitor region, and prior choice.
 * - Ad storage, user data, and personalization are ALWAYS denied everywhere.
 * - Global Privacy Control (GPC) immediately denies analytics and prevents loading GA.
 * - Non-EEA visitors default to analytics_storage: 'granted' without a banner.
 * - EEA/UK/CH visitors default to analytics_storage: 'denied' and require explicit consent.
 */
export function determineInitialConsent({
  isEea,
  storedConsent,
  globalPrivacyControl,
}: {
  isEea: boolean;
  storedConsent?: string | null;
  globalPrivacyControl?: boolean;
}): ConsentDecision {
  // GPC wins over any prior choice: analytics denied, do not load GA, no banner
  if (globalPrivacyControl) {
    return {
      consent: {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
      },
      shouldLoadGa: false,
      needsBanner: false,
    };
  }

  // EEA / UK / CH: default denied until user explicitly accepts
  if (isEea) {
    if (storedConsent === "granted") {
      return {
        consent: {
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          analytics_storage: "granted",
        },
        shouldLoadGa: true,
        needsBanner: false,
      };
    }

    if (storedConsent === "denied") {
      return {
        consent: {
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          analytics_storage: "denied",
        },
        shouldLoadGa: false,
        needsBanner: false,
      };
    }

    // No choice yet: default denied, show banner
    return {
      consent: {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
      },
      shouldLoadGa: false,
      needsBanner: true,
    };
  }

  // Non-EEA: analytics granted by default, no banner
  return {
    consent: {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
    },
    shouldLoadGa: true,
    needsBanner: false,
  };
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __gaLoaded?: boolean;
  }
}

/**
 * Install the official gtag() stub that queues commands until gtag.js loads.
 *
 * gtag.js only treats Arguments objects as commands (it checks
 * [object Arguments] or .callee). Pushing a rest-parameter Array is
 * silently ignored, so `config` / `event` never run and no collect
 * request is sent.
 */
export function installGtag(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments as unknown as never);
  };
}

export interface QueuedAnalyticsEvent {
  name: string;
  params?: Record<string, unknown>;
  enqueuedAt: number;
}

const eventQueue: QueuedAnalyticsEvent[] = [];
const QUEUE_TTL_MS = 5000;
let queueCheckInterval: ReturnType<typeof setInterval> | null = null;

function stopQueueCheck(): void {
  if (queueCheckInterval !== null) {
    clearInterval(queueCheckInterval);
    queueCheckInterval = null;
  }
}

function startQueueCheck(): void {
  if (queueCheckInterval !== null || typeof window === "undefined") return;
  queueCheckInterval = setInterval(() => {
    if (typeof window === "undefined") {
      stopQueueCheck();
      return;
    }

    if (window.__gaLoaded && typeof window.gtag === "function") {
      flushAnalyticsQueue();
      return;
    }

    // Drop expired events if GA hasn't loaded
    const now = Date.now();
    while (eventQueue.length > 0 && now - eventQueue[0].enqueuedAt > QUEUE_TTL_MS) {
      eventQueue.shift();
    }

    if (eventQueue.length === 0) {
      stopQueueCheck();
    }
  }, 100);
}

/**
 * Flushes all pending queued events to Google Analytics if loaded.
 */
export function flushAnalyticsQueue(): void {
  if (typeof window === "undefined") return;
  if (isCurrentHostLocalAnalytics()) return;
  if (!window.__gaLoaded || typeof window.gtag !== "function") return;

  const now = Date.now();
  while (eventQueue.length > 0) {
    const item = eventQueue.shift();
    if (item && now - item.enqueuedAt <= QUEUE_TTL_MS) {
      try {
        window.gtag("event", item.name, item.params);
      } catch {
        // Ignore runtime tracking errors
      }
    }
  }
  stopQueueCheck();
}

/**
 * Resets the in-memory queue (useful for test isolation).
 */
export function clearAnalyticsQueue(): void {
  eventQueue.length = 0;
  stopQueueCheck();
}

/**
 * Inspect the current queue length/items (useful for unit tests).
 */
export function getQueuedAnalyticsEvents(): readonly QueuedAnalyticsEvent[] {
  return [...eventQueue];
}

/**
 * Dispatches a custom GA4 event if GA is loaded and active.
 * If GA is not yet loaded, queues the event for a short time and flushes
 * when __gaLoaded becomes true. No-ops if GA never loads (GPC, declined, invalid ID).
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (isCurrentHostLocalAnalytics()) return;

  if (window.__gaLoaded && typeof window.gtag === "function") {
    try {
      window.gtag("event", name, params);
    } catch {
      // Ignore runtime tracking errors
    }
    return;
  }

  // Queue event to wait for GA script to finish loading
  eventQueue.push({ name, params, enqueuedAt: Date.now() });
  startQueueCheck();
}

/**
 * Fires the `sign_up` key event at most once per browser.
 * Returns true if the event was dispatched or queued, false if already tracked.
 */
export function trackSignUp(method: string = "Google"): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(SIGN_UP_TRACKED_KEY)) return false;
    localStorage.setItem(SIGN_UP_TRACKED_KEY, "true");
    trackEvent("sign_up", { method });
    return true;
  } catch {
    trackEvent("sign_up", { method });
    return true;
  }
}

/**
 * Fires the `first_scan` key event exactly once per browser/user.
 */
export function trackFirstScan(source: "barcode" | "receipt"): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(FIRST_SCAN_TRACKED_KEY)) return;
    localStorage.setItem(FIRST_SCAN_TRACKED_KEY, "true");
    trackEvent("first_scan", { source });
  } catch {
    trackEvent("first_scan", { source });
  }
}

function isUsableCheckoutId(value?: string | null): value is string {
  const trimmed = (value ?? "").trim();
  return Boolean(trimmed) && !trimmed.includes("{");
}

/**
 * Stash the Stripe Checkout Session id so the success page can use it as
 * purchase.transaction_id if the success URL is missing session_id.
 */
export function stashCheckoutSessionId(sessionId?: string | null): void {
  if (typeof window === "undefined" || !isUsableCheckoutId(sessionId)) return;
  try {
    sessionStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, sessionId.trim());
  } catch {
    // Ignore sessionStorage errors (private mode, etc.)
  }
}

/**
 * Prefer ?session_id= on the success URL (Stripe substitutes
 * {CHECKOUT_SESSION_ID}), then the stashed session id.
 */
export function getCheckoutTransactionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("session_id");
    if (isUsableCheckoutId(fromUrl)) return fromUrl.trim();
    const stored = sessionStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
    if (isUsableCheckoutId(stored)) return stored.trim();
    return null;
  } catch {
    return null;
  }
}

/**
 * Fires the `purchase` key event with currency, transaction_id, and the amount
 * Stripe actually charged (`value`, in major units). When the amount is unknown,
 * `value` is omitted rather than guessed, so the $1 offer, yearly, and Family
 * purchases are never reported as the $4.99 Pro list price (PP-166).
 * Deduped per Stripe session id in sessionStorage so a refresh does not double-fire.
 * Returns true if the event was dispatched or queued, false if already tracked.
 */
export function trackPurchase(options?: {
  transaction_id?: string | null;
  value?: number;
  currency?: string;
}): boolean {
  if (typeof window === "undefined") return false;

  const transactionId = isUsableCheckoutId(options?.transaction_id)
    ? options!.transaction_id!.trim()
    : getCheckoutTransactionId();
  const params: Record<string, unknown> = {
    currency: options?.currency ?? DEFAULT_PURCHASE_CURRENCY,
  };
  if (typeof options?.value === "number" && Number.isFinite(options.value) && options.value >= 0) {
    params.value = options.value;
  }
  if (transactionId) {
    params.transaction_id = transactionId;
  }

  const dedupeKey = `${PURCHASE_TRACKED_PREFIX}${transactionId ?? "unknown"}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return false;
    sessionStorage.setItem(dedupeKey, "true");
    trackEvent("purchase", params);
    return true;
  } catch {
    trackEvent("purchase", params);
    return true;
  }
}
