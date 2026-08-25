import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/shell";

/**
 * Layout for every authed route. Mounts the app-wide toast provider and renders
 * the persistent shell around each screen. A co-located `error.tsx` supplies the
 * error boundary that keeps the shell alive when a screen throws.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
