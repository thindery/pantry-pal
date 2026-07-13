import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export interface LegalNavItem {
  label: string;
  id: string;
}

interface LegalPageShellProps {
  title: string;
  titleAccent?: string;
  description: string;
  lastUpdated: string;
  navItems: LegalNavItem[];
  children: React.ReactNode;
}

export function LegalPageShell({
  title,
  titleAccent,
  description,
  lastUpdated,
  navItems,
  children,
}: LegalPageShellProps) {
  return (
    <div className="marketing-page min-h-screen flex flex-col">
      <MarketingNav />
      <main className="flex-1 pb-16">
        <section className="pt-12 pb-10 px-4 sm:px-6 lg:px-8 border-b border-[var(--marketing-border)]">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <RevealOnScroll>
              <h1 className="text-4xl md:text-5xl font-serif-heading font-bold text-slate-900 mb-4">
                {title}
                {titleAccent ? (
                  <span className="text-[var(--primary)]"> {titleAccent}</span>
                ) : null}
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">{description}</p>
              <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-xs text-emerald-800">
                Last updated: {lastUpdated}
              </div>
            </RevealOnScroll>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <aside className="md:col-span-1 hidden md:block">
              <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="font-semibold text-xs tracking-wider uppercase text-slate-400 mb-4 px-2">
                  On this page
                </h4>
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block px-2 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="md:col-span-3 space-y-10 text-sm text-slate-600 leading-relaxed">
              {children}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

interface LegalSectionProps {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}

export function LegalSection({ id, number, title, children }: LegalSectionProps) {
  return (
    <RevealOnScroll>
      <div id={id} className="scroll-mt-28 space-y-4">
        <h2 className="text-2xl font-serif-heading font-bold text-slate-900 flex items-center gap-2">
          <span className="text-[var(--primary)]">{number}.</span> {title}
        </h2>
        <div className="space-y-3">{children}</div>
      </div>
    </RevealOnScroll>
  );
}

export function LegalHighlight({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50">
      <h3 className="font-semibold text-lg text-slate-900 mb-2">{title}</h3>
      <div className="text-slate-700">{children}</div>
    </div>
  );
}