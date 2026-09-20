"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: "neutral" | "success" | "warning" | "critical";
}

type ToastInput = Omit<ToastItem, "id">;

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<NonNullable<ToastItem["tone"]>, string> = {
  neutral: "border-border bg-surface text-text",
  success: "border-success/30 bg-surface text-success-strong",
  warning: "border-warning/30 bg-surface text-warning-strong",
  critical: "border-critical/30 bg-surface text-critical-strong",
};

/** Mount once near the root layout. Renders nothing visible until toast() is called. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, tone: "neutral", ...input }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {items.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            duration={5000}
            onOpenChange={(open) => {
              if (!open) dismiss(item.id);
            }}
            className={cn(
              "rounded-md border p-4 shadow-lg data-[state=open]:animate-none",
              "grid grid-cols-[1fr_auto] items-start gap-2",
              TONE_STYLES[item.tone ?? "neutral"]
            )}
          >
            <div>
              <ToastPrimitive.Title className="text-sm font-semibold">{item.title}</ToastPrimitive.Title>
              {item.description ? (
                <ToastPrimitive.Description className="mt-1 text-sm text-secondary">
                  {item.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close className="text-secondary hover:text-text" aria-label="Fermer">
              ×
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider.");
  return ctx;
}
