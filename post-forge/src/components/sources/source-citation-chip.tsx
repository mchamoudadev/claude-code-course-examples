"use client";

import { safeHttpUrl } from "@/lib/safe-url";
import { cn } from "../ui/cn";
import { CheckIcon } from "../ui/icons";

export interface SourceCitationChipProps {
  /** Citation number shown in the leading badge. */
  index: number;
  title: string;
  domain: string;
  verified?: boolean;
  /** "card" (grid, Post sources) or "row" (inline list). Default "card". */
  variant?: "card" | "row";
  /** Renders an <a> (opens in a new tab). Takes precedence over onClick. */
  href?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * A cited source: numbered badge + title + monospace domain, with an optional
 * "verified" indicator. Clickable when `href`/`onClick` is given. Exported for
 * T12 (post detail) Sources section.
 */
export function SourceCitationChip({
  index,
  title,
  domain,
  verified = false,
  variant = "card",
  href,
  onClick,
  className,
}: SourceCitationChipProps) {
  // Guard the href against XSS: only http(s) links become live anchors; anything
  // else (javascript:, data:, …) falls through to the non-interactive rendering.
  const safeHref = safeHttpUrl(href);
  const interactive = Boolean(safeHref || onClick);
  const isCard = variant === "card";

  const shell = cn(
    "flex gap-2.5 border bg-surface text-left",
    isCard
      ? "items-start rounded-xl border-border-subtle px-3.5 py-[13px]"
      : "items-center rounded-[11px] border-border-subtle px-3 py-2.5",
    interactive && "transition-colors hover:border-[#c2c8c5] hover:bg-[#fbfcfc] cursor-pointer",
    className,
  );

  const badge = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[7px] font-mono font-bold",
        isCard ? "h-[26px] w-[26px] text-xs" : "h-6 w-6 text-[11px]",
        verified ? "bg-verified-tint text-primary-600" : "bg-surface-sunken text-secondary",
      )}
    >
      {index}
    </span>
  );

  const body = (
    <span className="min-w-0 flex-1">
      <span
        className={cn(
          "block font-medium text-ink",
          isCard ? "mb-1 text-[13.5px] leading-tight" : "truncate text-[13px]",
        )}
      >
        {title}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="min-w-0 truncate font-mono text-[11.5px] text-muted">{domain}</span>
        {verified ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-success-tint px-1.5 py-px text-[10.5px] font-semibold text-verified-fg">
            <CheckIcon size={9} strokeWidth={3.5} />
            verified
          </span>
        ) : null}
      </span>
    </span>
  );

  if (safeHref) {
    return (
      <a href={safeHref} target="_blank" rel="noopener noreferrer" className={shell}>
        {badge}
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(shell, "w-full")}>
        {badge}
        {body}
      </button>
    );
  }
  return (
    <div className={shell}>
      {badge}
      {body}
    </div>
  );
}
