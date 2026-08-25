import Link from "next/link";
import { Logo } from "@/components/nav";

/**
 * On-brand 404. As the root `not-found`, this also handles any URL that does not
 * match a route across the whole app. Server component — no client hooks.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-bg px-5 py-10">
      <div className="w-full max-w-[460px] rounded-3xl border border-border bg-surface p-8 text-center shadow-lg">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-7 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-primary-600">
          404
        </p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-ink">
          Page not found
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-secondary">
          We could not find that page. It may have moved, or the link is out of date.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgba(5,150,105,0.4)] transition-colors hover:bg-primary-700"
          >
            Back to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
