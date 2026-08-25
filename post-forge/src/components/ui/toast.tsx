"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { AlertIcon, CheckIcon, XIcon } from "./icons";

export type ToastTone = "success" | "error" | "info";

export interface ToastOptions {
  message: ReactNode;
  tone?: ToastTone;
  /** Auto-dismiss after ms. Default 3500. Pass 0 to persist. */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, "duration">> {
  id: number;
  duration: number;
}

const toneDot: Record<ToastTone, string> = {
  success: "bg-success",
  error: "bg-error",
  info: "bg-info",
};

/** Presentational toast (dark pill with a colored status icon). */
export function Toast({
  tone = "success",
  message,
  onDismiss,
}: {
  tone?: ToastTone;
  message: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex max-w-[340px] items-center gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-lg animate-up">
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          toneDot[tone],
        )}
      >
        {tone === "success" ? (
          <CheckIcon size={12} className="text-white" />
        ) : (
          <AlertIcon size={12} className="text-white" strokeWidth={2.6} />
        )}
      </span>
      <span className="text-[13.5px] font-medium leading-snug">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="ml-1 shrink-0 text-white/60 transition-colors hover:text-white"
        >
          <XIcon size={14} />
        </button>
      ) : null}
    </div>
  );
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Wrap the app (or a preview) to enable `useToast()`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: ToastOptions) => {
    const item: ToastItem = {
      id: Date.now() + Math.random(),
      message: opts.message,
      tone: opts.tone ?? "success",
      duration: opts.duration ?? 3500,
    };
    setItems((prev) => [...prev, item]);
    if (item.duration > 0) {
      setTimeout(() => dismiss(item.id), item.duration);
    }
  }, [dismiss]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed right-5 top-5 z-[1100] flex flex-col gap-2.5"
              role="region"
              aria-label="Notifications"
            >
              {items.map((t) => (
                <div key={t.id} className="pointer-events-auto">
                  <Toast tone={t.tone} message={t.message} onDismiss={() => dismiss(t.id)} />
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
