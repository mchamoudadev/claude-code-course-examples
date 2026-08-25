"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import { CheckIcon } from "./icons";

export interface OptionItem<T extends string | number> {
  value: T;
  label: ReactNode;
  /** Right-aligned sub label (e.g. provider tag, mono model note). */
  sub?: ReactNode;
}

export interface OptionListProps<T extends string | number> {
  options: OptionItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Render labels in monospace (model pickers). */
  mono?: boolean;
  "aria-label"?: string;
  className?: string;
}

/**
 * Vertical single-select list used for the Model (OpenRouter) and
 * Image-provider pickers on New Post. Selected row shows the emerald tint + check.
 */
export function OptionList<T extends string | number>({
  options,
  value,
  onChange,
  mono,
  "aria-label": ariaLabel,
  className,
}: OptionListProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-col gap-1.5", className)}>
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
              "flex h-10 items-center justify-between rounded-[9px] border px-[13px] text-[13.5px] font-medium transition-colors",
              mono && "font-mono",
              active
                ? "border-primary bg-primary-50 text-primary-700"
                : "border-border bg-surface text-body hover:bg-surface-sunken",
            )}
          >
            <span className="truncate">{opt.label}</span>
            <span className="ml-2 flex shrink-0 items-center gap-1.5">
              {opt.sub ? (
                <span className="font-mono text-[11px] text-faint">{opt.sub}</span>
              ) : null}
              {active ? <CheckIcon size={14} strokeWidth={2.5} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
