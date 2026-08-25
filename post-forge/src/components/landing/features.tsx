import type { ReactNode } from "react";
import { ImageIcon, SearchIcon, ShieldCheckIcon } from "@/components";

interface Feature {
  icon: ReactNode;
  color: string;
  tint: string;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: <SearchIcon size={21} />,
    color: "#2563EB",
    tint: "#EFF6FF",
    title: "Autonomous research",
    body: "Agents search the web in real time, read primary sources, and pull the numbers that matter — no manual digging.",
  },
  {
    icon: <ShieldCheckIcon size={21} />,
    color: "#059669",
    tint: "#ECFDF5",
    title: "Claim-level verification",
    body: "A dedicated Verify agent checks each statement against its source and flags anything it can't stand behind.",
  },
  {
    icon: <ImageIcon size={21} />,
    color: "#DB2777",
    tint: "#FDF2F8",
    title: "An original poster, every time",
    body: "The Illustrate agent generates a unique cover image so every post looks finished and ready to ship.",
  },
];

/** "Why PostForge" — three primary capability cards. */
export function Features() {
  return (
    <section id="features" className="mx-auto mt-20 max-w-[1080px] scroll-mt-24 px-6">
      <div className="mx-auto mb-11 max-w-[640px] text-center">
        <p className="mb-3 font-mono text-[12.5px] font-semibold uppercase tracking-[0.09em] text-primary-600">
          Why PostForge
        </p>
        <h2 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">
          Trust you can trace to a source
        </h2>
        <p className="mt-3.5 text-[17px] font-normal text-secondary">
          Every post is researched from the live web and fact-checked, claim by claim, before a
          single word is written.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {FEATURES.map((f) => (
          <li
            key={f.title}
            className="rounded-[18px] border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(11,18,16,0.03)]"
          >
            <div
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl"
              style={{ background: f.tint, color: f.color }}
            >
              {f.icon}
            </div>
            <h3 className="mb-[7px] mt-[18px] text-[17px] font-semibold">{f.title}</h3>
            <p className="text-sm leading-[1.55] text-secondary">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
