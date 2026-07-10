"use client";

import ShoppingSessionView from "@/components/ShoppingSessionView";
import { usePantry } from "@/contexts/pantry-provider";

export function ShoppingSessionPageView() {
  const {
    activeShoppingSession,
    setActiveShoppingSession,
    success,
    router,
  } = usePantry();

  return (
    <div className="animate-in fade-in duration-300">
      <ShoppingSessionView
        session={activeShoppingSession}
        onSessionCreated={(session) => {
          setActiveShoppingSession(session);
        }}
        onSessionCompleted={() => {
          setActiveShoppingSession(null);
          router.push("/dashboard/shopping-list/");
          success("Shopping session completed!");
        }}
        onCancel={() => router.push("/dashboard/shopping-list/")}
      />
    </div>
  );
}