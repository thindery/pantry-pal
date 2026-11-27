"use client";

import { useEffect, useState } from "react";
import {
  getEmailPreferences,
  updateEmailPreferences,
  type EmailPreferences,
} from "@/services/email-preferences";

/**
 * PP-235: opt-in weekly recipe email. Off by default. Renders nothing until the server says marketing
 * email is live, so nobody opts in to a mail that is switched off.
 */
export function WeeklyRecipesToggle() {
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEmailPreferences()
      .then((p) => {
        if (!cancelled) setPrefs(p);
      })
      .catch(() => {
        if (!cancelled) setPrefs(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!prefs?.weeklyRecipesAvailable) return null;
  const on = prefs.weeklyRecipes === true;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setPrefs(await updateEmailPreferences({ weeklyRecipes: !on }));
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-[var(--foreground)]">Weekly recipe email</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            Once a week, three recipes from our library plus one small pantry tip. Unsubscribe anytime.
          </p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Weekly recipe email"
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            on ? "bg-[var(--primary)]" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default WeeklyRecipesToggle;
