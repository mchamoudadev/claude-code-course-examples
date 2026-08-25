"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { ChevronDownIcon } from "./icons";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/** Styled native <select> — accessible by default, with a custom chevron. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        aria-invalid={invalid}
        className={cn(
          "h-10 w-full appearance-none rounded-lg border bg-surface pl-[13px] pr-9 text-sm text-ink outline-none transition-shadow",
          "disabled:bg-surface-sunken disabled:text-muted disabled:cursor-not-allowed",
          invalid
            ? "border-error-strong focus:shadow-[0_0_0_3px_rgba(244,63,94,0.13)]"
            : "border-border focus:border-primary focus:shadow-[0_0_0_3px_rgba(5,150,105,0.13)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
});
