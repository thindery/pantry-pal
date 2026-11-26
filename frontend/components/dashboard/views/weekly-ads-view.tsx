"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, Newspaper, ShoppingCart, Star } from "lucide-react";
import { usePantry } from "@/contexts/pantry-provider";
import { trackEvent } from "@/lib/analytics";
import {
  cleanZip,
  favoriteStore,
  getWeeklyAds,
  unfavoriteStore,
  WEEKLY_ADS_ZIP_KEY,
  type WeeklyAdStore,
  type WeeklyAdsResult,
} from "@/services/weekly-ads";

function StoreCard({
  store,
  onToggleFavorite,
}: {
  store: WeeklyAdStore;
  onToggleFavorite: (store: WeeklyAdStore) => void;
}) {
  const isFav = Boolean(store.isFavorite || store.is_favorite);
  const place = [store.address, [store.city, store.state].filter(Boolean).join(", "), store.zip]
    .filter(Boolean)
    .join(" ");
  return (
    <li className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <button
          type="button"
          onClick={() => onToggleFavorite(store)}
          aria-pressed={isFav}
          aria-label={isFav ? `Remove ${store.name} from favorites` : `Add ${store.name} to favorites`}
          className="shrink-0 mt-0.5 p-1 rounded-lg hover:bg-[var(--surface-hover,rgba(0,0,0,0.05))] text-[var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <Star
            size={18}
            className={isFav ? "fill-amber-400 text-amber-400" : "text-[var(--muted)]"}
            aria-hidden="true"
          />
        </button>
        <div className="min-w-0">
          <p className="font-semibold text-[var(--foreground)]">{store.name}</p>
          {place && <p className="text-sm text-[var(--muted)]">{place}</p>}
          {store.note && <p className="text-xs text-[var(--muted)] mt-1">{store.note}</p>}
        </div>
      </div>
      <a
        href={store.weeklyAdUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
        aria-label={`Open the ${store.name} weekly ad (opens the store's site)`}
      >
        Weekly ad
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </li>
  );
}

export function WeeklyAdsView() {
  const { shoppingList } = usePantry();
  const [zipInput, setZipInput] = useState("");
  const [result, setResult] = useState<WeeklyAdsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const listItems = useMemo(
    () => shoppingList.filter((item) => !item.isChecked && !item.isArchived),
    [shoppingList],
  );

  const favorites = useMemo(
    () => (result?.stores || []).filter((s) => Boolean(s.isFavorite || s.is_favorite)),
    [result?.stores],
  );
  const nonFavorites = useMemo(
    () => (result?.stores || []).filter((s) => !Boolean(s.isFavorite || s.is_favorite)),
    [result?.stores],
  );

  const fallbackFavorites = useMemo(
    () => (result?.fallback || []).filter((s) => Boolean(s.isFavorite || s.is_favorite)),
    [result?.fallback],
  );
  const fallbackNonFavorites = useMemo(
    () => (result?.fallback || []).filter((s) => !Boolean(s.isFavorite || s.is_favorite)),
    [result?.fallback],
  );

  const lookup = async (raw: string) => {
    const zip = cleanZip(raw);
    if (!zip) {
      setError("Enter a 5-digit US ZIP code.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      setResult(await getWeeklyAds(zip));
      try {
        localStorage.setItem(WEEKLY_ADS_ZIP_KEY, zip);
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load stores.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (store: WeeklyAdStore) => {
    if (!result) return;
    const currentFav = Boolean(store.isFavorite || store.is_favorite);
    const nextFav = !currentFav;
    const currentZip = result.zip;

    // Optimistic update
    setResult((prev) => {
      if (!prev) return prev;
      const updateList = (list: WeeklyAdStore[]) =>
        list.map((s) => (s.id === store.id ? { ...s, isFavorite: nextFav, is_favorite: nextFav } : s));
      return {
        ...prev,
        stores: updateList(prev.stores),
        fallback: updateList(prev.fallback),
      };
    });

    try {
      if (nextFav) {
        await favoriteStore(currentZip, store.id);
      } else {
        await unfavoriteStore(currentZip, store.id);
      }
      trackEvent("weekly_ad_favorite", {
        action: nextFav ? "add" : "remove",
        zip3: currentZip.slice(0, 3),
      });
    } catch (err) {
      // Rollback on error
      setResult((prev) => {
        if (!prev) return prev;
        const rollbackList = (list: WeeklyAdStore[]) =>
          list.map((s) => (s.id === store.id ? { ...s, isFavorite: currentFav, is_favorite: currentFav } : s));
        return {
          ...prev,
          stores: rollbackList(prev.stores),
          fallback: rollbackList(prev.fallback),
        };
      });
      setError(err instanceof Error ? err.message : "Could not update favorite store.");
    }
  };

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(WEEKLY_ADS_ZIP_KEY);
    } catch {}
    if (saved) {
      setZipInput(saved);
      void lookup(saved);
    }
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <Newspaper className="text-[var(--primary)]" size={20} />
        <h1 className="text-2xl font-serif-heading font-bold text-[var(--foreground)]">Weekly ads</h1>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Enter your ZIP to see stores near you. Each link opens the store&apos;s own weekly ad, with your
        shopping list here to check against.
      </p>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(zipInput);
        }}
      >
        <label htmlFor="weekly-ads-zip" className="sr-only">
          ZIP code
        </label>
        <input
          id="weekly-ads-zip"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={10}
          placeholder="ZIP code"
          value={zipInput}
          onChange={(e) => setZipInput(e.target.value)}
          className="w-36 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          <MapPin size={16} aria-hidden="true" />
          {loading ? "Finding…" : "Find stores"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <section aria-label="Stores">
          {result && result.covered && (
            <>
              <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">Stores near {result.zip}</h2>
              {favorites.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Your stores</h3>
                    <ul className="space-y-3">
                      {favorites.map((store) => (
                        <StoreCard key={store.id} store={store} onToggleFavorite={toggleFavorite} />
                      ))}
                    </ul>
                  </div>
                  {nonFavorites.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Other stores nearby</h3>
                      <ul className="space-y-3">
                        {nonFavorites.map((store) => (
                          <StoreCard key={store.id} store={store} onToggleFavorite={toggleFavorite} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {result.stores.map((store) => (
                    <StoreCard key={store.id} store={store} onToggleFavorite={toggleFavorite} />
                  ))}
                </ul>
              )}
            </>
          )}
          {result && !result.covered && (
            <>
              <p className="text-sm text-[var(--foreground)] mb-3">
                We don&apos;t have local stores for {result.zip} yet. These national chains let you pick a
                store near you and see its weekly ad:
              </p>
              {fallbackFavorites.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Your stores</h3>
                    <ul className="space-y-3">
                      {fallbackFavorites.map((store) => (
                        <StoreCard key={store.id} store={store} onToggleFavorite={toggleFavorite} />
                      ))}
                    </ul>
                  </div>
                  {fallbackNonFavorites.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Other stores nearby</h3>
                      <ul className="space-y-3">
                        {fallbackNonFavorites.map((store) => (
                          <StoreCard key={store.id} store={store} onToggleFavorite={toggleFavorite} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {result.fallback.map((store) => (
                    <StoreCard key={store.id} store={store} onToggleFavorite={toggleFavorite} />
                  ))}
                </ul>
              )}
            </>
          )}
          {result && (
            <p className="text-xs text-[var(--muted)] mt-3">
              Links go to each store&apos;s own site. Pantry Hub doesn&apos;t check prices or match deals.
            </p>
          )}
        </section>

        <aside
          aria-label="Your shopping list"
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm h-fit"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <ShoppingCart size={16} className="text-[var(--primary)]" aria-hidden="true" />
            <h2 className="font-semibold text-[var(--foreground)]">Your shopping list ({listItems.length})</h2>
          </div>
          {listItems.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Your list is empty.{" "}
              <Link href="/dashboard/shopping-list/" className="underline">
                Build your list
              </Link>
            </p>
          ) : (
            <ul className="text-sm text-[var(--foreground)] space-y-1">
              {listItems.map((item) => (
                <li key={item.id}>
                  {item.name}
                  {item.suggestedQuantity > 0 && (
                    <span className="text-[var(--muted)]">
                      {" "}
                      · {item.suggestedQuantity}
                      {item.unit ? ` ${item.unit}` : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

export default WeeklyAdsView;
