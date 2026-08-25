import Link from "next/link";
import { ArrowRightIcon, CheckIcon, XIcon } from "@/components";

interface Claim {
  text: string;
  source: string;
  ok: boolean;
}

const CLAIMS: Claim[] = [
  { text: "Adoption grew ~3× year over year", source: "McKinsey", ok: true },
  { text: ">50% of enterprises piloting agents", source: "Deloitte", ok: true },
  { text: "Agents replace 80% of workers by 2027", source: "flagged", ok: false },
];

/**
 * Dark split panel showing claim-level verification with sources — the
 * "transparency by default" story (checked claims + one flagged claim).
 */
export function VerificationShowcase() {
  return (
    <section className="mx-auto mt-16 max-w-[1080px] px-6">
      <div className="grid grid-cols-1 items-center gap-10 overflow-hidden rounded-3xl bg-ink p-8 sm:p-[52px] md:grid-cols-2 md:gap-12">
        <div>
          <p className="mb-3.5 font-mono text-[12.5px] font-semibold uppercase tracking-[0.09em] text-primary-400">
            Transparency by default
          </p>
          <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[34px]">
            See exactly what each agent did
          </h2>
          <p className="mb-[26px] mt-[18px] text-base leading-[1.6] text-[#A6B0AB]">
            No black box. Watch queries run, claims get checked, and sources get cited — then read
            the finished piece with every reference one click away.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex h-[46px] items-center gap-2 rounded-[11px] bg-white px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-primary-50"
          >
            Watch it work
            <ArrowRightIcon size={16} />
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#12191680] p-[18px] backdrop-blur-[6px]">
          <p className="mb-3 font-mono text-[11.5px] text-[#7E8B85]">verify · 5 claims</p>
          <ul>
            {CLAIMS.map((c, i) => (
              <li
                key={c.text}
                className={`flex items-start gap-2.5 py-2.5 ${
                  i < CLAIMS.length - 1 ? "border-b border-white/[0.06]" : ""
                }`}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: c.ok ? "#065F46" : "#4C1D24" }}
                  aria-hidden
                >
                  {c.ok ? (
                    <CheckIcon size={12} strokeWidth={3} className="text-[#6EE7B7]" />
                  ) : (
                    <XIcon size={11} strokeWidth={3} className="text-[#FDA4AF]" />
                  )}
                </span>
                <span
                  className={`text-[13.5px] leading-[1.4] ${
                    c.ok ? "text-[#D6DEDA]" : "text-[#93A19B] line-through"
                  }`}
                >
                  {c.text}{" "}
                  <span className={c.ok ? "text-[#5E6B65]" : "text-[#F59EAB] no-underline"}>
                    · {c.source}
                  </span>
                  <span className="sr-only">{c.ok ? " — verified" : " — flagged, removed"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
