"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

export function UserButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />;
  }

  if (!session?.user) {
    return null;
  }

  const label = session.user.name ?? session.user.email ?? "Account";
  const image = session.user.image;

  return (
    <div className="flex items-center gap-2">
      {image ? (
        <Image
          src={image}
          alt={label}
          width={36}
          height={36}
          className="h-9 w-9 rounded-full border border-slate-200"
          unoptimized
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold">
          {label.charAt(0).toUpperCase()}
        </div>
      )}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="hidden md:inline text-xs text-slate-500 hover:text-slate-800 transition"
      >
        Sign out
      </button>
    </div>
  );
}