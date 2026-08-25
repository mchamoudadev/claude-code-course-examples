import { Suspense } from "react";
import type { Metadata } from "next";
import { LibraryClient, LibrarySkeleton } from "@/components/library";

export const metadata: Metadata = {
  title: "Library · PostForge",
  description: "Browse, search and filter every post your agents have produced.",
};

/**
 * Library route. `LibraryClient` reads the `?q=` search param (from the global
 * top-bar search) via `useSearchParams`, so it must render inside a Suspense
 * boundary per Next.js 16's App Router requirement.
 */
export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-6">
            <h1 className="text-[27px] font-semibold tracking-[-0.025em] text-ink">Library</h1>
            <p className="mt-1.5 text-[15px] text-secondary">
              Every post your agents have produced.
            </p>
          </div>
          <LibrarySkeleton view="grid" />
        </div>
      }
    >
      <LibraryClient />
    </Suspense>
  );
}
