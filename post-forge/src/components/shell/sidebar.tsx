"use client";

import { usePathname, useRouter } from "next/navigation";
import { NavItem } from "@/components/nav";
import { cn } from "@/components/ui/cn";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import { NAV_LINKS, isNavActive } from "./nav-config";

export interface SidebarProps {
  /** Collapsed rail — icons only (desktop). */
  collapsed?: boolean;
  /** Renders the collapse/expand toggle (desktop rail only). */
  onToggleCollapse?: () => void;
  /** Called after a nav item is chosen — used to close the mobile drawer. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * App-shell primary navigation. Composes the design-system `NavItem`, highlights
 * the active route via `usePathname`, and drives client-side navigation so the
 * shell (and mobile drawer) transitions without a full reload.
 */
export function Sidebar({ collapsed = false, onToggleCollapse, onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      aria-label="Primary"
      className={cn("flex h-full flex-col gap-1 overflow-y-auto p-3", className)}
    >
      {NAV_LINKS.map((link) => (
        <NavItem
          key={link.href}
          icon={<link.Icon size={19} />}
          label={link.label}
          active={isNavActive(pathname, link.href)}
          collapsed={collapsed}
          onClick={() => {
            router.push(link.href);
            onNavigate?.();
          }}
        />
      ))}

      {onToggleCollapse ? (
        <div className="mt-auto border-t border-border-subtle pt-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className={cn(
              "flex w-full items-center gap-[11px] rounded-[9px] px-2.5 py-2.5 text-sm text-secondary transition-colors hover:bg-surface-sunken",
              collapsed && "justify-center",
            )}
          >
            <span className="flex w-[19px] shrink-0 justify-center">
              {collapsed ? <ArrowRightIcon size={18} /> : <ArrowLeftIcon size={18} />}
            </span>
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      ) : null}
    </nav>
  );
}
