"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import {
  CF_BEACON_TOKEN,
  GA_MEASUREMENT_ID,
  determineInitialConsent,
  flushAnalyticsQueue,
  isValidMeasurementId,
} from "@/lib/analytics";

function getClientRegion(): "eea" | "other" {
  if (typeof document === "undefined") return "other";
  const match = document.cookie.match(/(?:^|;\s*)ph_region=([^;]*)/);
  if (match && match[1] === "eea") return "eea";
  return "other";
}

export function AnalyticsScripts() {
  const [showBanner, setShowBanner] = useState(false);
  const [loadGaScript, setLoadGaScript] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize dataLayer and window.gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    }
    window.gtag = gtag;

    const gpc = Boolean(
      (navigator as unknown as { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    );
    const isEea = getClientRegion() === "eea";
    const storedConsent = localStorage.getItem("ph_analytics_consent");

    const decision = determineInitialConsent({
      isEea,
      storedConsent,
      globalPrivacyControl: gpc,
    });

    // Call consent default before any config or gtag.js execution
    gtag("consent", "default", decision.consent);

    if (decision.needsBanner) {
      setShowBanner(true);
    }

    if (decision.shouldLoadGa && isValidMeasurementId(GA_MEASUREMENT_ID)) {
      setLoadGaScript(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("ph_analytics_consent", "granted");
    } catch {
      // Ignore localStorage errors
    }
    setShowBanner(false);

    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }

    if (isValidMeasurementId(GA_MEASUREMENT_ID)) {
      setLoadGaScript(true);
    }
  };

  const handleDecline = () => {
    try {
      localStorage.setItem("ph_analytics_consent", "denied");
    } catch {
      // Ignore localStorage errors
    }
    setShowBanner(false);

    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
      });
    }
  };

  const onGtagLoaded = () => {
    if (typeof window.gtag === "function" && isValidMeasurementId(GA_MEASUREMENT_ID)) {
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      window.__gaLoaded = true;
      flushAnalyticsQueue();
    }
  };

  return (
    <>
      {/* Cloudflare Web Analytics beacon (cookieless, always loaded) */}
      {CF_BEACON_TOKEN && (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}
          strategy="afterInteractive"
        />
      )}

      {/* GA4 Script (loaded only when valid ID & consent granted) */}
      {loadGaScript && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
          onLoad={onGtagLoaded}
        />
      )}

      {/* EEA/UK/CH Consent Banner */}
      {showBanner && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-0 inset-x-0 z-50 p-4 bg-slate-900/95 text-slate-100 border-t border-slate-800 backdrop-blur-sm shadow-2xl animate-fade-in"
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              We use privacy-friendly analytics (with IP anonymization and ad tracking disabled)
              to improve Pantry Hub. You can accept or decline analytics cookies.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDecline}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                Accept
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
