"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const base =
  "w-full min-h-[88px] rounded-lg border bg-surface px-[13px] py-[10px] text-sm text-ink " +
  "placeholder:text-muted outline-none resize-y transition-shadow leading-relaxed " +
  "disabled:bg-surface-sunken disabled:text-muted disabled:cursor-not-allowed";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={ariaInvalid ?? invalid}
      className={cn(
        base,
        invalid
          ? "border-error-strong focus:border-error-strong focus:shadow-[0_0_0_3px_rgba(244,63,94,0.13)]"
          : "border-border focus:border-primary focus:shadow-[0_0_0_3px_rgba(5,150,105,0.13)]",
        className,
      )}
      {...props}
    />
  );
});
