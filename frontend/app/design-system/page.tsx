import type { Metadata } from "next";
import Link from "next/link";
import {
  Barcode,
  Minus,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  User,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { BRAND_NAME } from "@/lib/site-content";
import { colors, defaultThresholds } from "@/lib/design-tokens";

export const metadata: Metadata = {
  title: "Design System (PP-042)",
  description: "Pantry Hub dashboard design kit reference for PP-042 designer handoff.",
  robots: { index: false, follow: false },
};

const SWATCHES = [
  { name: "Primary", token: "--primary", hex: colors.primary },
  { name: "Primary light", token: "--primary-light", hex: colors.primaryLight },
  { name: "Accent", token: "--accent", hex: colors.accent },
  { name: "Accent light", token: "--accent-light", hex: colors.accentLight },
  { name: "Background", token: "--background", hex: colors.background },
  { name: "Surface", token: "--surface", hex: colors.surface },
  { name: "Foreground", token: "--foreground", hex: colors.foreground },
  { name: "Muted", token: "--muted", hex: colors.muted },
  { name: "Border", token: "--border", hex: colors.border },
  { name: "Danger", token: "--danger", hex: colors.danger },
] as const;

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
          <p className="text-sm font-medium text-[var(--primary)]">PP-042 · Designer handoff</p>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            {BRAND_NAME} Design Kit
          </h1>
          <p className="text-[var(--muted)] max-w-2xl">
            Light-mode dashboard system. Emerald primary, amber accent. Reference for
            streamlining the logged-in experience around add, view inventory, and
            threshold-based shopping lists.
          </p>
          <p className="text-sm text-[var(--muted-light)]">
            Spec: <code className="text-xs bg-[var(--surface-muted)] px-1.5 py-0.5 rounded">.agents/design/PP-042-designer-handoff.md</code>
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
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-[var(--primary)] text-white rounded-xl px-4 py-3 font-semibold hover:bg-[var(--primary-hover)] transition-colors"
            >
              <Barcode size={20} />
              Scan item
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] rounded-xl px-4 py-3 font-semibold hover:bg-[var(--surface-muted)] transition-colors"
            >
              <Plus size={20} />
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

        <Section title="Inventory row (proposed)">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm divide-y divide-[var(--border)]">
            {[
              { name: "Milk", qty: "2 cartons", status: null },
              { name: "Eggs", qty: "12", status: null },
              { name: "Rice", qty: "0", status: "low" as const },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between px-4 py-3 gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--foreground)] truncate">{row.name}</p>
                  <p className="text-sm text-[var(--muted)]">{row.qty}</p>
                </div>
                {row.status === "low" && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-hover)] shrink-0">
                    Low
                  </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted)]"
                    aria-label="Decrease"
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]"
                    aria-label="Increase"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Shopping list row (proposed)">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm divide-y divide-[var(--border)]">
            {[
              { label: "Milk — need 2 (have 1)", reason: "Below produce threshold (3)" },
              { label: "Rice — out of stock", reason: "Quantity is 0" },
            ].map((row) => (
              <label
                key={row.label}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer"
              >
                <input type="checkbox" className="mt-1 rounded border-[var(--border)]" />
                <div>
                  <p className="font-medium text-[var(--foreground)]">{row.label}</p>
                  <p className="text-xs text-[var(--muted)]">{row.reason}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>

        <Section title="Bottom navigation (proposed · 3 tabs)">
          <div className="max-w-sm mx-auto border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)] shadow-sm">
            <div className="h-32 bg-[var(--background)] flex items-center justify-center text-sm text-[var(--muted)]">
              Screen content
            </div>
            <nav className="flex border-t border-[var(--border)] px-2 py-2">
              {[
                { icon: Package, label: "Pantry", active: true },
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
            Replaces current 4-tab nav (Dashboard, Inventory, Shopping, Ledger). Pantry is default landing.
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
            <p className="text-2xl font-bold text-[var(--foreground)]">Page title · Inter bold</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">Section heading</p>
            <p className="text-base text-[var(--foreground)]">Body text for lists and forms</p>
            <p className="text-sm text-[var(--muted)]">Secondary / helper text</p>
            <p className="text-xs text-[var(--muted-light)]">Captions and metadata</p>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Lora serif is marketing-only — not used in dashboard screens.
          </p>
        </Section>

        <div className="rounded-xl border border-[var(--primary-light)] bg-[var(--primary-muted)] p-4 text-sm text-[var(--foreground)]">
          <p className="font-semibold mb-1">Designer deliverables requested</p>
          <ul className="list-disc list-inside space-y-1 text-[var(--muted)]">
            <li>High-fidelity mockups: Pantry, Shopping, Account (mobile + desktop)</li>
            <li>Scan flow + add-manually sheet/modal states</li>
            <li>Threshold settings panel redesign</li>
            <li>Annotated component spec (spacing, states, empty states)</li>
          </ul>
          <p className="mt-3">
            <Link href="/" className="text-[var(--primary)] font-medium hover:underline">
              ← Back to marketing site
            </Link>
            {" · "}
            <Link
              href="/dashboard/inventory/"
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