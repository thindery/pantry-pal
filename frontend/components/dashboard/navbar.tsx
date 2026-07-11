"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@/components/auth/UserButton";

interface DashboardNavbarProps {
  isPaid?: boolean;
}

const NAV_LINKS = [
  { href: "/dashboard/", label: "Dashboard", icon: "🏠" },
  { href: "/dashboard/inventory/", label: "Inventory", icon: "📦" },
  { href: "/dashboard/shopping-list/", label: "Shopping", icon: "🛒" },
  { href: "/dashboard/ledger/", label: "Ledger", icon: "📜" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }
  return pathname.startsWith(href.replace(/\/$/, ""));
}

export function DashboardNavbar({ isPaid }: DashboardNavbarProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-slate-200 px-4 py-2 pb-[env(safe-area-inset-bottom)] md:pb-4 flex justify-around items-center md:top-0 md:bottom-auto md:border-t-0 md:border-b md:justify-start md:gap-8 z-[9999]">
      <div className="hidden md:block font-bold text-xl text-emerald-600 mr-4">
        PantryPal
      </div>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1 rounded-lg transition-colors ${
            isActive(pathname, link.href)
              ? "text-emerald-600 font-semibold bg-emerald-50"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span className="text-xl md:text-lg">{link.icon}</span>
          <span className="text-xs md:text-sm">{link.label}</span>
        </Link>
      ))}
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/admin/"
          className={`hidden md:flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
            pathname.startsWith("/admin")
              ? "bg-slate-800 text-white"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
          Admin
        </Link>
        {!isPaid && (
          <Link
            href="/pricing/"
            className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-sm font-bold rounded-full hover:from-amber-500 hover:to-amber-600 transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Upgrade
          </Link>
        )}
        <UserButton />
      </div>
    </nav>
  );
}