import { Skeleton } from "@/components/ui";
import type { LibraryView } from "./library-toolbar";

/** Loading placeholder for the Library results — mirrors grid vs. list layout. */
export function LibrarySkeleton({ view, count = 6 }: { view: LibraryView; count?: number }) {
  if (view === "list") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-surface" aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-divider px-4 py-3 last:border-b-0">
            <Skeleton width={60} height={44} radius={9} />
            <div className="min-w-0 flex-1">
              <Skeleton width="46%" height={13} radius={6} />
              <Skeleton width="28%" height={11} radius={6} className="mt-2" />
            </div>
            <Skeleton width={80} height={22} radius={99} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
          <Skeleton height={132} radius={0} />
          <div className="px-4 pb-4 pt-4">
            <Skeleton width="90%" height={14} radius={6} />
            <Skeleton width="60%" height={14} radius={6} className="mt-2" />
            <div className="mt-3.5 flex items-center justify-between">
              <Skeleton width={72} height={20} radius={99} />
              <Skeleton width={44} height={12} radius={6} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
