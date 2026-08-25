"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Icon rendered inside the field, left-aligned (e.g. search). */
  leftIcon?: ReactNode;
}

const fieldBase =
  "w-full h-[42px] rounded-lg border bg-surface px-[13px] text-sm text-ink " +
  "placeholder:text-muted outline-none transition-shadow " +
  "disabled:bg-surface-sunken disabled:text-muted disabled:cursor-not-allowed";

const fieldOk =
  "border-border focus:border-primary focus:shadow-[0_0_0_3px_rgba(5,150,105,0.13)]";
const fieldErr =
  "border-error-strong focus:border-error-strong focus:shadow-[0_0_0_3px_rgba(244,63,94,0.13)]";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leftIcon, className, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  if (leftIcon) {
    return (
      <div className="relative w-full">
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-faint">
          {leftIcon}
        </span>
        <input
          ref={ref}
          aria-invalid={ariaInvalid ?? invalid}
          className={cn(fieldBase, invalid ? fieldErr : fieldOk, "pl-9", className)}
          {...props}
        />
      </div>
    );
  }
  return (
    <input
      ref={ref}
      aria-invalid={ariaInvalid ?? invalid}
      className={cn(fieldBase, invalid ? fieldErr : fieldOk, className)}
      {...props}
    />
  );
});
