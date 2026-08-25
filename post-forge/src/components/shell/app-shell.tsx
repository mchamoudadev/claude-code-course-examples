"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/nav";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/components/ui/cn";
import { XIcon } from "@/components/ui/icons";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * The persistent application frame that wraps every authed route: a top bar, a
 * collapsible desktop sidebar, and an accessible mobile navigation drawer.
 * Auth is a cosmetic stub — the shell never gates on a session.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer once the viewport reaches the desktop breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Topbar onOpenMobileNav={() => setMobileOpen(true)} />

      <div className="flex flex-1">
        <aside
          className={cn(
            "sticky top-[60px] hidden h-[calc(100vh-60px)] shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:block",
            collapsed ? "w-[74px]" : "w-[248px]",
          )}
        >
          <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
        </aside>

        <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      {/* Mobile navigation drawer — reuses the accessible Modal (focus, scroll-lock, Escape, overlay). */}
      <Modal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        variant="right"
        className="max-w-[300px]"
      >
        <div className="mb-1 flex items-center justify-between">
          <Logo />
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <XIcon size={18} />
          </button>
        </div>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </Modal>
    </div>
  );
}
