"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import {
  dismissBuildUpdate,
  fetchLiveBuildId,
  isNewerBuildAvailable,
} from "@/lib/versionCheck";

const CHECK_INTERVAL_MS = 30 * 1000;

export default function VersionUpdateToast() {
  const [visible, setVisible] = useState(false);
  const [liveBuildId, setLiveBuildId] = useState<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    const live = await fetchLiveBuildId();
    setLiveBuildId(live);
    const shouldShow = isNewerBuildAvailable(live);
    // Only update visibility if it should be shown, never hide if already shown
    setVisible((prev) => prev || shouldShow);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runCheck = async () => {
      if (cancelled) return;
      await checkForUpdate();
    };

    runCheck();

    const onFocus = () => runCheck();
    const onVisible = () => {
      if (document.visibilityState === "visible") runCheck();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      // Restored from bfcache keeps old JS — re-check immediately
      if (event.persisted) runCheck();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(runCheck, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [checkForUpdate]);

  const handleDismiss = () => {
    if (liveBuildId) dismissBuildUpdate(liveBuildId);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 md:bottom-4 z-[10050] max-w-sm pointer-events-auto">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xl shadow-black/10">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Update available</p>
          <p className="text-xs text-slate-500 mt-0.5">
            A newer version is live. Refresh to load it.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}