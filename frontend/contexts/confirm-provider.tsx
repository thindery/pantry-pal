"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ConfirmDialog";

export type { ConfirmOptions };

export type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const parentContext = useContext(ConfirmContext);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalizedOptions: ConfirmOptions =
      typeof options === "string"
        ? { title: "Confirm", message: options }
        : options;

    return new Promise<boolean>((resolve) => {
      // Resolve previous pending confirm with false (one confirm at a time)
      if (resolveRef.current) {
        resolveRef.current(false);
      }

      const resolver = (result: boolean) => {
        resolveRef.current = null;
        setConfirmState(null);
        resolve(result);
      };

      resolveRef.current = resolver;
      setConfirmState({
        options: normalizedOptions,
        resolve: resolver,
      });
    });
  }, []);

  // If already nested under an existing ConfirmProvider, avoid duplicate provider/dialog
  if (parentContext) {
    return <>{children}</>;
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {confirmState && (
        <ConfirmDialog
          options={confirmState.options}
          onResolve={confirmState.resolve}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return context;
}
