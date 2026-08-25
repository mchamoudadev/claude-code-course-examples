"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, SparkLogo } from "@/components";
import { useReducedMotion } from "./use-reduced-motion";
import { PipelinePreview } from "./pipeline-preview";

const TOPICS = [
  "The rise of AI agents",
  "Humanoid robots",
  "Fusion energy breakthroughs",
  "Small language models",
];

const EXAMPLES = ["Humanoid robots", "Fusion energy", "Small language models"];

/**
 * Landing hero: the "one topic in → a researched, verified post out" framing,
 * a faux prompt field whose topic types itself (reduced-motion falls back to a
 * static topic), the primary CTA into sign-up, and the animated pipeline preview.
 */
export function Hero() {
  const reduced = useReducedMotion();
  const [text, setText] = useState(TOPICS[0]);

  useEffect(() => {
    if (reduced) {
      setText(TOPICS[0]);
      return;
    }
    let topic = 0;
    let char = TOPICS[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      const full = TOPICS[topic];
      char = deleting ? char - 1 : char + 1;
      setText(full.slice(0, char));

      let delay = deleting ? 34 : 62;
      if (!deleting && char >= full.length) {
        deleting = true;
        delay = 1600;
      } else if (deleting && char <= 0) {
        deleting = false;
        topic = (topic + 1) % TOPICS.length;
        delay = 320;
      }
      timer = setTimeout(step, delay);
    };

    timer = setTimeout(step, 1600);
    return () => clearTimeout(timer);
  }, [reduced]);

  return (
    <>
      <section className="mx-auto max-w-[1000px] px-6 pb-10 pt-[52px] text-center sm:pt-[76px]">
        <div className="mb-[26px] inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#E3E7E5] bg-surface py-1.5 pl-2 pr-3.5 text-[12.5px] text-body shadow-[0_1px_2px_rgba(11,18,16,0.04)]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2 py-0.5 text-[11.5px] font-semibold text-primary-700">
            <span className="h-[5px] w-[5px] rounded-full bg-primary" aria-hidden />6 agents
          </span>
          <span className="text-secondary">
            Research → Verify → Write → Edit → Illustrate → Publish
          </span>
        </div>

        <h1 className="mx-auto max-w-[820px] text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[52px] md:text-[60px] md:leading-[1.03]">
          One topic in.
          <br />
          A{" "}
          <span className="font-serif font-medium italic text-primary">researched, verified</span>{" "}
          post out.
        </h1>

        <p className="mx-auto mt-[22px] max-w-[600px] text-[17px] font-normal leading-[1.5] text-secondary sm:text-[19px]">
          PostForge runs a team of autonomous AI agents that research the web, fact-check every
          claim, write the piece, design a poster, and publish it — while you watch, live.
        </p>

        {/* faux prompt field */}
        <div className="mx-auto mt-[34px] max-w-[600px]">
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#E3E7E5] bg-surface py-2.5 pl-[18px] pr-2.5 shadow-[0_18px_44px_-20px_rgba(11,18,16,0.28),0_2px_6px_-2px_rgba(11,18,16,0.06)]">
            <SparkLogo size={19} className="shrink-0 text-primary" strokeWidth={2} />
            <div className="flex-1 truncate text-left text-[15px] text-body sm:text-[16px]">
              <span>{text}</span>
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[18px] w-[1.5px] translate-y-[3px] animate-blink bg-primary align-baseline"
              />
            </div>
            <Link
              href="/sign-up"
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[11px] bg-primary px-4 text-sm font-medium text-white shadow-[0_2px_8px_-1px_rgba(5,150,105,0.5)] transition-colors hover:bg-primary-700 sm:px-5 sm:text-[15px]"
            >
              Generate
              <ArrowRightIcon size={16} />
            </Link>
          </div>
          <div className="mt-3.5 flex flex-wrap justify-center gap-2">
            <span className="self-center text-[12.5px] text-secondary">Try:</span>
            {EXAMPLES.map((ex) => (
              <Link
                key={ex}
                href="/sign-up"
                className="rounded-full border border-border bg-surface px-[11px] py-1 text-[12.5px] text-body transition-colors hover:border-primary-200 hover:bg-primary-50"
              >
                {ex}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* animated pipeline preview */}
      <section
        id="how-it-works"
        aria-label="How the six-agent pipeline works"
        className="mx-auto mt-[22px] max-w-[1080px] scroll-mt-24 px-6"
      >
        <PipelinePreview />
      </section>
    </>
  );
}
