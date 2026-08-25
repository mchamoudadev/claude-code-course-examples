"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshIcon } from "@/components/ui/icons";
import { ErrorState } from "@/components/shell";

/**
 * Error boundary for authed screens. Because it is co-located with the (app)
 * layout, the shell (top bar + sidebar) stays mounted — only the failed screen
 * is replaced, so the user can retry or navigate away.
 */
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] screen error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorState
        title="This screen hit an error"
        description="An agent or a data fetch failed while rendering this view. Your work is safe — try again, or head back to the dashboard."
        action={
          <>
            <Button onClick={() => reset()} leftIcon={<RefreshIcon size={16} />}>
              Try again
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
            >
              Back to dashboard
            </Link>
          </>
        }
      />
    </div>
  );
}
