"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { XIcon } from "./icons";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** "center" = dialog, "right" = slide-over drawer. */
  variant?: "center" | "right";
  className?: string;
}

/**
 * Accessible dialog / drawer. Closes on Escape and overlay click, locks body
 * scroll, moves focus into the panel, and traps the initial focus target.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "center",
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const drawer = variant === "right";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[1000] flex p-4",
        drawer ? "justify-end" : "items-center justify-center",
      )}
    >
      <div
        className="absolute inset-0 bg-ink/40 animate-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-full flex-col overflow-hidden border border-border bg-surface shadow-lg outline-none",
          drawer
            ? "h-full w-full max-w-md rounded-2xl"
            : "w-full max-w-md rounded-2xl animate-up",
          className,
        )}
      >
        {title || description ? (
          <div className="flex items-start justify-between gap-4 border-b border-border-subtle p-5">
            <div className="min-w-0">
              {title ? <h2 className="text-[17px] font-semibold text-ink">{title}</h2> : null}
              {description ? (
                <p className="mt-1 text-[13.5px] text-secondary">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <XIcon size={17} />
            </button>
          </div>
        ) : null}
        {children ? <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div> : null}
        {footer ? (
          <div className="flex justify-end gap-2.5 border-t border-border-subtle p-4">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
