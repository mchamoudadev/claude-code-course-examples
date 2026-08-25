import Link from "next/link";

/** Pricing-style closing CTA — free-to-start, bring-your-own-keys. */
export function CtaBand() {
  return (
    <section id="pricing" className="mx-auto mt-[72px] max-w-[1080px] scroll-mt-24 px-6 pb-[84px]">
      <div className="rounded-3xl border border-verified-border bg-[linear-gradient(135deg,#ECFDF5,#F5FDF9)] px-6 py-14 text-center">
        <h2 className="text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">
          Ship your first post in a minute
        </h2>
        <p className="mx-auto mb-7 mt-3.5 max-w-[500px] text-[17px] text-[#3E6B57]">
          Free to start. No credit card. Bring your own API keys and generate on-demand, sourced
          content in seconds.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className="inline-flex h-[50px] items-center justify-center rounded-xl bg-primary px-[26px] text-base font-semibold text-white shadow-[0_8px_20px_-6px_rgba(5,150,105,0.5)] transition-colors hover:bg-primary-700"
          >
            Start free
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-[50px] items-center justify-center rounded-xl border border-verified-border bg-surface px-6 text-base font-medium text-ink transition-colors hover:bg-[#F5FDF9]"
          >
            See a live run
          </Link>
        </div>
      </div>
    </section>
  );
}
