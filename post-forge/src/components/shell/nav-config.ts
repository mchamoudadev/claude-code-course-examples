import type { ComponentType } from "react";
import {
  CalendarIcon,
  DashboardIcon,
  LibraryIcon,
  PlusIcon,
  SettingsIcon,
  type IconProps,
} from "@/components/ui/icons";

export interface NavLink {
  label: string;
  href: string;
  Icon: ComponentType<IconProps>;
}

/**
 * Primary sidebar navigation — the single source of truth for the app shell's
 * links (desktop rail + mobile drawer). Order matches the design.
 */
export const NAV_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", Icon: DashboardIcon },
  { label: "New Post", href: "/new-post", Icon: PlusIcon },
  { label: "Library", href: "/library", Icon: LibraryIcon },
  { label: "Scheduled", href: "/scheduled", Icon: CalendarIcon },
  { label: "Settings", href: "/settings", Icon: SettingsIcon },
];

/** Active when the pathname equals the link or is nested beneath it. */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
