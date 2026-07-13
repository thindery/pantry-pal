"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingCart, User } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { UserButton } from "@/components/auth/UserButton";

const NAV_LINKS = [
  { href: "/dashboard/", label: "Pantry", icon: Package },
  { href: "/dashboard/shopping-list/", label: "Shopping", icon: ShoppingCart },
  { href: "/dashboard/account/", label: "Account", icon: User },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/") {
    return (
      pathname === "/dashboard" ||
      pathname === "/dashboard/" ||
      pathname === "/dashboard/inventory" ||
      pathname === "/dashboard/inventory/"
    );
  }
  return pathname.startsWith(href.replace(/\/$/, ""));
}

export function DashboardNavbar() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden md:flex fixed top-0 left-0 right-0 w-full bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3 items-center gap-8 z-[9999]">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <BrandMark
            nameClassName="font-serif-heading font-bold text-lg text-[var(--foreground)]"
          />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
        >
          <Home size={18} />
          Home
        </Link>
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "text-[var(--primary)] bg-[var(--primary-light)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
        <div className="ml-auto">
          <UserButton />
        </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-[var(--surface)] border-t border-[var(--border)] px-2 py-2 pb-[env(safe-area-inset-bottom)] flex justify-around items-center z-[9999]">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? "text-[var(--primary)] bg-[var(--primary-light)]"
                  : "text-[var(--muted)]"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}