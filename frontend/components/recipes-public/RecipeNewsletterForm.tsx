"use client";

import { FormEvent, useId, useState } from "react";

const CONSENT = "We'll email new recipes occasionally. Unsubscribe anytime.";

export function RecipeNewsletterForm({ recipeSlug }: { recipeSlug?: string }) {
  const emailId = useId();
  const honeypotId = useId();
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/public/recipe-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: recipeSlug ? "recipe_page" : "recipes_index",
          recipe_slug: recipeSlug ?? null,
          website: honeypot,
        }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      let json: { data?: { confirmation_required?: boolean } } | null = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      setNeedsConfirm(Boolean(json?.data?.confirmation_required));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      data-testid="recipe-newsletter-form"
      onSubmit={onSubmit}
      className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 print:hidden"
    >
      <p className="font-serif-heading text-lg font-bold text-slate-900">
        Get new pantry recipes by email
      </p>
      {status === "done" ? (
        <p className="mt-2 text-sm text-slate-700" role="status">
          {needsConfirm
            ? "Almost done. Check your inbox (and spam) for an email from Pantry Hub and tap the confirm button."
            : `You're signed up. ${CONSENT}`}
        </p>
      ) : (
        <>
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor={honeypotId}>Website</label>
            <input
              id={honeypotId}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <label htmlFor={emailId} className="sr-only">
              Email address
            </label>
            <input
              id={emailId}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="shrink-0 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-70"
            >
              {status === "submitting" ? "Signing up…" : "Subscribe"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-600">{CONSENT}</p>
          {status === "error" ? (
            <p className="mt-2 text-sm text-red-700" role="alert">
              Enter a valid email address, or try again.
            </p>
          ) : null}
        </>
      )}
    </form>
  );
}
