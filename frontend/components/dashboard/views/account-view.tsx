"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  Camera,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { usePantry } from "@/contexts/pantry-provider";
import {
  cancelSubscription,
  createCustomerPortal,
  reactivateSubscription,
  useSubscription,
} from "@/services/subscription";
import { BRAND_NAME, PRO_PLAN_NAME } from "@/lib/site-content";

export function AccountView() {
  const { data: session } = useSession();
  const {
    router,
    isPaid,
    setShowThresholdSettings,
    handleScanReceiptClick,
  } = usePantry();

  const email = session?.user?.email ?? "";
  const name = session?.user?.name ?? email;
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;
  const { tierInfo, refresh } = useSubscription();
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const subscription = tierInfo?.subscription;
  const cancelAtPeriodEnd = Boolean(subscription?.cancelAtPeriodEnd);
  const accessEnd = subscription?.subscriptionEndDate
    ? new Date(subscription.subscriptionEndDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const runBilling = async (action: () => Promise<unknown>) => {
    if (billingBusy) return;
    setBillingBusy(true);
    setBillingError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBillingBusy(false);
    }
  };

  const menuItems = [
    {
      label: "Homepage",
      icon: Home,
      href: "/",
    },
    {
      label: "Low stock thresholds",
      icon: Settings,
      onClick: () => setShowThresholdSettings(true),
    },
    {
      label: "Activity ledger",
      icon: ClipboardList,
      href: "/dashboard/ledger/",
    },
    { label: "Scan receipt", icon: Camera, onClick: handleScanReceiptClick },
    ...(isAdmin
      ? [{ label: "Admin", icon: Settings, href: "/admin/" }]
      : []),
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-2xl font-serif-heading font-bold text-[var(--foreground)]">Account</h1>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
        <p className="font-semibold text-[var(--foreground)]">{name}</p>
        <p className="text-sm text-[var(--muted)]">{email}</p>
        <p className="text-sm text-[var(--muted)] mt-2">
          Plan:{" "}
          <span className="font-medium text-[var(--foreground)]">
            {isPaid ? PRO_PLAN_NAME : "Free"}
          </span>
        </p>
        {isPaid && accessEnd && (
          <p className="text-sm text-[var(--muted)] mt-1">
            {cancelAtPeriodEnd
              ? `Cancellation scheduled. Access continues until ${accessEnd}.`
              : `Access through ${accessEnd}.`}
          </p>
        )}
        {billingError && (
          <p className="text-sm text-red-600 mt-2">{billingError}</p>
        )}
        {!isPaid && (
          <button
            type="button"
            onClick={() => router.push("/pricing/")}
            className="mt-3 inline-flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Sparkles size={16} />
            Upgrade
          </button>
        )}
        {isPaid && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={billingBusy}
              onClick={() =>
                runBilling(async () => {
                  const portal = await createCustomerPortal(`${window.location.origin}/dashboard/account/`);
                  window.location.href = portal.url;
                })
              }
              className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
            >
              Manage billing
            </button>
            {cancelAtPeriodEnd ? (
              <button
                type="button"
                disabled={billingBusy}
                onClick={() => runBilling(() => reactivateSubscription())}
                className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                Keep my plan
              </button>
            ) : (
              <button
                type="button"
                disabled={billingBusy}
                onClick={() => runBilling(() => cancelSubscription())}
                className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                Cancel at period end
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm divide-y divide-[var(--border)]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-[var(--muted)]" />
                <span className="text-[var(--foreground)] font-medium">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-[var(--muted-light)]" />
            </>
          );

          if ("href" in item && item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-[var(--surface-muted)] transition-colors"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--surface-muted)] transition-colors text-left"
            >
              {content}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-3 border border-[var(--border)] rounded-xl text-[var(--muted)] font-medium hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <LogOut size={18} />
        Sign out of {BRAND_NAME}
      </button>
    </div>
  );
}