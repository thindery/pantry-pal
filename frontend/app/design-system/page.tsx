import type { Metadata } from "next";
import Link from "next/link";
import {
  Barcode,
  ChefHat,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  User,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { BRAND_NAME } from "@/lib/site-content";
import { LivePantryRows, LiveShoppingRows } from "./LiveRows";
import { colors, defaultThresholds } from "@/lib/design-tokens";

export const metadata: Metadata = {
  title: "Design System",
  description: "Pantry Hub shipped component and token reference.",
  robots: { index: false, follow: false },
};

const SWATCHES = Object.entries(colors).map(([name, hex]) => ({
  name,
  token: `--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
  hex,
}));

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <MarketingNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        <header className="space-y-2">
          <p className="text-sm font-medium text-[var(--primary)]">PP-146 · Shipped UI reference</p>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            {BRAND_NAME} Design System
          </h1>
          <p className="text-[var(--muted)] max-w-2xl">
            Light-mode component reference for the shipped Pantry, Recipes, Shopping,
            and Account experience. Rows below use the real app components with static
            sample data and no-op actions; no account data is loaded.
          </p>
          <p className="text-sm text-[var(--muted-light)]">
            Spec: <code className="text-xs bg-[var(--surface-muted)] px-1.5 py-0.5 rounded">.agents/docs/design-review-2026-11-22.md</code>
          </p>
        </header>

        <Section title="Color tokens">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SWATCHES.map((s) => (
              <div
                key={s.name}
                className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]"
              >
                <div className="h-14" style={{ backgroundColor: s.hex }} />
                <div className="p-2 text-xs">
                  <p className="font-semibold text-[var(--foreground)]">{s.name}</p>
                  <p className="text-[var(--muted)] font-mono">{s.hex}</p>
                  <p className="text-[var(--muted-light)]">{s.token}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-[var(--muted)]">
            Use --primary for text, links and solid buttons; --primary-hover for hover.
            --primary-bright is for the logo field and decorative accents only: no white
            type on bright green or bright amber, and no bright-green body or link text.
            --accent is the solid amber fill; --accent-bright is decorative.
          </p>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 bg-[var(--primary)] text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
            >
              <Barcode size={16} />
              Scan item
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] rounded-xl px-4 py-3 font-semibold hover:bg-[var(--surface-muted)] transition-colors"
            >
              <Plus size={16} />
              Add manually
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-[var(--accent)] text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-[var(--accent-hover)] transition-colors"
            >
              Upgrade
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-[var(--muted)] rounded-xl px-3 py-2 text-sm hover:bg-[var(--surface-muted)] transition-colors"
            >
              <Settings size={18} />
              Thresholds
            </button>
          </div>
        </Section>

        <Section title="Status badges">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
              In stock
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent-hover)]">
              Low stock
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
              Out of stock
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--danger-light)] text-[var(--danger)]">
              Error
            </span>
          </div>
        </Section>

        <Section title="Filter chips">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--primary-light)] text-[var(--primary)]"
            >
              All
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]"
            >
              Low
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]"
            >
              Out
            </button>
            <span className="text-sm text-[var(--muted-light)] ml-2">Sort: Recent ▾</span>
          </div>
        </Section>

        <Section title="Inventory rows (shipped)">
          <LivePantryRows />
          <p className="text-sm text-[var(--muted)]">52–60px compact rows, 40px thumbnails, 32px quantity steppers. Sample data only.</p>
        </Section>

        <Section title="Shopping list rows (shipped)">
          <LiveShoppingRows />
        </Section>

        <Section title="Bottom navigation (shipped · 4 tabs)">
          <div className="max-w-sm mx-auto border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)] shadow-sm">
            <div className="h-32 bg-[var(--background)] flex items-center justify-center text-sm text-[var(--muted)]">
              Screen content
            </div>
            <nav className="flex border-t border-[var(--border)] px-2 py-2">
              {[
                { icon: Package, label: "Pantry", active: true },
                { icon: ChefHat, label: "Recipes", active: false },
                { icon: ShoppingCart, label: "Shopping", active: false },
                { icon: User, label: "Account", active: false },
              ].map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-xs font-medium ${
                    active
                      ? "text-[var(--primary)] bg-[var(--primary-light)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </div>
              ))}
            </nav>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Pantry is the default landing. Four tabs: Pantry, Recipes, Shopping, Account. This inline sample mirrors the mobile navbar without fixed positioning.
          </p>
        </Section>

        <Section title="Default thresholds (per category)">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {Object.entries(defaultThresholds).map(([cat, val]) => (
              <div
                key={cat}
                className="flex justify-between px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg capitalize"
              >
                <span className="text-[var(--foreground)]">{cat}</span>
                <span className="font-semibold text-[var(--primary)]">{val}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">
            Items at or below threshold auto-appear on Shopping list. User can override in settings.
          </p>
        </Section>

        <Section title="Typography">
          <div className="space-y-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
            <p className="text-2xl font-serif-heading font-bold text-[var(--foreground)]">Page title · Lora bold</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">Section heading</p>
            <p className="text-base text-[var(--foreground)]">Body text for lists and forms</p>
            <p className="text-sm text-[var(--muted)]">Secondary / helper text</p>
            <p className="text-xs text-[var(--muted-light)]">Captions and metadata</p>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Inter for body and controls; Lora for marketing and app screen titles. Scale: xs 12, sm 14, base 16, lg 18, xl 20, 2xl 24, 3xl 30; 4xl 36 and 5xl 48 for marketing H1 only.
          </p>
        </Section>

        <Section title="Shape, icons and focus">
          <p className="text-sm text-[var(--muted)]">
            Cards use rounded-2xl, shadow-sm and a 1px border; rows use rounded-lg
            thumbs. Use the shipped Tailwind radius classes (not custom per-component
            values). Lucide icons: 16–20px for controls, tab stroke 1.75 inactive / 2.25
            active. Standalone settings, close and back icons need at least 44×44px
            targets. Controls should have a 2px primary focus ring with 2px offset.
          </p>
        </Section>

        <div className="rounded-xl border border-[var(--primary-light)] bg-[var(--primary-muted)] p-4 text-sm text-[var(--foreground)]">
          <p className="font-semibold">Component reference, not a second design system</p>
          <p className="text-[var(--muted)]">Update the shipped components and token source first; this page documents them.</p>
          <p className="mt-3">
            <Link href="/" className="text-[var(--primary)] font-medium hover:underline">
              ← Back to marketing site
            </Link>
            {" · "}
            <Link
              href="/dashboard/"
              className="text-[var(--primary)] font-medium hover:underline"
            >
              Current inventory (requires sign-in)
            </Link>
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}