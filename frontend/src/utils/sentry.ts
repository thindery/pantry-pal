import * as Sentry from "@sentry/browser";

let initialized = false;

export function initSentry(): void {
  if (initialized || typeof window === "undefined") return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || process.env.NODE_ENV === "development") {
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: parseFloat(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1"
    ),
    replaysSessionSampleRate: parseFloat(
      process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE ?? "0.01"
    ),
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? "production",
    release: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
  });

  initialized = true;
}