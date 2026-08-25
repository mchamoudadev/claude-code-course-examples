import type { ReactNode } from "react";
import { cn } from "@/components/ui";

export interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Right-aligned header accessory (e.g. a status chip). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Consistent settings block: an icon + title/description header above a card of
 * controls. Composes the shared design system (no bespoke tokens) so every
 * section on the page reads as one system.
 */
export function SettingsSection({
  title,
  description,
  icon,
  aside,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn("scroll-mt-20", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon ? (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-sunken text-secondary">
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 max-w-[560px] text-[13.5px] leading-relaxed text-secondary">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
