const STATS = [
  { value: "120k+", label: "posts generated" },
  { value: "96%", label: "runs succeed first try" },
  { value: "~21s", label: "topic to published" },
  { value: "100%", label: "claims cited & checked" },
];

/** Social-proof stat strip under the hero. */
export function TrustBar() {
  return (
    <section aria-label="PostForge by the numbers" className="mx-auto mt-11 max-w-[1080px] px-6">
      <dl className="flex flex-wrap items-stretch justify-center gap-x-9 gap-y-6 text-center">
        {STATS.map((s, i) => (
          <div key={s.label} className="flex items-stretch gap-x-9">
            <div>
              <dd className="text-[30px] font-semibold tracking-[-0.02em] text-ink">{s.value}</dd>
              <dt className="text-[13px] text-secondary">{s.label}</dt>
            </div>
            {i < STATS.length - 1 ? (
              <div aria-hidden className="hidden w-px self-stretch bg-border sm:block" />
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
