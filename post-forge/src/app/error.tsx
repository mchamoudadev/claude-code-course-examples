"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { RefreshIcon } from "@/components/ui/icons";
import { ErrorState } from "@/components/shell";

/**
 * Root error boundary — the friendly full-page 500 / agent-failure screen. Catches
 * anything thrown below the root layout (including the shell itself). It renders
 * without the shell chrome, so it also covers the public surface.
 */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root] unhandled error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-bg px-5 py-10">
      <div className="w-full max-w-[460px] rounded-3xl border border-border bg-surface p-8 shadow-lg">
        <div className="flex justify-center">
          <Logo />
        </div>
        <ErrorState
          className="py-8"
          title="Something went wrong"
          description="PostForge hit an unexpected error. This one is on us — you can retry, or return to your dashboard."
          action={
            <>
              <Button onClick={() => reset()} leftIcon={<RefreshIcon size={16} />}>
                Try again
              </Button>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
              >
                Go to dashboard
              </Link>
            </>
          }
        />
        {error?.digest ? (
          <p className="mt-1 text-center font-mono text-[11px] text-faint">ref: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
