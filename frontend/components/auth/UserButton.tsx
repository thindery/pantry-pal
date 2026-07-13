"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { LogOut } from "lucide-react";

export function UserButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-9 w-9 rounded-full bg-[var(--surface-muted)] animate-pulse" />;
  }

  if (!session?.user) {
    return null;
  }

  const label = session.user.name ?? session.user.email ?? "Account";
  const image = session.user.image;

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard/account/"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-muted)] transition-colors"
        title={label}
      >
        {image ? (
          <Image
            src={image}
            alt={label}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full border border-[var(--border)]"
            unoptimized
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-sm font-semibold">
            {label.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden lg:inline text-sm font-medium text-[var(--foreground)] max-w-[10rem] truncate">
          {label}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--surface-muted)]"
      >
        <LogOut size={16} />
        <span className="hidden xl:inline">Sign out</span>
      </button>
    </div>
  );
}