"use client";

import type { ReactNode } from "react";
import { cn } from "../ui/cn";

export interface NavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  /** Collapsed rail — hides the label, keeps the icon (with title tooltip). */
  collapsed?: boolean;
  badge?: ReactNode;
  href?: string;
  onClick?: () => void;
}

/**
 * Sidebar navigation row primitive (consumed by the T08 app shell).
 * Active row gets the emerald tint + primary icon; idle rows hover to sunken.
 */
export function NavItem({
  icon,
  label,
  active = false,
  collapsed = false,
  badge,
  href,
  onClick,
}: NavItemProps) {
  const cls = cn(
    "flex items-center gap-[11px] rounded-[9px] px-2.5 py-2.5 text-sm transition-colors",
    active
      ? "bg-primary-50 font-semibold text-primary-700"
      : "font-normal text-body hover:bg-surface-sunken",
    collapsed && "justify-center",
  );
  const inner = (
    <>
      <span className={cn("flex w-[19px] shrink-0 justify-center", active ? "text-primary-600" : "text-secondary")}>
        {icon}
      </span>
      {!collapsed ? <span>{label}</span> : null}
      {!collapsed && badge ? <span className="ml-auto">{badge}</span> : null}
    </>
  );

  if (href) {
    return (
      <a href={href} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined} className={cn(cls, "w-full text-left")}>
      {inner}
    </button>
  );
}
