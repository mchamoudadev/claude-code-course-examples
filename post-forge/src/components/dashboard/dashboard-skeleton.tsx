import { Skeleton } from "@/components/ui";

function CardSkeleton({ height }: { height: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <Skeleton width="40%" height={14} radius={6} />
      <Skeleton width="55%" height={11} radius={6} className="mt-2" />
      <Skeleton height={height} radius={12} className="mt-4" shimmer={false} />
    </div>
  );
}

/** Full-page loading placeholder for the dashboard (shown while data loads). */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1180px]" aria-hidden>
      <Skeleton width={220} height={26} radius={8} />
      <Skeleton width={300} height={14} radius={6} className="mt-3" />

      <Skeleton height={112} radius={18} className="mt-6" shimmer={false} />

      <div className="mt-3.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-[18px]">
            <Skeleton width="60%" height={12} radius={6} />
            <Skeleton width="45%" height={26} radius={8} className="mt-3" />
          </div>
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.7fr_1fr]">
        <CardSkeleton height={168} />
        <CardSkeleton height={140} />
      </div>
      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <CardSkeleton height={150} />
        <CardSkeleton height={150} />
      </div>
    </div>
  );
}
