"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  sub?: ReactNode;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
  className?: string;
}

/**
 * Row of mutually-exclusive segments (Length / Tone pickers on New Post).
 * Selected segment adopts the emerald tint; keyboard/AA via radiogroup roles.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex gap-1.5", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-[9px] border px-1 py-2 text-center text-[13px] font-medium transition-colors",
              active
                ? "border-primary bg-primary-50 text-primary-700"
                : "border-border bg-surface text-body hover:bg-surface-sunken",
            )}
          >
            <span className="block">{opt.label}</span>
            {opt.sub ? (
              <span
                className={cn(
                  "mt-0.5 block font-mono text-[10.5px]",
                  active ? "text-primary-600" : "text-faint",
                )}
              >
                {opt.sub}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
